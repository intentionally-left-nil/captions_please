// https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/keyvault/keyvault-secrets/samples/javascript/helloWorld.js

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

const get_secret = async (name) => {
  const credential = new DefaultAzureCredential();
  const url = 'https://captionspleasevault.vault.azure.net/';
  const client = new SecretClient(url, credential);
  return await client.getSecret(name);
};

const get_all_secrets = async () => {
  const secrets = {};
  const names = [
    'TwitterConsumerKey',
    'TwitterConsumerSecret',
    'TwitterAccessToken',
    'TwitterAccessTokenSecret',
    'TwitterBearerToken',
  ];

  const requests = names.map(get_secret).then((secret) => {
    secrets[secret.name] = secret.value;
  });
  await Promise.all(requests);
  return secrets;
};

module.exports = { get_secret, get_all_secrets };
