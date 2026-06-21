import { body, query as queryValidator } from 'express-validator';

export const registerVehicleValidator = [
  body('make').trim().notEmpty().withMessage('Vehicle make is required'),
  body('model').trim().notEmpty().withMessage('Vehicle model is required'),
  body('plateNumber')
    .trim()
    .notEmpty().withMessage('Plate number is required')
    .matches(/^[A-Z0-9]{4,12}$/i).withMessage('Invalid plate number format'),
  body('vehicleType').isIn(['SEDAN', 'SUV', 'AUTO']).withMessage('Invalid vehicle type'),
  body('color').trim().notEmpty().withMessage('Vehicle color is required'),
  body('year')
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('Invalid manufacturing year'),
];

export const updateVehicleValidator = [
  body('make').optional().trim().notEmpty(),
  body('model').optional().trim().notEmpty(),
  body('plateNumber').optional().trim().matches(/^[A-Z0-9]{4,12}$/i),
  body('vehicleType').optional().isIn(['SEDAN', 'SUV', 'AUTO']),
  body('color').optional().trim().notEmpty(),
  body('year').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
];

export const toggleAvailabilityValidator = [
  body('isAvailable').isBoolean().withMessage('isAvailable must be true or false'),
];

export const updateLocationValidator = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

export const earningsQueryValidator = [
  queryValidator('period').optional().isIn(['today', 'week', 'month']),
];

export const historyQueryValidator = [
  queryValidator('page').optional().isInt({ min: 1 }).toInt(),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];