const twitter = require('../shared/twitter');

const TWEET_CHAR_LIMIT = 280;
const re = /^(.*)\s(.+)$/;

const group_paragraphs_into_tweets = (paragraphs) => {
  let all_tweets = [];
  for (lines of paragraphs) {
    const paragraph_tweets = [];
    for (let i = 0; i < lines.length; ++i) {
      const last_tweet =
        paragraph_tweets.length > 0
          ? paragraph_tweets[paragraph_tweets.length - 1]
          : null;
      const line = lines[i];
      if (line.length > TWEET_CHAR_LIMIT) {
        const beginning = line.slice(0, TWEET_CHAR_LIMIT);
        const end = line.slice(TWEET_CHAR_LIMIT);
        const match = re.exec(beginning);
        if (match) {
          const [_, prefix, to_cut] = match;
          paragraph_tweets.push(prefix);
          lines.splice(i + 1, 0, to_cut + end);
        } else {
          paragraph_tweets.push(beginning);
          lines.splice(i + 1, 0, end);
        }
      } else if (
        last_tweet &&
        last_tweet.length + line.length + 1 <= TWEET_CHAR_LIMIT
      ) {
        paragraph_tweets[paragraph_tweets.length - 1] += ' ' + line;
      } else {
        paragraph_tweets.push(line);
      }
    }
    all_tweets = all_tweets.concat(paragraph_tweets);
  }
  return all_tweets;
};

const prepend_index = (message, index) => {
  return index == null ? message : `Photo ${index + 1}:\n${message}`;
};

const reply_with_text = async (to_reply_id, paragraphs, index) => {
  paragraphs[0][0] = prepend_index(paragraphs[0][0], index);

  for (const tweet of group_paragraphs_into_tweets(paragraphs)) {
    const response = await twitter.censored_reply(to_reply_id, tweet);
    to_reply_id = response.id_str;
  }
  return to_reply_id;
};

const reply_with_caption = async (to_reply_id, caption, index) => {
  const message = prepend_index(`Image Description: ${caption}`, index);
  const response = await twitter.censored_reply(to_reply_id, message);
  return response.id_str;
};

const reply_unknown_description = async (to_reply_id, index) => {
  const message = prepend_index("I don't know what this is, sorry.", index);
  const response = await twitter.censored_reply(to_reply_id, message);
  return response.id_str;
};

module.exports = async (to_reply_id, image_data, index) => {
  switch (image_data.type) {
    case 'text':
      return reply_with_text(to_reply_id, image_data.value, index);
    case 'caption':
      return reply_with_caption(to_reply_id, image_data.value, index);
    case 'unknown':
      return reply_unknown_description(to_reply_id, index);
    default:
      throw new Error(`Unknown parsed image type ${image_data.type}`);
  }
};
