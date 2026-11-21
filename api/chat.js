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

  // Read the server-side environment variable
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
    const isProModel = targetModel.toLowerCase().includes('-pro');

    // 1. Pro Models (e.g. gpt-5.5-pro, gpt-5-pro) use v1/responses endpoint
    if (isProModel) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          input: messages,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).send(errText);
      }

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'response.output_text.delta' && event.delta) {
              const chatChunk = {
                choices: [{
                  delta: { content: event.delta }
                }]
              };
              res.write(`data: ${JSON.stringify(chatChunk)}\n\n`);
            } else if (event.type === 'response.completed') {
              res.write(`data: [DONE]\n\n`);
            }
          } catch (e) {
            // Ignore parse errors on intermediate chunks
          }
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    // 2. Standard Chat Models (gpt-6-luna, gpt-5.4-mini, gpt-4o, etc.) use v1/chat/completions
    const reqPayload = {
      model: targetModel,
      messages: messages,
      stream: true,
      max_completion_tokens: 2500
    };

    // Reasoning models only support default temperature (omit temperature parameter)
    const isReasoningModel = targetModel.toLowerCase().includes('luna') || 
                             targetModel.toLowerCase().includes('gpt-5') ||
                             targetModel.startsWith('o1') || 
                             targetModel.startsWith('o3');

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
