const twitter = require('./twitter');

class Tweet {
  constructor(data) {
    this.data = data;
  }

  get_visible_text() {
    const { text, display_text_range } = this.data.extended_tweet
      ? {
          ...this.data.extended_tweet,
          text: this.data.extended_tweet.full_text,
        }
      : this.data;
    if (!display_text_range) {
      return text;
    }

    // https://developer.twitter.com/en/docs/tweets/tweet-updates
    // From the docs, display_text_range may exist in the response, containing an array
    // of two numbers, [x, y] which correspond to the unicode codepoints indices of the visible part
    // This can be less than the full text, if you do things like reply to a tweet. The text will contain
    // @user_you_replied_to The message you typed
    // even though the tweet didn't explicitly @ the user.
    // In Javascript, to split strings according to unicode codepoints, we can use the spread operator
    const [start, end] = display_text_range;
    // We're trusting twitter to not have the indices break multi-codepoint sequences
    return [...text].slice(start, end).join('');
  }

  explicitly_contains_handle(handle) {
    return this.get_visible_text().toLowerCase().includes(handle);
  }

  has_photos() {
    return this.get_photos().length > 0;
  }

  has_media() {
    return this.get_media().length > 0;
  }

  get_photos() {
    return this.get_media().filter(({ type }) => type == 'photo');
  }

  is_retweet() {
    return this.data.retweeted_status != null;
  }

  is_quote_tweet() {
    return this.data.is_quote_status;
  }

  is_mention() {
    return this.data.user_has_blocked != null;
  }

  is_reply() {
    return this.data.in_reply_to_status_id_str != null;
  }

  is_tweet() {
    return (
      !this.is_reply() &&
      !this.is_mention() &&
      !this.is_retweet() &&
      !this.is_quote_tweet()
    );
  }

  id() {
    return this.data.id_str;
  }

  get_media() {
    const root = this.data.extended_tweet || this.data;
    const extended_media = root.extended_entities
      ? root.extended_entities.media
      : null;
    const single_media = root.entities ? root.entities.media : null;
    return extended_media || single_media || [];
  }

  async get_parent_tweet() {
    if (this.data.in_reply_to_status_id_str) {
      const parent_data = await twitter.get_tweet(
        this.data.in_reply_to_status_id_str
      );
      return new Tweet(parent_data);
    }
    return null;
  }
}

module.exports = Tweet;
