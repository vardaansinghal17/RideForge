import { getOne, getMany, query } from '../../db/query';
import { NotFoundError, AppError } from '../../config/errors';

interface SubmitRatingDto {
  rideId: string;
  userId: string;
  userRole: 'RIDER' | 'DRIVER';
  rating: number;
  comment?: string;
}

export class RatingsService {
  async submitRating(dto: SubmitRatingDto) {
    const ride = await getOne<{
      id: string;
      status: string;
      rider_user_id: string;
      driver_user_id: string | null;
      rider_id: string;
      driver_id: string | null;
    }>(
      `SELECT r.id, r.status, r.rider_id, r.driver_id,
              ru.id AS rider_user_id,
              du.id AS driver_user_id
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       WHERE r.id = $1`,
      [dto.rideId]
    );

    if (!ride) throw new NotFoundError('Ride');

    if (ride.status !== 'COMPLETED') {
      throw new AppError('Can only rate completed rides', 400);
    }

    const isRider  = ride.rider_user_id === dto.userId;
    const isDriver = ride.driver_user_id === dto.userId;

    if (!isRider && !isDriver) {
      throw new AppError('You were not part of this ride', 403);
    }

    const column = dto.userRole === 'RIDER' ? 'driver_rating' : 'rider_rating';

    const existing = await getOne<Record<string, unknown>>(
      `SELECT ${column} FROM ratings WHERE ride_id = $1`, [dto.rideId]
    );

    if (existing && existing[column] !== null) {
      throw new AppError('You have already rated this ride', 409);
    }

    await query(
      `INSERT INTO ratings (ride_id, ${column}, comment)
       VALUES ($1, $2, $3)
       ON CONFLICT (ride_id)
       DO UPDATE SET ${column} = $2, comment = COALESCE($3, ratings.comment)`,
      [dto.rideId, dto.rating, dto.comment || null]
    );

    await this.recomputeRating(dto.userRole, ride);

    return { success: true, message: 'Rating submitted' };
  }

  private async recomputeRating(
    raterRole: 'RIDER' | 'DRIVER',
    ride: { rider_id: string; driver_id: string | null }
  ) {
    if (raterRole === 'RIDER' && ride.driver_id) {
      await query(
        `UPDATE drivers
         SET rating = (
           SELECT ROUND(AVG(rt.driver_rating)::numeric, 2)
           FROM ratings rt
           JOIN rides r ON r.id = rt.ride_id
           WHERE r.driver_id = $1
             AND rt.driver_rating IS NOT NULL
         )
         WHERE id = $1`,
        [ride.driver_id]
      );
    } else {
      await query(
        `UPDATE riders
         SET rating = (
           SELECT ROUND(AVG(rt.rider_rating)::numeric, 2)
           FROM ratings rt
           JOIN rides r ON r.id = rt.ride_id
           WHERE r.rider_id = $1
             AND rt.rider_rating IS NOT NULL
         )
         WHERE id = $1`,
        [ride.rider_id]
      );
    }
  }

  async getRatingByRide(rideId: string) {
    const rating = await getOne<any>(
      `SELECT rt.*,
              ru.name AS rider_name,
              du.name AS driver_name
       FROM ratings rt
       JOIN rides r ON r.id = rt.ride_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       WHERE rt.ride_id = $1`,
      [rideId]
    );

    if (!rating) throw new NotFoundError('Rating');
    return rating;
  }

  async getDriverRatings(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const ratings = await getMany<any>(
      `SELECT rt.driver_rating AS rating, rt.comment, rt.created_at,
              ru.name AS rider_name,
              r.pickup_address, r.drop_address
       FROM ratings rt
       JOIN rides r ON r.id = rt.ride_id
       JOIN drivers d ON d.id = r.driver_id
       JOIN users du ON du.id = d.user_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       WHERE du.id = $1 AND rt.driver_rating IS NOT NULL
       ORDER BY rt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await getOne<{ count: string; avg_rating: string }>(
      `SELECT COUNT(*) AS count, ROUND(AVG(rt.driver_rating)::numeric, 2) AS avg_rating
       FROM ratings rt
       JOIN rides r ON r.id = rt.ride_id
       JOIN drivers d ON d.id = r.driver_id
       JOIN users du ON du.id = d.user_id
       WHERE du.id = $1 AND rt.driver_rating IS NOT NULL`,
      [userId]
    );

    return {
      ratings,
      averageRating: Number(totalResult?.avg_rating || 5),
      total: Number(totalResult?.count || 0),
      pagination: {
        page, limit,
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    };
  }
}