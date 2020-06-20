const crypto = require('crypto');
const { get_secret } = require('./secrets');

module.exports = async (context, req) => {
  const crc_token = req.query.crc_token;
  if (crc_token) {
    const { value: consumer_secret } = await get_secret(
      'TwitterConsumerSecret'
    );
    if (consumer_secret) {
      const hmac = crypto
        .createHmac('sha256', consumer_secret)
        .update(crc_token)
        .digest('base64');
      context.res = {
        status: 200,
        body: { response_token: `sha256=${hmac}` },
      };
    } else {
      context.res = {
        status: 500,
        body: { message: 'Missing Consumer Secret' },
      };
    }
  } else {
    context.res = {
      status: 400,
      body: { message: 'Error: crc_token missing from request.' },
    };
  }
};
