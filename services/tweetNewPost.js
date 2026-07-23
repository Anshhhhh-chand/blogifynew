const User = require('../models/user');
const { decrypt } = require('./encryption');

async function tweetNewPost(post) {
  try {
    console.log(`🐦 Checking Twitter auto-post for post: "${post.title}" (slug: ${post.slug})`);

    const author = await User.findById(post.createdBy).select('+twitter.accessToken +twitter.refreshToken');

        if (!author) {
      console.log('❌ Author not found, skipping Twitter post');
      return;
    }

        if (!author.twitter || !author.twitter.autoTweet) {
      console.log(`ℹ️ Twitter auto-post disabled for user ${author._id}`);
      return;
    }

        if (!author.twitter.accessToken) {
      console.log(`❌ Twitter access token not found for user ${author._id}`);
      return;
    }

        console.log(`✅ Twitter auto-post enabled for user ${author._id} (@${author.twitter.screenName})`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const postUrl = `${baseUrl}/blog/${post.slug}`;

    let tweetText = `🆕 New post: "${post.title}"\n${postUrl}\n#blog #tech`;

        if (tweetText.length > 280) {
      const maxTitleLength = 280 - postUrl.length - 20; 
      const truncatedTitle = post.title.length > maxTitleLength 
        ? post.title.substring(0, maxTitleLength - 3) + '...'
        : post.title;
      tweetText = `🆕 New post: "${truncatedTitle}"\n${postUrl}\n#blog #tech`;
    }

        console.log(`📝 Tweet text: ${tweetText}`);
    console.log(`📏 Tweet length: ${tweetText.length} characters`);

        const { TwitterApi } = require('twitter-api-v2');
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    const accessToken = decrypt(author.twitter.accessToken);
    const refreshToken = author.twitter.refreshToken ? decrypt(author.twitter.refreshToken) : null;

        if (!accessToken) {
      console.error('❌ Failed to decrypt Twitter access token');
      return;
    }

        try {
      console.log('🔐 Initializing Twitter API client...');
      const oauthClient = new TwitterApi({ clientId, clientSecret });

      let client;
      const expiresAt = author.twitter.expiresAt ? new Date(author.twitter.expiresAt).getTime() : 0;
      if (expiresAt && Date.now() >= expiresAt - 60 * 1000 && refreshToken) {
        const refreshed = await oauthClient.refreshOAuth2Token(refreshToken);
        await User.findByIdAndUpdate(author._id, {
          'twitter.accessToken': encrypt(refreshed.accessToken),
          'twitter.refreshToken': refreshed.refreshToken ? encrypt(refreshed.refreshToken) : author.twitter.refreshToken,
          'twitter.expiresAt': new Date(Date.now() + refreshed.expiresIn * 1000)
        });
        client = refreshed.client; 
      } else {
        client = new TwitterApi(accessToken);
      }

      try {
        console.log('🔍 Verifying Twitter token...');
        const userData = await client.v2.me();
        console.log(`✅ Twitter token verified for user: @${userData.data.username}`);
      } catch (e) {
        console.warn('Token verification failed, attempting to tweet anyway');
      }

      console.log('📤 Posting tweet...');
      const tweet = await client.v2.tweet(tweetText);
      console.log(`✅ Successfully tweeted: ${tweet.data.id}`);

      await User.findByIdAndUpdate(author._id, {
        'twitter.lastTweetAt': new Date()
      });

            console.log(`🎉 Twitter auto-post completed for user ${author._id} (@${author.twitter.screenName})`);
      console.log(`🔗 Tweet URL: https://twitter.com/${author.twitter.screenName}/status/${tweet.data.id}`);

          } catch (error) {
      console.error('❌ Twitter API Error:', error);

            let errorMessage = 'Unknown Twitter API error';

            if (error.code === 402) {
        errorMessage = 'Twitter API subscription required or credits depleted. X has made this a premium API feature.';
        console.error('💡 Solution: Check your X developer portal billing and limits.');
      } else if (error.code === 403) {
        errorMessage = 'Insufficient permissions. Make sure your Twitter app has "Read and Write" permissions.';
        console.error('💡 Solution: Check your Twitter Developer App permissions');
      } else if (error.code === 401) {
        errorMessage = 'Authentication failed. The access token might be invalid or expired.';
        console.error('💡 Solution: Reconnect Twitter from profile to re-authorize.');
      } else if (error.code === 429) {
        errorMessage = 'Rate limit exceeded. Please wait before posting again.';
        console.error('💡 Solution: Twitter has rate limits. Wait a few minutes before posting again.');
      } else if (error.data && error.data.errors) {
        errorMessage = error.data.errors.map(err => err.message).join(', ');
      }

            console.error(`❌ Twitter posting failed: ${errorMessage}`);

    }

      } catch (error) {
    console.error('❌ Error in Twitter auto-post:', error);
  }
}

module.exports = tweetNewPost;
