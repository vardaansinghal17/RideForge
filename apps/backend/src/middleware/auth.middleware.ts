import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../config/errors';
import { Role } from '@uber-clone/shared';

export interface AuthRequest extends Request {
  user?: { id: string; role: Role };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('No token provided');

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role: Role;
    };

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}