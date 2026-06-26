import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type {
  Ride, RideStatus,
  ClientToServerEvents, ServerToClientEvents,
} from '@RideForge/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface RideStore {
  socket: AppSocket | null;
  ride: Ride | null;
  driverInfo: any | null;
  driverLocation: { lat: number; lng: number } | null;
  isRequesting: boolean;
  errorMessage: string | null;

  connect: (token: string) => void;
  disconnect: () => void;
  requestRide: (data: {
    pickupLat: number; pickupLng: number; pickupAddress: string;
    dropLat: number; dropLng: number; dropAddress: string;
    distanceKm: number; durationMin: number;
  }) => void;
  cancelRide: () => void;
  reset: () => void;
}

export const useRideStore = create<RideStore>((set, get) => ({
  socket: null,
  ride: null,
  driverInfo: null,
  driverLocation: null,
  isRequesting: false,
  errorMessage: null,

  connect: (token) => {
    if (get().socket?.connected) return;

    const socket: AppSocket = io(
      (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace('/api', ''),
      { auth: { token } }
    );

    socket.on('connect', () => console.log('Connected to ride server'));

    socket.on('ride:created', (ride) => {
      set({ ride, isRequesting: true, errorMessage: null });
    });

    socket.on('ride:no_driver', () => {
      set({ isRequesting: false, ride: null, errorMessage: 'No drivers available nearby. Try again shortly.' });
    });

    socket.on('ride:accepted', ({ ride, driver }) => {
      set({ ride, driverInfo: driver, isRequesting: false });
    });

    socket.on('ride:already_taken', () => {
      // Relevant on driver side mostly, but kept for completeness
    });

    socket.on('ride:status_update', ({ status }) => {
      set((s) => ({ ride: s.ride ? { ...s.ride, status: status as RideStatus } : null }));
    });

    socket.on('driver:moved', ({ lat, lng }) => {
      set({ driverLocation: { lat, lng } });
    });

    socket.on('ride:cancelled', () => {
      set({ ride: null, driverInfo: null, driverLocation: null, isRequesting: false });
    });

    socket.on('error', ({ message }) => {
      set({ errorMessage: message, isRequesting: false });
    });

    set({ socket });
  },

  requestRide: (data) => {
    set({ isRequesting: true, errorMessage: null });
    get().socket?.emit('ride:request', data);
  },

  cancelRide: () => {
    const { socket, ride } = get();
    if (ride) socket?.emit('ride:cancel', { rideId: ride.id });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null });
  },

  reset: () => set({ ride: null, driverInfo: null, driverLocation: null, isRequesting: false, errorMessage: null }),
}));