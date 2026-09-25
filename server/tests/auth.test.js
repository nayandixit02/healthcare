const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');

describe('Authentication API Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await setupTestDb();
  });

  test('POST /api/v1/auth/signup - Success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'new_patient@example.com',
        password: 'Password123!',
        full_name: 'Jane Doe',
        phone_number: '+1-555-9988',
        role: 'patient'
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.email).toBe('new_patient@example.com');
    expect(res.body.data.password).toBeUndefined();
  });

  test('POST /api/v1/auth/signup - Duplicate Email Fails', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: fixtures.patientUser.email,
        password: 'AnotherPassword123!',
        full_name: 'Duplicate User'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists');
  });

  test('POST /api/v1/auth/signup - Invalid Email Format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'invalid-email',
        password: 'Password123!',
        full_name: 'Jane Doe'
      });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
  });

  test('POST /api/v1/auth/signup - Password Too Short', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'shortpass@example.com',
        password: '123',
        full_name: 'Jane Doe'
      });

    expect(res.status).toBe(422);
  });

  test('POST /api/v1/auth/login - Success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: fixtures.patientUser.email,
        password: 'Patient123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.token_type).toBe('bearer');
    expect(res.body.user.email).toBe(fixtures.patientUser.email);
  });

  test('POST /api/v1/auth/login - Wrong Password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: fixtures.patientUser.email,
        password: 'WrongPassword!'
      });

    expect(res.status).toBe(401);
  });

  test('GET /api/v1/auth/me - Authorized', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${fixtures.patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(fixtures.patientUser.id);
    expect(res.body.data.email).toBe(fixtures.patientUser.email);
  });

  test('GET /api/v1/auth/me - Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
