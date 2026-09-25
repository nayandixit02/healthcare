const bcrypt = require('bcryptjs');
const db = require('./index');
const logger = require('../config/logger');

async function seed() {
  await db.initDb();

  try {
    logger.info('Starting database seeding...');

    // 1. Seed Users
    const adminPassword = await bcrypt.hash('Admin@12345', 10);
    const patientPassword = await bcrypt.hash('Patient@12345', 10);

    // Admin user
    const adminCheck = await db.query('SELECT * FROM users WHERE email = $1', ['admin@evehealthcare.com']);
    let adminUser;
    if (adminCheck.rows.length === 0) {
      const res = await db.query(
        `INSERT INTO users (email, password, full_name, phone_number, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        ['admin@evehealthcare.com', adminPassword, 'Dr. Sarah Connor (Chief Medical Officer)', '+1-555-0199', 'admin', true]
      );
      adminUser = res.rows[0];
      logger.info('Created Admin user: admin@evehealthcare.com');
    } else {
      adminUser = adminCheck.rows[0];
    }

    // Patient user
    const patientCheck = await db.query('SELECT * FROM users WHERE email = $1', ['patient@example.com']);
    let patientUser;
    if (patientCheck.rows.length === 0) {
      const res = await db.query(
        `INSERT INTO users (email, password, full_name, phone_number, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        ['patient@example.com', patientPassword, 'Alex Mercer', '+1-555-0144', 'patient', true]
      );
      patientUser = res.rows[0];
      logger.info('Created Patient user: patient@example.com');
    } else {
      patientUser = patientCheck.rows[0];
    }

    // 2. Seed Diagnostic Tests
    const testsData = [
      {
        name: 'Complete Blood Count (CBC)',
        code: 'CBC',
        category: 'Hematology',
        description: 'Comprehensive evaluation of RBCs, WBCs, platelets, hemoglobin, and hematocrit.',
        default_price: 350.00
      },
      {
        name: 'Lipid Profile Panel',
        code: 'LIPID',
        category: 'Biochemistry',
        description: 'Cardiovascular assessment covering Total Cholesterol, HDL, LDL, and Triglycerides.',
        default_price: 750.00
      },
      {
        name: 'HbA1c Glycated Hemoglobin',
        code: 'HBA1C',
        category: 'Diabetes Screening',
        description: 'Monitors 3-month average blood glucose control for diabetes management.',
        default_price: 450.00
      },
      {
        name: 'Thyroid Profile Total (T3, T4, TSH)',
        code: 'THYROID',
        category: 'Endocrinology',
        description: 'Evaluates thyroid hormone production and metabolism regulation.',
        default_price: 600.00
      },
      {
        name: 'Magnetic Resonance Imaging (MRI Brain)',
        code: 'MRI_BRAIN',
        category: 'Radiology',
        description: 'High-definition 3T neural magnetic imaging of brain structure and vascular flow.',
        default_price: 4500.00
      },
      {
        name: 'Chest X-Ray PA View',
        code: 'XRAY_CHEST',
        category: 'Radiology',
        description: 'Digital diagnostic radiography of chest cavity, lungs, and heart shadow.',
        default_price: 500.00
      }
    ];

    const testMap = {};
    for (const t of testsData) {
      const check = await db.query('SELECT * FROM diagnostic_tests WHERE code = $1', [t.code]);
      if (check.rows.length === 0) {
        const res = await db.query(
          `INSERT INTO diagnostic_tests (name, code, category, description, default_price, is_active)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [t.name, t.code, t.category, t.description, t.default_price, true]
        );
        testMap[t.code] = res.rows[0];
        logger.info(`Created Test: ${t.name}`);
      } else {
        testMap[t.code] = check.rows[0];
      }
    }

    // 3. Seed Diagnostic Centres
    const centresData = [
      {
        name: 'EVE Healthcare Metropolis Lab',
        address: '45 Park Avenue, Healthcare Hub, Sector 12',
        city: 'Bengaluru',
        contact_phone: '+91-80-45678901'
      },
      {
        name: 'EVE Healthcare Prime Diagnostics',
        address: '88 Marine Lines, South District',
        city: 'Mumbai',
        contact_phone: '+91-22-22345678'
      },
      {
        name: 'EVE Advanced Imaging & Diagnostics',
        address: '12 Connaught Place, Central Zone',
        city: 'New Delhi',
        contact_phone: '+91-11-23456789'
      }
    ];

    const createdCentres = [];
    for (const c of centresData) {
      const check = await db.query('SELECT * FROM diagnostic_centres WHERE name = $1', [c.name]);
      if (check.rows.length === 0) {
        const res = await db.query(
          `INSERT INTO diagnostic_centres (name, address, city, contact_phone, is_active)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [c.name, c.address, c.city, c.contact_phone, true]
        );
        createdCentres.push(res.rows[0]);
        logger.info(`Created Centre: ${c.name}`);
      } else {
        createdCentres.push(check.rows[0]);
      }
    }

    // 4. Link Tests to Centres with custom pricing
    const multipliers = [1.0, 1.10, 1.15];
    for (let i = 0; i < createdCentres.length; i++) {
      const centre = createdCentres[i];
      const mult = multipliers[i % multipliers.length];

      for (const code of Object.keys(testMap)) {
        const test = testMap[code];
        const offerCheck = await db.query(
          'SELECT * FROM centre_test_offers WHERE centre_id = $1 AND test_id = $2',
          [centre.id, test.id]
        );
        if (offerCheck.rows.length === 0) {
          const price = Number((test.default_price * mult).toFixed(2));
          const tat = test.category === 'Hematology' ? 12 : 24;
          await db.query(
            `INSERT INTO centre_test_offers (centre_id, test_id, price, turn_around_hours, is_available)
             VALUES ($1, $2, $3, $4, $5)`,
            [centre.id, test.id, price, tat, true]
          );
        }
      }
    }

    logger.info('Database seeding completed successfully!');
  } catch (err) {
    logger.error(`Error during seeding: ${err.message}`);
    throw err;
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seed;
