import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';


export interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: 'RIDER' | 'DRIVER' | 'ADMIN'; }

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token missing'));

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role: 'RIDER' | 'DRIVER' | 'ADMIN';
    };

    (socket  as AuthenticatedSocket).userId = payload.sub;
    (socket  as AuthenticatedSocket).userRole = payload.role;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}