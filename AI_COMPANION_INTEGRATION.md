# AI Companion Widget Integration

## Overview
The AI Companion widget has been successfully integrated into your main dashboard as a floating chat interface. It appears as a small floating button in the bottom-right corner and expands into a full chat interface when clicked.

## Features

### 🎯 **Floating Widget Design**
- **Always Visible**: Appears on all pages of your dashboard
- **Bottom-Right Position**: Fixed position in the bottom-right corner
- **Minimizable**: Can be minimized to just the header
- **Responsive**: Adapts to different screen sizes

### 💬 **Chat Functionality**
- **Real-time Messaging**: Send and receive messages instantly
- **Typing Indicators**: Shows when AI is processing responses
- **Message History**: Maintains conversation history during session
- **Auto-scroll**: Automatically scrolls to show new messages

### ⚙️ **Settings & Configuration**
- **Webhook URL**: Configurable API endpoint
- **Theme Support**: Light/dark mode compatibility
- **Debug Mode**: Optional detailed error information
- **Local Storage**: Settings persist between sessions

### 🔧 **Technical Integration**
- **React Component**: Built as a reusable React component
- **TypeScript**: Fully typed for better development experience
- **Tailwind CSS**: Styled with your existing design system
- **Error Handling**: Graceful error handling and user feedback

## File Structure

```
src/
├── components/
│   ├── AICompanion.tsx          # Main chat widget component
│   └── Layout.tsx               # Updated to include AI companion
├── styles/
│   └── ai-companion.css         # Custom styles for the widget
└── index.css                   # Updated to import AI companion styles
```

## Usage

### Basic Usage
1. **Open Chat**: Click the floating chat button in the bottom-right corner
2. **Send Messages**: Type your message and press Enter or click Send
3. **Minimize**: Click the minimize button to collapse the chat
4. **Close**: Click the X button to close the chat widget

### Settings Configuration
1. **Open Settings**: Click the settings icon in the chat header
2. **Configure Webhook**: Update the webhook URL if needed
3. **Save Settings**: Click Save to apply changes

### Keyboard Shortcuts
- **Enter**: Send message
- **Shift + Enter**: New line in message input

## Configuration

### Default Settings
```typescript
{
  apiUrl: 'https://csaiteam.app.n8n.cloud/webhook/df8223bf-119c-44d5-9bbf-f74ae26828e8/chat',
  theme: 'auto',
  fontSize: 'medium',
  debugMode: false
}
```

### Webhook Integration
The widget supports multiple webhook formats:
- **Form Data**: `sessionId` and `chatInput` fields
- **URL Encoded**: URL-encoded parameters
- **JSON**: JSON payload with sessionId and chatInput

### Response Handling
- **Real AI Responses**: Processes actual AI responses from n8n
- **Simulated Responses**: Falls back to simulated responses when webhook returns "firstEntryJson"
- **Error Handling**: Graceful error messages and retry options

## Customization

### Styling
The widget uses Tailwind CSS classes and can be customized by modifying:
- `src/components/AICompanion.tsx` - Component structure and classes
- `src/styles/ai-companion.css` - Custom CSS animations and styles

### Positioning
To change the widget position, modify the CSS classes in `AICompanion.tsx`:
```typescript
// Current: bottom-6 right-6
// Alternative positions:
// bottom-6 left-6 (bottom-left)
// top-6 right-6 (top-right)
// top-6 left-6 (top-left)
```

### Size
To adjust the widget size, modify the width and height classes:
```typescript
// Current: w-80 h-96 (320px × 384px)
// Smaller: w-72 h-80 (288px × 320px)
// Larger: w-96 h-[28rem] (384px × 448px)
```

## Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Widget Not Appearing**
   - Check if the component is properly imported in Layout.tsx
   - Verify CSS imports are working

2. **Chat Not Working**
   - Check webhook URL in settings
   - Verify network connectivity
   - Check browser console for errors

3. **Styling Issues**
   - Clear browser cache
   - Check if Tailwind CSS is properly configured
   - Verify custom CSS imports

### Debug Mode
Enable debug mode in settings to see detailed error information and network requests.

## Future Enhancements

### Potential Improvements
- **File Upload**: Support for file attachments
- **Voice Messages**: Audio message support
- **Chat History**: Persistent chat history across sessions
- **Multiple Sessions**: Support for multiple chat sessions
- **Custom Themes**: More theme options
- **Notifications**: Desktop notifications for new messages

### Integration Ideas
- **Dashboard Integration**: Show chat status in dashboard header
- **Incident Chat**: Context-aware chat for incident management
- **Quick Actions**: Quick action buttons for common tasks
- **AI Suggestions**: Proactive AI suggestions based on dashboard data

## Support

For issues or questions about the AI Companion widget:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify webhook configuration and connectivity
4. Test with the standalone chat application first

The widget is designed to be robust and provide a seamless chat experience while maintaining the professional look and feel of your security operations dashboard.
