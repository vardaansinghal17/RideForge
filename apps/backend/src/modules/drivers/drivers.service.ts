import { getOne, getMany, query } from '../../db/query';
import { AppError, NotFoundError, ConflictError } from '../../config/errors';
import type { RideStatus } from '@uber-clone/shared';

interface RegisterVehicleDto {
  make: string;
  model: string;
  plateNumber: string;
  vehicleType: 'SEDAN' | 'SUV' | 'AUTO';
  color: string;
  year: number;
}

export class DriversService {
  async getDriverProfile(userId: string) {
    const driver = await getOne<any>(
      `SELECT d.*, v.make, v.model, v.plate_number, v.vehicle_type, v.color, v.year
       FROM drivers d
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE d.user_id = $1`,
      [userId]
    );
    if (!driver) throw new NotFoundError('Driver profile');
    return driver;
  }

  async registerVehicle(userId: string, dto: RegisterVehicleDto) {
    const driver = await getOne<{ id: string }>(
      `SELECT id FROM drivers WHERE user_id = $1`, [userId]
    );
    if (!driver) throw new NotFoundError('Driver profile');

    const existingVehicle = await getOne(
      `SELECT id FROM vehicles WHERE driver_id = $1`, [driver.id]
    );
    if (existingVehicle) {
      throw new ConflictError('Vehicle already registered. Use update instead.');
    }

    const plateExists = await getOne(
      `SELECT id FROM vehicles WHERE plate_number = $1`, [dto.plateNumber]
    );
    if (plateExists) throw new ConflictError('Plate number already registered');

    const result = await query(
      `INSERT INTO vehicles (driver_id, make, model, plate_number, vehicle_type, color, year)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [driver.id, dto.make, dto.model, dto.plateNumber, dto.vehicleType, dto.color, dto.year]
    );

    return result.rows[0];
  }

  async updateVehicle(userId: string, dto: Partial<RegisterVehicleDto>) {
    const driver = await getOne<{ id: string }>(
      `SELECT id FROM drivers WHERE user_id = $1`, [userId]
    );
    if (!driver) throw new NotFoundError('Driver profile');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      make: 'make', model: 'model', plateNumber: 'plate_number',
      vehicleType: 'vehicle_type', color: 'color', year: 'year',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (dto[key as keyof RegisterVehicleDto] !== undefined) {
        fields.push(`${column} = $${idx}`);
        values.push(dto[key as keyof RegisterVehicleDto]);
        idx++;
      }
    }

    if (fields.length === 0) throw new AppError('No fields to update', 400);

    values.push(driver.id);
    const result = await query(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE driver_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) throw new NotFoundError('Vehicle');
    return result.rows[0];
  }

  async toggleAvailability(userId: string, isAvailable: boolean) {
    const driver = await getOne<{ id: string; is_approved: boolean }>(
      `SELECT id, is_approved FROM drivers WHERE user_id = $1`, [userId]
    );
    if (!driver) throw new NotFoundError('Driver profile');

    if (!driver.is_approved && isAvailable) {
      throw new AppError('Your account is pending admin approval', 403);
    }

    if (isAvailable) {
      const vehicle = await getOne(`SELECT id FROM vehicles WHERE driver_id = $1`, [driver.id]);
      if (!vehicle) throw new AppError('Please register your vehicle before going online', 400);
    }

    const result = await query(
      `UPDATE drivers SET is_available = $1 WHERE id = $2 RETURNING id, is_available`,
      [isAvailable, driver.id]
    );

    return result.rows[0];
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    const result = await query(
      `UPDATE drivers SET latitude = $1, longitude = $2
       WHERE user_id = $3 RETURNING id, latitude, longitude`,
      [lat, lng, userId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Driver profile');
    return result.rows[0];
  }

  async getActiveRideForDriver(userId: string) {
    return getOne<any>(
      `SELECT r.*, 
              ru.name AS rider_name, ru.phone AS rider_phone,
              ri.rating AS rider_rating
       FROM rides r
       JOIN drivers d ON d.id = r.driver_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       WHERE d.user_id = $1
         AND r.status IN ('ACCEPTED','ARRIVED','IN_PROGRESS')
       ORDER BY r.requested_at DESC
       LIMIT 1`,
      [userId]
    );
  }

  async getRideHistory(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const rides = await getMany<any>(
      `SELECT r.*, ru.name AS rider_name, p.status AS payment_status,
              p.amount AS payment_amount, rt.rider_rating
       FROM rides r
       JOIN drivers d ON d.id = r.driver_id
       JOIN riders ri ON ri.id = r.rider_id
       JOIN users ru ON ru.id = ri.user_id
       LEFT JOIN payments p ON p.ride_id = r.id
       LEFT JOIN ratings rt ON rt.ride_id = r.id
       WHERE d.user_id = $1
       ORDER BY r.requested_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await getOne<{ count: string }>(
      `SELECT COUNT(*) FROM rides r
       JOIN drivers d ON d.id = r.driver_id
       WHERE d.user_id = $1`,
      [userId]
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

  async getEarnings(userId: string, period: 'today' | 'week' | 'month' = 'today') {
    const driver = await getOne<{ id: string; earnings: number }>(
      `SELECT id, earnings FROM drivers WHERE user_id = $1`, [userId]
    );
    if (!driver) throw new NotFoundError('Driver profile');

    const intervalMap = {
      today: "DATE_TRUNC('day', NOW())",
      week:  "DATE_TRUNC('week', NOW())",
      month: "DATE_TRUNC('month', NOW())",
    };

    const stats = await getOne<{ ride_count: string; total_earned: string | null; total_distance: string | null }>(
      `SELECT
        COUNT(*) AS ride_count,
        COALESCE(SUM(r.final_fare), 0) AS total_earned,
        COALESCE(SUM(r.distance_km), 0) AS total_distance
       FROM rides r
       WHERE r.driver_id = $1
         AND r.status = 'COMPLETED'
         AND r.completed_at >= ${intervalMap[period]}`,
      [driver.id]
    );

    // Daily breakdown for the last 7 days (for chart)
    const dailyBreakdown = await getMany<{ day: string; earnings: string; rides: string }>(
      `SELECT
        TO_CHAR(DATE_TRUNC('day', completed_at), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(final_fare), 0) AS earnings,
        COUNT(*) AS rides
       FROM rides
       WHERE driver_id = $1 AND status = 'COMPLETED'
         AND completed_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE_TRUNC('day', completed_at)
       ORDER BY day ASC`,
      [driver.id]
    );

    return {
      totalEarnings: Number(driver.earnings),
      periodEarnings: Number(stats?.total_earned || 0),
      periodRides: Number(stats?.ride_count || 0),
      periodDistance: Number(stats?.total_distance || 0),
      dailyBreakdown: dailyBreakdown.map(d => ({
        day: d.day,
        earnings: Number(d.earnings),
        rides: Number(d.rides),
      })),
    };
  }
}