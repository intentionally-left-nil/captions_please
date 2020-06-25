const allSettled = require('promise.allsettled');
const vision = require('./vision');

const process_image = async (url) => {
  return vision(url);
};

const get_successful_promises = (settled_promises) =>
  settled_promises
    .filter(({ status }) => status === 'fulfilled')
    .map(({ value }) => value);

module.exports = async function (context, item) {
  const result_promises = item.media.map(({ media_url_https }) =>
    process_image(media_url_https)
  );
  const successful_results = await allSettled(result_promises).then(
    get_successful_promises
  );

  for (result of successful_results) {
    console.log('parsed image successfully');
    console.log(result);
  }
};
