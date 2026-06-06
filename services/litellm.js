// Direct Groq API integration (replacing LiteLLM due to compatibility issues)
async function chat(messages, model = "llama3-8b-8192") {
  // Allow overriding the model via env to match available models for the API key
  const modelToUse = process.env.GROQ_MODEL || model || 'groq/compound';
  console.log('Using Groq model:', modelToUse);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // include the raw API error for better debugging
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error in Groq API chat:', error);
    console.error('Error details:', {
      message: error.message,
      modelRequested: modelToUse,
      hasApiKey: !!process.env.GROQ_API_KEY
    });
    // Surface the underlying error message for callers
    throw new Error('Failed to get response from AI service: ' + (error.message || 'Unknown'));
  }
}

module.exports = { chat };
