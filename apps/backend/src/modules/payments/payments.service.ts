import { getOne, getMany, query } from '../../db/query';
import { NotFoundError, AppError } from '../../config/errors';

export class PaymentsService {
  async getPaymentByRide(rideId: string, userId: string) {
    const payment = await getOne<any>(
      `SELECT
        p.*,
        r.pickup_address, r.drop_address,
        r.distance_km, r.duration_min,
        r.estimated_fare, r.final_fare,
        r.surge_multiplier, r.completed_at,
        ru.name AS rider_name, ru.phone AS rider_phone,
        du.name AS driver_name, du.phone AS driver_phone,
        v.make, v.model, v.plate_number
       FROM payments p
       JOIN rides r ON r.id = p.ride_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE p.ride_id = $1`,
      [rideId]
    );

    if (!payment) throw new NotFoundError('Payment');

    const ownership = await getOne<{ rider_user_id: string; driver_user_id: string | null }>(
      `SELECT ri.user_id AS rider_user_id, du.user_id AS driver_user_id
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       WHERE r.id = $1`,
      [rideId]
    );

    const isOwner =
      ownership?.rider_user_id === userId ||
      ownership?.driver_user_id === userId;

    if (!isOwner) throw new AppError('Access denied', 403);

    return payment;
  }

  async getPaymentHistory(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const payments = await getMany<any>(
      `SELECT
        p.*,
        r.pickup_address, r.drop_address,
        r.distance_km, r.final_fare,
        r.completed_at, r.status AS ride_status
       FROM payments p
       JOIN rides r ON r.id = p.ride_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users u ON u.id = ri.user_id
       WHERE u.id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) FROM payments p
       JOIN rides r ON r.id = p.ride_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users u ON u.id = ri.user_id
       WHERE u.id = $1`,
      [userId]
    );

    return {
      payments,
      pagination: {
        page, limit,
        total: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    };
  }

  async updatePaymentMethod(
    rideId: string,
    userId: string,
    method: 'CASH' | 'CARD' | 'UPI'
  ) {
    const ride = await getOne<{ status: string; rider_user_id: string; driver_user_id: string | null }>(
      `SELECT r.status, ri.user_id AS rider_user_id, du.user_id AS driver_user_id
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       WHERE r.id = $1`,
      [rideId]
    );

    if (!ride) throw new NotFoundError('Ride');
    const isRider  = ride.rider_user_id === userId;
    const isDriver = ride.driver_user_id === userId;

    if (!isRider && !isDriver) throw new AppError('Access denied', 403);

    const result = await query(
      `UPDATE payments SET method = $1, status = 'COMPLETED', updated_at = NOW() WHERE ride_id = $2 RETURNING *`,
      [method, rideId]
    );

    if (result.rows.length === 0) {
      const rideData = await getOne<{ estimated_fare: number; final_fare: number }>(
        `SELECT estimated_fare, final_fare FROM rides WHERE id = $1`,
        [rideId]
      );
      const fareAmount = rideData?.final_fare || rideData?.estimated_fare || 0;
      const newPayment = await query(
        `INSERT INTO payments (ride_id, amount, status, method)
         VALUES ($1, $2, 'COMPLETED', $3)
         ON CONFLICT (ride_id) DO UPDATE SET method = $3, status = 'COMPLETED', updated_at = NOW()
         RETURNING *`,
        [rideId, fareAmount, method]
      );
      return newPayment.rows[0];
    }
    return result.rows[0];
  }

  // ── Generate invoice ──────────────────────────────────────
  async generateInvoice(rideId: string, userId: string) {
    let payment;
    try {
      payment = await this.getPaymentByRide(rideId, userId);
    } catch (err) {
      // If payment record is missing, auto-create it for completed ride
      const rideData = await getOne<{ estimated_fare: number; final_fare: number }>(
        `SELECT estimated_fare, final_fare FROM rides WHERE id = $1`,
        [rideId]
      );
      if (rideData) {
        const fareAmount = rideData.final_fare || rideData.estimated_fare || 0;
        await query(
          `INSERT INTO payments (ride_id, amount, status, method)
           VALUES ($1, $2, 'COMPLETED', 'UPI')
           ON CONFLICT (ride_id) DO NOTHING`,
          [rideId, fareAmount]
        );
        payment = await this.getPaymentByRide(rideId, userId);
      }
    }

    if (!payment) throw new NotFoundError('Payment');

    // Build structured invoice object
    const invoice = {
      invoiceNumber: `INV-${payment.id.slice(0, 8).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      ride: {
        id: payment.ride_id,
        from: payment.pickup_address,
        to: payment.drop_address,
        distanceKm: Number(payment.distance_km),
        completedAt: payment.completed_at || payment.created_at,
      },
      passenger: {
        name: payment.rider_name,
        phone: payment.rider_phone,
      },
      driver: {
        name: payment.driver_name || 'Driver',
        phone: payment.driver_phone || '—',
        vehicle: payment.make ? `${payment.make} ${payment.model}` : 'Vehicle',
        plateNumber: payment.plate_number || '—',
      },
      fare: {
        estimatedFare: Number(payment.estimated_fare || payment.amount),
        finalFare: Number(payment.final_fare || payment.amount),
        surgeMultiplier: Number(payment.surge_multiplier || 1),
        paymentMethod: payment.method || 'UPI',
        paymentStatus: payment.status || 'COMPLETED',
      },
    };

    return invoice;
  }

  // ── Admin: all payments with filters ─────────────────────
  async getAllPayments(page = 1, limit = 20, status?: string) {
    const offset = (page - 1) * limit;
    const whereClause = status ? `WHERE p.status = $3` : '';

    const params: unknown[] = status
      ? [limit, offset, status]
      : [limit, offset];

    const payments = await getMany<any>(
      `SELECT
        p.*,
        r.pickup_address, r.drop_address, r.distance_km,
        ru.name AS rider_name, du.name AS driver_name
       FROM payments p
       JOIN rides r ON r.id = p.ride_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const totalResult = await getOne<{ count: string; total_amount: string }>(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount
       FROM payments ${whereClause}`,
      status ? [status] : []
    );

    return {
      payments,
      pagination: {
        page, limit,
        total: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
      totalAmount: Number(totalResult?.total_amount || 0),
    };
  }
}