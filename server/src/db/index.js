const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../config/logger');

let pool = null;
let isMockDb = true;

// In-memory mock database state for testing or standalone execution without running Postgres daemon
const mockDb = {
  users: [],
  diagnostic_centres: [],
  diagnostic_tests: [],
  centre_test_offers: [],
  bookings: [],
  payments: [],
  webhook_events: [],
  autoInc: {
    users: 1,
    diagnostic_centres: 1,
    diagnostic_tests: 1,
    centre_test_offers: 1,
    bookings: 1,
    payments: 1,
    webhook_events: 1
  }
};

function resetMockDb() {
  isMockDb = true;
  mockDb.users = [];
  mockDb.diagnostic_centres = [];
  mockDb.diagnostic_tests = [];
  mockDb.centre_test_offers = [];
  mockDb.bookings = [];
  mockDb.payments = [];
  mockDb.webhook_events = [];
  mockDb.autoInc = {
    users: 1,
    diagnostic_centres: 1,
    diagnostic_tests: 1,
    centre_test_offers: 1,
    bookings: 1,
    payments: 1,
    webhook_events: 1
  };
}

async function initDb() {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_mock') {
    isMockDb = true;
    logger.info('Using In-Memory Database store for tests.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 10000,
      max: 20
    });

    const client = await pool.connect();
    logger.info('Connected to PostgreSQL database successfully.');

    // Execute schema migrations
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);
    logger.info('Database schema initialized.');
    client.release();
    isMockDb = false;
  } catch (err) {
    logger.warn(`Could not connect to PostgreSQL (${err.message}). Using In-Memory Database fallback.`);
    isMockDb = true;
    if (pool) {
      try {
        await pool.end();
      } catch (e) {}
      pool = null;
    }
  }
}

async function query(text, params = []) {
  if (!isMockDb && pool) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      // If pool disconnects, handle gracefully
      throw err;
    }
  }

  // Handle Mock DB operations for standard queries
  return executeMockQuery(text, params);
}

function executeMockQuery(text, params) {
  const sql = text.trim();
  const lower = sql.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    let rows = [];

    if (lower.includes('from users')) {
      rows = [...mockDb.users];
      if (lower.includes('where email =') || lower.includes('where lower(email) =')) {
        const email = String(params[0]).toLowerCase();
        rows = rows.filter(u => u.email.toLowerCase() === email);
      } else if (lower.includes('where id =')) {
        const id = parseInt(params[0]);
        rows = rows.filter(u => u.id === id);
      }
    } else if (lower.includes('from diagnostic_centres')) {
      rows = [...mockDb.diagnostic_centres];
      if (lower.includes('where id =')) {
        const id = parseInt(params[0]);
        rows = rows.filter(c => c.id === id);
      } else {
        rows = rows.filter(c => c.is_active !== false);
        if (params[0]) {
          // City filter
          const city = String(params[0]).toLowerCase();
          rows = rows.filter(c => c.city.toLowerCase().includes(city));
        }
      }
    } else if (lower.includes('from diagnostic_tests')) {
      rows = [...mockDb.diagnostic_tests];
      if (lower.includes('where id =')) {
        const id = parseInt(params[0]);
        rows = rows.filter(t => t.id === id);
      } else if (lower.includes('where code =') || lower.includes('where upper(code) =')) {
        const code = String(params[0]).toUpperCase();
        rows = rows.filter(t => t.code.toUpperCase() === code);
      } else {
        rows = rows.filter(t => t.is_active !== false);
        if (params[0]) {
          const cat = String(params[0]).toLowerCase();
          rows = rows.filter(t => t.category.toLowerCase().includes(cat));
        }
      }
    } else if (lower.includes('from centre_test_offers')) {
      rows = [...mockDb.centre_test_offers];
      if (lower.includes('centre_id =') && lower.includes('test_id =')) {
        const centreId = parseInt(params[0]);
        const testId = parseInt(params[1]);
        rows = rows.filter(o => o.centre_id === centreId && o.test_id === testId);
      } else if (lower.includes('centre_id =')) {
        const centreId = parseInt(params[0]);
        rows = rows.filter(o => o.centre_id === centreId && o.is_available !== false);
      }
    } else if (lower.includes('from bookings')) {
      rows = [...mockDb.bookings];
      if (lower.includes('where id =') || lower.includes('where b.id =')) {
        const id = parseInt(params[0]);
        rows = rows.filter(b => b.id === id);
      } else if (lower.includes('where user_id =') || lower.includes('where b.user_id =')) {
        const userId = parseInt(params[0]);
        rows = rows.filter(b => b.user_id === userId);
      }
    } else if (lower.includes('from payments')) {
      rows = [...mockDb.payments];
      if (lower.includes('where id =')) {
        const id = parseInt(params[0]);
        rows = rows.filter(p => p.id === id);
      } else if (lower.includes('where booking_id =')) {
        const bookingId = parseInt(params[0]);
        rows = rows.filter(p => p.booking_id === bookingId);
      }
    } else if (lower.includes('from webhook_events')) {
      rows = [...mockDb.webhook_events];
      if (lower.includes('where event_id =')) {
        const eventId = String(params[0]);
        rows = rows.filter(e => e.event_id === eventId);
      }
    }

    return { rows, rowCount: rows.length };
  }

  // 2. INSERT queries
  if (lower.startsWith('insert into users')) {
    const existing = mockDb.users.find(u => u.email.toLowerCase() === String(params[0]).toLowerCase());
    if (existing) {
      const err = new Error('duplicate key value violates unique constraint "users_email_key"');
      err.code = '23505';
      throw err;
    }
    
    let phoneNumber = null;
    let role = 'patient';
    let isActive = true;

    // Check if 6 params (email, password, full_name, phone_number, role, is_active)
    // or 5 params (email, password, full_name, role, is_active)
    if (params.length === 6) {
      phoneNumber = params[3];
      role = params[4] || 'patient';
      isActive = params[5] !== undefined ? params[5] : true;
    } else if (params.length === 5) {
      role = params[3] || 'patient';
      isActive = params[4] !== undefined ? params[4] : true;
    }

    const user = {
      id: mockDb.autoInc.users++,
      email: params[0],
      password: params[1],
      full_name: params[2],
      phone_number: phoneNumber,
      role: role,
      is_active: isActive,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.users.push(user);
    return { rows: [user], rowCount: 1 };
  }

  if (lower.startsWith('insert into diagnostic_centres')) {
    const centre = {
      id: mockDb.autoInc.diagnostic_centres++,
      name: params[0],
      address: params[1],
      city: params[2],
      contact_phone: params[3],
      is_active: params[4] !== undefined ? params[4] : true,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.diagnostic_centres.push(centre);
    return { rows: [centre], rowCount: 1 };
  }

  if (lower.startsWith('insert into diagnostic_tests')) {
    const existing = mockDb.diagnostic_tests.find(t => t.code.toUpperCase() === String(params[1]).toUpperCase());
    if (existing) {
      const err = new Error('duplicate key value violates unique constraint "diagnostic_tests_code_key"');
      err.code = '23505';
      throw err;
    }
    const test = {
      id: mockDb.autoInc.diagnostic_tests++,
      name: params[0],
      code: params[1].toUpperCase(),
      category: params[2],
      description: params[3],
      default_price: Number(params[4]),
      is_active: params[5] !== undefined ? params[5] : true,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.diagnostic_tests.push(test);
    return { rows: [test], rowCount: 1 };
  }

  if (lower.startsWith('insert into centre_test_offers')) {
    const existing = mockDb.centre_test_offers.find(
      o => o.centre_id === parseInt(params[0]) && o.test_id === parseInt(params[1])
    );
    if (existing) {
      existing.price = Number(params[2]);
      existing.turn_around_hours = parseInt(params[3]);
      existing.is_available = params[4] !== undefined ? params[4] : true;
      existing.updated_at = new Date();
      return { rows: [existing], rowCount: 1 };
    }
    const offer = {
      id: mockDb.autoInc.centre_test_offers++,
      centre_id: parseInt(params[0]),
      test_id: parseInt(params[1]),
      price: Number(params[2]),
      turn_around_hours: parseInt(params[3]) || 24,
      is_available: params[4] !== undefined ? params[4] : true,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.centre_test_offers.push(offer);
    return { rows: [offer], rowCount: 1 };
  }

  if (lower.startsWith('insert into bookings')) {
    const booking = {
      id: mockDb.autoInc.bookings++,
      user_id: parseInt(params[0]),
      centre_id: parseInt(params[1]),
      test_id: parseInt(params[2]),
      appointment_datetime: new Date(params[3]),
      amount: Number(params[4]),
      status: params[5] || 'PENDING',
      notes: params[6] || null,
      cancellation_reason: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.bookings.push(booking);
    return { rows: [booking], rowCount: 1 };
  }

  if (lower.startsWith('insert into payments')) {
    const payment = {
      id: mockDb.autoInc.payments++,
      booking_id: parseInt(params[0]),
      user_id: parseInt(params[1]),
      amount: Number(params[2]),
      status: params[3],
      payment_method: params[4] || 'mock_card',
      transaction_ref: params[5],
      failure_reason: params[6] || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.payments.push(payment);
    return { rows: [payment], rowCount: 1 };
  }

  if (lower.startsWith('insert into webhook_events')) {
    const existing = mockDb.webhook_events.find(e => e.event_id === String(params[0]));
    if (existing) {
      const err = new Error('duplicate key value violates unique constraint "webhook_events_event_id_key"');
      err.code = '23505';
      throw err;
    }
    const event = {
      id: mockDb.autoInc.webhook_events++,
      event_id: params[0],
      event_type: params[1],
      booking_id: params[2] ? parseInt(params[2]) : null,
      payment_id: params[3] ? parseInt(params[3]) : null,
      payload: params[4],
      status: params[5] || 'RECEIVED',
      response_summary: params[6] || null,
      error_message: params[7] || null,
      retry_count: 0,
      processed_at: new Date(),
      created_at: new Date()
    };
    mockDb.webhook_events.push(event);
    return { rows: [event], rowCount: 1 };
  }

  // 3. UPDATE queries
  if (lower.startsWith('update bookings')) {
    const id = parseInt(params[params.length - 1]);
    const booking = mockDb.bookings.find(b => b.id === id);
    if (booking) {
      if (lower.includes('status =') && lower.includes('cancellation_reason =')) {
        booking.status = params[0];
        booking.cancellation_reason = params[1];
      } else if (lower.includes('status =')) {
        booking.status = params[0];
      }
      booking.updated_at = new Date();
      return { rows: [booking], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('update webhook_events')) {
    const id = parseInt(params[params.length - 1]);
    const event = mockDb.webhook_events.find(e => e.id === id);
    if (event) {
      if (lower.includes('retry_count = retry_count + 1')) {
        event.retry_count++;
      }
      if (lower.includes('status =')) {
        event.status = params[0];
      }
      return { rows: [event], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('update diagnostic_centres')) {
    const id = parseInt(params[params.length - 1]);
    const centre = mockDb.diagnostic_centres.find(c => c.id === id);
    if (centre) {
      if (params[0] !== undefined) centre.name = params[0];
      if (params[1] !== undefined) centre.address = params[1];
      if (params[2] !== undefined) centre.city = params[2];
      if (params[3] !== undefined) centre.contact_phone = params[3];
      if (params[4] !== undefined) centre.is_active = params[4];
      centre.updated_at = new Date();
      return { rows: [centre], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (lower.startsWith('update diagnostic_tests')) {
    const id = parseInt(params[params.length - 1]);
    const test = mockDb.diagnostic_tests.find(t => t.id === id);
    if (test) {
      if (params[0] !== undefined) test.name = params[0];
      if (params[1] !== undefined) test.category = params[1];
      if (params[2] !== undefined) test.description = params[2];
      if (params[3] !== undefined) test.default_price = Number(params[3]);
      if (params[4] !== undefined) test.is_active = params[4];
      test.updated_at = new Date();
      return { rows: [test], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 4. DELETE queries
  if (lower.startsWith('delete from centre_test_offers')) {
    const centreId = parseInt(params[0]);
    const testId = parseInt(params[1]);
    const initialLen = mockDb.centre_test_offers.length;
    mockDb.centre_test_offers = mockDb.centre_test_offers.filter(
      o => !(o.centre_id === centreId && o.test_id === testId)
    );
    return { rowCount: initialLen - mockDb.centre_test_offers.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  initDb,
  query,
  getPool: () => pool,
  mockDb,
  resetMockDb
};
