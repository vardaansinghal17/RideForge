import { Router, Response, NextFunction } from 'express';
import { DriversService } from './drivers.service';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  registerVehicleValidator,
  updateVehicleValidator,
  toggleAvailabilityValidator,
  updateLocationValidator,
  earningsQueryValidator,
  historyQueryValidator,
} from './drivers.validators';

const router = Router();
const driversService = new DriversService();

router.use(authenticate, requireRole('DRIVER'));

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await driversService.getDriverProfile(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

router.post(
  '/vehicle',
  validate(registerVehicleValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vehicle = await driversService.registerVehicle(req.user!.id, req.body);
      res.status(201).json({ success: true, data: vehicle });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/vehicle',
  validate(updateVehicleValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const vehicle = await driversService.updateVehicle(req.user!.id, req.body);
      res.json({ success: true, data: vehicle });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/availability',
  validate(toggleAvailabilityValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await driversService.toggleAvailability(req.user!.id, req.body.isAvailable);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/location',
  validate(updateLocationValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await driversService.updateLocation(req.user!.id, req.body.lat, req.body.lng);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.get('/active-ride', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ride = await driversService.getActiveRideForDriver(req.user!.id);
    res.json({ success: true, data: ride });
  } catch (err) { next(err); }
});

router.get(
  '/history',
  validate(historyQueryValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const history = await driversService.getRideHistory(req.user!.id, page, limit);
      res.json({ success: true, data: history });
    } catch (err) { next(err); }
  }
);

router.get(
  '/earnings',
  validate(earningsQueryValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as 'today' | 'week' | 'month') || 'today';
      const earnings = await driversService.getEarnings(req.user!.id, period);
      res.json({ success: true, data: earnings });
    } catch (err) { next(err); }
  }
);

export { router as driversRouter };