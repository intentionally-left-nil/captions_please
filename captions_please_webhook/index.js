const respond_to_crc_token = require('./respond_to_crc_token');

module.exports = async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');
  console.log(process.env);
  if (req.method == 'GET') {
    return respond_to_crc_token(context, req);
  }

  if (req.query.name || (req.body && req.body.name)) {
    context.res = {
      // status: 200, /* Defaults to 200 */
      body: 'Hello ' + (req.query.name || req.body.name),
    };
  } else {
    context.res = {
      status: 400,
      body: 'Please pass a name on the query string or in the request body',
    };
  }
};
