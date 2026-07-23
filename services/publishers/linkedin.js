
async function publish(post, user) {
  console.log(`[publishers/linkedin] LinkedIn publish stub called for post: ${post.title}`);
  return {
    success: false,
    message: 'LinkedIn publisher not yet configured. Add LINKEDIN_CLIENT_ID and implement OAuth flow.',
  };
}

module.exports = { publish };
