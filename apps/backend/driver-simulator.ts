import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';
const DRIVER_PHONE = '9123456789';
const DRIVER_PASSWORD = 'password123';

async function run() {
  console.log('🏁 Starting Driver Simulator...');

  // 1. Login as driver
  let token: string;
  try {
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      phone: DRIVER_PHONE,
      password: DRIVER_PASSWORD,
    });
    token = loginRes.data.data.accessToken;
    console.log('🔑 Logged in successfully. Token acquired.');
  } catch (error: any) {
    console.error('❌ Failed to log in as driver:', error.message);
    process.exit(1);
  }

  // 2. Connect to Socket.io
  const socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ Driver socket connected to backend.');
    // Make driver available and active in DB
    console.log('📡 Listening for incoming ride requests...');
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });

  socket.on('ride:incoming', async (ride: any) => {
    console.log(`📢 Incoming ride request! Ride ID: ${ride.id}`);
    console.log(`📍 Pickup: ${ride.pickup_address}`);
    console.log(`🏁 Destination: ${ride.drop_address}`);

    // Wait 2 seconds before accepting
    setTimeout(() => {
      console.log('👉 Accepting ride...');
      socket.emit('ride:accept', { rideId: ride.id });
    }, 2000);
  });

  socket.on('ride:accepted', (payload: any) => {
    const rideId = payload.ride.id;
    console.log(`🎉 Ride accepted successfully. Starting lifecycle for Ride: ${rideId}`);

    // Cycle through: ARRIVED -> IN_PROGRESS -> COMPLETED
    setTimeout(() => {
      console.log('🚗 Arrived at pickup...');
      socket.emit('ride:status', { rideId, status: 'ARRIVED' });

      setTimeout(() => {
        console.log('🛫 Trip started (In Progress)...');
        socket.emit('ride:status', { rideId, status: 'IN_PROGRESS' });

        // Update driver location periodically to simulate movement
        let ticks = 0;
        const interval = setInterval(() => {
          if (ticks >= 3) {
            clearInterval(interval);
            console.log('🏁 Trip completed!');
            socket.emit('ride:status', { rideId, status: 'COMPLETED' });
          } else {
            ticks++;
            const lat = 28.6139 + ticks * 0.005;
            const lng = 77.2090 + ticks * 0.005;
            console.log(`📍 Driver moved to lat: ${lat}, lng: ${lng}`);
            socket.emit('driver:location', { lat, lng, rideId });
          }
        }, 1500);

      }, 4000);
    }, 4000);
  });

  socket.on('ride:cancelled', () => {
    console.log('❌ Ride was cancelled by the rider.');
  });

  socket.on('error', (err) => {
    console.error('❌ Socket error:', err);
  });
}

run();
