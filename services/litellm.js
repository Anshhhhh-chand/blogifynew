// Direct Groq API integration (replacing LiteLLM due to compatibility issues)
async function chat(messages, model = "llama3-8b-8192") {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error in Groq API chat:', error);
    console.error('Error details:', {
      message: error.message,
      model: model,
      hasApiKey: !!process.env.GROQ_API_KEY
    });
    throw new Error('Failed to get response from AI service');
  }
}

module.exports = { chat };
