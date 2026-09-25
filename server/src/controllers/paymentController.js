const PaymentService = require('../services/paymentService');

class PaymentController {
  static async simulatePayment(req, res, next) {
    try {
      const payment = await PaymentService.processSimulatedPayment(req.user, req.body);
      res.status(200).json({
        status: 'success',
        data: payment
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPayment(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await PaymentService.getPaymentById(id, req.user);
      res.status(200).json({
        status: 'success',
        data: payment
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PaymentController;
