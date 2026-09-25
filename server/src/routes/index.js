const express = require('express');
const authRoutes = require('./authRoutes');
const centreRoutes = require('./centreRoutes');
const testRoutes = require('./testRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const webhookRoutes = require('./webhookRoutes');

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/centres', centreRoutes);
apiRouter.use('/tests', testRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/payments/webhook', webhookRoutes);

module.exports = {
  apiRouter,
  authRoutes,
  centreRoutes,
  testRoutes,
  bookingRoutes,
  paymentRoutes,
  webhookRoutes
};
