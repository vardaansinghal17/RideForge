export type Role = 'RIDER' | 'DRIVER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'created_at'>;
}


export interface Driver {
  id: string;
  user_id: string;
  is_approved: boolean;
  is_available: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  plate_number: string;
  vehicle_type: 'SEDAN' | 'SUV' | 'AUTO';
  color: string;
}


export type RideStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Ride {
  id: string;
  rider_id: string;
  driver_id: string | null;
  status: RideStatus;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  estimated_fare: number;
  final_fare: number | null;
  distance_km: number;
  duration_min: number;
  requested_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}


export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';

export interface Payment {
  id: string;
  ride_id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  created_at: string;
}


export interface Rating {
  id: string;
  ride_id: string;
  rider_rating: number | null;
  driver_rating: number | null;
  comment: string | null;
  created_at: string;
}


export interface ServerToClientEvents {
  'ride:created': (ride: Ride) => void;
  'ride:accepted': (payload: { ride: Ride; driver: Driver & { user: User; vehicle: Vehicle } }) => void;
  'ride:no_driver': () => void;
  'ride:status_update': (payload: { rideId: string; status: RideStatus }) => void;
  'ride:cancelled': (payload: { rideId: string }) => void;
  'ride:incoming': (ride: Ride & { rider: { name: string; phone: string; rating: number } }) => void;
  'ride:already_taken': () => void;
  'driver:moved': (payload: { lat: number; lng: number }) => void;
  'error': (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  'ride:request': (data: {
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropLat: number;
    dropLng: number;
    dropAddress: string;
    distanceKm: number;
    durationMin: number;
  }) => void;
  'ride:accept': (data: { rideId: string }) => void;
  'ride:reject': (data: { rideId: string }) => void;
  'ride:status': (data: { rideId: string; status: RideStatus }) => void;
  'ride:cancel': (data: { rideId: string }) => void;
  'driver:location': (data: { lat: number; lng: number; rideId?: string }) => void;
}