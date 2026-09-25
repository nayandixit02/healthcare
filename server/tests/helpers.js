const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const config = require('../src/config');
const cache = require('../src/config/redis');

async function setupTestDb() {
  db.resetMockDb();
  await cache.clearPattern('*');

  // Create admin user
  const adminPwd = await bcrypt.hash('Admin123!', 10);
  const adminRes = await db.query(
    `INSERT INTO users (email, password, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    ['admin_test@example.com', adminPwd, 'Admin Test', 'admin', true]
  );
  const adminUser = adminRes.rows[0];

  // Create patient user
  const patientPwd = await bcrypt.hash('Patient123!', 10);
  const patientRes = await db.query(
    `INSERT INTO users (email, password, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    ['patient_test@example.com', patientPwd, 'Patient Test', 'patient', true]
  );
  const patientUser = patientRes.rows[0];

  // Create second patient user
  const otherPatientRes = await db.query(
    `INSERT INTO users (email, password, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    ['other_patient@example.com', patientPwd, 'Other Patient', 'patient', true]
  );
  const otherPatientUser = otherPatientRes.rows[0];

  // Create sample centre
  const centreRes = await db.query(
    `INSERT INTO diagnostic_centres (name, address, city, contact_phone, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    ['Apex Diagnostics Centre', '100 Health Way', 'Bengaluru', '+91-80-12345678', true]
  );
  const centre = centreRes.rows[0];

  // Create sample test
  const testRes = await db.query(
    `INSERT INTO diagnostic_tests (name, code, category, description, default_price, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    ['Complete Blood Count (CBC)', 'CBC_TEST', 'Hematology', 'Blood test', 400.00, true]
  );
  const testItem = testRes.rows[0];

  // Create centre offer
  const offerRes = await db.query(
    `INSERT INTO centre_test_offers (centre_id, test_id, price, turn_around_hours, is_available)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [centre.id, testItem.id, 380.00, 12, true]
  );
  const offer = offerRes.rows[0];

  const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, config.JWT_SECRET);
  const patientToken = jwt.sign({ id: patientUser.id, email: patientUser.email, role: patientUser.role }, config.JWT_SECRET);
  const otherPatientToken = jwt.sign({ id: otherPatientUser.id, email: otherPatientUser.email, role: otherPatientUser.role }, config.JWT_SECRET);

  return {
    adminUser,
    patientUser,
    otherPatientUser,
    adminToken,
    patientToken,
    otherPatientToken,
    centre,
    testItem,
    offer
  };
}

module.exports = {
  setupTestDb
};
