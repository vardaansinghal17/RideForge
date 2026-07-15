import { Router, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { param, body, query as queryValidator } from 'express-validator';

const router = Router();
const adminService = new AdminService();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', async (_req, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

router.get(
  '/users',
  validate([
    queryValidator('page').optional().isInt({ min: 1 }).toInt(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('role').optional().isIn(['RIDER', 'DRIVER', 'ADMIN']),
    queryValidator('search').optional().isString(),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page   = Number(req.query.page)  || 1;
      const limit  = Number(req.query.limit) || 20;
      const role   = req.query.role   as string | undefined;
      const search = req.query.search as string | undefined;
      const result = await adminService.getUsers(page, limit, role, search);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.get(
  '/drivers',
  validate([
    queryValidator('page').optional().isInt({ min: 1 }).toInt(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('approved').optional().isBoolean().toBoolean(),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page     = Number(req.query.page)  || 1;
      const limit    = Number(req.query.limit) || 20;
      const approved = req.query.approved !== undefined
        ? req.query.approved === 'true'
        : undefined;
      const result = await adminService.getDrivers(page, limit, approved);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/drivers/:driverId/approve',
  validate([
    param('driverId').notEmpty(),
    body('isApproved').isBoolean().withMessage('isApproved must be boolean'),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.updateDriverApproval(
        req.params.driverId, req.body.isApproved
      );
      // Notify admin dashboard of driver approval change
      try {
        const { io } = await import('../../index');
        io.to('admin:live').emit('admin:driver_update', {
          driverUserId: result.user_id,
          isAvailable: result.is_available,
          isApproved: result.is_approved,
        });
        io.to('admin:live').emit('admin:stats_update');
      } catch (err) {
        // Safe catch if io is not initialized
      }
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.get(
  '/rides',
  validate([
    queryValidator('page').optional().isInt({ min: 1 }).toInt(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('status').optional().isIn([
      'REQUESTED','ACCEPTED','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED',
    ]),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page   = Number(req.query.page)  || 1;
      const limit  = Number(req.query.limit) || 20;
      const status = req.query.status as string | undefined;
      const result = await adminService.getRides(page, limit, status);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.get(
  '/analytics/revenue',
  validate([
    queryValidator('period').optional().isIn(['week', 'month', 'year']),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as 'week' | 'month' | 'year') || 'month';
      const result = await adminService.getRevenueAnalytics(period);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.patch(
  '/users/:userId/block',
  validate([
    param('userId').notEmpty(),
    body('blocked').isBoolean(),
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.toggleUserBlock(req.params.userId, req.body.blocked);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);
router.get(
  '/payments',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { PaymentsService } = await import('../payments/payments.service');
      const paymentsService = new PaymentsService();
      const page   = Number(req.query.page)  || 1;
      const limit  = Number(req.query.limit) || 20;
      const status = req.query.status as string | undefined;
      const result = await paymentsService.getAllPayments(page, limit, status);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

export { router as adminRouter };