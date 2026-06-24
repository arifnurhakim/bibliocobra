/**
 * Task Type Classification for Hybrid AI Strategy
 * Helps determine which AI model to use based on task complexity
 */

export const TASK_TYPES = {
  // LIGHT TASKS - Use Gemini Flash Lite (Cost-effective)
  // These tasks are mainly about text parsing, extraction, and formatting
  LIGHT: {
    PARSE_METADATA: 'parse_metadata',              // Extract title, authors, year, journal
    TEXT_SUMMARIZATION: 'text_summarization',      // Summarize abstracts or long texts
    KEYWORD_EXTRACTION: 'keyword_extraction',      // Extract key concepts from text
    FORMAT_CONVERSION: 'format_conversion',        // Convert RIS to JSON, or format reference
    ABSTRACT_PARSING: 'abstract_parsing',          // Parse and structure abstract data
    REFERENCE_FORMATTING: 'reference_formatting'   // Format bibliographic references
  },

  // HEAVY TASKS - Use GPT-4o-mini (High-quality reasoning)
  // These tasks require complex logic, reasoning, and decision-making
  HEAVY: {
    PRISMA_LOGIC: 'prisma_logic',                  // Extract PRISMA counts with complex logic
    REASONING: 'reasoning',                        // Deep analysis of research papers
    DECISION_MAKING: 'decision_making',            // Determine inclusion/exclusion criteria
    COMPLEX_SYNTHESIS: 'complex_synthesis',        // Synthesize insights from multiple papers
    CRITERIA_EVALUATION: 'criteria_evaluation',    // Evaluate papers against criteria
    RESEARCH_RECOMMENDATION: 'research_recommendation' // Provide research recommendations
  },

  // DEFAULT - Use GPT-4o-mini when task type is unclear
  DEFAULT: 'default'
};

/**
 * Model Configuration with pricing and limits
 */
export const MODEL_CONFIG = {
  gemini_flash_lite: {
    name: 'Gemini 2.0 Flash Lite',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
    costPer1MTokens: 0.075, // Input tokens (estimate)
    costPer1MTokensOutput: 0.3,
    tier: 'light',
    maxTokens: 8000,
    description: 'Fast, cost-effective model for light tasks'
  },
  gpt_4o_mini: {
    name: 'GPT-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    costPer1MTokens: 0.15, // Input tokens
    costPer1MTokensOutput: 0.6,
    tier: 'premium',
    maxTokens: 16000,
    description: 'High-quality reasoning for complex tasks'
  }
};

/**
 * Cost Comparison Matrix
 * Shows estimated savings when using hybrid strategy
 */
export const COST_METRICS = {
  lightTaskSavings: 0.90, // 90% savings vs premium model
  estimatedMonthlyApiCalls: 1000,
  lightTaskPercentage: 0.70, // 70% of tasks are light
  heavyTaskPercentage: 0.30  // 30% of tasks are heavy
};
