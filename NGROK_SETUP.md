# ngrok Setup Guide

This guide explains how to run the Sentinel Dashboard with ngrok for public access.

## Prerequisites

- ngrok token configured (already done)
- Domain: `ddpmsoc.ngrok.app`

## Quick Start

Simply run the startup script:

```bash
./start-with-ngrok.sh
```

This script will:
1. Start ngrok tunnels for both frontend and backend
2. Start the application servers
3. Display the public URLs

## Manual Setup

If you prefer to run ngrok manually:

1. **Start ngrok tunnels:**
   ```bash
   ./ngrok start --all --config=./ngrok.yml
   ```

2. **Get the backend URL:**
   - Open http://localhost:4040 in your browser
   - Find the backend tunnel URL (port 3001)
   - Copy the public URL

3. **Update ngrok-config.js:**
   ```bash
   echo "window.NGROK_BACKEND_URL = 'YOUR_BACKEND_URL';" > public/ngrok-config.js
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

## Configuration

### Frontend URL
- **Domain:** `ddpmsoc.ngrok.app`
- **Port:** 8080 (tunneled)

### Backend URL
- **Port:** 3001 (tunneled)
- **Auto-detected** by the startup script

## Troubleshooting

### Frontend can't connect to backend

1. Check that both tunnels are running:
   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. Verify `public/ngrok-config.js` exists and has the correct backend URL

3. Check browser console for errors

4. Ensure CORS is configured correctly (already done in `server/index.js`)

### ngrok tunnel not starting

1. Verify your token is configured:
   ```bash
   ./ngrok config check
   ```

2. Check ngrok logs:
   ```bash
   cat /tmp/ngrok.log
   ```

3. Ensure ports 8080 and 3001 are not in use by other applications

## Access URLs

After starting, you'll see:
- **Frontend:** `https://ddpmsoc.ngrok.app`
- **Backend:** (displayed by startup script)

## Notes

- The ngrok free tier has limitations (request limits, session timeouts)
- For production use, consider ngrok paid plans or other tunneling solutions
- The backend URL is automatically detected and stored in `public/ngrok-config.js`
- Frontend reads the backend URL from `window.NGROK_BACKEND_URL` or sessionStorage
