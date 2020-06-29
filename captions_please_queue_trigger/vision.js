const { get_secret } = require('../shared/secrets');
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const ComputerVisionClient = require('@azure/cognitiveservices-computervision')
  .ComputerVisionClient;

const DETECT_ORIENTATION = true;

const sanitize = (paragraphs) => {
  paragraphs = paragraphs.map((lines) => lines.filter((line) => line.trim()));
  paragraphs = paragraphs.filter((lines) => lines.length > 0);
  return paragraphs.length > 0 ? paragraphs : null;
};

const getText = async (computerVisionClient, url) => {
  const response = await computerVisionClient.recognizePrintedText(
    DETECT_ORIENTATION,
    url
  );
  if (!response.regions.length) {
    return null;
  }
  return sanitize(
    response.regions.map((region) =>
      region.lines.map((line) => line.words.map(({ text }) => text).join(' '))
    )
  );
};

const getCaption = async (computerVisionClient, url) => {
  response = await computerVisionClient.describeImage(url);
  return response.captions.length ? response.captions[0].text : null;
};

const vision = async (url) => {
  const { value: key } = await get_secret('ComputerVisionKey');
  const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
    'https://captionspleasecomputervision.cognitiveservices.azure.com/'
  );

  const text = await getText(computerVisionClient, url);
  if (text) {
    return {
      type: 'text',
      value: text,
    };
  }

  const caption = await getCaption(computerVisionClient, url);
  return caption
    ? {
        type: 'caption',
        value: caption,
      }
    : {
        type: 'unknown',
      };
};

module.exports = vision;
