import { pool } from './pool';

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('RIDER', 'DRIVER', 'ADMIN');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE ride_status AS ENUM (
          'REQUESTED', 'ACCEPTED', 'ARRIVED',
          'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM (
          'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'UPI');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE vehicle_type AS ENUM ('SEDAN', 'SUV', 'AUTO');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name          TEXT NOT NULL,
        email         TEXT UNIQUE,
        phone         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          user_role NOT NULL,
        avatar_url    TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        token      TEXT NOT NULL UNIQUE,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS riders (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        rating     NUMERIC(3,2) NOT NULL DEFAULT 5.00,
        total_rides INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        is_approved  BOOLEAN NOT NULL DEFAULT FALSE,
        is_available BOOLEAN NOT NULL DEFAULT FALSE,
        latitude     NUMERIC(10,7),
        longitude    NUMERIC(10,7),
        rating       NUMERIC(3,2) NOT NULL DEFAULT 5.00,
        total_rides  INTEGER NOT NULL DEFAULT 0,
        earnings     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id    TEXT NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
        make         TEXT NOT NULL,
        model        TEXT NOT NULL,
        plate_number TEXT NOT NULL UNIQUE,
        vehicle_type vehicle_type NOT NULL DEFAULT 'SEDAN',
        color        TEXT NOT NULL,
        year         INTEGER NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        rider_id        TEXT NOT NULL REFERENCES riders(id),
        driver_id       TEXT REFERENCES drivers(id),
        status          ride_status NOT NULL DEFAULT 'REQUESTED',
        pickup_lat      NUMERIC(10,7) NOT NULL,
        pickup_lng      NUMERIC(10,7) NOT NULL,
        pickup_address  TEXT NOT NULL,
        drop_lat        NUMERIC(10,7) NOT NULL,
        drop_lng        NUMERIC(10,7) NOT NULL,
        drop_address    TEXT NOT NULL,
        estimated_fare  NUMERIC(8,2) NOT NULL,
        final_fare      NUMERIC(8,2),
        distance_km     NUMERIC(8,3) NOT NULL,
        duration_min    NUMERIC(8,2) NOT NULL,
        surge_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
        requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        accepted_at     TIMESTAMPTZ,
        arrived_at      TIMESTAMPTZ,
        started_at      TIMESTAMPTZ,
        completed_at    TIMESTAMPTZ,
        cancelled_at    TIMESTAMPTZ,
        cancel_reason   TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id    TEXT NOT NULL UNIQUE REFERENCES rides(id),
        amount     NUMERIC(8,2) NOT NULL,
        status     payment_status NOT NULL DEFAULT 'PENDING',
        method     payment_method NOT NULL DEFAULT 'CASH',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id       TEXT NOT NULL UNIQUE REFERENCES rides(id),
        rider_rating  NUMERIC(2,1),
        driver_rating NUMERIC(2,1),
        comment       TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_rides_rider_id    ON rides(rider_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rides_driver_id   ON rides(driver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rides_status      ON rides(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available, is_approved);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens    ON refresh_tokens(token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rides_requested   ON rides(requested_at DESC);`);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const table of ['users', 'drivers', 'payments']) {
      await client.query(`
        DROP TRIGGER IF EXISTS set_updated_at ON ${table};
        CREATE TRIGGER set_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `);
    }

    await client.query('COMMIT');
    console.log(' Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();