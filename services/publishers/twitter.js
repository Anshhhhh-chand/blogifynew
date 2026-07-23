
const { decrypt, encrypt } = require('../encryption');
const User = require('../../models/user');

async function publish(post, user) {
  try {
    if (!user.twitter || !user.twitter.autoTweet || !user.twitter.accessToken) {
      return { success: false, message: 'Twitter not configured or disabled' };
    }

    const { TwitterApi } = require('twitter-api-v2');
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const postUrl = `${baseUrl}/blog/${post.slug}`;

    const accessToken = decrypt(user.twitter.accessToken);
    const refreshToken = user.twitter.refreshToken ? decrypt(user.twitter.refreshToken) : null;

    if (!accessToken) {
      return { success: false, message: 'Failed to decrypt Twitter access token' };
    }

    const oauthClient = new TwitterApi({ clientId, clientSecret });
    let client;

    const expiresAt = user.twitter.expiresAt ? new Date(user.twitter.expiresAt).getTime() : 0;
    if (expiresAt && Date.now() >= expiresAt - 60 * 1000 && refreshToken) {
      const refreshed = await oauthClient.refreshOAuth2Token(refreshToken);
      await User.findByIdAndUpdate(user._id, {
        'twitter.accessToken': encrypt(refreshed.accessToken),
        'twitter.refreshToken': refreshed.refreshToken ? encrypt(refreshed.refreshToken) : user.twitter.refreshToken,
        'twitter.expiresAt': new Date(Date.now() + refreshed.expiresIn * 1000),
      });
      client = refreshed.client;
    } else {
      client = new TwitterApi(accessToken);
    }

    let tweetText = `🆕 New post: "${post.title}"\n${postUrl}\n#blog #tech`;
    if (tweetText.length > 280) {
      const maxTitleLen = 280 - postUrl.length - 25;
      const truncatedTitle =
        post.title.length > maxTitleLen
          ? post.title.substring(0, maxTitleLen - 3) + '...'
          : post.title;
      tweetText = `🆕 New post: "${truncatedTitle}"\n${postUrl}\n#blog #tech`;
    }

    const tweet = await client.v2.tweet(tweetText);
    await User.findByIdAndUpdate(user._id, { 'twitter.lastTweetAt': new Date() });

    return {
      success: true,
      message: `Tweeted: https://twitter.com/${user.twitter.screenName}/status/${tweet.data.id}`,
    };
  } catch (error) {
    console.error('[publishers/twitter] Error:', error);
    return { success: false, message: error.message || 'Twitter publish failed' };
  }
}

module.exports = { publish };
