const { get_secret } = require('../shared/secrets');
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const ComputerVisionClient = require('@azure/cognitiveservices-computervision')
  .ComputerVisionClient;

const DETECT_ORIENTATION = true;

const get_client = async () => {
  const { value: key } = await get_secret('ComputerVisionKey');
  const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
    'https://captionspleasecomputervision.cognitiveservices.azure.com/'
  );
  return computerVisionClient;
};

const get_text = async (computerVisionClient, url) => {
  const response = await computerVisionClient.recognizePrintedText(
    DETECT_ORIENTATION,
    url
  );
  if (!response.regions.length) {
    return null;
  }
  const text = response.regions
    .map(({ lines }) =>
      lines
        .map((line) => line.words.map(({ text }) => text).join(' '))
        .join(' ')
    )
    .join('\n\n');
  return text.trim() ? text : null;
};

const get_caption = async (computerVisionClient, url) => {
  response = await computerVisionClient.describeImage(url);
  return response.captions.length ? response.captions[0].text : null;
};

module.exports = { get_client, get_caption, get_text };
