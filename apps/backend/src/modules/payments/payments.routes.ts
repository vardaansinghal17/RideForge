import { Router, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { body, param, query as queryValidator } from 'express-validator';

const router = Router();
const paymentsService = new PaymentsService();

router.use(authenticate);

router.get(
  '/history',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 10;
      const history = await paymentsService.getPaymentHistory(req.user!.id, page, limit);
      res.json({ success: true, data: history });
    } catch (err) { next(err); }
  }
);

router.get(
  '/ride/:rideId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const payment = await paymentsService.getPaymentByRide(req.params.rideId, req.user!.id);
      res.json({ success: true, data: payment });
    } catch (err) { next(err); }
  }
);

router.get(
  '/ride/:rideId/invoice',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const invoice = await paymentsService.generateInvoice(req.params.rideId, req.user!.id);
      res.json({ success: true, data: invoice });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/ride/:rideId/method',
  validate([
    param('rideId').notEmpty(),
    body('method').isIn(['CASH', 'CARD', 'UPI']).withMessage('Invalid payment method'),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const payment = await paymentsService.updatePaymentMethod(
        req.params.rideId, req.user!.id, req.body.method
      );
      res.json({ success: true, data: payment });
    } catch (err) { next(err); }
  }
);

router.get(
  '/',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page   = Number(req.query.page)   || 1;
      const limit  = Number(req.query.limit)  || 20;
      const status = req.query.status as string | undefined;
      const result = await paymentsService.getAllPayments(page, limit, status);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

export { router as paymentsRouter };