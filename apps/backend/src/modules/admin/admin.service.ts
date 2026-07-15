import { getOne, getMany, query } from '../../db/query';
import { NotFoundError, AppError } from '../../config/errors';

export class AdminService {
  async getDashboardStats() {
    const [overview, ridesByStatus, revenueByDay, topDrivers] = await Promise.all([
      getOne<{
        total_users: string;
        total_riders: string;
        total_drivers: string;
        active_drivers: string;
        pending_approvals: string;
        total_rides: string;
        completed_rides: string;
        cancelled_rides: string;
        total_revenue: string;
        today_revenue: string;
        today_rides: string;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM users)                                          AS total_users,
          (SELECT COUNT(*) FROM riders)                                         AS total_riders,
          (SELECT COUNT(*) FROM drivers)                                        AS total_drivers,
          (SELECT COUNT(*) FROM drivers WHERE is_available = true)              AS active_drivers,
          (SELECT COUNT(*) FROM drivers WHERE is_approved = false)              AS pending_approvals,
          (SELECT COUNT(*) FROM rides)                                          AS total_rides,
          (SELECT COUNT(*) FROM rides WHERE status = 'COMPLETED')               AS completed_rides,
          (SELECT COUNT(*) FROM rides WHERE status = 'CANCELLED')               AS cancelled_rides,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'COMPLETED')        AS total_revenue,
          (SELECT COALESCE(SUM(amount), 0) FROM payments
           WHERE status = 'COMPLETED'
             AND created_at >= DATE_TRUNC('day', NOW()))                        AS today_revenue,
          (SELECT COUNT(*) FROM rides
           WHERE requested_at >= DATE_TRUNC('day', NOW()))                      AS today_rides`
      ),

      getMany<{ status: string; count: string }>(
        `SELECT status, COUNT(*) AS count FROM rides GROUP BY status`
      ),

      getMany<{ day: string; revenue: string; rides: string }>(
        `SELECT
          TO_CHAR(DATE_TRUNC('day', completed_at), 'YYYY-MM-DD') AS day,
          COALESCE(SUM(r.final_fare), 0) AS revenue,
          COUNT(*) AS rides
         FROM rides r
         WHERE r.status = 'COMPLETED'
           AND r.completed_at >= NOW() - INTERVAL '14 days'
         GROUP BY DATE_TRUNC('day', completed_at)
         ORDER BY day ASC`
      ),

      getMany<{ driver_name: string; total_earnings: string; total_rides: string; rating: string }>(
        `SELECT
          u.name AS driver_name,
          d.earnings AS total_earnings,
          d.total_rides,
          d.rating
         FROM drivers d
         JOIN users u ON u.id = d.user_id
         ORDER BY d.earnings DESC
         LIMIT 5`
      ),
    ]);

    return {
      overview: {
        totalUsers:       Number(overview?.total_users       || 0),
        totalRiders:      Number(overview?.total_riders      || 0),
        totalDrivers:     Number(overview?.total_drivers     || 0),
        activeDrivers:    Number(overview?.active_drivers    || 0),
        pendingApprovals: Number(overview?.pending_approvals || 0),
        totalRides:       Number(overview?.total_rides       || 0),
        completedRides:   Number(overview?.completed_rides   || 0),
        cancelledRides:   Number(overview?.cancelled_rides   || 0),
        totalRevenue:     Number(overview?.total_revenue     || 0),
        todayRevenue:     Number(overview?.today_revenue     || 0),
        todayRides:       Number(overview?.today_rides       || 0),
      },
      ridesByStatus: ridesByStatus.map(r => ({
        status: r.status,
        count: Number(r.count),
      })),
      revenueByDay: revenueByDay.map(r => ({
        day: r.day,
        revenue: Number(r.revenue),
        rides: Number(r.rides),
      })),
      topDrivers: topDrivers.map(d => ({
        name:          d.driver_name,
        totalEarnings: Number(d.total_earnings),
        totalRides:    Number(d.total_rides),
        rating:        Number(d.rating),
      })),
    };
  }

  async getUsers(page = 1, limit = 20, role?: string, search?: string) {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (role) {
      conditions.push(`u.role = $${idx}`);
      params.push(role);
      idx++;
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const users = await getMany<any>(
      `SELECT
        u.id, u.name, u.email, u.phone, u.role, u.created_at,
        CASE
          WHEN u.role = 'RIDER'  THEN ri.total_rides::text
          WHEN u.role = 'DRIVER' THEN d.total_rides::text
          ELSE '0'
        END AS total_rides,
        CASE
          WHEN u.role = 'RIDER'  THEN ri.rating::text
          WHEN u.role = 'DRIVER' THEN d.rating::text
          ELSE '5'
        END AS rating,
        CASE
          WHEN u.role = 'DRIVER' THEN d.is_approved::text
          ELSE 'true'
        END AS is_approved
       FROM users u
       LEFT JOIN riders ri ON ri.user_id = u.id
       LEFT JOIN drivers d  ON d.user_id  = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const totalResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) FROM users u ${where}`, countParams
    );

    return {
      users,
      pagination: {
        page, limit,
        total: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    };
  }

  async getDrivers(page = 1, limit = 20, approved?: boolean) {
    const offset = (page - 1) * limit;
    const where  = approved !== undefined ? `WHERE d.is_approved = $3` : '';
    const params: unknown[] = approved !== undefined
      ? [limit, offset, approved]
      : [limit, offset];

    const drivers = await getMany<any>(
      `SELECT
        d.id, d.is_approved, d.is_available,
        d.rating, d.total_rides, d.earnings,
        d.latitude, d.longitude, d.created_at,
        u.name, u.email, u.phone,
        v.make, v.model, v.plate_number, v.vehicle_type, v.color, v.year
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const totalResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) FROM drivers d ${approved !== undefined ? 'WHERE d.is_approved = $1' : ''}`,
      approved !== undefined ? [approved] : []
    );

    return {
      drivers,
      pagination: {
        page, limit,
        total: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    };
  }

  async updateDriverApproval(driverId: string, isApproved: boolean) {
    const driver = await getOne(
      `SELECT id FROM drivers WHERE id = $1`, [driverId]
    );
    if (!driver) throw new NotFoundError('Driver');

    const result = await query(
      `UPDATE drivers SET is_approved = $1 WHERE id = $2
       RETURNING id, user_id, is_approved, is_available`,
      [isApproved, driverId]
    );

    return result.rows[0];
  }

  async getRides(page = 1, limit = 20, status?: string) {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [limit, offset];
    let idx = 3;

    if (status) {
      conditions.push(`r.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rides = await getMany<any>(
      `SELECT
        r.id, r.status,
        r.pickup_address, r.drop_address,
        r.distance_km, r.estimated_fare, r.final_fare,
        r.surge_multiplier, r.requested_at, r.completed_at,
        ru.name AS rider_name, ru.phone AS rider_phone,
        du.name AS driver_name, du.phone AS driver_phone,
        v.plate_number, v.vehicle_type,
        p.method AS payment_method, p.status AS payment_status
       FROM rides r
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN payments p ON p.ride_id = r.id
       ${where}
       ORDER BY r.requested_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const totalResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) FROM rides r ${status ? 'WHERE r.status = $1' : ''}`,
      status ? [status] : []
    );

    return {
      rides,
      pagination: {
        page, limit,
        total: Number(totalResult?.count || 0),
        totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
      },
    };
  }

  async toggleUserBlock(userId: string, blocked: boolean) {
    const user = await getOne<{ id: string; email: string | null }>(
      `SELECT id, email FROM users WHERE id = $1`, [userId]
    );
    if (!user) throw new NotFoundError('User');

    await query(
      `UPDATE drivers SET is_approved = $1 WHERE user_id = $2`,
      [!blocked, userId]
    );

    return { userId, blocked };
  }

  async getRevenueAnalytics(period: 'week' | 'month' | 'year' = 'month') {
    const intervalMap = {
      week:  `NOW() - INTERVAL '7 days'`,
      month: `NOW() - INTERVAL '30 days'`,
      year:  `NOW() - INTERVAL '365 days'`,
    };

    const groupMap = {
      week:  `DATE_TRUNC('day', completed_at)`,
      month: `DATE_TRUNC('day', completed_at)`,
      year:  `DATE_TRUNC('month', completed_at)`,
    };

    const labelFormat = {
      week:  `'YYYY-MM-DD'`,
      month: `'YYYY-MM-DD'`,
      year:  `'YYYY-MM'`,
    };

    const data = await getMany<{ period: string; revenue: string; rides: string }>(
      `SELECT
        TO_CHAR(${groupMap[period]}, ${labelFormat[period]}) AS period,
        COALESCE(SUM(r.final_fare), 0) AS revenue,
        COUNT(*) AS rides
       FROM rides r
       WHERE r.status = 'COMPLETED'
         AND r.completed_at >= ${intervalMap[period]}
       GROUP BY ${groupMap[period]}
       ORDER BY ${groupMap[period]} ASC`
    );

    const summary = await getOne<{
      total_revenue: string;
      total_rides: string;
      avg_fare: string;
      avg_distance: string;
    }>(
      `SELECT
        COALESCE(SUM(final_fare), 0)      AS total_revenue,
        COUNT(*)                           AS total_rides,
        ROUND(AVG(final_fare)::numeric, 2) AS avg_fare,
        ROUND(AVG(distance_km)::numeric, 2) AS avg_distance
       FROM rides
       WHERE status = 'COMPLETED'
         AND completed_at >= ${intervalMap[period]}`
    );

    return {
      chartData: data.map(d => ({
        period:  d.period,
        revenue: Number(d.revenue),
        rides:   Number(d.rides),
      })),
      summary: {
        totalRevenue: Number(summary?.total_revenue  || 0),
        totalRides:   Number(summary?.total_rides    || 0),
        avgFare:      Number(summary?.avg_fare       || 0),
        avgDistance:  Number(summary?.avg_distance   || 0),
      },
    };
  }
}