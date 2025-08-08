const User = require('../models/user');
const { decrypt } = require('./encryption');

/**
 * Auto-tweet a new blog post if user has enabled Twitter integration
 * @param {Object} post - The blog post object
 * @param {string} post.title - Post title
 * @param {string} post.slug - Post slug for URL
 * @param {string} post.createdBy - User ID who created the post
 */
async function tweetNewPost(post) {
  try {
    console.log(`🐦 Checking Twitter auto-post for post: "${post.title}" (slug: ${post.slug})`);
    
    // Get user with Twitter settings
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
    
    // Construct tweet text
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const postUrl = `${baseUrl}/blog/${post.slug}`;
    
    // Create tweet text (max 280 characters)
    let tweetText = `🆕 New post: "${post.title}"\n${postUrl}\n#blog #tech`;
    
    if (tweetText.length > 280) {
      // Truncate title if tweet is too long
      const maxTitleLength = 280 - postUrl.length - 20; // 20 chars for "🆕 New post: \n\n#blog #tech"
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
    
    // Decrypt tokens
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
      // Refresh if expired or near expiry
      const expiresAt = author.twitter.expiresAt ? new Date(author.twitter.expiresAt).getTime() : 0;
      if (expiresAt && Date.now() >= expiresAt - 60 * 1000 && refreshToken) {
        const refreshed = await oauthClient.refreshOAuth2Token(refreshToken);
        // Persist new tokens
        await User.findByIdAndUpdate(author._id, {
          'twitter.accessToken': encrypt(refreshed.accessToken),
          'twitter.refreshToken': refreshed.refreshToken ? encrypt(refreshed.refreshToken) : author.twitter.refreshToken,
          'twitter.expiresAt': new Date(Date.now() + refreshed.expiresIn * 1000)
        });
        client = refreshed.client; // already authenticated client
      } else {
        client = new TwitterApi(accessToken);
      }
      
      // Verify the token is still valid by making a simple API call
      try {
        console.log('🔍 Verifying Twitter token...');
        const userData = await client.v2.me();
        console.log(`✅ Twitter token verified for user: @${userData.data.username}`);
      } catch (e) {
        console.warn('Token verification failed, attempting to tweet anyway');
      }
      
      // Post tweet using v2 API
      console.log('📤 Posting tweet...');
      const tweet = await client.v2.tweet(tweetText);
      console.log(`✅ Successfully tweeted: ${tweet.data.id}`);
      
      // Update last tweet timestamp
      await User.findByIdAndUpdate(author._id, {
        'twitter.lastTweetAt': new Date()
      });
      
      console.log(`🎉 Twitter auto-post completed for user ${author._id} (@${author.twitter.screenName})`);
      console.log(`🔗 Tweet URL: https://twitter.com/${author.twitter.screenName}/status/${tweet.data.id}`);
      
    } catch (error) {
      console.error('❌ Twitter API Error:', error);
      
      let errorMessage = 'Unknown Twitter API error';
      
      if (error.code === 403) {
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
      
      // Don't throw error to avoid breaking the blog post creation flow
      // But we could log this to a separate error tracking system
    }
    
  } catch (error) {
    console.error('❌ Error in Twitter auto-post:', error);
    // Don't throw error to avoid breaking the blog post creation flow
  }
}

module.exports = tweetNewPost;
