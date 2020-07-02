const twitterText = require('twitter-text');
const runes = require('runes');
const twitter = require('../shared/twitter');

const get_last_whitespace_index = (graphemes) => {
  for (let i = graphemes.length - 1; i >= 0; i--) {
    if (graphemes[i].trim().length == 0) {
      return i;
    }
  }
  return -1;
};

const get_valid_tweet_length = (graphemes) => {
  for (let i = graphemes.length - 1; i >= 0; i--) {
    const message = graphemes.slice(0, i).join('');
    if (twitterText.parseTweet(message).valid) {
      return i + 1;
    }
  }
  throw new Error('Fatal error trying to parse the ');
};

const get_combined_tweet_if_valid = (paragraph_tweets, line) => {
  const last_tweet =
    paragraph_tweets.length > 0
      ? paragraph_tweets[paragraph_tweets.length - 1]
      : null;
  if (last_tweet) {
    const combined_message = `${last_tweet} ${line}`;
    if (twitterText.parseTweet(combined_message).valid) {
      return combined_message;
    }
  }
  return null;
};

const truncate_tweet = (message) => {
  const { weightedLength, permillage } = twitterText.parseTweet(message);
  const max_length = Math.floor((1000 * weightedLength) / permillage);
  const graphemes = runes(message);
  const valid_tweet_length = get_valid_tweet_length(
    graphemes.slice(0, max_length)
  );
  let beginning = graphemes.slice(0, valid_tweet_length);
  let end = graphemes.slice(valid_tweet_length);
  const to_cut_index = get_last_whitespace_index(beginning);
  if (to_cut_index !== -1) {
    const to_add = beginning.slice(0, to_cut_index);
    const to_cut = beginning.slice(to_cut_index + 1); // eat the whitespace, since the next line will be in a new tweet
    beginning = to_add;
    end = to_cut.concat(end);
  }
  return [beginning.join(''), end.join('')];
};

const group_paragraphs_into_tweets = (paragraphs) => {
  let all_tweets = [];
  for (lines of paragraphs) {
    const paragraph_tweets = [];
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      if (twitterText.parseTweet(line).valid) {
        const combined_message = get_combined_tweet_if_valid(
          paragraph_tweets,
          line
        );
        if (combined_message == null) {
          paragraph_tweets.push(line);
        } else {
          paragraph_tweets[paragraph_tweets.length - 1] = combined_message;
        }
      } else {
        const [beginning, end] = truncate_tweet(line);
        paragraph_tweets.push(beginning);
        lines.splice(i + 1, 0, end);
      }
    }
    all_tweets = all_tweets.concat(paragraph_tweets);
  }
  return all_tweets;
};

const prepend_index = (message, index) => {
  return index == null ? message : `Photo ${index + 1}:\n${message}`;
};

const reply_with_alt_text = async (to_reply_id, alt_text) => {
  if (alt_text) {
    const message = `User provided description: ${alt_text}`;
    const response = await twitter.censored_reply(to_reply_id, message);
    to_reply_id = response.id_str;
  }
  return to_reply_id;
};

const reply_with_text = async (to_reply_id, image_data, index) => {
  const paragraphs = image_data.value;
  paragraphs[0][0] = prepend_index(paragraphs[0][0], index);

  for (const tweet of group_paragraphs_into_tweets(paragraphs)) {
    const response = await twitter.censored_reply(to_reply_id, tweet);
    to_reply_id = response.id_str;
  }
  to_reply_id = await reply_with_alt_text(to_reply_id, image_data.alt_text);
  return to_reply_id;
};

const reply_with_caption = async (to_reply_id, image_data, index) => {
  const caption = image_data.value;
  const message = prepend_index(`Image description: ${caption}`, index);
  const response = await twitter.censored_reply(to_reply_id, message);
  to_reply_id = response.id_str;
  to_reply_id = await reply_with_alt_text(to_reply_id, image_data.alt_text);
  return to_reply_id;
};

const reply_unknown_description = async (to_reply_id, index) => {
  const message = prepend_index("I don't know what this is, sorry.", index);
  const response = await twitter.reply(to_reply_id, message);
  return response.id_str;
};

module.exports = async (to_reply_id, image_data, index) => {
  switch (image_data.type) {
    case 'text':
      return reply_with_text(to_reply_id, image_data, index);
    case 'caption':
      return reply_with_caption(to_reply_id, image_data, index);
    case 'unknown':
      return reply_unknown_description(to_reply_id, index);
    default:
      throw new Error(`Unknown parsed image type ${image_data.type}`);
  }
};
