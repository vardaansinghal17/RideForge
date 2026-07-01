import { io } from 'socket.io-client';

// Replace with real tokens from /api/auth/login
const RIDER_TOKEN  = 'PASTE_RIDER_ACCESS_TOKEN';
const DRIVER_TOKEN = 'PASTE_DRIVER_ACCESS_TOKEN';

const rider  = io('http://localhost:4000', { auth: { token: RIDER_TOKEN } });
const driver = io('http://localhost:4000', { auth: { token: DRIVER_TOKEN } });

driver.on('connect', () => console.log('Driver connected'));
driver.on('ride:incoming', (ride) => {
  console.log('Driver received offer:', ride.id);
  setTimeout(() => driver.emit('ride:accept', { rideId: ride.id }), 1000);
});

rider.on('connect', () => {
  console.log('Rider connected — requesting ride in 1s');
  setTimeout(() => {
    rider.emit('ride:request', {
      pickupLat: 28.6139, pickupLng: 77.2090, pickupAddress: 'Connaught Place',
      dropLat: 28.6129, dropLng: 77.2295, dropAddress: 'India Gate',
      distanceKm: 2.3, durationMin: 8,
    });
  }, 1000);
});

rider.on('ride:created', (r) => console.log('Ride created:', r.id, r.status));
rider.on('ride:accepted', (p) => console.log('Ride accepted! Driver:', p.driver.driver_name));
rider.on('ride:no_driver', () => console.log('No driver found'));