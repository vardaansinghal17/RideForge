import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getOne, query } from '../../db/query';
import {
  ConflictError,
  UnauthorizedError,
  AppError,
} from '../../config/errors';
import type { Role, AuthTokens } from '@RideForge/shared';

interface RegisterDto {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'RIDER' | 'DRIVER';
}

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  password_hash: string;
  role: Role;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await getOne(
      `SELECT id FROM users WHERE phone = $1`, [dto.phone]
    );
    if (existing) throw new ConflictError('Phone number already registered');

    if (dto.email) {
      const emailExists = await getOne(
        `SELECT id FROM users WHERE email = $1`, [dto.email]
      );
      if (emailExists) throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const userResult = await query<UserRow>(
      `INSERT INTO users (name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dto.name, dto.phone, dto.email || null, passwordHash, dto.role]
    );
    const user = userResult.rows[0];

    if (dto.role === 'RIDER') {
      await query(`INSERT INTO riders (user_id) VALUES ($1)`, [user.id]);
    } else {
      await query(`INSERT INTO drivers (user_id) VALUES ($1)`, [user.id]);
    }

    return this.signTokens(user);
  }

  async login(phone: string, password: string): Promise<AuthTokens> {
    const user = await getOne<UserRow>(
      `SELECT * FROM users WHERE phone = $1`, [phone]
    );
    if (!user) throw new UnauthorizedError('Invalid phone or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid phone or password');

    return this.signTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await getOne<{ user_id: string; expires_at: string }>(
      `SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1`,
      [refreshToken]
    );

    if (!stored) throw new UnauthorizedError('Invalid refresh token');
    if (new Date(stored.expires_at) < new Date()) {
      await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
      throw new UnauthorizedError('Refresh token expired, please log in again');
    }

    const user = await getOne<UserRow>(
      `SELECT * FROM users WHERE id = $1`, [stored.user_id]
    );
    if (!user) throw new UnauthorizedError('User not found');

    await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
    return this.signTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
  }

  async getMe(userId: string) {
    const user = await getOne<UserRow>(
      `SELECT id, name, email, phone, role, avatar_url, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!user) throw new AppError('User not found', 404);

    if ((user as any).role === 'RIDER') {
      const rider = await getOne(
        `SELECT id, rating, total_rides FROM riders WHERE user_id = $1`,
        [userId]
      );
      return { ...user, profile: rider };
    }

    if ((user as any).role === 'DRIVER') {
      const driver = await getOne(
        `SELECT d.id, d.rating, d.total_rides, d.earnings,
                d.is_approved, d.is_available,
                v.make, v.model, v.plate_number, v.vehicle_type, v.color
         FROM drivers d
         LEFT JOIN vehicles v ON v.driver_id = d.id
         WHERE d.user_id = $1`,
        [userId]
      );
      return { ...user, profile: driver };
    }

    return user;
  }

  private async signTokens(user: UserRow): Promise<AuthTokens> {
    const payload = { sub: user.id, role: user.role };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
  expiresIn: "15m",
});

    const refreshToken = crypto.randomBytes(64).toString('hex');

    await query(
      `INSERT INTO refresh_tokens (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [refreshToken, user.id]
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}