import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import {
  registerValidator,
  loginValidator,
  refreshValidator,
} from './auth.validator';

const router = Router();
const authService = new AuthService();

router.post(
  '/register',
  validate(registerValidator),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.register(req.body);
      res.status(201).json({ success: true, data: tokens });
    } catch (err) { next(err); }
  }
);

router.post(
  '/login',
  validate(loginValidator),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.login(req.body.phone, req.body.password);
      res.json({ success: true, data: tokens });
    } catch (err) { next(err); }
  }
);

router.post(
  '/refresh',
  validate(refreshValidator),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err) { next(err); }
  }
);

router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (err) { next(err); }
  }
);

router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  }
);

export { router as authRouter };