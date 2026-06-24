# Hybrid AI Strategy Implementation Guide

## Overview

This document explains the hybrid AI strategy implemented in Bibliocobra to optimize costs and performance by using different AI models for different types of tasks.

## Architecture

### 1. Task Classification

**Light Tasks (Cost-effective tier)** - Use Gemini Flash Lite (~$0.075 per 1M tokens)
- Text parsing and metadata extraction
- Keyword extraction from abstracts
- Reference formatting
- Format conversion (RIS to JSON)
- Text summarization

**Heavy Tasks (Premium tier)** - Use GPT-4o-mini (~$0.15 per 1M tokens)
- PRISMA logic extraction with complex reasoning
- Deep paper analysis and research reasoning
- Decision-making on inclusion/exclusion criteria
- Complex synthesis of multiple papers
- Criteria evaluation

### 2. File Structure

```
api/
├── chat-hybrid.js              # Main hybrid endpoint (replaces chat.js)
├── monitoring.js               # Cost monitoring dashboard
├── constants/
│   └── taskTypes.js           # Task classification definitions
├── models/
│   ├── geminiFlashLite.js     # Gemini Flash Lite integration
│   └── gpt4oMini.js           # GPT-4o-mini integration
└── utils/
    ├── hybridRouter.js         # Intelligence routing logic
    └── costTracker.js          # Cost tracking & analytics
```

## Usage

### Frontend (React) Example

#### Light Task - Extract Keywords
```javascript
const extractKeywords = async (abstractText) => {
  const response = await fetch('/api/chat-hybrid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Extract key concepts from this abstract: ${abstractText}`,
      taskType: 'KEYWORD_EXTRACTION',  // Uses Gemini Flash Lite
      options: {
        temperature: 0.3,
        maxTokens: 1500
      }
    })
  });
  
  const result = await response.json();
  console.log('Cost savings:', result.metadata.cost.savings);
  return result.response;
};
```

#### Heavy Task - PRISMA Analysis
```javascript
const analyzePRISMA = async (papers) => {
  const response = await fetch('/api/chat-hybrid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Analyze these papers for PRISMA criteria: ${JSON.stringify(papers)}`,
      taskType: 'PRISMA_LOGIC',  // Uses GPT-4o-mini for better reasoning
      options: {
        temperature: 0.7,
        maxTokens: 4000
      }
    })
  });
  
  const result = await response.json();
  return result.response;
};
```

### Available Task Types

**Light Tasks:**
- `PARSE_METADATA`
- `TEXT_SUMMARIZATION`
- `KEYWORD_EXTRACTION`
- `FORMAT_CONVERSION`
- `ABSTRACT_PARSING`
- `REFERENCE_FORMATTING`

**Heavy Tasks:**
- `PRISMA_LOGIC`
- `REASONING`
- `DECISION_MAKING`
- `COMPLEX_SYNTHESIS`
- `CRITERIA_EVALUATION`
- `RESEARCH_RECOMMENDATION`

## Response Format

### Successful Response
```json
{
  "success": true,
  "response": "The AI-generated text here...",
  "metadata": {
    "model": "gemini-2.0-flash-lite",
    "taskType": "KEYWORD_EXTRACTION",
    "quality": "fast-cost-effective",
    "usage": {
      "promptTokens": 245,
      "outputTokens": 187,
      "totalTokens": 432
    },
    "cost": {
      "estimated": 0.000089,
      "premiumAlternative": 0.000542,
      "savings": 0.000453,
      "savingsPercentage": "83.6%"
    },
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Gagal menghubungi AI",
  "details": "Error message in development mode"
}
```

## Environment Setup

Add these environment variables to your `.env` file:

```bash
# Gemini API (for light tasks)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API (for heavy tasks)
OPENAI_API_KEY=your_openai_api_key_here
```

## Monitoring & Analytics

Access the monitoring dashboard:

```bash
GET /api/monitoring
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "period": {
        "start": "2024-01-15T00:00:00.000Z",
        "uptime": "24.50 hours"
      },
      "calls": {
        "total": 1250,
        "lightTasks": 875,
        "heavyTasks": 375,
        "lightTaskPercentage": "70.0%"
      },
      "costs": {
        "totalSpent": "$0.1562",
        "estimatedIfAllPremium": "$0.9847",
        "totalSavings": "$0.8285",
        "savingsPercentage": "84.1%",
        "averageCostPerCall": "$0.000125"
      }
    }
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Cost Analysis

### Monthly Projection (1000 API calls)

**Scenario: 70% light tasks, 30% heavy tasks**

| Model | Calls | Cost | Subtotal |
|-------|-------|------|----------|
| Gemini Flash Lite | 700 | ~$0.005 | ~$3.50 |
| GPT-4o-mini | 300 | ~$0.015 | ~$4.50 |
| **TOTAL (Hybrid)** | 1000 | - | **~$8.00** |
| **ALL Premium** | 1000 | ~$0.012 | **~$12.00** |
| **SAVINGS** | - | - | **~$4.00/month (33%)** |

*Note: Costs are estimates based on average token usage*

## Fallback Logic

If the selected model fails:

1. **First attempt:** Try primary model with exponential backoff
2. **Retry 1:** Wait 1 second, try again
3. **Retry 2:** Wait 2 seconds, try again
4. **Fallback:** Attempt alternative model if configured
5. **Final failure:** Return error to client

## Best Practices

1. **Set Appropriate Task Types:** Always specify the correct `taskType` for accurate model selection
2. **Monitor Costs:** Regularly check `/api/monitoring` to track spending
3. **Optimize Prompts:** Write clear, concise prompts to reduce token usage
4. **Temperature Settings:**
   - Light tasks: `temperature: 0.3` (deterministic)
   - Heavy tasks: `temperature: 0.7` (creative reasoning)
5. **Error Handling:** Always handle potential failures gracefully in frontend

## Migration from Old Endpoint

### Before (Old)
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ /* ... */ })
});
```

### After (Hybrid)
```javascript
const response = await fetch('/api/chat-hybrid', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Your prompt here',
    taskType: 'KEYWORD_EXTRACTION',  // <- Add this
    options: { /* optional */ }
  })
});
```

## Troubleshooting

### Issue: API keys not found
**Solution:** Ensure `GEMINI_API_KEY` and `OPENAI_API_KEY` are set in `.env`

### Issue: High error rates for Gemini
**Solution:** Check if task requires complex reasoning (use `PRISMA_LOGIC` or `REASONING` instead)

### Issue: Costs higher than expected
**Solution:** Review `/api/monitoring` to identify expensive tasks, consider batch processing

## Future Enhancements

- [ ] Support for Claude 3 (Anthropic)
- [ ] Support for Llama 2 (open-source option)
- [ ] Dynamic model selection based on real-time pricing
- [ ] Advanced caching to reduce redundant API calls
- [ ] A/B testing dashboard to compare model outputs
- [ ] Custom model fine-tuning for domain-specific tasks
