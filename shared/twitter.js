const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const querystring = require('querystring');
const fetch = require('node-fetch');
const BadWords = require('bad-words');
const { get_all_secrets, get_secret } = require('./secrets');

const badWordFilter = new BadWords();

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

// Handling the POST body taken from
// https://github.com/draftbit/twitter-lite/blob/master/twitter.js
function percentEncode(string) {
  return string
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

const get_authorization_header = (url, options, secrets) => {
  const oauth = create_oauth(secrets);
  const token = {
    key: secrets.TwitterAccessToken,
    secret: secrets.TwitterAccessTokenSecret,
  };
  const authorization = oauth.authorize(
    { url, method: options.method, data: options.body },
    token
  );
  const headers = oauth.toHeader(authorization);
  return headers.Authorization;
};

const get_from_twitter = async (endpoint, options = { method: 'GET' }) => {
  const secrets = await get_all_secrets();
  const url = `https://api.twitter.com/1.1/${endpoint}`;
  options.headers = Object.assign({}, options.headers, {
    Authorization: get_authorization_header(url, options, secrets),
  });
  if (options.method != 'GET') {
    // Handling the POST body taken from
    // https://github.com/draftbit/twitter-lite/blob/master/twitter.js
    options.body = percentEncode(querystring.stringify(options.body));
    options.headers = options.headers || {};
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return fetch(url, options);
};

const safe_stringify = (json) => {
  try {
    return JSON.stringify(json, null, 2);
  } catch {
    return 'Invalid JSON';
  }
};

const validate_response = (response) => {
  return response.ok
    ? Promise.resolve(response)
    : response
        .json()
        .then((body) => Promise.reject(body))
        .catch((body) => {
          let message = `Invalid response code ${response.status}`;
          if (body) {
            message += `. Body is ${safe_stringify(body)}`;
          }
          return Promise.reject(message);
        });
};

const get_json_from_twitter = async (...args) => {
  response = await get_from_twitter(...args);
  return validate_response(response).then((response) => response.json());
};

const get_tweet = async (tweet_id) =>
  get_json_from_twitter(`statuses/show/${tweet_id}.json?include_entities=true`);

const censored_reply = async (tweet_id, message) =>
  reply(tweet_id, badWordFilter.clean(message));

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

const whoami = async () => {
  const response = await get_json_from_twitter(
    'account/verify_credentials.json'
  );
  return response.id_str;
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

const get_webhook_status = async () =>
  get_json_from_twitter(
    `account_activity/all/${process.env.TWITTER_WEBHOOK_ENV}/webhooks.json`
  );

const subscribe_to_webhook = async (callback_url) =>
  get_json_from_twitter(
    `account_activity/all/${process.env.TWITTER_WEBHOOK_ENV}/webhooks.json`,
    {
      method: 'POST',
      body: {
        url: callback_url,
      },
    }
  );

const delete_webhook = (webhook_id) =>
  get_from_twitter(
    `account_activity/all/${process.env.TWITTER_WEBHOOK_ENV}/webhooks/${webhook_id}.json`,
    {
      method: 'DELETE',
      body: {},
    }
  ).then(validate_response);

const add_subscription_to_webhook = () =>
  get_from_twitter(
    `account_activity/all/${process.env.TWITTER_WEBHOOK_ENV}/subscriptions.json`,
    {
      method: 'POST',
    }
  ).then(validate_response);

const get_subscriptions = async () => {
  const { value: bearer_token } = await get_secret('TwitterBearerToken');
  const response = await fetch(
    `https://api.twitter.com/1.1/account_activity/all/${process.env.TWITTER_WEBHOOK_ENV}/subscriptions/list.json`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearer_token}`,
      },
      body: null,
    }
  );
  return validate_response(response).then((response) =>
    response.json().then(({ subscriptions }) => subscriptions)
  );
};

module.exports = {
  get_tweet,
  reply,
  censored_reply,
  download_media,
  whoami,
  get_webhook_status,
  subscribe_to_webhook,
  delete_webhook,
  add_subscription_to_webhook,
  get_subscriptions,
};
