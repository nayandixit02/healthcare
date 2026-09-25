const db = require('../db');
const cache = require('../config/redis');
const logger = require('../config/logger');

class CentreController {
  static async listCentres(req, res, next) {
    try {
      const { city, search, page = 1, limit = 20 } = req.query;
      const cacheKey = `centres_list:${city || ''}:${search || ''}:${page}:${limit}`;

      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      let resDb = await db.query('SELECT * FROM diagnostic_centres WHERE is_active = true ORDER BY name ASC');
      let rows = resDb.rows;

      if (city) {
        rows = rows.filter(c => c.city.toLowerCase().includes(city.toLowerCase()));
      }
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(c => c.name.toLowerCase().includes(s) || c.address.toLowerCase().includes(s));
      }

      const total = rows.length;
      const offset = (Number(page) - 1) * Number(limit);
      const items = rows.slice(offset, offset + Number(limit));

      const response = {
        status: 'success',
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        total_pages: Math.ceil(total / Number(limit)) || 1
      };

      await cache.set(cacheKey, response, 120);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getCentre(req, res, next) {
    try {
      const { id } = req.params;
      const cacheKey = `centre_detail:${id}`;

      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      const centreRes = await db.query('SELECT * FROM diagnostic_centres WHERE id = $1', [id]);
      if (centreRes.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Diagnostic centre with ID ${id} not found`
        });
      }

      const centre = centreRes.rows[0];

      // Fetch offered tests
      const offersRes = await db.query(
        'SELECT * FROM centre_test_offers WHERE centre_id = $1 AND is_available = true',
        [id]
      );

      const testOffers = await Promise.all(offersRes.rows.map(async (o) => {
        const tRes = await db.query('SELECT * FROM diagnostic_tests WHERE id = $1', [o.test_id]);
        return {
          id: o.id,
          centre_id: o.centre_id,
          test_id: o.test_id,
          price: Number(o.price),
          turn_around_hours: o.turn_around_hours,
          is_available: o.is_available,
          test: tRes.rows[0] ? { ...tRes.rows[0], default_price: Number(tRes.rows[0].default_price) } : null
        };
      }));

      const response = {
        status: 'success',
        data: {
          ...centre,
          test_offers: testOffers
        }
      };

      await cache.set(cacheKey, response, 120);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async createCentre(req, res, next) {
    try {
      const { name, address, city, contact_phone, is_active = true } = req.body;

      const result = await db.query(
        `INSERT INTO diagnostic_centres (name, address, city, contact_phone, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, address, city, contact_phone || null, is_active]
      );

      await cache.clearPattern('centres*');
      res.status(201).json({
        status: 'success',
        data: result.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCentre(req, res, next) {
    try {
      const { id } = req.params;
      const { name, address, city, contact_phone, is_active } = req.body;

      const check = await db.query('SELECT * FROM diagnostic_centres WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Diagnostic centre with ID ${id} not found`
        });
      }

      const centre = check.rows[0];
      const updatedName = name !== undefined ? name : centre.name;
      const updatedAddress = address !== undefined ? address : centre.address;
      const updatedCity = city !== undefined ? city : centre.city;
      const updatedPhone = contact_phone !== undefined ? contact_phone : centre.contact_phone;
      const updatedActive = is_active !== undefined ? is_active : centre.is_active;

      const result = await db.query(
        `UPDATE diagnostic_centres
         SET name = $1, address = $2, city = $3, contact_phone = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [updatedName, updatedAddress, updatedCity, updatedPhone, updatedActive, id]
      );

      await cache.clearPattern('centres*');
      res.status(200).json({
        status: 'success',
        data: result.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  static async addTestOffer(req, res, next) {
    try {
      const { id: centre_id } = req.params;
      const { test_id, price, turn_around_hours = 24, is_available = true } = req.body;

      const centreRes = await db.query('SELECT id FROM diagnostic_centres WHERE id = $1', [centre_id]);
      if (centreRes.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: `Centre ID ${centre_id} not found` });
      }

      const testRes = await db.query('SELECT id FROM diagnostic_tests WHERE id = $1', [test_id]);
      if (testRes.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: `Test ID ${test_id} not found` });
      }

      const result = await db.query(
        `INSERT INTO centre_test_offers (centre_id, test_id, price, turn_around_hours, is_available)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [centre_id, test_id, price, turn_around_hours, is_available]
      );

      await cache.clearPattern('centres*');
      await cache.clearPattern(`centre_detail:${centre_id}`);

      res.status(201).json({
        status: 'success',
        data: {
          ...result.rows[0],
          price: Number(result.rows[0].price)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeTestOffer(req, res, next) {
    try {
      const { id: centre_id, test_id } = req.params;

      const result = await db.query(
        'DELETE FROM centre_test_offers WHERE centre_id = $1 AND test_id = $2',
        [centre_id, test_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'This test is not currently offered by the centre'
        });
      }

      await cache.clearPattern('centres*');
      await cache.clearPattern(`centre_detail:${centre_id}`);

      res.status(200).json({
        status: 'success',
        message: 'Test offer removed from centre successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CentreController;
