const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/user');
const { encrypt, decrypt } = require('../services/encryption');
const { checkForAuthenticationInCookie } = require('../middlewares/authenticatiion');
const { TwitterApi } = require('twitter-api-v2');

// Middleware to ensure user is authenticated
router.use(checkForAuthenticationInCookie("token"));

// Helper: PKCE code verifier/challenge
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}
function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Begin OAuth 2.0 user context flow
 */
router.get('/connect', async (req, res) => {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL;
    if (!clientId || !callbackUrl) {
      return res.status(500).send('Twitter OAuth not configured');
    }

    const state = crypto.randomBytes(16).toString('hex');

    const client = new TwitterApi({ clientId });
    // Let the library generate a matching code_challenge/code_verifier pair
    const { url, codeVerifier } = client.generateOAuth2AuthLink(callbackUrl, {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      state,
      code_challenge_method: 's256',
    });

    // Store state & verifier in httpOnly cookies (short TTL)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    };
    res.cookie('tw_state', state, cookieOptions);
    res.cookie('tw_code_verifier', codeVerifier, cookieOptions);

    return res.redirect(url);
  } catch (err) {
    console.error('Error starting Twitter OAuth:', err);
    return res.redirect('/user/profile?twitter=error');
  }
});

/**
 * OAuth callback handler
 */
router.get('/callback', async (req, res) => {
  try {
    const { state, code } = req.query;
    const storedState = req.cookies['tw_state'];
    const codeVerifier = req.cookies['tw_code_verifier'];
    if (!state || !code || !storedState || !codeVerifier || state !== storedState) {
      return res.redirect('/user/profile?twitter=error&reason=state');
    }

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL;

    const client = new TwitterApi({ clientId, clientSecret });
    const { client: loggedClient, accessToken, refreshToken, expiresIn } =
      await client.loginWithOAuth2({ code, codeVerifier, redirectUri: callbackUrl });

    // Get user profile
    const me = await loggedClient.v2.me();

    // Encrypt tokens and persist
    const encryptedAccess = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;
    const expiresAt = new Date(Date.now() + (expiresIn || 0) * 1000);

    await User.findByIdAndUpdate(
      req.user._id,
      {
        'twitter.accessToken': encryptedAccess,
        'twitter.refreshToken': encryptedRefresh,
        'twitter.expiresAt': expiresAt,
        'twitter.userId': me.data.id,
        'twitter.screenName': me.data.username,
        'twitter.autoTweet': true,
        'twitter.lastTweetAt': null,
      },
      { new: true, runValidators: true }
    );

    // Clear cookies
    res.clearCookie('tw_state');
    res.clearCookie('tw_code_verifier');

    return res.redirect('/user/profile?twitter=connected');
  } catch (err) {
    console.error('Twitter OAuth callback error:', err);
    return res.redirect('/user/profile?twitter=error');
  }
});

/**
 * Disable Twitter auto-tweet
 */
router.post('/disable', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      'twitter.autoTweet': false,
      'twitter.accessToken': null,
      'twitter.accessTokenSecret': null,
      'twitter.refreshToken': null,
      'twitter.expiresAt': null,
    });

    console.log(`Twitter auto-tweet disabled for user ${req.user._id}`);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        message: 'Auto-tweet disabled'
      });
    }
    
    res.redirect('/user/profile?twitter=disabled');
  } catch (error) {
    console.error('Error disabling Twitter auto-tweet:', error);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({
        success: false,
        error: 'Failed to disable Twitter settings. Please try again.'
      });
    }
    
    res.redirect('/user/profile?error=twitter_disable_failed');
  }
});

/**
 * Test Twitter connection
 */
router.post('/test', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twitter.accessToken +twitter.refreshToken');
    
    if (!user.twitter || !user.twitter.autoTweet || !user.twitter.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Twitter not configured. Please connect your account first.'
      });
    }

    // Test the actual Twitter connection
    try {
      const accessToken = decrypt(user.twitter.accessToken);
      let refreshToken = user.twitter.refreshToken ? decrypt(user.twitter.refreshToken) : null;
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Failed to decrypt Twitter token. Please reconnect your account.'
        });
      }
      const clientId = process.env.TWITTER_CLIENT_ID;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET;
      let client = new TwitterApi({ clientId, clientSecret });

      // If token is expired or close to expiry, refresh
      const needsRefresh = user.twitter.expiresAt && (Date.now() >= new Date(user.twitter.expiresAt).getTime() - 60 * 1000);
      if (needsRefresh && refreshToken) {
        const refreshed = await client.refreshOAuth2Token(refreshToken);
        const newEncryptedAccess = encrypt(refreshed.accessToken);
        const newEncryptedRefresh = refreshed.refreshToken ? encrypt(refreshed.refreshToken) : user.twitter.refreshToken;
        await User.findByIdAndUpdate(user._id, {
          'twitter.accessToken': newEncryptedAccess,
          'twitter.refreshToken': newEncryptedRefresh,
          'twitter.expiresAt': new Date(Date.now() + refreshed.expiresIn * 1000),
        });
        client = new TwitterApi({ clientId, clientSecret, accessToken: refreshed.accessToken });
      } else {
        client = new TwitterApi(accessToken);
      }
      
      // Test the connection by getting user info
      const userData = await client.v2.me();
      
    res.json({
      success: true,
        message: `✅ Twitter connection successful! Connected as @${userData.data.username}`,
        screenName: userData.data.username
      });
      
    } catch (twitterError) {
      console.error('Twitter API test error:', twitterError);
      
      let errorMessage = 'Failed to connect to Twitter';
      
      if (twitterError.code === 403) {
        errorMessage = 'Insufficient permissions. Make sure your Twitter app has "Read and Write" permissions.';
      } else if (twitterError.code === 401) {
        errorMessage = 'Invalid Bearer Token. Please generate a new one from Twitter Developer Portal.';
      } else if (twitterError.code === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a few minutes before testing again.';
      }
      
      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
    
  } catch (error) {
    console.error('Error testing Twitter connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Twitter connection'
    });
  }
});

module.exports = router;
