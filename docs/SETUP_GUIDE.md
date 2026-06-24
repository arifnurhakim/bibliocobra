# Hybrid AI Strategy - Setup Guide

## Quick Start

### 1. Install Dependencies

No additional npm packages needed - uses native fetch API available in Node.js 18+

Verify your Node.js version:
```bash
node --version  # Should be v18.0.0 or higher
```

### 2. Environment Variables

Create or update `.env` with:
```bash
# For Gemini Flash Lite (light tasks)
GEMINI_API_KEY=your-gemini-api-key

# For GPT-4o-mini (heavy tasks)
OPENAI_API_KEY=your-openai-api-key

# Optional: Development mode
NODE_ENV=production
```

### 3. Get API Keys

#### Gemini Flash Lite Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Get API Key" → "Create API Key in new project"
3. Copy the key to `.env` as `GEMINI_API_KEY`

#### OpenAI GPT-4o-mini Key
1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Click "Create new secret key"
3. Copy the key to `.env` as `OPENAI_API_KEY`

### 4. File Structure

Copy all files from the implementation to your project:

```
your-project/
├── api/
│   ├── chat-hybrid.js              ← New main endpoint
│   ├── monitoring.js               ← New monitoring endpoint
│   ├── constants/
│   │   └── taskTypes.js           ← New
│   ├── models/
│   │   ├── geminiFlashLite.js     ← New
│   │   └── gpt4oMini.js           ← New
│   └── utils/
│       ├── hybridRouter.js         ← New
│       └── costTracker.js          ← New
├── .env                           ← Updated with API keys
└── src/
    └── App.js                     ← Update to use chat-hybrid
```

### 5. Update Frontend Code

Replace calls from `/api/chat` to `/api/chat-hybrid` in your React components:

#### src/App.js
```javascript
// Find this:
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(req.body)
});

// Replace with:
const response = await fetch('/api/chat-hybrid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: req.body.prompt,
    taskType: 'KEYWORD_EXTRACTION',  // Specify task type
    options: {
      temperature: 0.3,
      maxTokens: 2000
    }
  })
});
```

### 6. Test the Implementation

#### Test Light Task (Gemini Flash Lite)
```bash
curl -X POST http://localhost:3000/api/chat-hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Extract key concepts from this text: machine learning is a subset of artificial intelligence",
    "taskType": "KEYWORD_EXTRACTION",
    "options": { "temperature": 0.3 }
  }'
```

#### Test Heavy Task (GPT-4o-mini)
```bash
curl -X POST http://localhost:3000/api/chat-hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze the following research papers and determine PRISMA criteria",
    "taskType": "PRISMA_LOGIC",
    "options": { "temperature": 0.7 }
  }'
```

#### Check Monitoring Dashboard
```bash
curl http://localhost:3000/api/monitoring
```

### 7. Deploy to Vercel

No special configuration needed - Vercel automatically detects serverless functions in the `/api` directory.

**Deploy:**
```bash
vercel deploy
```

**Add environment variables in Vercel dashboard:**
- Go to Settings → Environment Variables
- Add `GEMINI_API_KEY`
- Add `OPENAI_API_KEY`

## Configuration Options

### Task Type Examples

```javascript
// For journal metadata extraction (light)
await fetch('/api/chat-hybrid', {
  body: JSON.stringify({
    prompt: 'Extract: title, authors, year, journal',
    taskType: 'PARSE_METADATA'
  })
});

// For abstract summarization (light)
await fetch('/api/chat-hybrid', {
  body: JSON.stringify({
    prompt: 'Summarize this abstract in 50 words...',
    taskType: 'TEXT_SUMMARIZATION',
    options: { maxTokens: 200 }
  })
});

// For PRISMA analysis (heavy)
await fetch('/api/chat-hybrid', {
  body: JSON.stringify({
    prompt: 'Extract PRISMA counts from papers...',
    taskType: 'PRISMA_LOGIC',
    options: { temperature: 0.7 }
  })
});
```

## Temperature Settings Guide

```javascript
// Deterministic responses (parsing, extraction)
temperature: 0.1-0.3  // Gemini Flash Lite tasks

// Balanced responses (most use cases)
temperature: 0.5-0.7  // GPT-4o-mini tasks

// Creative responses (synthesis, recommendations)
temperature: 0.8-1.0  // Complex heavy tasks
```

## Cost Optimization Tips

1. **Batch similar requests:** Combine multiple light tasks into one larger request
2. **Use max token limits:** Set `maxTokens` appropriately to avoid wasting tokens
3. **Cache results:** Store frequently requested analyses to avoid repeat calls
4. **Monitor costs regularly:** Check `/api/monitoring` endpoint daily
5. **Choose correct task type:** Misclassified tasks will use expensive models

## Troubleshooting

### Error: "GEMINI_API_KEY environment variable is not set"
```bash
# Add to .env
GEMINI_API_KEY=your_key_here

# If using Vercel, add to environment variables:
vercel env add GEMINI_API_KEY
```

### Error: "OPENAI_API_KEY environment variable is not set"
```bash
# Add to .env
OPENAI_API_KEY=your_key_here

# If using Vercel:
vercel env add OPENAI_API_KEY
```

### Error: "No response from Gemini model"
- Check API key is valid
- Verify prompt is not empty
- Ensure Gemini API quota is not exceeded

### Error: "OpenAI API error: 429"
- Too many requests - rate limited
- Wait a few seconds before retry
- Consider upgrading OpenAI plan

## Next Steps

1. ✅ Setup all files
2. ✅ Configure API keys
3. ✅ Test endpoints locally
4. ✅ Update frontend code
5. ✅ Deploy to Vercel
6. ✅ Monitor costs via `/api/monitoring`
7. ✅ Gather performance metrics
8. ✅ Optimize task type assignments

## Support

For issues or questions:
- Check `/api/monitoring` for cost/usage data
- Review logs in Vercel dashboard
- Test API keys directly in Google AI Studio and OpenAI platform
