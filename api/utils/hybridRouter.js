/**
 * Hybrid AI Router
 * Intelligently routes tasks to the most appropriate AI model
 * based on complexity, cost, and quality requirements
 */

import { TASK_TYPES } from '../constants/taskTypes.js';
import { callGeminiFlashLite, estimateGeminiCost } from '../models/geminiFlashLite.js';
import { callGPT4oMini, estimateGPT4oCost } from '../models/gpt4oMini.js';

/**
 * Main router function - selects best model for the task
 * @param {string} taskType - Type of task to classify
 * @param {string} prompt - The prompt to send to AI
 * @param {object} options - Additional options (temperature, maxTokens, etc)
 * @returns {Promise<object>} Response with text, model used, and cost info
 */
export async function routeToHybridAI(taskType, prompt, options = {}) {
  try {
    // Determine which model to use
    const modelType = selectModel(taskType);

    let response;
    let estimatedCost;

    if (modelType === 'gemini_flash_lite') {
      response = await callGeminiFlashLite(prompt, {
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 2000,
        retries: options.retries || 2
      });
      estimatedCost = estimateGeminiCost(
        response.usage.promptTokens,
        response.usage.outputTokens
      );
    } else {
      response = await callGPT4oMini(prompt, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 4000,
        retries: options.retries || 2
      });
      estimatedCost = estimateGPT4oCost(
        response.usage.promptTokens,
        response.usage.outputTokens
      );
    }

    // Calculate potential savings vs always using premium model
    const premiumCost = estimateGPT4oCost(
      response.usage.promptTokens,
      response.usage.outputTokens
    );
    const savings = premiumCost - estimatedCost;

    return {
      text: response.text,
      model: response.model,
      taskType: taskType,
      usage: response.usage,
      cost: {
        estimated: parseFloat(estimatedCost.toFixed(6)),
        premiumAlternative: parseFloat(premiumCost.toFixed(6)),
        savings: parseFloat(savings.toFixed(6)),
        savingsPercentage: ((savings / premiumCost) * 100).toFixed(1) + '%'
      },
      quality: modelType === 'gemini_flash_lite' ? 'fast-cost-effective' : 'premium-quality'
    };
  } catch (error) {
    console.error('[Hybrid Router] Error routing task:', error);
    throw error;
  }
}

/**
 * Select appropriate model based on task type
 * Falls back to premium model if uncertain
 * @param {string} taskType - Type of task
 * @returns {string} Model identifier ('gemini_flash_lite' or 'gpt_4o_mini')
 */
export function selectModel(taskType) {
  // Light tasks use Gemini Flash Lite
  if (Object.values(TASK_TYPES.LIGHT).includes(taskType)) {
    return 'gemini_flash_lite';
  }

  // Heavy tasks use GPT-4o-mini
  if (Object.values(TASK_TYPES.HEAVY).includes(taskType)) {
    return 'gpt_4o_mini';
  }

  // Default to premium model for unknown tasks
  console.warn(`[Hybrid Router] Unknown task type: ${taskType}, falling back to GPT-4o-mini`);
  return 'gpt_4o_mini';
}

/**
 * Check if a task is classified as "light"
 * @param {string} taskType - Type of task
 * @returns {boolean}
 */
export function isLightTask(taskType) {
  return Object.values(TASK_TYPES.LIGHT).includes(taskType);
}

/**
 * Check if a task is classified as "heavy"
 * @param {string} taskType - Type of task
 * @returns {boolean}
 */
export function isHeavyTask(taskType) {
  return Object.values(TASK_TYPES.HEAVY).includes(taskType);
}

/**
 * Get model information
 * @param {string} modelType - Model identifier
 * @returns {object} Model configuration and description
 */
export function getModelInfo(modelType) {
  const models = {
    gemini_flash_lite: {
      name: 'Gemini 2.0 Flash Lite',
      tier: 'cost-effective',
      costPerMTokens: '$0.075 (input) / $0.3 (output)',
      bestFor: 'Text parsing, extraction, formatting',
      latency: 'Very Fast',
      contextWindow: '8k tokens'
    },
    gpt_4o_mini: {
      name: 'GPT-4o-mini',
      tier: 'premium',
      costPerMTokens: '$0.15 (input) / $0.6 (output)',
      bestFor: 'Complex reasoning, decision-making',
      latency: 'Standard',
      contextWindow: '16k tokens'
    }
  };

  return models[modelType] || models.gpt_4o_mini;
}
