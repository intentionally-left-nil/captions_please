const { get_secret } = require('../shared/secrets');
const { sanitize } = require('./vision_utils');
const api = require('@google-cloud/vision');

const get_client = async () => {
  const { value: client_email } = await get_secret('GoogleClientEmail');
  const { value: private_key } = await get_secret('GoogleClientPrivateKey');
  const credentials = { client_email, private_key };
  const google_client = new api.ImageAnnotatorClient({ credentials });
  return google_client;
};

const get_text = async (google_client, url) => {
  const [response] = await google_client.textDetection(url);
  if (!response.fullTextAnnotation) return null;

  const { pages } = response.fullTextAnnotation;
  const blocks = pages.map(({ blocks }) => blocks).flat();
  const paragraphs = blocks
    .map(({ paragraphs }) =>
      paragraphs
        .map(({ words }) =>
          words
            .map(({ symbols }) => symbols.map(({ text }) => text).join(''))
            .join(' ')
        )
        .join('\n\n')
    )
    .flat();
  return sanitize(paragraphs);
};

module.exports = { get_text, get_client };
