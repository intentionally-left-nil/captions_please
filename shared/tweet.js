const twitter = require('./twitter');

class Tweet {
  constructor(data) {
    this.data = data;
  }

  contains_handle(handle) {
    return this.data.text.toLowerCase().includes(handle);
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

  get_media() {
    const extended_media = this.data.extended_entities
      ? this.data.extended_entities.media
      : null;
    const single_media = this.data.entities ? this.data.entities.media : null;
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
