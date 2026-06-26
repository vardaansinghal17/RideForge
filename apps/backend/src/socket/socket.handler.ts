import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, RideStatus } from '@uber-clone/shared';
import { socketAuthMiddleware, AuthenticatedSocket } from './socket-auth.middleware';
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

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.userId} (${socket.userRole})`);

    // Every driver joins their personal room so we can target them directly
    if (socket.userRole === 'DRIVER') {
      socket.join(rooms.driverPersonal(socket.userId));
    }
    if (socket.userRole === 'RIDER') {
      socket.join(rooms.riderPersonal(socket.userId));
    }

    socket.on('ride:request', async (data) => {
      try {
        if (socket.userRole !== 'RIDER') {
          return socket.emit('error', { message: 'Only riders can request rides' });
        }

        const rider = await getOne<{ id: string }>(
          `SELECT id FROM riders WHERE user_id = $1`, [socket.userId]
        );
        if (!rider) return socket.emit('error', { message: 'Rider profile not found' });

        // Prevent duplicate active ride requests
        const existingActive = await getOne(
          `SELECT id FROM rides WHERE rider_id = $1
           AND status IN ('REQUESTED','ACCEPTED','ARRIVED','IN_PROGRESS')`,
          [rider.id]
        );
        if (existingActive) {
          return socket.emit('error', { message: 'You already have an active ride' });
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

        socket.join(rooms.ridePersonal(ride.id));
        socket.emit('ride:created', ride);

        const nearbyDrivers = await matchingService.findNearbyDrivers(
          data.pickupLat, data.pickupLng
        );

        if (nearbyDrivers.length === 0) {
          await query(`UPDATE rides SET status = 'CANCELLED', cancel_reason = 'NO_DRIVERS' WHERE id = $1`, [ride.id]);
          return socket.emit('ride:no_driver');
        }

        const candidateQueue = matchingService.buildCandidateQueue(nearbyDrivers);

        rideRequestTracker.add(ride.id, {
          rideId: ride.id,
          pickupLat: data.pickupLat,
          pickupLng: data.pickupLng,
          candidateQueue,
        });

        offerRideToNextDriver(io, ride.id);
      } catch (err: any) {
        logger.error('ride:request failed', { error: err.message });
        socket.emit('error', { message: 'Failed to create ride request' });
      }
    });

    socket.on('ride:accept', async ({ rideId }) => {
      try {
        if (socket.userRole !== 'DRIVER') {
          return socket.emit('error', { message: 'Only drivers can accept rides' });
        }

        const driver = await getOne<{ id: string }>(
          `SELECT id FROM drivers WHERE user_id = $1`, [socket.userId]
        );
        if (!driver) return socket.emit('error', { message: 'Driver profile not found' });

        const won = await matchingService.acceptRide(rideId, driver.id);

        if (!won) {
          return socket.emit('ride:already_taken');
        }

        rideRequestTracker.remove(rideId);

        socket.join(rooms.ridePersonal(rideId));

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

        io.to(rooms.ridePersonal(rideId)).emit('ride:accepted', {
          ride: fullRide,
          driver: fullRide,
        } as any);

        logger.info(`Ride ${rideId} accepted by driver ${driver.id}`);
      } catch (err: any) {
        logger.error('ride:accept failed', { error: err.message });
        socket.emit('error', { message: 'Failed to accept ride' });
      }
    });

    socket.on('ride:reject', async ({ rideId }) => {
      if (socket.userRole !== 'DRIVER') return;
      logger.info(`Driver ${socket.userId} rejected ride ${rideId}`);
      tryNextDriver(io, rideId);
    });

    socket.on('ride:status', async ({ rideId, status }) => {
      try {
        if (socket.userRole !== 'DRIVER') {
          return socket.emit('error', { message: 'Only drivers can update ride status' });
        }

        const driver = await getOne<{ id: string }>(
          `SELECT id FROM drivers WHERE user_id = $1`, [socket.userId]
        );
        if (!driver) return socket.emit('error', { message: 'Driver profile not found' });

        const validTransitions: Record<string, RideStatus[]> = {
          ACCEPTED:    ['ARRIVED'],
          ARRIVED:     ['IN_PROGRESS'],
          IN_PROGRESS: ['COMPLETED'],
        };

        const currentRide = await getOne<{ status: RideStatus }>(
          `SELECT status FROM rides WHERE id = $1 AND driver_id = $2`,
          [rideId, driver.id]
        );
        if (!currentRide) return socket.emit('error', { message: 'Ride not found' });

        const allowedNext = validTransitions[currentRide.status] || [];
        if (!allowedNext.includes(status)) {
          return socket.emit('error', {
            message: `Cannot transition from ${currentRide.status} to ${status}`,
          });
        }

        const updated = await matchingService.updateRideStatus(
          rideId, driver.id, status as 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
        );

        if (!updated) return socket.emit('error', { message: 'Failed to update ride' });

        io.to(rooms.ridePersonal(rideId)).emit('ride:status_update', {
          rideId, status: status as RideStatus,
        });

        if (status === 'COMPLETED') {
          io.in(rooms.ridePersonal(rideId)).socketsLeave(rooms.ridePersonal(rideId));
        }

        logger.info(`Ride ${rideId} status → ${status}`);
      } catch (err: any) {
        logger.error('ride:status failed', { error: err.message });
        socket.emit('error', { message: 'Failed to update ride status' });
      }
    });

    socket.on('ride:cancel', async ({ rideId }) => {
      try {
        const ride = await getOne<{ status: RideStatus; rider_id: string }>(
          `SELECT r.status, ri.user_id AS rider_id
           FROM rides r JOIN riders ri ON ri.id = r.rider_id
           WHERE r.id = $1`,
          [rideId]
        );

        if (!ride) return socket.emit('error', { message: 'Ride not found' });
        if ((ride as any).rider_id !== socket.userId && socket.userRole !== 'ADMIN') {
          return socket.emit('error', { message: 'Not authorized to cancel this ride' });
        }
        if (['COMPLETED', 'IN_PROGRESS', 'CANCELLED'].includes(ride.status)) {
          return socket.emit('error', { message: 'Ride cannot be cancelled at this stage' });
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
        socket.emit('error', { message: 'Failed to cancel ride' });
      }
    });

    socket.on('driver:location', async ({ lat, lng, rideId }) => {
      try {
        if (socket.userRole !== 'DRIVER') return;

        await driversService.updateLocation(socket.userId, lat, lng);

        // Broadcast only to the active ride room (rider sees driver move)
        if (rideId) {
          socket.to(rooms.ridePersonal(rideId)).emit('driver:moved', { lat, lng });
        }
      } catch (err: any) {
        logger.error('driver:location failed', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.userId}`);
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