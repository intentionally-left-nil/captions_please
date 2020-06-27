const {
  get_webhook_status,
  subscribe_to_webhook,
  delete_webhook,
  get_subscriptions,
  add_subscription_to_webhook,
} = require('../shared/twitter');
const fetch = require('node-fetch');

const ensure_webhook = async (context) => {
  let webhook_status = null;
  try {
    webhook_status = await get_webhook_status();
  } catch (e) {
    context.log('Unable to get the webhook, needs manual fixing');
    context.log(e);
    context.res = {
      status: 500,
      body: 'Failed to query webhook status from twitter',
    };
    return false;
  }

  if (webhook_status.length === 1 && webhook_status[0].valid) {
    return true;
  }

  context.log('Webhook was not valid, trying to recreate it');

  if (webhook_status.length === 1) {
    context.log('Deleting the old webhook');
    delete_webhook(webhook_status[0].id).catch((e) => {
      context.log('Unable to delete the old webhook, needs manual fixing');
      context.log(e);
      context.res = {
        status: 500,
        body: 'Failed to delete the old webhook',
      };
      return false;
    });
  }

  try {
    context.log('Creating the new webhook');
    // Warm up the webhook in case it's asleep
    await fetch(process.env.TWITTER_WEBHOOK_URL);
    await subscribe_to_webhook(process.env.TWITTER_WEBHOOK_URL);
  } catch (e) {
    context.log('Unable to create the new webhook, needs manual fixing');
    context.log(e);
    context.res = {
      status: 500,
      body: 'Failed to create a new webhook',
    };
    return false;
  }
  context.log('New webhook created');
  return true;
};

const ensure_subscription = async (context) => {
  let subscriptions = null;
  try {
    subscriptions = await get_subscriptions();
  } catch (e) {
    context.log('Unable to get the subscriptions, needs manual fixing');
    context.log(e);
    context.res = {
      status: 500,
      body: 'Failed to query the subscription',
    };
    return false;
  }
  if (subscriptions.length === 0) {
    try {
      context.log('Adding a new subscription');
      await add_subscription_to_webhook();
      context.log('Subscription successfully added');
    } catch (e) {
      context.log('Unable to create the new subscription, needs manual fixing');
      context.log(e);
      context.res = {
        status: 500,
        body: 'Failed to create the subscription',
      };
      return false;
    }
  }
  return true;
};

module.exports = async (context, req) => {
  const has_webhook = await ensure_webhook(context);
  if (has_webhook) {
    const has_subscription = await ensure_subscription(context);
    if (has_subscription) {
      context.res = {
        status: 200,
        body: { status: 'ok' },
      };
    }
  }
  context.done();
};
