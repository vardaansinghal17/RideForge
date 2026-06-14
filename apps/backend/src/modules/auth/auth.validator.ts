import { body } from 'express-validator';

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['RIDER', 'DRIVER']).withMessage('Role must be RIDER or DRIVER'),
  body('email')
    .optional()
    .isEmail().withMessage('Enter a valid email'),
];

export const loginValidator = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];