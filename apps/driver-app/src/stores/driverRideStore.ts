import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type {
  Ride, RideStatus,
  ClientToServerEvents, ServerToClientEvents,
} from '@RideForge/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface IncomingRide extends Ride {
    rider: {
        name: string;
        phone: string;
        rating: number;
    };
}

interface DriverRideStore {
  socket: AppSocket | null;
  incomingRide: IncomingRide | null;
  activeRide: Ride | null;
  offerSecondsLeft: number;
  errorMessage: string | null;

  connect: (token: string) => void;
  disconnect: () => void;
  acceptRide: (rideId: string) => void;
  rejectRide: (rideId: string) => void;
  updateStatus: (rideId: string, status: RideStatus) => void;
  sendLocation: (lat: number, lng: number, rideId?: string) => void;
}

let offerCountdownInterval: ReturnType<typeof setInterval> | null = null;

export const useDriverRideStore = create<DriverRideStore>((set, get) => ({
  socket: null,
  incomingRide: null,
  activeRide: null,
  offerSecondsLeft: 15,
  errorMessage: null,

  connect: (token) => {
    if (get().socket?.connected) return;

    const socket: AppSocket = io(
      (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace('/api', ''),
      { auth: { token } }
    );

    socket.on('ride:incoming', (ride) => {
      set({ incomingRide: ride as IncomingRide, offerSecondsLeft: 15 });

      if (offerCountdownInterval) clearInterval(offerCountdownInterval);
      offerCountdownInterval = setInterval(() => {
        const left = get().offerSecondsLeft - 1;
        if (left <= 0) {
          clearInterval(offerCountdownInterval!);
          set({ incomingRide: null, offerSecondsLeft: 15 });
        } else {
          set({ offerSecondsLeft: left });
        }
      }, 1000);
    });

    socket.on('ride:already_taken', () => {
      if (offerCountdownInterval) clearInterval(offerCountdownInterval);
      set({ incomingRide: null });
    });

    socket.on('ride:accepted', ({ ride }) => {
      if (offerCountdownInterval) clearInterval(offerCountdownInterval);
      set({ activeRide: ride, incomingRide: null });
    });

    socket.on('ride:status_update', ({ status }) => {
      set((s) => ({ activeRide: s.activeRide ? { ...s.activeRide, status: status as RideStatus } : null }));
    });

    socket.on('ride:cancelled', () => {
      set({ activeRide: null, incomingRide: null });
    });

    socket.on('error', ({ message }) => set({ errorMessage: message }));

    set({ socket });
  },

  acceptRide: (rideId) => {
    get().socket?.emit('ride:accept', { rideId });
  },

  rejectRide: (rideId) => {
    get().socket?.emit('ride:reject', { rideId });
    set({ incomingRide: null });
  },

  updateStatus: (rideId, status) => {
    get().socket?.emit('ride:status', { rideId, status });
    if (status === 'COMPLETED') set({ activeRide: null });
  },

  sendLocation: (lat, lng, rideId) => {
    get().socket?.emit('driver:location', { lat, lng, rideId });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null });
  },
}));