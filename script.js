class ChatApp {
    constructor() {
        this.apiUrl = 'https://csaiteam.app.n8n.cloud/webhook/df8223bf-119c-44d5-9bbf-f74ae26828e8/chat';
        this.messages = [];
        this.isTyping = false;
        this.sessionId = this.generateSessionId();
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.initializeTheme();
        this.displaySessionId();
    }

    generateSessionId() {
        // Generate a unique session ID for this chat session
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateSimulatedResponse(message) {
        // Generate a simple simulated AI response when the n8n workflow isn't properly configured
        const responses = [
            `I understand you said: "${message}". How can I help you with that?`,
            `That's interesting! You mentioned: "${message}". Tell me more about it.`,
            `I see you're asking about: "${message}". Let me think about that...`,
            `Thanks for sharing: "${message}". What would you like to know more about?`,
            `I heard you say: "${message}". That's a great question!`,
            `You mentioned: "${message}". I'd be happy to help you with that.`,
            `Interesting point about: "${message}". What else would you like to discuss?`,
            `I understand: "${message}". How can I assist you further?`
        ];
        
        // Simple keyword-based responses
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return `Hello! Nice to meet you. You said: "${message}". How are you doing today?`;
        } else if (lowerMessage.includes('help')) {
            return `I'd be happy to help! You mentioned: "${message}". What specific assistance do you need?`;
        } else if (lowerMessage.includes('thank')) {
            return `You're welcome! You said: "${message}". Is there anything else I can help you with?`;
        } else if (lowerMessage.includes('?')) {
            return `That's a great question: "${message}". Let me think about the best way to answer that.`;
        } else {
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    displaySessionId() {
        if (this.sessionIdDisplay) {
            this.sessionIdDisplay.textContent = this.sessionId;
        }
    }

    initializeElements() {
        // Main elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.charCount = document.getElementById('charCount');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.quickTestBtn = document.getElementById('quickTestBtn');
        this.sessionIdDisplay = document.getElementById('sessionIdDisplay');
        
        // Header elements
        this.testWebhookBtn = document.getElementById('testWebhook');
        this.clearChatBtn = document.getElementById('clearChat');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // Modal elements
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.cancelSettings = document.getElementById('cancelSettings');
        this.saveSettings = document.getElementById('saveSettings');
        this.apiUrlInput = document.getElementById('apiUrl');
        this.themeSelect = document.getElementById('theme');
        this.fontSizeSelect = document.getElementById('fontSize');
        this.debugModeCheckbox = document.getElementById('debugMode');
        
        // Toast elements
        this.errorToast = document.getElementById('errorToast');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeToast = document.getElementById('closeToast');
    }

    bindEvents() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.quickTestBtn.addEventListener('click', () => this.quickTest());
        
        // Header events
        this.testWebhookBtn.addEventListener('click', () => this.testWebhook());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        
        // Modal events
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.cancelSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettings.addEventListener('click', () => this.saveSettings());
        
        // Toast events
        this.closeToast.addEventListener('click', () => this.hideToast());
        
        // Click outside modal to close
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettingsModal();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('chatSettings') || '{}');
        this.apiUrl = settings.apiUrl || this.apiUrl;
        this.apiUrlInput.value = this.apiUrl;
        this.themeSelect.value = settings.theme || 'auto';
        this.fontSizeSelect.value = settings.fontSize || 'medium';
        this.debugModeCheckbox.checked = settings.debugMode || false;
    }

    saveSettings() {
        const settings = {
            apiUrl: this.apiUrlInput.value,
            theme: this.themeSelect.value,
            fontSize: this.fontSizeSelect.value,
            debugMode: this.debugModeCheckbox.checked
        };
        
        localStorage.setItem('chatSettings', JSON.stringify(settings));
        this.apiUrl = settings.apiUrl;
        this.applyTheme(settings.theme);
        this.applyFontSize(settings.fontSize);
        this.closeSettingsModal();
        this.showToast('Settings saved successfully!', 'success');
    }

    initializeTheme() {
        const settings = JSON.parse(localStorage.getItem('chatSettings') || '{}');
        this.applyTheme(settings.theme || 'auto');
        this.applyFontSize(settings.fontSize || 'medium');
    }

    applyTheme(theme) {
        const body = document.body;
        body.classList.remove('dark-theme');
        
        if (theme === 'dark') {
            body.classList.add('dark-theme');
        } else if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                body.classList.add('dark-theme');
            }
        }
    }

    applyFontSize(size) {
        const body = document.body;
        body.classList.remove('font-small', 'font-medium', 'font-large');
        body.classList.add(`font-${size}`);
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/2000`;
        
        if (count > 1800) {
            this.charCount.style.color = '#ef4444';
        } else if (count > 1500) {
            this.charCount.style.color = '#f59e0b';
        } else {
            this.charCount.style.color = '#94a3b8';
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.updateCharCount();
        this.updateSendButton();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send message to webhook
            const response = await this.sendToWebhook(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add AI response to chat
            if (response && response.message) {
                this.addMessage(response.message, 'ai');
            } else {
                this.addMessage('I received your message but couldn\'t generate a proper response.', 'ai');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            
            const settings = JSON.parse(localStorage.getItem('chatSettings') || '{}');
            const isDebugMode = settings.debugMode || false;
            
            let errorMessage = 'Sorry, I encountered an error while processing your message. Please try again.';
            let toastMessage = 'Failed to send message. Please check your connection.';
            
            if (error.message.includes('Webhook error')) {
                if (error.message.includes('Server error (500)')) {
                    this.updateConnectionStatus('Error', 'Service Down');
                    errorMessage = '🚨 The AI service is currently down or experiencing technical issues.\n\nThis is a server-side problem that needs to be fixed by the service administrator.\n\nPossible causes:\nThe n8n workflow is not running\nThe AI service is overloaded\nThere\'s a configuration error in the workflow\nThe AI API key has expired\n\nPlease try again later or contact the service administrator.';
                    toastMessage = 'AI service is down (500 error)';
                } else {
                    this.updateConnectionStatus('Error', 'Service Error');
                    errorMessage = 'The AI service is currently experiencing issues. Please try again later.';
                    toastMessage = 'AI service error: ' + error.message;
                }
                if (isDebugMode) {
                    errorMessage += `\n\nDebug info: ${error.message}`;
                }
            } else if (error.message.includes('HTTP error')) {
                errorMessage = 'Connection error. Please check your internet connection and try again.';
                toastMessage = 'Connection failed: ' + error.message;
                if (isDebugMode) {
                    errorMessage += `\n\nDebug info: ${error.message}`;
                }
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to the AI service. Please check your internet connection.';
                toastMessage = 'Network error: Unable to connect to AI service';
                if (isDebugMode) {
                    errorMessage += `\n\nDebug info: ${error.message}`;
                }
            }
            
            if (isDebugMode) {
                errorMessage += `\n\nFull error: ${error.toString()}`;
            }
            
            this.addMessage(errorMessage, 'ai');
            this.showToast(toastMessage, 'error');
        }
    }

    async sendToWebhook(message) {
        // Prioritize the working Form Data method based on actual test results
        const approaches = [
            {
                name: 'Form Data with sessionId and chatInput (Working Method)',
                options: {
                    method: 'POST',
                    body: (() => {
                        const formData = new FormData();
                        formData.append('sessionId', this.sessionId);
                        formData.append('chatInput', message);
                        return formData;
                    })()
                }
            },
            {
                name: 'URL Encoded with sessionId and chatInput',
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `sessionId=${encodeURIComponent(this.sessionId)}&chatInput=${encodeURIComponent(message)}`
                }
            },
            {
                name: 'JSON with sessionId and chatInput',
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: this.sessionId,
                        chatInput: message
                    })
                }
            },
            {
                name: 'Form Data with all fields',
                options: {
                    method: 'POST',
                    body: (() => {
                        const formData = new FormData();
                        formData.append('sessionId', this.sessionId);
                        formData.append('chatInput', message);
                        formData.append('message', message);
                        formData.append('input', message);
                        return formData;
                    })()
                }
            },
            {
                name: 'URL Encoded with all fields',
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `sessionId=${encodeURIComponent(this.sessionId)}&chatInput=${encodeURIComponent(message)}&message=${encodeURIComponent(message)}&input=${encodeURIComponent(message)}`
                }
            },
            {
                name: 'JSON with all fields',
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: this.sessionId,
                        chatInput: message,
                        message: message,
                        input: message
                    })
                }
            }
        ];

        for (const approach of approaches) {
            try {
                console.log(`Trying approach: ${approach.name}`);
                const url = approach.url || this.apiUrl;
                const response = await fetch(url, approach.options);

                console.log(`Response status for ${approach.name}:`, response.status);

                if (response.ok) {
                    let data;
                    const textData = await response.text();
                    console.log(`Response is text: ${textData}`);
                    
                    try {
                        // Try to parse as JSON
                        data = JSON.parse(textData);
                        
                        // Check if this is a real AI response from n8n
                        if (data.output || (data.message && data.message !== 'firstEntryJson')) {
                            console.log('✅ Real AI response received!', data);
                            
                            // Handle n8n response format - it uses 'output' field
                            if (data.output) {
                                return {
                                    message: data.output,
                                    sessionId: this.sessionId,
                                    timestamp: new Date().toISOString(),
                                    source: 'n8n'
                                };
                            }
                            
                            // This is a real response from n8n - no simulation needed
                            return data;
                        }
                    } catch (e) {
                        // Not JSON, check for special responses
                    }
                    
                    // Handle special responses
                    if (textData === 'firstEntryJson') {
                        // The n8n webhook is returning a placeholder response
                        // Generate a simulated AI response while the workflow is being fixed
                        const simulatedResponse = this.generateSimulatedResponse(message);
                        data = { 
                            message: `🤖 ${simulatedResponse}\n\n⚠️ Note: The n8n webhook is returning "firstEntryJson" which indicates the chat workflow needs to be properly configured.\n\nTo fix this:\n1. Check your n8n workflow has a proper chat trigger node\n2. Ensure the workflow processes the chatInput and sessionId\n3. Configure the workflow to return actual AI responses\n\n📖 See n8n-real-ai-setup.md for detailed instructions`,
                            type: 'firstEntry',
                            sessionId: this.sessionId,
                            originalMessage: message,
                            simulated: true
                        };
                    } else if (textData.includes('<!doctype') || textData.includes('<html')) {
                        // HTML response - not what we want
                        throw new Error('Webhook returned HTML instead of chat data');
                    } else {
                        // Plain text response - might be a real response
                        data = { message: textData };
                    }
                    
                    console.log(`Success with ${approach.name}:`, data);
                    
                    // Check if the response contains an error message
                    if (data.message && data.message.includes('Error')) {
                        throw new Error(`Webhook error: ${data.message}`);
                    }
                    
                    return data;
                } else {
                    let errorText = '';
                    try {
                        errorText = await response.text();
                        console.log(`Error response body for ${approach.name}:`, errorText);
                    } catch (e) {
                        console.log('Could not read error response body');
                    }

                    if (response.status === 500) {
                        console.log(`${approach.name} failed with 500 error:`, errorText);
                        // Continue to next approach
                        continue;
                    } else if (response.status === 404) {
                        throw new Error(`Webhook error: Not found (404) - Please check the webhook URL`);
                    } else if (response.status === 403) {
                        throw new Error(`Webhook error: Forbidden (403) - Access denied to the webhook`);
                    } else {
                        console.log(`${approach.name} failed with status ${response.status}:`, errorText);
                        // Continue to next approach
                        continue;
                    }
                }
            } catch (error) {
                console.error(`${approach.name} failed:`, error);
                // If it's not a network error, continue to next approach
                if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
                    continue;
                }
                throw error;
            }
        }

        // If all approaches failed, try GET request to check if webhook is accessible
        try {
            console.log('Trying GET request to check webhook accessibility...');
            const getResponse = await fetch(this.apiUrl, { method: 'GET' });
            console.log('GET response status:', getResponse.status);
            
            if (getResponse.ok) {
                const getData = await getResponse.text();
                console.log('GET response data:', getData);
                throw new Error(`Webhook is accessible via GET (returns HTML) but POST requests fail with 500 error. This suggests the webhook is designed for a different interface or the n8n workflow is not properly configured to handle POST requests. GET response: ${getData.substring(0, 200)}...`);
            }
        } catch (getError) {
            console.log('GET request also failed:', getError.message);
        }

        // If all approaches failed
        throw new Error('All webhook approaches failed. The n8n workflow may not be properly configured to handle chat messages. Try checking the n8n workflow configuration.');
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Format the content for better readability
        const formattedContent = this.formatMessageContent(content);
        messageContent.innerHTML = formattedContent;
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();
        
        messageContent.appendChild(messageTime);
        messageDiv.appendChild(messageContent);
        
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store message
        this.messages.push({
            content,
            sender,
            timestamp: new Date().toISOString()
        });
    }

    formatMessageContent(content) {
        // Handle different types of content formatting
        let formatted = content;
        
        // Escape HTML first
        formatted = formatted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Format bullet points and lists - convert to proper HTML structure
        formatted = formatted.replace(/^[\s]*[-•]\s*(.+)/gm, '<div class="bullet-item">$1</div>');
        formatted = formatted.replace(/^[\s]*\d+\.\s*(.+)/gm, '<div class="numbered-item">$1</div>');
        
        // Format tool names and descriptions
        formatted = formatted.replace(/- ([^-]+):/g, '<br/><strong>$1:</strong>');
        
        // Format section headers (lines that end with colon and are followed by content)
        formatted = formatted.replace(/^([^•\n]+):\s*$/gm, '<strong>$1:</strong>');
        
        // Add line breaks for better paragraph separation
        formatted = formatted.replace(/\n\s*\n/g, '<br/><br/>');
        
        // Format special sections
        formatted = formatted.replace(/หากคุณมีสถานการณ์หรือเหตุผลใช้งานใด/g, '<br/><br/><strong>หากคุณมีสถานการณ์หรือเหตุผลใช้งานใด</strong>');
        formatted = formatted.replace(/แจ้งได้เลย/g, '<strong>แจ้งได้เลย</strong>');
        formatted = formatted.replace(/จะเลือกเครื่องมือที่เหมาะสมให้ทันที/g, '<strong>จะเลือกเครื่องมือที่เหมาะสมให้ทันที</strong>');
        
        // Format the parenthetical note at the end
        formatted = formatted.replace(/\([^)]*รันหลายเครื่องมือพร้อมกัน[^)]*\)/g, '<em>($&)</em>');
        
        return formatted;
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.typingIndicator.classList.add('show');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.typingIndicator.classList.remove('show');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendBtn.classList.toggle('active', hasText);
    }

    updateConnectionStatus(status, message = '') {
        this.connectionStatus.textContent = message || status;
        this.connectionStatus.className = `status ${status.toLowerCase()}`;
        
        // Update the status indicator color
        const statusElement = this.connectionStatus;
        statusElement.style.setProperty('--status-color', 
            status === 'Online' ? '#4ade80' : 
            status === 'Offline' ? '#ef4444' : 
            status === 'Error' ? '#f59e0b' : '#64748b'
        );
    }

    async quickTest() {
        this.quickTestBtn.textContent = 'Testing...';
        this.quickTestBtn.disabled = true;
        
        try {
            console.log('Quick test starting with working Form Data method...');
            const formData = new FormData();
            formData.append('sessionId', this.sessionId);
            formData.append('chatInput', 'Quick test message');
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            console.log('Quick test response status:', response.status);
            console.log('Quick test response headers:', [...response.headers.entries()]);
            
            if (response.ok) {
                const textData = await response.text();
                console.log('Quick test response is text:', textData);
                
                let data;
                try {
                    data = JSON.parse(textData);
                    
                    // Handle n8n response format - it uses 'output' field
                    if (data.output) {
                        data = {
                            message: data.output,
                            sessionId: this.sessionId,
                            timestamp: new Date().toISOString(),
                            source: 'n8n'
                        };
                    }
                } catch (e) {
                    if (textData === 'firstEntryJson') {
                        const simulatedResponse = this.generateSimulatedResponse('Quick test message');
                        data = { 
                            message: `✅ Quick test successful! ${simulatedResponse}\n\n⚠️ Note: The n8n webhook is returning "firstEntryJson" - the workflow needs proper chat configuration.`,
                            type: 'firstEntry',
                            sessionId: this.sessionId,
                            simulated: true
                        };
                    } else {
                        data = { message: textData };
                    }
                }
                
                console.log('Quick test response data:', data);
                this.addMessage(`✅ Quick test successful! Response: ${JSON.stringify(data)}`, 'ai');
                this.updateConnectionStatus('Online');
            } else {
                const errorText = await response.text();
                console.log('Quick test error response:', errorText);
                this.addMessage(`❌ Quick test failed! Status: ${response.status}, Response: ${errorText}`, 'ai');
                this.updateConnectionStatus('Error', 'Test Failed');
            }
        } catch (error) {
            console.error('Quick test error:', error);
            this.addMessage(`❌ Quick test error: ${error.message}`, 'ai');
            this.updateConnectionStatus('Error', 'Test Error');
        } finally {
            this.quickTestBtn.textContent = 'Test';
            this.quickTestBtn.disabled = false;
        }
    }

    async testWebhook() {
        this.testWebhookBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.testWebhookBtn.disabled = true;
        
        try {
            this.addMessage('🧪 Testing webhook with different n8n chat methods...', 'ai');
            
            // Test different approaches that n8n chat interfaces typically use
            const testMethods = [
                {
                    name: 'Form Data with sessionId and chatInput (Working Method)',
                    test: async () => {
                        const formData = new FormData();
                        formData.append('sessionId', this.sessionId);
                        formData.append('chatInput', 'Hello test message');
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            body: formData
                        });
                        return response;
                    }
                },
                {
                    name: 'URL Encoded with sessionId and chatInput',
                    test: async () => {
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `sessionId=${encodeURIComponent(this.sessionId)}&chatInput=Hello test message`
                        });
                        return response;
                    }
                },
                {
                    name: 'JSON with sessionId and chatInput',
                    test: async () => {
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: this.sessionId,
                                chatInput: 'Hello test message'
                            })
                        });
                        return response;
                    }
                },
                {
                    name: 'Form Data with all fields',
                    test: async () => {
                        const formData = new FormData();
                        formData.append('sessionId', this.sessionId);
                        formData.append('chatInput', 'Hello test message');
                        formData.append('message', 'Hello test message');
                        formData.append('input', 'Hello test message');
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            body: formData
                        });
                        return response;
                    }
                },
                {
                    name: 'URL Encoded with all fields',
                    test: async () => {
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `sessionId=${encodeURIComponent(this.sessionId)}&chatInput=Hello test message&message=Hello test message&input=Hello test message`
                        });
                        return response;
                    }
                },
                {
                    name: 'GET with all fields',
                    test: async () => {
                        const response = await fetch(`${this.apiUrl}?sessionId=${encodeURIComponent(this.sessionId)}&chatInput=Hello test message&message=Hello test message&input=Hello test message`, {
                            method: 'GET'
                        });
                        return response;
                    }
                },
                {
                    name: 'JSON with all fields',
                    test: async () => {
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: this.sessionId,
                                chatInput: 'Hello test message',
                                message: 'Hello test message',
                                input: 'Hello test message'
                            })
                        });
                        return response;
                    }
                },
                {
                    name: 'Form Data with sessionId as input field',
                    test: async () => {
                        const formData = new FormData();
                        formData.append('sessionId', this.sessionId);
                        formData.append('message', 'Hello test message');
                        formData.append('input', 'Hello test message');
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            body: formData
                        });
                        return response;
                    }
                },
                {
                    name: 'URL Encoded with sessionId as input field',
                    test: async () => {
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `sessionId=${encodeURIComponent(this.sessionId)}&message=Hello test message&input=Hello test message`
                        });
                        return response;
                    }
                }
            ];
            
            let success = false;
            let workingMethod = null;
            
            for (const method of testMethods) {
                try {
                    const response = await method.test();
                    const status = response.ok ? '✅' : '❌';
                    const statusText = response.ok ? 'SUCCESS' : `FAILED (${response.status})`;
                    
                    this.addMessage(`${status} ${method.name}: ${statusText}`, 'ai');
                    
                    if (response.ok) {
                        success = true;
                        workingMethod = method;
                        const textData = await response.text();
                        let data;
                        
                        try {
                            data = JSON.parse(textData);
                        } catch (e) {
                            if (textData === 'firstEntryJson') {
                                data = 'firstEntryJson (First entry response)';
                            } else {
                                data = textData;
                            }
                        }
                        
                        this.addMessage(`🎉 Found working method: ${method.name}! Response: ${JSON.stringify(data).substring(0, 100)}...`, 'ai');
                        break;
                    }
                } catch (error) {
                    this.addMessage(`❌ ${method.name}: ERROR - ${error.message}`, 'ai');
                }
            }
            
            if (success) {
                this.updateConnectionStatus('Online');
                this.showToast(`Webhook test successful! Working method: ${workingMethod.name}`, 'success');
            } else {
                this.updateConnectionStatus('Error', 'Service Down');
                this.showToast('Webhook test failed. The n8n workflow may not be properly configured.', 'error');
                this.addMessage(`❌ All test methods failed. The n8n workflow needs to be configured to handle chat messages properly.`, 'ai');
            }
            
        } catch (error) {
            console.error('Webhook test error:', error);
            this.showToast('Webhook test failed: ' + error.message, 'error');
            this.addMessage(`❌ Webhook test failed: ${error.message}`, 'ai');
        } finally {
            this.testWebhookBtn.innerHTML = '<i class="fas fa-flask"></i>';
            this.testWebhookBtn.disabled = false;
        }
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.messages = [];
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <i class="fas fa-sparkles"></i>
                        <h3>Welcome to AI Chat!</h3>
                        <p>Start a conversation with your AI companion. I'm here to help and chat with you!</p>
                    </div>
                </div>
            `;
            this.hideTypingIndicator();
        }
    }

    openSettings() {
        this.settingsModal.classList.add('show');
    }

    closeSettingsModal() {
        this.settingsModal.classList.remove('show');
    }

    showToast(message, type = 'error') {
        this.errorMessage.textContent = message;
        this.errorToast.className = `toast show ${type}`;
        
        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        this.errorToast.classList.remove('show');
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatApp = new ChatApp();
    
    // Update send button state on input
    chatApp.messageInput.addEventListener('input', () => {
        chatApp.updateSendButton();
    });
    
    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const settings = JSON.parse(localStorage.getItem('chatSettings') || '{}');
        if (settings.theme === 'auto') {
            chatApp.applyTheme('auto');
        }
    });
});

// Add font size styles and message formatting styles
const style = document.createElement('style');
style.textContent = `
    .font-small {
        font-size: 14px;
    }
    .font-small .message-content {
        font-size: 14px;
    }
    .font-medium {
        font-size: 16px;
    }
    .font-medium .message-content {
        font-size: 16px;
    }
    .font-large {
        font-size: 18px;
    }
    .font-large .message-content {
        font-size: 18px;
    }
    .toast.success {
        background: #10b981;
    }
    .toast.success .toast-content i {
        color: #d1fae5;
    }
    
    /* Message formatting styles */
    .message-content {
        line-height: 1.6;
        word-wrap: break-word;
    }
    
    .message-content .bullet-item {
        margin: 8px 0;
        padding-left: 20px;
        position: relative;
    }
    
    .message-content .bullet-item:before {
        content: "•";
        color: #667eea;
        font-weight: bold;
        position: absolute;
        left: 0;
    }
    
    .message-content .numbered-item {
        margin: 8px 0;
        padding-left: 20px;
        position: relative;
    }
    
    .message-content .numbered-item:before {
        content: attr(data-number) ".";
        color: #667eea;
        font-weight: bold;
        position: absolute;
        left: 0;
    }
    
    .message-content strong {
        color: #1e40af;
        font-weight: 600;
    }
    
    .message-content em {
        color: #6b7280;
        font-style: italic;
    }
    
    .message-content br + br {
        margin: 12px 0;
    }
    
    /* Dark theme adjustments */
    .dark-theme .message-content strong {
        color: #60a5fa;
    }
    
    .dark-theme .message-content .bullet-item:before,
    .dark-theme .message-content .numbered-item:before {
        color: #60a5fa;
    }
    
    .dark-theme .message-content em {
        color: #9ca3af;
    }
`;
document.head.appendChild(style);
