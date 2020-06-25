const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const fetch = require('node-fetch');
const { get_all_secrets } = require('./secrets');

const create_oauth = (secrets) => {
  const consumer = {
    key: secrets.TwitterConsumerKey,
    secret: secrets.TwitterConsumerSecret,
  };
  return OAuth({
    consumer,
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64');
    },
  });
};

const get_authorization_header = (url, options, secrets) => {
  const oauth = create_oauth(secrets);
  const token = {
    key: secrets.TwitterAccessToken,
    secret: secrets.TwitterAccessTokenSecret,
  };
  const oauth_data = oauth.authorize(
    { url, method: options.method, data: options.body },
    token
  );
  const headers = oauth.toHeader(oauth_data);
  return headers.Authorization;
};

const encode_body = (body) => {
  const params = new URLSearchParams();
  for ([key, value] of Object.entries(body)) {
    params.append(key, value);
  }
  return params;
};

const get_from_twitter = async (endpoint, options = { method: 'GET' }) => {
  const secrets = await get_all_secrets();
  const url = `https://api.twitter.com/1.1/${endpoint}`;
  options.headers = Object.assign({}, options.headers, {
    Authorization: get_authorization_header(url, options, secrets),
  });

  if (options.method == 'POST' || options.method == 'PUT') {
    options.body = encode_body(options.body);
  }

  return fetch(url, options);
};

const validate_response = (response) => {
  if (!response.ok) {
    return Promise.reject(`Invalid response status ${response.status}`);
  }
  return Promise.resolve(response);
};

const get_json_from_twitter = async (...args) => {
  response = await get_from_twitter(...args);
  return validate_response(response).then((response) => response.json());
};

const get_tweet = async (tweet_id) =>
  get_json_from_twitter(`statuses/show/${tweet_id}.json`);

const reply = async (tweet_id, message) => {
  const body = {
    status: message,
    in_reply_to_status_id: tweet_id,
    auto_populate_reply_metadata: true,
  };
  return get_json_from_twitter('statuses/update.json', {
    method: 'POST',
    body,
  });
};

const download_media = async (url) => {
  const secrets = await get_all_secrets();
  const headers = {
    Authorization: get_authorization_header(url, { method: 'GET' }, secrets),
  };
  return fetch(url, { headers })
    .then(validate_response)
    .then((response) => response.blob());
};

module.exports = { get_tweet, reply, download_media };
