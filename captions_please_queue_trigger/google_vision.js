const { get_secret } = require('../shared/secrets');
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

  const paragraphs = response.fullTextAnnotation.pages
    .map(({ blocks }) => blocks.map(({ paragraphs }) => paragraphs))
    .flat(2);
  const text = paragraphs
    .map(({ words }) =>
      words
        .map(({ symbols }) => symbols.map(({ text }) => text).join(''))
        .join(' ')
    )
    .join('\n\n');
  return text.trim() ? text : null;
};

module.exports = { get_text, get_client };
