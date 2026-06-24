/**
 * Gemini Flash Lite Integration
 * Cost-effective model for light, text-heavy tasks
 * ~90% cheaper than premium models
 */

export async function callGeminiFlashLite(prompt, options = {}) {
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const {
    temperature = 0.3,
    maxTokens = 2000,
    topP = 0.9,
    retries = 2
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' +
          API_KEY,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: temperature,
              maxOutputTokens: maxTokens,
              topP: topP
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini model');
      }

      const result = data.candidates[0]?.content?.parts?.[0]?.text;
      if (!result) {
        throw new Error('Empty response from Gemini model');
      }

      return {
        text: result,
        model: 'gemini-2.0-flash-lite',
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      lastError = error;
      console.error(`[Gemini Flash Lite] Attempt ${attempt + 1} failed:`, error.message);

      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
}

/**
 * Estimate cost for Gemini Flash Lite
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Estimated cost in USD
 */
export function estimateGeminiCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.3;
  return inputCost + outputCost;
}
