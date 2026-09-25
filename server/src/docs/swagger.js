const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'EVE Healthcare Backend API',
    version: '1.0.0',
    description: 'API for diagnostic test bookings, mock payments, and idempotent payment webhooks.'
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local Development Server' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Service Health Check',
        responses: { 200: { description: 'Healthy service' } }
      }
    },
    '/api/v1/auth/signup': {
      post: {
        summary: 'User Signup',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'full_name'],
                properties: {
                  email: { type: 'string', example: 'patient@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                  full_name: { type: 'string', example: 'Alex Mercer' },
                  phone_number: { type: 'string', example: '+1-555-0144' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'User created' } }
      }
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'User Login',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'patient@example.com' },
                  password: { type: 'string', example: 'Patient@12345' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'JWT Token' } }
      }
    },
    '/api/v1/centres': {
      get: {
        summary: 'List Diagnostic Centres',
        parameters: [
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'List of centres' } }
      }
    },
    '/api/v1/bookings': {
      post: {
        summary: 'Book a Diagnostic Test',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['centre_id', 'test_id', 'appointment_datetime'],
                properties: {
                  centre_id: { type: 'integer', example: 1 },
                  test_id: { type: 'integer', example: 1 },
                  appointment_datetime: { type: 'string', example: '2026-10-01T10:00:00Z' },
                  notes: { type: 'string', example: 'Fasting 12 hours' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Booking created' } }
      }
    },
    '/payments': {
      post: {
        summary: 'Simulated Payment Endpoint',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['booking_id'],
                properties: {
                  booking_id: { type: 'integer', example: 1 },
                  simulate_status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
                  payment_method: { type: 'string', example: 'mock_card' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Payment simulated result' } }
      }
    },
    '/payments/webhook': {
      post: {
        summary: 'Idempotent Payment Webhook',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event_id', 'event_type', 'booking_id'],
                properties: {
                  event_id: { type: 'string', example: 'evt_99887766' },
                  event_type: { type: 'string', enum: ['payment.success', 'payment.failed'], example: 'payment.success' },
                  booking_id: { type: 'integer', example: 1 },
                  amount: { type: 'number', example: 380.00 }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Webhook processed or duplicate ignored' } }
      }
    }
  }
};

function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/openapi.json', (req, res) => res.json(swaggerDocument));
}

module.exports = setupSwagger;
