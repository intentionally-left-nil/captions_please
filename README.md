# Captions, Please!

This codebase supports the twitter bot, @captions_please which responds to tweet webhooks and replies with the description of images in the tweet. Here's how it works:

1. Using the Twitter developer portal, set up an [Account Activity Webhook](https://developer.twitter.com/en/docs/accounts-and-users/subscribe-account-activity/guides/account-activity-data-objects).
2. To actually power the webhook, we need to call /webhooks to register our URL with the webhook. Then, we need to subscribe a user (@captions_please) to the webhook. Since this only needs to happen ~once, I am just using some scripts to get the oauth access token for the @captions_please user, and then call the appropriate [webhook and subscribe POST methods](https://developer.twitter.com/en/docs/accounts-and-users/subscribe-account-activity/api-reference)
3. Now that twitter is talking to us, we need a server that will listen and respond to these HTTP requests. Instead of running a full webserver, I decided to learn how to use [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node) as a serverless architecture.
4. To parse the image, I'm using the [Azure cognitive services](https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/tutorials/storage-lab-tutorial) API to decode the image.

The full flow looks like this:

1. User posts a tweet that contains @captions_please
2. Twitter calls my webhook with the tweet data, including the tweet id, as well as the URL that the photos are accessible at
3. Azure takes care of the machinery of listening to the endpoint, and running my code to handle the request
4. Inside the webhook, I validate the tweet to make sure it's something to respond to. To get the media, I may need to make an outbound API call to get the parent tweet's information.
5. Once I've computed the URL of the image, I don't directly parse it. Instead, this data goes into an azure queue, and at this point the webhook returns, without doing anything.
6. Azure manages the queue and starts another Azure function that I wrote, captions_please_queue_trigger, to process the request. Inside here, I make an API call to the cognitive services to do OCR recognition of the image. If that fails, I try to get a sentiment description of the image. Once I have this data, inside of this secondary worker, I make an outbound API call (or calls if the response takes multiple tweets) to reply to the original message with the new data

The underlying code isn't too complicated, it's mostly just piping data around. Most of the challenge was configuring twitter, azure, and the image recognition code to all work together nicely.

I did find two challenges though:

## Oauth

Twitter OAuth is a PITA. I made my life more complicated than it should have been by being stubborn and partially rolling a solution myself. The POST body has to be encoded in a very specific way for it to pass authentication, and this has to agree with the code you use to generate the hash. I ended up using the [twitter-lite](https://github.com/draftbit/twitter-lite/blob/master/twitter.js) code for reference to help figure out how to send data properly. This took a bunch of time.

It's also worth taking a moment to consider the different types of OAuth secrets and how they're used.

1. The combination of the Consumer Key and Consumer Key Secret are what OAuth uses to know that they are talking to the proper server (aka you, the developer). This is why, for example, to authenticate the webhook, the requirement is that you sign the response with the consumer key secret, as only you should have it. The consumer key and secret are also used in the 3-legged auth process to allow our app to log on behalf of a user.
2. OAuth Bearer token is effectively a machine token that is mostly equivalent to the consumer key and consumer key secret. We mostly don't need it for our application.
3. The Access Token and Access Token Secret are the user half of OAuth. When users go through the OAuth flow, eventually these tokens make their way back to the app. This allows the app to do things on behalf of the user. It is basically proof for twitter that says the user gave you permission to do things on their behalf. Since we don't need to dynamically authenticate users, I used the [twurl](https://github.com/twitter/twurl) commad line to generate the access tokens for @captions_please for my app.

So back to signing the request. Both the query params (in the URL), as well as the body params (for a POST request) need to get combined, alphabetized, escaped, and then signed with oauth keys to work properly. This set of data can then be appended to the body, or added as an HTTP header. Since get requests don't have a body, I decided to always use an Authorization header.

## Breaking out the response

The only other technically challenging part of the project is to take a response, which is potentially much larger than can fit in one tweet, and break that up into multiple tweets. You can take a look into the logic in [tweet_reply.js#group_paragraphs_into_tweets](./captions_please_queue_trigger/tweet_reply.js)

## Azure

For the azure setup, this was pretty straightforward, just stitching some tutorials together. The magic is in the function.json file of each function. This is where I specify that the webhook has an HTTP in request, and that it has an outbound queue. I use the same queue as an inbound for the captions_please_queue_trigger, and azure does the rest for me.
I'm using the Azure Key vault to hold my secrets, such as all of the twitter auth tokens, and the token to connect to the compute service

## TODO

- Add tests
- Rate limiting
- Special handling of memes
- Make sure the support works well for all languages
