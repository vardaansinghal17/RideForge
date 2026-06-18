import { body, param, query as queryValidator } from 'express-validator';

export const createRideValidator = [
  body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
  body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
  body('pickupAddress').trim().notEmpty().withMessage('Pickup address is required'),
  body('dropLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid drop latitude'),
  body('dropLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid drop longitude'),
  body('dropAddress').trim().notEmpty().withMessage('Drop address is required'),
  body('distanceKm').isFloat({ min: 0.1 }).withMessage('Invalid distance'),
  body('durationMin').isFloat({ min: 0.1 }).withMessage('Invalid duration'),
];

export const estimateFareValidator = [
  body('distanceKm').isFloat({ min: 0.1 }).withMessage('Invalid distance'),
  body('durationMin').isFloat({ min: 0.1 }).withMessage('Invalid duration'),
];

export const rideIdValidator = [
  param('rideId').notEmpty().withMessage('Ride ID is required'),
];

export const cancelRideValidator = [
  ...rideIdValidator,
  body('reason').optional().isString().isLength({ max: 200 }),
];

export const ratingValidator = [
  ...rideIdValidator,
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().isLength({ max: 500 }),
];

export const historyQueryValidator = [
  queryValidator('page').optional().isInt({ min: 1 }).toInt(),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];