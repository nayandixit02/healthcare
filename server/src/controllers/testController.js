const db = require('../db');
const cache = require('../config/redis');

class TestController {
  static async listTests(req, res, next) {
    try {
      const { category, search, page = 1, limit = 20 } = req.query;
      const cacheKey = `tests_list:${category || ''}:${search || ''}:${page}:${limit}`;

      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      let resDb = await db.query('SELECT * FROM diagnostic_tests WHERE is_active = true ORDER BY name ASC');
      let rows = resDb.rows;

      if (category) {
        rows = rows.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
      }
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(t => t.name.toLowerCase().includes(s) || t.code.toLowerCase().includes(s));
      }

      const total = rows.length;
      const offset = (Number(page) - 1) * Number(limit);
      const items = rows.slice(offset, offset + Number(limit)).map(t => ({
        ...t,
        default_price: Number(t.default_price)
      }));

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

  static async getTest(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM diagnostic_tests WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Diagnostic test with ID ${id} not found`
        });
      }
      const test = result.rows[0];
      res.status(200).json({
        status: 'success',
        data: {
          ...test,
          default_price: Number(test.default_price)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async createTest(req, res, next) {
    try {
      const { name, code, category, description, default_price, is_active = true } = req.body;

      const existing = await db.query('SELECT id FROM diagnostic_tests WHERE UPPER(code) = UPPER($1)', [code]);
      if (existing.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `A test with code '${code.toUpperCase()}' already exists.`
        });
      }

      const result = await db.query(
        `INSERT INTO diagnostic_tests (name, code, category, description, default_price, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, code.toUpperCase(), category, description || null, default_price, is_active]
      );

      await cache.clearPattern('tests*');
      res.status(201).json({
        status: 'success',
        data: {
          ...result.rows[0],
          default_price: Number(result.rows[0].default_price)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTest(req, res, next) {
    try {
      const { id } = req.params;
      const { name, category, description, default_price, is_active } = req.body;

      const check = await db.query('SELECT * FROM diagnostic_tests WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: `Diagnostic test with ID ${id} not found`
        });
      }

      const test = check.rows[0];
      const updatedName = name !== undefined ? name : test.name;
      const updatedCat = category !== undefined ? category : test.category;
      const updatedDesc = description !== undefined ? description : test.description;
      const updatedPrice = default_price !== undefined ? default_price : test.default_price;
      const updatedActive = is_active !== undefined ? is_active : test.is_active;

      const result = await db.query(
        `UPDATE diagnostic_tests
         SET name = $1, category = $2, description = $3, default_price = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [updatedName, updatedCat, updatedDesc, updatedPrice, updatedActive, id]
      );

      await cache.clearPattern('tests*');
      res.status(200).json({
        status: 'success',
        data: {
          ...result.rows[0],
          default_price: Number(result.rows[0].default_price)
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TestController;
