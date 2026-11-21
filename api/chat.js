export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Read the encrypted server-side environment variable
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on the Vercel server environment.'
    });
  }

  try {
    const { messages, model } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required.' });
    }

    // Target user-selected model or default to GPT-6 Luna
    const targetModel = model || 'gpt-6-luna';

    const reqPayload = {
      model: targetModel,
      messages: messages,
      stream: true,
      max_completion_tokens: 2500
    };

    // Reasoning models (luna, gpt-5 flagship, o-series) only support default temperature
    const isReasoningModel = targetModel.toLowerCase().includes('luna') || 
                             targetModel.startsWith('o1') || 
                             targetModel.startsWith('o3') || 
                             targetModel === 'gpt-5' || 
                             targetModel.includes('-pro');

    if (!isReasoningModel) {
      reqPayload.temperature = 0.2;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    // Stream SSE back to client
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error('Serverless chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      res.end();
    }
  }
}
