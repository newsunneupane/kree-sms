const https = require('https');
const http = require('http');

class AakashSmsService {
  constructor() {
    this.token = process.env.AAKASH_SMS_TOKEN;
    this.apiUrl = process.env.AAKASH_API_URL;
    this.creditUrl = process.env.AAKASH_CREDIT_URL;
  }

  _makeRequest(url, params) {
    return new Promise((resolve, reject) => {
      const fullUrl = new URL(url);
      fullUrl.searchParams.append('auth_token', this.token);
      for (const [key, value] of Object.entries(params)) {
        fullUrl.searchParams.append(key, value);
      }

      const protocol = fullUrl.protocol === 'https:' ? https : http;
      const req = protocol.get(fullUrl.toString(), { timeout: 15000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: { raw: data } });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  async sendSms(to, text) {
    try {
      const result = await this._makeRequest(this.apiUrl, { to, text });
      const body = result.body;
      const success = result.statusCode === 200 && body.error === false;

      return {
        success,
        httpCode: result.statusCode,
        gatewayError: body.error,
        availableCredit: body.available_credit || body.credits || body.balance || null,
        raw: body,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkCredit() {
    try {
      const result = await this._makeRequest(this.creditUrl, {});
      return {
        success: result.statusCode === 200,
        balance: result.body.available_credit || result.body.credits || result.body.balance || 0,
        raw: result.body,
      };
    } catch (error) {
      return { success: false, error: error.message, balance: 0 };
    }
  }
}

module.exports = new AakashSmsService();