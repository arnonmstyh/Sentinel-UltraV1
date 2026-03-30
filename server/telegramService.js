const https = require('https');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '8577213408:AAFlhRXTvtcQVID3L1nfmUy4c5U-7oJ_BdI';
const TELEGRAM_CHAT_ID = '-1003466229180';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send a message to Telegram chat
 * @param {string} message - The message to send
 * @returns {Promise<boolean>} - Success status
 */
const sendTelegramMessage = (message) => {
    return new Promise((resolve) => {
        const url = `${TELEGRAM_API_URL}/sendMessage`;
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(responseData);
                        if (result.ok) {
                            console.log('Telegram message sent successfully');
                            resolve(true);
                        } else {
                            console.error('Telegram API error:', result.description);
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('Error parsing Telegram response:', error);
                        resolve(false);
                    }
                } else {
                    console.error(`Telegram API returned status ${res.statusCode}:`, responseData);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Error sending Telegram message:', error.message);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
};

/**
 * Format SSL expiration alert message
 * @param {Array} expiringUrls - Array of URL objects with expiration info
 * @returns {string} - Formatted message
 */
const formatSSLAlertMessage = (expiringUrls) => {
    if (!expiringUrls || expiringUrls.length === 0) {
        return '';
    }

    const date = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    let message = `🔔 <b>SSL Certificate Expiration Alert</b>\n\n`;
    message += `📅 Report Date: ${date} UTC\n`;
    message += `⚠️ Found <b>${expiringUrls.length}</b> certificate(s) expiring in less than 20 days\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Sort by days remaining (ascending)
    const sortedUrls = expiringUrls.sort((a, b) => {
        const daysA = a.daysRemaining !== null ? a.daysRemaining : 999;
        const daysB = b.daysRemaining !== null ? b.daysRemaining : 999;
        return daysA - daysB;
    });

    sortedUrls.forEach((url, index) => {
        const days = url.daysRemaining !== null ? url.daysRemaining : 'N/A';
        const expiryDate = url.expiryDate 
            ? new Date(url.expiryDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            })
            : 'N/A';
        
        let statusIcon = '🟢';
        if (days <= 0) statusIcon = '🔴';
        else if (days <= 7) statusIcon = '🟠';
        else if (days <= 20) statusIcon = '🟡';

        message += `${index + 1}. ${statusIcon} <b>${url.url}</b>\n`;
        message += `   📆 Expires: ${expiryDate}\n`;
        message += `   ⏰ Days Remaining: <b>${days}</b> days\n`;
        
        if (url.issuer) {
            message += `   🏢 Issuer: ${url.issuer}\n`;
        }
        
        if (url.status === 'ERROR' && url.lastError) {
            message += `   ❌ Error: ${url.lastError}\n`;
        }
        
        message += `\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 Please renew these certificates before expiration.`;

    return message;
};

/**
 * Send SSL expiration summary report to Telegram
 * @param {Array} expiringUrls - Array of URL objects expiring in < 20 days
 * @returns {Promise<boolean>} - Success status
 */
const sendSSLExpirationAlert = async (expiringUrls) => {
    if (!expiringUrls || expiringUrls.length === 0) {
        console.log('No expiring certificates found (< 20 days). No alert sent.');
        return true;
    }

    const message = formatSSLAlertMessage(expiringUrls);
    
    // Telegram has a message length limit of 4096 characters
    // If message is too long, split it into multiple messages
    const maxLength = 4000; // Leave some buffer
    
    if (message.length <= maxLength) {
        return await sendTelegramMessage(message);
    } else {
        // Split into multiple messages
        const urlsPerMessage = Math.floor((expiringUrls.length * maxLength) / message.length);
        let sent = true;
        
        for (let i = 0; i < expiringUrls.length; i += urlsPerMessage) {
            const chunk = expiringUrls.slice(i, i + urlsPerMessage);
            const chunkMessage = formatSSLAlertMessage(chunk);
            const success = await sendTelegramMessage(chunkMessage);
            if (!success) sent = false;
            
            // Small delay between messages to avoid rate limiting
            if (i + urlsPerMessage < expiringUrls.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return sent;
    }
};

module.exports = {
    sendTelegramMessage,
    sendSSLExpirationAlert,
    formatSSLAlertMessage
};
