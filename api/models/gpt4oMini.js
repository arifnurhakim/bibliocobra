/**
 * GPT-4o-mini Integration
 * Premium model for complex reasoning and decision-making tasks
 * Provides high-quality outputs for critical analysis
 */

export async function callGPT4oMini(prompt, options = {}) {
  const API_KEY = process.env.OPENAI_API_KEY;

  if (!API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const {
    temperature = 0.7,
    maxTokens = 4000,
    topP = 1,
    retries = 2
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
          max_tokens: maxTokens,
          top_p: topP
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from GPT-4o-mini');
      }

      const result = data.choices[0]?.message?.content;
      if (!result) {
        throw new Error('Empty response from GPT-4o-mini');
      }

      return {
        text: result,
        model: 'gpt-4o-mini',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      lastError = error;
      console.error(`[GPT-4o-mini] Attempt ${attempt + 1} failed:`, error.message);

      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
}

/**
 * Estimate cost for GPT-4o-mini
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Estimated cost in USD
 */
export function estimateGPT4oCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.6;
  return inputCost + outputCost;
}
