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
  const data = {};
  const names = [
    'TwitterConsumerKey',
    'TwitterConsumerSecret',
    'TwitterAccessToken',
    'TwitterAccessTokenSecret',
    'TwitterBearerToken',
  ];

  const secrets = await Promise.all(names.map(get_secret));
  for (const secret of secrets) {
    data[secret.name] = secret.value;
  }
  return data;
};

module.exports = { get_secret, get_all_secrets };
