# AI Chat Companion

A beautiful, modern web application for interacting with AI chat webhooks. This application provides a sleek chat interface with real-time messaging capabilities.

## Features

- 🎨 **Beautiful UI**: Modern, responsive design with gradient backgrounds and smooth animations
- 💬 **Real-time Chat**: Send and receive messages with typing indicators
- 🌙 **Theme Support**: Light, dark, and auto themes
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- ⚙️ **Customizable Settings**: Configure webhook URL, theme, and font size
- 💾 **Local Storage**: Settings and preferences are saved locally
- 🔄 **Auto-resize Input**: Text area automatically adjusts to content
- ✨ **Smooth Animations**: Elegant transitions and micro-interactions

## Getting Started

1. **Open the Application**: Simply open `index.html` in your web browser
2. **Configure Webhook**: Click the settings button (⚙️) to configure your webhook URL
3. **Start Chatting**: Type your message and press Enter or click the send button

## Configuration

### Webhook Setup
The application is pre-configured to work with the provided webhook:
```
https://csaiteam.app.n8n.cloud/webhook/df8223bf-119c-44d5-9bbf-f74ae26828e8/chat
```

### Expected Webhook Format
The application sends messages in the following format:
```json
{
  "message": "Your message here",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "user": "web_user"
}
```

The webhook should respond with:
```json
{
  "message": "AI response here"
}
```

## Customization

### Themes
- **Light**: Clean, bright interface
- **Dark**: Dark mode for low-light environments
- **Auto**: Automatically switches based on system preference

### Font Sizes
- **Small**: 14px
- **Medium**: 16px (default)
- **Large**: 18px

### Settings
All settings are automatically saved to localStorage and persist between sessions.

## File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # CSS styles and animations
├── script.js           # JavaScript functionality
└── README.md           # This documentation
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Features in Detail

### Chat Interface
- **Message Bubbles**: Distinct styling for user and AI messages
- **Timestamps**: Each message shows the time it was sent
- **Typing Indicator**: Shows when AI is processing a response
- **Character Counter**: Shows remaining characters (2000 limit)
- **Auto-scroll**: Automatically scrolls to show new messages

### User Experience
- **Welcome Screen**: Friendly greeting when starting a new chat
- **Clear Chat**: Option to clear conversation history
- **Error Handling**: Graceful error messages and retry options
- **Loading States**: Visual feedback during message processing

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Flexible Layout**: Adapts to different screen sizes
- **Touch-friendly**: Large touch targets for mobile interaction

## Technical Details

### Technologies Used
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox and grid
- **Vanilla JavaScript**: No external dependencies
- **Font Awesome**: Icons
- **Google Fonts**: Inter font family

### Performance
- **Lightweight**: No external JavaScript frameworks
- **Fast Loading**: Optimized CSS and minimal dependencies
- **Efficient**: Minimal DOM manipulation and smooth animations

## Troubleshooting

### Common Issues

1. **Messages not sending**: Check webhook URL in settings
2. **No response from AI**: Verify webhook is working and returns proper JSON
3. **Styling issues**: Clear browser cache and reload
4. **Settings not saving**: Check if localStorage is enabled

### Error Messages
- **"Failed to send message"**: Network or webhook issue
- **"HTTP error"**: Webhook returned an error status
- **"Invalid response"**: Webhook didn't return expected format

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the troubleshooting section or create an issue in the project repository.
