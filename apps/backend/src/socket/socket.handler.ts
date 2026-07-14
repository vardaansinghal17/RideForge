import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, RideStatus } from '@RideForge/shared';
import { socketAuthMiddleware, AuthenticatedSocket } from './socket-auth.middleware';
//import { socketAuthMiddleware } from './socket-auth.middleware';
import { rooms } from './rooms';
import { rideRequestTracker } from './ride-request-tracker';
import { RidesService } from '../modules/rides/rides.service';
import { MatchingService } from '../modules/rides/matching.service';
import { DriversService } from '../modules/drivers/drivers.service';
import { getOne, query } from '../db/query';
import { logger } from '../config/logger';

const ridesService = new RidesService();
const matchingService = new MatchingService();
const driversService = new DriversService();

const DRIVER_OFFER_TIMEOUT_MS = 15000;

export function setupSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    logger.info(`Socket connected: ${authSocket.userId} (${authSocket.userRole})`);

    // Every driver joins their personal room so we can target them directly
    if (authSocket.userRole === 'DRIVER') {
      authSocket.join(rooms.driverPersonal(authSocket.userId));
    }
    if (authSocket.userRole === 'RIDER') {
      authSocket.join(rooms.riderPersonal(authSocket.userId));
    }

    authSocket.on('ride:request', async (data) => {
      try {
        if (authSocket.userRole !== 'RIDER') {
          return authSocket.emit('error', { message: 'Only riders can request rides' });
        }

        const rider = await getOne<{ id: string }>(
          `SELECT id FROM riders WHERE user_id = $1`, [authSocket.userId]
        );
        if (!rider) return authSocket.emit('error', { message: 'Rider profile not found' });

        const existingActive = await getOne(
          `SELECT id FROM rides WHERE rider_id = $1
           AND status IN ('REQUESTED','ACCEPTED','ARRIVED','IN_PROGRESS')`,
          [rider.id]
        );
        if (existingActive) {
          return authSocket.emit('error', { message: 'You already have an active ride' });
        }

        // Create the ride record
        const ride = await ridesService.createRide({
          riderId: rider.id,
          pickupLat: data.pickupLat,
          pickupLng: data.pickupLng,
          pickupAddress: data.pickupAddress,
          dropLat: data.dropLat,
          dropLng: data.dropLng,
          dropAddress: data.dropAddress,
          distanceKm: data.distanceKm,
          durationMin: data.durationMin,
        });

        authSocket.join(rooms.ridePersonal(ride.id));
        authSocket.emit('ride:created', ride);

        const nearbyDrivers = await matchingService.findNearbyDrivers(
          data.pickupLat, data.pickupLng
        );

        if (nearbyDrivers.length === 0) {
          await query(`UPDATE rides SET status = 'CANCELLED', cancel_reason = 'NO_DRIVERS' WHERE id = $1`, [ride.id]);
          return authSocket.emit('ride:no_driver');
        }

        const candidateQueue = matchingService.buildCandidateQueue(nearbyDrivers);

        rideRequestTracker.add(ride.id, {
          rideId: ride.id,
          pickupLat: data.pickupLat,
          pickupLng: data.pickupLng,
          candidateQueue,
        });

        // Offer to the first (nearest) driver
        offerRideToNextDriver(io, ride.id);
      } catch (err: any) {
        logger.error('ride:request failed', { error: err.message });
        authSocket.emit('error', { message: 'Failed to create ride request' });
      }
    });

    authSocket.on('ride:accept', async ({ rideId }) => {
      try {
        if (authSocket.userRole !== 'DRIVER') {
          return authSocket.emit('error', { message: 'Only drivers can accept rides' });
        }

        const driver = await getOne<{ id: string }>(
          `SELECT id FROM drivers WHERE user_id = $1`, [authSocket.userId]
        );
        if (!driver) return authSocket.emit('error', { message: 'Driver profile not found' });

        // Atomic accept — prevents two drivers winning the same ride
        const won = await matchingService.acceptRide(rideId, driver.id);

        if (!won) {
          return authSocket.emit('ride:already_taken');
        }

        // Stop offering this ride to other drivers
        rideRequestTracker.remove(rideId);

        authSocket.join(rooms.ridePersonal(rideId));

        const fullRide = await getOne<any>(
          `SELECT r.*, du.name AS driver_name, du.phone AS driver_phone,
                  d.rating AS driver_rating, d.latitude AS driver_lat, d.longitude AS driver_lng,
                  v.make, v.model, v.plate_number, v.color, v.vehicle_type
           FROM rides r
           JOIN drivers d ON d.id = r.driver_id
           JOIN users du ON du.id = d.user_id
           LEFT JOIN vehicles v ON v.driver_id = d.id
           WHERE r.id = $1`,
          [rideId]
        );

        // Notify everyone in the ride room (rider + driver)
        io.to(rooms.ridePersonal(rideId)).emit('ride:accepted', {
          ride: fullRide,
          driver: fullRide,
        } as any);

        logger.info(`Ride ${rideId} accepted by driver ${driver.id}`);
      } catch (err: any) {
        logger.error('ride:accept failed', { error: err.message });
        authSocket.emit('error', { message: 'Failed to accept ride' });
      }
    });

    authSocket.on('ride:reject', async ({ rideId }) => {
      if (authSocket.userRole !== 'DRIVER') return;
      logger.info(`Driver ${authSocket.userId} rejected ride ${rideId}`);
      tryNextDriver(io, rideId);
    });

    authSocket.on('ride:status', async ({ rideId, status }) => {
      try {
        if (authSocket.userRole !== 'DRIVER') {
          return authSocket.emit('error', { message: 'Only drivers can update ride status' });
        }

        const driver = await getOne<{ id: string }>(
          `SELECT id FROM drivers WHERE user_id = $1`, [authSocket.userId]
        );
        if (!driver) return authSocket.emit('error', { message: 'Driver profile not found' });

        const validTransitions: Record<string, RideStatus[]> = {
          ACCEPTED: ['ARRIVED'],
          ARRIVED: ['IN_PROGRESS'],
          IN_PROGRESS: ['COMPLETED'],
        };

        const currentRide = await getOne<{ status: RideStatus }>(
          `SELECT status FROM rides WHERE id = $1 AND driver_id = $2`,
          [rideId, driver.id]
        );
        if (!currentRide) return authSocket.emit('error', { message: 'Ride not found' });

        const allowedNext = validTransitions[currentRide.status] || [];
        if (!allowedNext.includes(status)) {
          return authSocket.emit('error', {
            message: `Cannot transition from ${currentRide.status} to ${status}`,
          });
        }

        const updated = await matchingService.updateRideStatus(
          rideId, driver.id, status as 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
        );

        if (!updated) return authSocket.emit('error', { message: 'Failed to update ride' });

        io.to(rooms.ridePersonal(rideId)).emit('ride:status_update', {
          rideId, status: status as RideStatus,
        });

        // If completed, free both parties from the ride room
        if (status === 'COMPLETED') {
          io.in(rooms.ridePersonal(rideId)).socketsLeave(rooms.ridePersonal(rideId));
        }

        logger.info(`Ride ${rideId} status → ${status}`);
      } catch (err: any) {
        logger.error('ride:status failed', { error: err.message });
        authSocket.emit('error', { message: 'Failed to update ride status' });
      }
    });

    authSocket.on('ride:cancel', async ({ rideId }) => {
      try {
        const ride = await getOne<{ status: RideStatus; rider_id: string }>(
          `SELECT r.status, ri.user_id AS rider_id
           FROM rides r JOIN riders ri ON ri.id = r.rider_id
           WHERE r.id = $1`,
          [rideId]
        );

        if (!ride) return authSocket.emit('error', { message: 'Ride not found' });
        if ((ride as any).rider_id !== authSocket.userId && authSocket.userRole !== 'ADMIN') {
          return authSocket.emit('error', { message: 'Not authorized to cancel this ride' });
        }
        if (['COMPLETED', 'IN_PROGRESS', 'CANCELLED'].includes(ride.status)) {
          return authSocket.emit('error', { message: 'Ride cannot be cancelled at this stage' });
        }

        await query(
          `UPDATE rides SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1`,
          [rideId]
        );

        rideRequestTracker.remove(rideId);

        io.to(rooms.ridePersonal(rideId)).emit('ride:cancelled', { rideId });
        io.in(rooms.ridePersonal(rideId)).socketsLeave(rooms.ridePersonal(rideId));

        logger.info(`Ride ${rideId} cancelled`);
      } catch (err: any) {
        logger.error('ride:cancel failed', { error: err.message });
        authSocket.emit('error', { message: 'Failed to cancel ride' });
      }
    });

    authSocket.on('driver:location', async ({ lat, lng, rideId }) => {
      try {
        if (authSocket.userRole !== 'DRIVER') return;

        await driversService.updateLocation(authSocket.userId, lat, lng);

        if (rideId) {
          authSocket.to(rooms.ridePersonal(rideId)).emit('driver:moved', { lat, lng });
        }
      } catch (err: any) {
        logger.error('driver:location failed', { error: err.message });
      }
    });

    authSocket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${authSocket.userId}`);
    });
  });
}

function offerRideToNextDriver(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  rideId: string
) {
  const tracked = rideRequestTracker.get(rideId);
  if (!tracked) return;

  const driverUserId = rideRequestTracker.getCurrentDriverUserId(rideId);

  if (!driverUserId) {
    // Exhausted the queue — no one accepted
    handleNoDriverFound(io, rideId);
    return;
  }

  rideRequestTracker.markOffered(rideId, driverUserId);

  getOne<any>(
    `SELECT r.*, ru.name AS rider_name, ru.phone AS rider_phone, ri.rating AS rider_rating
     FROM rides r
     JOIN riders ri ON ri.id = r.rider_id
     JOIN users ru ON ru.id = ri.user_id
     WHERE r.id = $1`,
    [rideId]
  ).then(ride => {
    if (!ride) return;
    io.to(rooms.driverPersonal(driverUserId)).emit('ride:incoming', ride);
    logger.info(`Offered ride ${rideId} to driver ${driverUserId}`);
  });

  // Set timeout — if driver doesn't respond, move to next candidate
  const timeoutHandle = setTimeout(() => {
    logger.info(`Driver ${driverUserId} timed out on ride ${rideId}`);
    tryNextDriver(io, rideId);
  }, DRIVER_OFFER_TIMEOUT_MS);

  rideRequestTracker.setTimeoutHandle(rideId, timeoutHandle);
}

function tryNextDriver(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  rideId: string
) {
  rideRequestTracker.clearTimeout(rideId);

  // Check the ride wasn't already accepted by someone else through a race
  getOne<{ status: string }>(`SELECT status FROM rides WHERE id = $1`, [rideId])
    .then(ride => {
      if (!ride || ride.status !== 'REQUESTED') return; // already accepted/cancelled

      const next = rideRequestTracker.advance(rideId);
      if (!next) {
        handleNoDriverFound(io, rideId);
        return;
      }
      offerRideToNextDriver(io, rideId);
    });
}

async function handleNoDriverFound(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  rideId: string
) {
  rideRequestTracker.remove(rideId);

  await query(
    `UPDATE rides SET status = 'CANCELLED', cancel_reason = 'NO_DRIVERS_RESPONDED'
     WHERE id = $1 AND status = 'REQUESTED'`,
    [rideId]
  );

  io.to(rooms.ridePersonal(rideId)).emit('ride:no_driver');
  logger.info(`No driver found for ride ${rideId} after exhausting queue`);
}