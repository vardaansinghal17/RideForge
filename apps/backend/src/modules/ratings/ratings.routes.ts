import { Router, Response, NextFunction } from 'express';
import { RatingsService } from './ratings.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { body, param } from 'express-validator';

const router = Router();
const ratingsService = new RatingsService();

router.use(authenticate);

// POST /api/ratings
router.post(
  '/',
  validate([
    body('rideId').notEmpty().withMessage('Ride ID is required'),
    body('rating')
      .isFloat({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().isLength({ max: 500 }),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await ratingsService.submitRating({
        rideId:   req.body.rideId,
        userId:   req.user!.id,
        userRole: req.user!.role as 'RIDER' | 'DRIVER',
        rating:   req.body.rating,
        comment:  req.body.comment,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// GET /api/ratings/ride/:rideId
router.get(
  '/ride/:rideId',
  validate([param('rideId').notEmpty()]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rating = await ratingsService.getRatingByRide(req.params.rideId);
      res.json({ success: true, data: rating });
    } catch (err) { next(err); }
  }
);

// GET /api/ratings/my-ratings — driver's received ratings
router.get(
  '/my-ratings',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await ratingsService.getDriverRatings(req.user!.id, page, limit);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

export { router as ratingsRouter };