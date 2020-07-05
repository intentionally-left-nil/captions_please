const respond_to_crc_token = require('./respond_to_crc_token');
const respond_to_webhook = require('./respond_to_webhook');

module.exports = async function (context, req) {
  switch (req.method) {
    case 'GET':
      return respond_to_crc_token(context, req);
    case 'POST':
      return respond_to_webhook(context, req);
    default:
      context.res = {
        status: 200,
      };
      context.done();
  }
};
