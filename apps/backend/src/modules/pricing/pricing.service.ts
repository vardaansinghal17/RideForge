import { getOne } from '../../db/query';

interface FareResult {
  fare: number;
  surgeMultiplier: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeFare: number;
    total: number;
  };
  estimatedArrival: number;
}

export class PricingService {
  private readonly CONFIG = {
    SEDAN: { base: 30, perKm: 12, perMin: 1.5, minFare: 50 },
    SUV:   { base: 50, perKm: 18, perMin: 2.0, minFare: 80 },
    AUTO:  { base: 20, perKm:  8, perMin: 1.0, minFare: 30 },
  };

  async calculateFare(
    distanceKm: number,
    durationMin: number,
    vehicleType: 'SEDAN' | 'SUV' | 'AUTO' = 'SEDAN'
  ): Promise<FareResult> {
    const config = this.CONFIG[vehicleType];
    const surgeMultiplier = await this.getSurgeMultiplier();

    const baseFare     = config.base;
    const distanceFare = distanceKm * config.perKm;
    const timeFare     = durationMin * config.perMin;
    const subtotal     = baseFare + distanceFare + timeFare;
    const surgeFare    = subtotal * (surgeMultiplier - 1);
    const total        = Math.max(
      Math.ceil((subtotal + surgeFare) * 100) / 100,
      config.minFare
    );

    return {
      fare: total,
      surgeMultiplier,
      breakdown: {
        baseFare,
        distanceFare: Math.round(distanceFare * 100) / 100,
        timeFare:     Math.round(timeFare * 100) / 100,
        surgeFare:    Math.round(surgeFare * 100) / 100,
        total,
      },
      estimatedArrival: Math.ceil(durationMin),
    };
  }

  private async getSurgeMultiplier(): Promise<number> {
    const stats = await getOne<{ requests: string; drivers: string }>(
      `SELECT
        (SELECT COUNT(*) FROM rides
         WHERE status = 'REQUESTED'
           AND requested_at >= NOW() - INTERVAL '5 minutes'
        ) AS requests,
        (SELECT COUNT(*) FROM drivers
         WHERE is_available = true AND is_approved = true
        ) AS drivers`
    );

    const requests = Number(stats?.requests || 0);
    const drivers  = Number(stats?.drivers  || 1);
    const ratio    = requests / Math.max(drivers, 1);

    if (ratio >= 4) return 2.0;
    if (ratio >= 3) return 1.8;
    if (ratio >= 2) return 1.5;
    if (ratio >= 1.5) return 1.2;
    return 1.0;
  }
}