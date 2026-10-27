// Vercel serverless function: Gemini API key stays on the server.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Method not allowed. Use POST.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is missing from the server environment.'
    });
  }

  const { resume, jobDesc, systemPrompt } = req.body || {};

  if (
    typeof resume !== 'string' ||
    typeof jobDesc !== 'string' ||
    typeof systemPrompt !== 'string'
  ) {
    return res.status(400).json({
      error: 'Please provide a resume, job description, and prompt.'
    });
  }

  if (resume.trim().length < 50 || jobDesc.trim().length < 50) {
    return res.status(400).json({
      error: 'Resume and job description must each contain at least 50 characters.'
    });
  }

  if (resume.length > 30000 || jobDesc.length > 20000) {
    return res.status(413).json({
      error: 'Input is too long. Please shorten the resume or job description.'
    });
  }

  const userPrompt =
    `Resume:\n${resume.trim()}\n\n` +
    `Job Description:\n${jobDesc.trim()}\n\n` +
    'Provide your analysis as a JSON object with the exact fields specified.';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const rawResponse = await response.text();

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch {
      console.error('Gemini returned a non-JSON response.');
      return res.status(502).json({
        error: 'Gemini returned an unexpected response. Please try again.'
      });
    }

    if (!response.ok) {
      const message =
        data?.error?.message || `Gemini API returned status ${response.status}`;

      // Log details for debugging, but never log the API key.
      console.error('Gemini API error:', response.status, message);

      return res.status(response.status === 429 ? 429 : 502).json({
        error: message
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!text) {
      console.error(
        'Gemini returned no text. Finish reason:',
        data?.candidates?.[0]?.finishReason || 'unknown'
      );

      return res.status(502).json({
        error: 'Gemini returned no analysis text. Please try again.'
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Gemini request timed out.');

      return res.status(504).json({
        error: 'Gemini took too long to respond. Please try again.'
      });
    }

    console.error('Gemini request failed:', error.message);

    return res.status(502).json({
      error: 'Could not connect to Gemini. Please try again.'
    });
  } finally {
    clearTimeout(timeout);
  }
};