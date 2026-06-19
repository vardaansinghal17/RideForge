import { Router, Response, NextFunction } from 'express';
import { RidesService } from './rides.service';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  estimateFareValidator,
  rideIdValidator,
  cancelRideValidator,
  ratingValidator,
  historyQueryValidator,
} from './rides.validators';

const router = Router();
const ridesService = new RidesService();

router.use(authenticate);

router.post(
  '/estimate-fare',
  validate(estimateFareValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { distanceKm, durationMin } = req.body;
      const estimate = await ridesService.estimateFare(distanceKm, durationMin);
      res.json({ success: true, data: estimate });
    } catch (err) { next(err); }
  }
);

router.get(
  '/active',
  requireRole('RIDER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const ride = await ridesService.getActiveRideForRider(req.user!.id);
      res.json({ success: true, data: ride });
    } catch (err) { next(err); }
  }
);

router.get(
  '/history',
  validate(historyQueryValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const history = await ridesService.getRideHistory(req.user!.id, page, limit);
      res.json({ success: true, data: history });
    } catch (err) { next(err); }
  }
);

router.get(
  '/:rideId',
  validate(rideIdValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const ride = await ridesService.getRideById(req.params.rideId, req.user!.id, req.user!.role);
      res.json({ success: true, data: ride });
    } catch (err) { next(err); }
  }
);

router.post(
  '/:rideId/cancel',
  validate(cancelRideValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const ride = await ridesService.cancelRide(
        req.params.rideId, req.user!.id, req.user!.role, req.body.reason
      );
      res.json({ success: true, data: ride });
    } catch (err) { next(err); }
  }
);

router.post(
  '/:rideId/rate',
  validate(ratingValidator),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await ridesService.submitRating(
        req.params.rideId, req.user!.id, req.user!.role,
        req.body.rating, req.body.comment
      );
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

export { router as ridesRouter };