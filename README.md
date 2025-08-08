# Blogify - AI-Powered Blog Platform

A modern blog platform with AI-powered content generation and optimization features.

## Features

- 🚀 AI-powered blog post generation
- 🔍 SEO optimization suggestions

- 📅 Content calendar planning
- 📱 Responsive design
- 🔐 User authentication
- ☁️ Cloudinary image hosting

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Frontend**: EJS templates, Bootstrap 5
- **AI**: LiteLLM with Groq (Llama 3.1 8B)
- **Cloud**: Cloudinary for image storage
- **Auth**: JWT-based authentication

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Groq API key
- Cloudinary account (for image uploads)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/blogify.git
   cd blogify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```env
   # Groq API Configuration
   GROQ_API_KEY=your_groq_api_key_here
   
   # MongoDB Configuration
   MONGO_URI=your_mongodb_connection_string
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit: `http://localhost:8000`

## AI Integration

This project uses LiteLLM to interface with Groq's Llama 3.1 8B model for AI-powered features.

### AI Features

1. **Blog Post Generation**
   - Generate complete blog posts from a topic
   - Get well-structured markdown content

2. **SEO Optimization**
   - Get SEO suggestions for your posts
   - Optimize titles, meta descriptions, and URLs

3. **Content Calendar**
   - Get content planning suggestions
   - Plan your editorial calendar with AI

### Testing the AI Integration

To verify the Groq API connection, you can use the test endpoint:

```bash
curl http://localhost:8000/ai/test-groq
```

## Migrating from OpenAI to Groq

This project was migrated from using OpenAI to Groq via LiteLLM. Here's what changed:

### Changes Made

1. **Dependencies**
   - Removed `@langchain/openai` and related packages
   - Added `litellm` for model-agnostic LLM access

2. **Configuration**
   - Updated environment variables to use `GROQ_API_KEY`
   - Simplified model configuration

3. **Code Changes**
   - Replaced LangChain abstractions with direct LiteLLM calls
   - Simplified prompt templates
   - Improved error handling and fallbacks

### Benefits

- **Faster responses**: Groq's inference engine provides lower latency
- **Cost-effective**: More affordable than OpenAI for many use cases
- **Open weights**: Uses the open-weight Llama 3.1 8B model

## License

MIT

## Acknowledgments

- Built with ❤️ using Node.js, Express, and LiteLLM
- Uses Groq for high-performance AI inference
- Cloudinary for image storage and optimization

# Blogging App

This is a simple blogging app with AI helper and Twitter auto-posting.

## Twitter OAuth 2.0 Setup (User Context)

- In the Twitter Developer portal, enable OAuth 2.0 for your app, set permissions to Read and Write, and add the callback URL.
- Environment variables required:
  - `TWITTER_CLIENT_ID`
  - `TWITTER_CLIENT_SECRET`
  - `TWITTER_CALLBACK_URL` (e.g., http://localhost:8000/twitter/callback)
  - `BASE_URL` (e.g., http://localhost:8000)
- In the Profile page, click "Connect Twitter" to link your account, then use "Test Connection" to verify.
