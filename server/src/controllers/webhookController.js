const WebhookService = require('../services/webhookService');

class WebhookController {
  static async handleWebhook(req, res, next) {
    try {
      const result = await WebhookService.processWebhook(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = WebhookController;
