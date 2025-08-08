# Twitter Auto-Posting Setup Guide

This guide will help you set up automatic Twitter posting for your blog posts.

## Prerequisites

1. A Twitter Developer Account
2. A Twitter App with OAuth 2.0 Bearer Token
3. Your blog application running

## Step 1: Create a Twitter Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/projects)
2. Sign in with your Twitter account
3. Apply for a developer account if you don't have one
4. Wait for approval (usually takes 1-2 days)

## Step 2: Create a Twitter App

1. In the Twitter Developer Portal, click "Create App"
2. Fill in the required information:
   - App name: Your blog name (e.g., "My Blog Auto-Poster")
   - App description: "Automatically posts new blog articles to Twitter"
   - Website URL: Your blog URL
   - Callback URL: Leave empty for Bearer Token usage
3. Accept the terms and create the app

## Step 3: Configure App Permissions

1. In your app settings, go to "User authentication settings"
2. Enable OAuth 2.0
3. Set App permissions to "Read and Write"
4. Save the changes

## Step 4: Generate Bearer Token

1. In your app settings, go to "Keys and tokens"
2. Under "Authentication Tokens", click "Generate" next to "Bearer Token"
3. Copy the generated token (it starts with "AAAAAAAAAAAAAAAAAAAAA...")
4. **Keep this token secure and never share it publicly**

## Step 5: Configure Your Blog Application

1. Go to your blog's profile page
2. Scroll down to the "Twitter Auto-Posting" section
3. Enter your Twitter username (without @)
4. Paste your Bearer Token
5. Click "Save & Enable Auto-Posting"

## Step 6: Test the Connection

1. Click the "Test Connection" button
2. If successful, you'll see a confirmation message
3. If there's an error, check the troubleshooting section below

## How It Works

- When you create a new blog post, the system automatically:
  1. Checks if you have Twitter integration enabled
  2. Generates a tweet with your post title and URL
  3. Posts it to your Twitter account
  4. Updates the last tweet timestamp

## Tweet Format

The system generates tweets in this format:
```
🆕 New post: "Your Blog Post Title"
https://yourblog.com/blog/your-post-slug
#blog #tech
```

## Troubleshooting

### Common Issues

1. **"Invalid Bearer Token" Error**
   - Make sure you copied the entire token
   - Generate a new token if needed
   - Ensure the token starts with "AAAAAAAAAAAAAAAAAAAAA..."

2. **"Insufficient Permissions" Error**
   - Go to your Twitter App settings
   - Make sure "Read and Write" permissions are enabled
   - Wait a few minutes for changes to take effect

3. **"Rate Limit Exceeded" Error**
   - Twitter has rate limits on API calls
   - Wait a few minutes before trying again
   - Consider posting less frequently

4. **"Authentication Failed" Error**
   - Your Bearer Token might be expired
   - Generate a new token from the Twitter Developer Portal
   - Update your settings with the new token

### Debugging

1. Check the server logs for detailed error messages
2. Use the "Test Connection" button to verify your setup
3. Make sure your Twitter App is active and not suspended

## Security Notes

- Your Bearer Token is encrypted before being stored in the database
- The token is only used to post tweets when you publish new blog posts
- Never share your Bearer Token publicly
- You can disable auto-posting at any time from your profile page

## Migration

If you have existing blog posts without slugs, run the migration script:

```bash
node scripts/migrateBlogSlugs.js
```

This will add slugs to all existing blog posts so they can be properly tweeted.

## Support

If you continue to have issues:

1. Check the Twitter Developer documentation
2. Verify your app settings in the Twitter Developer Portal
3. Check the server logs for detailed error messages
4. Ensure your Twitter account is not restricted or suspended
