import { getOne, getMany, query } from '../../db/query';
import { AppError, NotFoundError, ForbiddenError } from '../../config/errors';
import { PricingService } from '../pricing/pricing.service';
import type { Ride, RideStatus } from '@uber-clone/shared';

const pricingService = new PricingService();

interface CreateRideDto {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
  distanceKm: number;
  durationMin: number;
}

export class RidesService {
  async createRide(dto: CreateRideDto): Promise<Ride> {
    const { fare, surgeMultiplier } = await pricingService.calculateFare(
      dto.distanceKm,
      dto.durationMin
    );

    const result = await query<Ride>(
      `INSERT INTO rides (
        rider_id, pickup_lat, pickup_lng, pickup_address,
        drop_lat, drop_lng, drop_address,
        estimated_fare, distance_km, duration_min, surge_multiplier, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'REQUESTED')
      RETURNING *`,
      [
        dto.riderId, dto.pickupLat, dto.pickupLng, dto.pickupAddress,
        dto.dropLat, dto.dropLng, dto.dropAddress,
        fare, dto.distanceKm, dto.durationMin, surgeMultiplier,
      ]
    );

    return result.rows[0];
  }

  async getRideById(rideId: string, requesterId: string, requesterRole: string) {
    const ride = await getOne<any>(
      `SELECT
        r.*,
        u.name AS rider_name, u.phone AS rider_phone,
        ri.rating AS rider_rating,
        du.name AS driver_name, du.phone AS driver_phone,
        d.rating AS driver_rating, d.latitude AS driver_lat, d.longitude AS driver_lng,
        v.make, v.model, v.plate_number, v.color, v.vehicle_type
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users u ON u.id = ri.user_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE r.id = $1`,
      [rideId]
    );

    if (!ride) throw new NotFoundError('Ride');

    const ownsRide =
      (requesterRole === 'RIDER' && ride.rider_id_owner === requesterId) ||
      (requesterRole === 'DRIVER' && ride.driver_id_owner === requesterId) ||
      requesterRole === 'ADMIN';

    const ownershipCheck = await getOne<{ rider_user_id: string; driver_user_id: string | null }>(
      `SELECT ri.user_id AS rider_user_id, du.user_id AS driver_user_id
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       WHERE r.id = $1`,
      [rideId]
    );

    const isOwner =
      requesterRole === 'ADMIN' ||
      ownershipCheck?.rider_user_id === requesterId ||
      ownershipCheck?.driver_user_id === requesterId;

    if (!isOwner) throw new ForbiddenError('You do not have access to this ride');

    return ride;
  }

  async getActiveRideForRider(userId: string) {
    return getOne<any>(
      `SELECT r.*, 
              du.name AS driver_name, du.phone AS driver_phone,
              d.rating AS driver_rating, d.latitude AS driver_lat, d.longitude AS driver_lng,
              v.make, v.model, v.plate_number, v.color
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE ri.user_id = $1
         AND r.status IN ('REQUESTED','ACCEPTED','ARRIVED','IN_PROGRESS')
       ORDER BY r.requested_at DESC
       LIMIT 1`,
      [userId]
    );
  }

  async getRideHistory(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const rides = await getMany<any>(
      `SELECT r.*, du.name AS driver_name, v.make, v.model, v.plate_number,
              p.status AS payment_status, p.method AS payment_method,
              rt.driver_rating, rt.rider_rating
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN payments p ON p.ride_id = r.id
       LEFT JOIN ratings rt ON rt.ride_id = r.id
       WHERE ri.user_id = $1
       ORDER BY r.requested_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       WHERE ri.user_id = $1`,
      [userId]
    );

    return {
      rides,
      pagination: {
        page,
        limit,
        total: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    };
  }

  async cancelRide(rideId: string, userId: string, role: string, reason?: string) {
    const ride = await getOne<{ id: string; status: RideStatus; rider_id: string; driver_id: string | null }>(
      `SELECT r.id, r.status, r.rider_id, r.driver_id
       FROM rides r WHERE r.id = $1`,
      [rideId]
    );
    if (!ride) throw new NotFoundError('Ride');

    if (['COMPLETED', 'CANCELLED'].includes(ride.status)) {
      throw new AppError('Ride cannot be cancelled at this stage', 400);
    }

    if (ride.status === 'IN_PROGRESS') {
      throw new AppError('Cannot cancel a ride that is already in progress', 400);
    }

    const result = await query<Ride>(
      `UPDATE rides SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = $2
       WHERE id = $1 RETURNING *`,
      [rideId, reason || null]
    );

    return result.rows[0];
  }

  async submitRating(rideId: string, userId: string, role: string, rating: number, comment?: string) {
    const ride = await getOne<{ status: RideStatus }>(
      `SELECT status FROM rides WHERE id = $1`, [rideId]
    );
    if (!ride) throw new NotFoundError('Ride');
    if (ride.status !== 'COMPLETED') {
      throw new AppError('Can only rate completed rides', 400);
    }

    const column = role === 'RIDER' ? 'driver_rating' : 'rider_rating';

    await query(
      `INSERT INTO ratings (ride_id, ${column}, comment)
       VALUES ($1, $2, $3)
       ON CONFLICT (ride_id) DO UPDATE SET ${column} = $2, comment = COALESCE($3, ratings.comment)`,
      [rideId, rating, comment || null]
    );

    if (role === 'RIDER') {
      await query(
        `UPDATE drivers d SET rating = (
          SELECT ROUND(AVG(rt.driver_rating)::numeric, 2)
          FROM ratings rt
          JOIN rides r ON r.id = rt.ride_id
          WHERE r.driver_id = d.id AND rt.driver_rating IS NOT NULL
        )
        WHERE d.id = (SELECT driver_id FROM rides WHERE id = $1)`,
        [rideId]
      );
    } else {
      await query(
        `UPDATE riders ri SET rating = (
          SELECT ROUND(AVG(rt.rider_rating)::numeric, 2)
          FROM ratings rt
          JOIN rides r ON r.id = rt.ride_id
          WHERE r.rider_id = ri.id AND rt.rider_rating IS NOT NULL
        )
        WHERE ri.id = (SELECT rider_id FROM rides WHERE id = $1)`,
        [rideId]
      );
    }

    return { success: true };
  }

  async estimateFare(distanceKm: number, durationMin: number) {
    return pricingService.calculateFare(distanceKm, durationMin);
  }
}