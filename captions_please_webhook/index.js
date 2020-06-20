const respond_to_crc_token = require('./respond_to_crc_token');
const Tweet = require('./tweet');

const BOT_HANDLE = '@captions_please';

const do_nothing = (context) => {
  context.res = {
    status: 200,
  };
  context.done();
};

const respond_no_photos = (context, tweet) => {
  // Even on failure, we'll respond 200, as there's nothing to retry here
  context.res = {
    status: 200,
  };
  return tweet.reply(
    "I don't see any photos in the tweet, and I still don't know any good jokes."
  );
};

module.exports = async function (context, req) {
  if (req.method == 'GET') {
    return respond_to_crc_token(context, req);
  }

  if (!req.body.tweet_create_events) {
    return do_nothing(context);
  }

  const tweet = new Tweet(req.body.tweet_create_events[0]);
  if (!tweet.contains_handle(BOT_HANDLE)) {
    return do_nothing(context);
  }

  let parent_tweet = null;
  if (!tweet.has_photos()) {
    parent_tweet = await tweet.get_parent_tweet();
    if (!parent_tweet || !parent_tweet.has_photos()) {
      return respond_no_photos(context, tweet);
    }
  }
  const tweet_to_scan = parent_tweet || tweet;

  const item = {
    to_reply_id: tweet.data.id_str,
    media: tweet_to_scan.data.entities.media,
  };
  console.log('Placing new item in the queue');
  console.log(item);
  return do_nothing(context);
};
