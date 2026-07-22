import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminHash = await bcrypt.hash('admin123', 12);
    const userHash  = await bcrypt.hash('password123', 12);

    
    const admin = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'ADMIN') ON CONFLICT (phone) DO NOTHING RETURNING id`,
      ['Admin User', 'admin@uber.com', '9999999999', adminHash]
    );

  
    const rider = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'RIDER') ON CONFLICT (phone) DO NOTHING RETURNING id`,
      ['Rahul Sharma', 'rahul@test.com', '9876543210', userHash]
    );
    if (rider.rows[0]) {
      await client.query(
        `INSERT INTO riders (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [rider.rows[0].id]
      );
    }
    const rider2 = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'RIDER') ON CONFLICT (phone) DO NOTHING RETURNING id`,
      ['Raj Sharma', 'raj@test.com', '9876543219', userHash]
    );
    if (rider.rows[0]) {
      await client.query(
        `INSERT INTO riders (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [rider.rows[0].id]
      );
    }

    
    const driver = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,'DRIVER') ON CONFLICT (phone) DO NOTHING RETURNING id`,
      ['Suresh Kumar', 'suresh@test.com', '9123456789', userHash]
    );
    if (driver.rows[0]) {
      const d = await client.query(
        `INSERT INTO drivers (user_id, is_approved, is_available, latitude, longitude)
         VALUES ($1, true, true, 28.6139, 77.2090) ON CONFLICT DO NOTHING RETURNING id`,
        [driver.rows[0].id]
      );
      if (d.rows[0]) {
        await client.query(
          `INSERT INTO vehicles (driver_id, make, model, plate_number, vehicle_type, color, year)
           VALUES ($1,'Maruti','Swift','DL01AB1234','SEDAN','White',2022) ON CONFLICT DO NOTHING`,
          [d.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    console.log(' Seed complete');
    console.log('   Rider  → phone: 9876543210  password: password123');
    console.log('   Driver → phone: 9123456789  password: password123');
    console.log('   Admin  → phone: 9999999999  password: admin123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();