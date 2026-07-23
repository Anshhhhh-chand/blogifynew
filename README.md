# Blogify - Autonomous AI Content Platform

**Blogify** is a modern, AI-powered blogging platform built on Node.js and Express. It has evolved from a standard blog into a fully autonomous, multi-agent AI content pipeline featuring Human-in-the-loop approvals, background processing, and a Vector Search RAG Chatbot.

## 🚀 Features

### 1. Multi-Agent Content Pipeline
Blogify orchestrates a team of specialized AI agents working in the background:
- **Planner:** Outlines the blog structure and identifies target keywords.
- **Researcher:** Fetches real-world data and context using web search capabilities.
- **Writer:** Compiles the plan and research into a structured Markdown draft.
- **Critic (LLM-as-a-Judge):** Evaluates the draft on Accuracy, Tone, SEO, and Engagement. If the score falls below a threshold, it forces the Writer to rewrite the draft autonomously.

### 2. Human-in-the-Loop Workflow
- Approved pipelines generate drafts that are held in an `awaiting_approval` state.
- The **Approvals Dashboard** allows humans to review the Critic's scores and the draft preview.
- Users can **Reject** (with optional feedback for the AI to rewrite) or **Approve & Publish**.

### 3. "Ask My Blog" (RAG Chatbot)
- A reader-facing chatbot that answers questions based *strictly* on the site's published content.
- Uses `@xenova/transformers` (`all-MiniLM-L6-v2`) to generate 384-dimensional vector embeddings of all blog posts locally, completely free of API costs.
- Queries MongoDB Atlas Vector Search (`$vectorSearch`) for ultra-fast semantic retrieval, with a seamless fallback to in-memory JS Cosine Similarity.
- Generates responses with inline citations linking back to original blog posts.

### 4. Live Traces & Background Processing
- Pipeline runs are queued in MongoDB and processed asynchronously via a polling background worker (`jobQueue.js`).
- **Live Trace Viewer:** Users can watch the AI agents "think" in real-time, viewing intermediate steps, research results, and logs through a polling UI.

### 5. Automated Analytics & Eval Harness
- **Analytics Agent:** A cron job aggregates synthetic engagement data and uses the LLM to generate actionable weekly insights.
- **Eval Harness:** A Jest-based testing suite evaluates the Critic agent against a dataset of known drafts to ensure the LLM-as-a-judge remains accurate and consistent.

### 6. Core Blog Features
- Secure User authentication (JWT stored in cookies)
- Blog CRUD with auto-generated URL slugs
- Cloudinary image hosting for cover images
- Twitter Auto-Posting (OAuth 2.0 PKCE) to tweet when a new post is published

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express (v5.1.0)
- **Database**: MongoDB with Mongoose (Atlas for Vector Search)
- **Frontend**: SSR using EJS templates, Bootstrap 5
- **AI Models**: LiteLLM interfacing with Groq (Llama 3.1 / 3.3 70b)
- **Local Vectors**: Transformers.js (`@xenova/transformers`)
- **Cloud**: Cloudinary for image storage
- **Auth**: JWT-based authentication

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB Atlas (for database and Vector Search)
- Groq API key
- Cloudinary account (for image uploads)
- Twitter Developer Account (optional, for auto-tweeting)

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
   # Core
   PORT=8000
   MONGO_URL=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret

   # AI Configuration
   GROQ_API_KEY=your_groq_api_key

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Security
   ENCRYPTION_KEY=your_32_byte_hex_encryption_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit: `http://localhost:8000`

---

## 🔍 Database Setup for RAG Chatbot

To enable the RAG Chatbot's ultra-fast semantic search, you must create a Vector Search Index in MongoDB Atlas:

1. Go to your MongoDB Atlas dashboard.
2. Select your cluster and go to the **Atlas Search** tab.
3. Click **Create Search Index** and choose **Atlas Vector Search** (JSON Editor).
4. Select the `blogify` database and the `embeddingchunks` collection.
5. Paste the following configuration:
```json
{
  "fields": [
    {
      "numDimensions": 384,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    }
  ]
}
```
6. Name the index `embedding_index` and create it. 
7. *Note: If the index is missing or building, Blogify will automatically fallback to in-memory JS Cosine Similarity so your site never breaks.*

