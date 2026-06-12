import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from '../config/errors';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      await validation.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array().map(e => e.msg).join(', ');
      return next(new AppError(message, 422, 'VALIDATION_ERROR'));
    }
    next();
  };
}