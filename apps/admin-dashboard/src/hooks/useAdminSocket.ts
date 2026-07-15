import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

export function useAdminSocket() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    // Use default or configured backend URL
    const socketUrl = 'http://localhost:4000';
    console.log('[AdminSocket] Connecting to:', socketUrl);

    const socket: Socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[AdminSocket] Connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('[AdminSocket] Connection error:', error);
    });

    socket.on('admin:ride_update', (payload) => {
      console.log('[AdminSocket] admin:ride_update received:', payload);
      // Invalidate rides page query, dashboard stats, payments, analytics
      queryClient.invalidateQueries({ queryKey: ['rides'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    socket.on('admin:driver_update', (payload) => {
      console.log('[AdminSocket] admin:driver_update received:', payload);
      // Invalidate drivers list, dashboard stats
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    socket.on('admin:stats_update', () => {
      console.log('[AdminSocket] admin:stats_update received');
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    });

    socket.on('disconnect', (reason) => {
      console.log('[AdminSocket] Disconnected:', reason);
    });

    return () => {
      console.log('[AdminSocket] Cleaning up socket connection...');
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
