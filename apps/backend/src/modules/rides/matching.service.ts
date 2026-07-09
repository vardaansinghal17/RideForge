import { getMany, query } from '../../db/query';
import { haversineDistance } from './haversine';
import { logger } from '../../config/logger';

interface NearbyDriver {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  rating: number;
  distance_km: number;
  vehicle_type: string;
  make: string;
  model: string;
  plate_number: string;
  color: string;
  driver_name: string;
}

interface MatchResult {
  driver: NearbyDriver;
  distanceKm: number;
  etaMinutes: number;
}
interface RideCompletionRow {
  id: string;
  driver_id: string;
  rider_id: string;
  estimated_fare: number;
}

export class MatchingService {
  private readonly SEARCH_RADIUS_KM = 5;
  private readonly DRIVER_ACCEPT_TIMEOUT_MS = 15000; // 15 seconds

  async findNearbyDrivers(
    pickupLat: number,
    pickupLng: number,
    radiusKm = this.SEARCH_RADIUS_KM
  ): Promise<NearbyDriver[]> {
    const drivers = await getMany<{
      id: string;
      user_id: string;
      latitude: string;
      longitude: string;
      rating: string;
      vehicle_type: string;
      make: string;
      model: string;
      plate_number: string;
      color: string;
      driver_name: string;
    }>(
      `SELECT
        d.id, d.user_id,
        d.latitude, d.longitude, d.rating,
        v.vehicle_type, v.make, v.model, v.plate_number, v.color,
        u.name AS driver_name
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       WHERE d.is_available = true
         AND d.is_approved  = true
         AND d.latitude     IS NOT NULL
         AND d.longitude    IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM rides r
           WHERE r.driver_id = d.id
             AND r.status IN ('ACCEPTED','ARRIVED','IN_PROGRESS')
         )`
    );

    const nearby = drivers
      .map(d => ({
        ...d,
        latitude:     Number(d.latitude),
        longitude:    Number(d.longitude),
        rating:       Number(d.rating),
        distance_km:  haversineDistance(
          pickupLat, pickupLng,
          Number(d.latitude), Number(d.longitude)
        ),
      }))
      .filter(d => d.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);

    return nearby;
  }

  async findNearestDriver(
    pickupLat: number,
    pickupLng: number
  ): Promise<MatchResult | null> {
    const nearby = await this.findNearbyDrivers(pickupLat, pickupLng);

    if (nearby.length === 0) {
      logger.info('No drivers available near pickup', { pickupLat, pickupLng });
      return null;
    }

    const best = nearby[0];
    const etaMinutes = Math.ceil((best.distance_km / 30) * 60);

    logger.info(`Matched driver ${best.id} at ${best.distance_km.toFixed(2)}km`);

    return { driver: best, distanceKm: best.distance_km, etaMinutes };
  }

  async acceptRide(rideId: string, driverId: string): Promise<boolean> {
    const result = await query(
      `UPDATE rides
       SET status = 'ACCEPTED', driver_id = $1, accepted_at = NOW()
       WHERE id = $2 AND status = 'REQUESTED'`,
      [driverId, rideId]
    );

    return result.rowCount === 1;
  }

  async updateRideStatus(
    rideId: string,
    driverId: string,
    newStatus: 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
  ) {
    const timeColumns: Record<string, string> = {
      ARRIVED:     'arrived_at   = NOW()',
      IN_PROGRESS: 'started_at   = NOW()',
      COMPLETED:   'completed_at = NOW()',
    };

    const extraUpdates = timeColumns[newStatus];

    const result = await query<RideCompletionRow>(
      `UPDATE rides
       SET status = $1, ${extraUpdates}
       WHERE id = $2 AND driver_id = $3
       RETURNING *`,
      [newStatus, rideId, driverId]
    );

    if (result.rows.length === 0) return null;
    const ride = result.rows[0];

    if (newStatus === 'COMPLETED') {
      await this.handleRideCompletion(ride);
    }

    return ride;
  }

  private async handleRideCompletion(ride: {
    id: string;
    driver_id: string;
    rider_id: string;
    estimated_fare: number;
  }) {
    await query(
      `UPDATE rides SET final_fare = estimated_fare WHERE id = $1`,
      [ride.id]
    );

    await query(
      `INSERT INTO payments (ride_id, amount, status, method)
       VALUES ($1, $2, 'COMPLETED', 'CASH')
       ON CONFLICT (ride_id) DO NOTHING`,
      [ride.id, ride.estimated_fare]
    );

    await query(
      `UPDATE drivers SET total_rides = total_rides + 1,
              earnings = earnings + $1
       WHERE id = $2`,
      [ride.estimated_fare, ride.driver_id]
    );

    await query(
      `UPDATE riders SET total_rides = total_rides + 1 WHERE id = $1`,
      [ride.rider_id]
    );
  }

  buildCandidateQueue(drivers: NearbyDriver[]): string[] {
    return drivers.map(d => d.user_id);
  }
}