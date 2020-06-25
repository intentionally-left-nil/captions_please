const respond_to_crc_token = require('./respond_to_crc_token');
const Tweet = require('../shared/tweet');
const { whoami, reply } = require('../shared/twitter');
const twitter = require('../shared/twitter');

const BOT_HANDLE = '@captions_please';
let my_id = null;

const do_nothing = (context) => {
  context.res = {
    status: 200,
  };
  context.done();
};

const respond_no_photos = (context, tweet, has_invalid_media) => {
  // Even on failure, we'll respond 200, as there's nothing to retry here
  context.res = {
    status: 200,
  };
  const message = has_invalid_media
    ? 'I only know how to decode photos, not gifs or videos. Sorry!'
    : "I don't see any photo's to decode, but I appreciate the shoutout!";
  return twitter.reply(tweet.data.id_str, message);
};

module.exports = async function (context, req) {
  if (req.method == 'GET') {
    return respond_to_crc_token(context, req);
  }

  if (!req.body.tweet_create_events) {
    return do_nothing(context);
  }

  if (!my_id) {
    my_id = await whoami();
  }

  const tweet = new Tweet(req.body.tweet_create_events[0]);
  if (!tweet.contains_handle(BOT_HANDLE) || tweet.data.id_str == my_id) {
    return do_nothing(context);
  }

  let parent_tweet = null;
  if (!tweet.has_photos()) {
    parent_tweet = await tweet.get_parent_tweet();
    if (!parent_tweet || !parent_tweet.has_photos()) {
      const has_invalid_media = tweet.has_media() || parent_tweet.has_media();
      return respond_no_photos(context, tweet, has_invalid_media);
    }
  }
  const tweet_to_scan = parent_tweet || tweet;

  const item = {
    to_reply_id: tweet.data.id_str,
    media: tweet_to_scan.get_photos(),
  };
  context.bindings.imageQueue = JSON.stringify(item);
  return do_nothing(context);
};
