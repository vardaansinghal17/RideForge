import { Request, Response, NextFunction } from 'express';
import { AppError } from '../config/errors';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  logger.error('Unhandled error', { err: err.message, stack: err.stack, path: req.path });

  res.status(500).json({
    success: false,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' },
  });
}