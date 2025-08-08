const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user');

async function resetTwitterTokens() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find users with Twitter tokens
    const users = await User.find({
      'twitter.accessToken': { $exists: true },
      'twitter.accessToken': { $ne: null }
    });

    console.log(`Found ${users.length} users with Twitter tokens`);

    // Clear Twitter tokens for each user
    for (const user of users) {
      console.log(`\nResetting Twitter tokens for user: ${user._id} (${user.username || user.email})`);
      
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'twitter.accessToken': null,
          'twitter.accessTokenSecret': null,
          'twitter.autoTweet': false,
          'twitter.lastTweetAt': null
        }
      });
      
      console.log(`✅ Reset Twitter tokens for user: ${user._id}`);
    }

    console.log('\n✅ All Twitter tokens have been reset');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting Twitter tokens:', error);
    process.exit(1);
  }
}

resetTwitterTokens();
