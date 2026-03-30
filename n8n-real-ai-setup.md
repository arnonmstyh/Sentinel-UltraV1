# n8n Real AI Response Setup Guide

## Current Problem
Your n8n webhook is returning "firstEntryJson" instead of real AI responses. This means the workflow is not configured to process chat messages through an AI service.

## What You Need to Do

### Step 1: Open Your n8n Workflow
1. Go to your n8n dashboard
2. Open the workflow that contains your webhook
3. Look for the webhook node that handles the chat endpoint

### Step 2: Check Your Current Workflow
Your current workflow probably looks like:
```
Webhook Trigger → [Some processing] → Response (returns "firstEntryJson")
```

### Step 3: Add AI Processing
You need to modify it to:
```
Webhook Trigger → Chat Processing → AI Service → Response
```

### Step 4: Configure the Workflow

#### A. Webhook Trigger Node
- **Method**: GET
- **Path**: `/chat` (or whatever you're using)
- **Response Mode**: "On Received"

#### B. Add Chat Processing Node
Add a **Code** node or **Function** node after the webhook:
```javascript
// Extract parameters from query string
const url = new URL($input.first().json.url);
const sessionId = url.searchParams.get('sessionId');
const chatInput = url.searchParams.get('chatInput');

return {
  sessionId: sessionId,
  chatInput: chatInput,
  timestamp: new Date().toISOString()
};
```

#### C. Add AI Service Node
Add one of these AI service nodes:

**Option 1: OpenAI Node**
- **Model**: gpt-3.5-turbo or gpt-4
- **Messages**: 
  ```json
  [
    {
      "role": "system",
      "content": "You are a helpful AI assistant."
    },
    {
      "role": "user", 
      "content": "{{ $json.chatInput }}"
    }
  ]
  ```

**Option 2: Hugging Face Node**
- **Model**: microsoft/DialoGPT-medium or similar
- **Input**: `{{ $json.chatInput }}`

**Option 3: Custom AI API**
- Use **HTTP Request** node
- Configure your AI service endpoint

#### D. Add Response Node
Add a **Respond to Webhook** node:
- **Response Code**: 200
- **Response Body**:
  ```json
  {
    "message": "{{ $json.choices[0].message.content }}",
    "sessionId": "{{ $json.sessionId }}",
    "timestamp": "{{ $json.timestamp }}"
  }
  ```

### Step 5: Test the Workflow
1. Click "Test workflow" in n8n
2. Send test data:
   ```json
   {
     "sessionId": "test123",
     "chatInput": "Hello, how are you?"
   }
   ```
3. Should return:
   ```json
   {
     "message": "Hello! I'm doing well, thank you for asking. How can I help you today?",
     "sessionId": "test123",
     "timestamp": "2024-01-20T10:30:00.000Z"
   }
   ```

### Step 6: Deploy and Test
1. **Activate** the workflow in n8n
2. Test with your chat app
3. The app should now receive real AI responses

## Alternative: Quick Fix with Mock AI
If you want to test immediately without setting up a real AI service, you can add a **Code** node that generates responses:

```javascript
const responses = [
  "Hello! How can I help you today?",
  "That's an interesting question. Let me think about that...",
  "I understand what you're asking. Here's what I think...",
  "Thanks for your message! I'd be happy to help with that.",
  "That's a great point. Let me provide some insights..."
];

const randomResponse = responses[Math.floor(Math.random() * responses.length)];

return {
  message: randomResponse,
  sessionId: $json.sessionId,
  timestamp: new Date().toISOString()
};
```

## Expected Final Response Format
Your webhook should return JSON like this:
```json
{
  "message": "Real AI response here",
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Troubleshooting
- **Still getting "firstEntryJson"**: Check that your workflow is activated
- **500 errors**: Check the AI service configuration and API keys
- **No response**: Make sure the Respond to Webhook node is connected
- **Wrong format**: Verify the response JSON structure matches expected format

## Next Steps
1. Follow the steps above to configure your n8n workflow
2. Test with the provided test data
3. Once working, test with your chat app
4. The chat app will automatically detect real responses and stop using simulated ones
