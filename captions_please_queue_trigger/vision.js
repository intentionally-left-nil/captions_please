const google_vision = require('./google_vision');
const azure_vision = require('./azure_vision');

module.exports = async (url) => {
  const google_client = await google_vision.get_client();
  const text = await google_vision.get_text(google_client, url);
  if (text) {
    return {
      type: 'text',
      value: text,
    };
  }

  const azure_client = await azure_vision.get_client();
  const caption = await azure_vision.get_caption(azure_client, url);
  return caption
    ? {
        type: 'caption',
        value: caption,
      }
    : {
        type: 'unknown',
      };
};
