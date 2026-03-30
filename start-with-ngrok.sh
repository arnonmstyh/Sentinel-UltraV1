#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Sentinel Dashboard with ngrok...${NC}\n"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Kill any existing ngrok processes
pkill -9 ngrok 2>/dev/null
sleep 2

# Check if ngrok is available
if [ ! -f "./ngrok" ]; then
    echo -e "${YELLOW}ngrok not found. Downloading...${NC}"
    wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz
    tar -xzf /tmp/ngrok.tgz -C /tmp
    mv /tmp/ngrok ./ngrok
    chmod +x ./ngrok
fi

# Start ngrok in background using config file
echo -e "${GREEN}Starting ngrok tunnels...${NC}"
./ngrok start --all --config=./ngrok.yml --log=stdout > ./ngrok_current.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
echo -e "${BLUE}Waiting for tunnels to initialize...${NC}"
sleep 10

# Get URLs from ngrok API
TUNNELS_JSON=$(curl -s http://localhost:4040/api/tunnels)

if [ -z "$TUNNELS_JSON" ]; then
    echo -e "${RED}Error: ngrok failed to start or API not responding.${NC}"
    cat ./ngrok_current.log
    exit 1
fi

FRONTEND_URL=$(echo "$TUNNELS_JSON" | python3 -c "import sys, json; data=json.load(sys.stdin); print(next((t['public_url'] for t in data['tunnels'] if t['name'] == 'frontend'), ''))")
BACKEND_URL=$(echo "$TUNNELS_JSON" | python3 -c "import sys, json; data=json.load(sys.stdin); print(next((t['public_url'] for t in data['tunnels'] if t['name'] == 'backend'), ''))")

if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}Error: Could not retrieve tunnel URLs.${NC}"
    echo "Frontend: $FRONTEND_URL"
    echo "Backend: $BACKEND_URL"
    cat ./ngrok_current.log
    exit 1
fi

echo -e "${GREEN}✓ Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}✓ Backend URL:  ${BACKEND_URL}${NC}\n"

# Update ngrok-config.js
mkdir -p public
cat > public/ngrok-config.js <<EOF
// Auto-generated ngrok configuration
window.NGROK_BACKEND_URL = "${BACKEND_URL}";
window.NGROK_FRONTEND_URL = "${FRONTEND_URL}";
EOF
echo -e "${GREEN}✓ Updated public/ngrok-config.js${NC}\n"

# Start application servers
echo -e "${BLUE}Starting application servers (npm start)...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $NGROK_PID 2>/dev/null
    pkill -f "node.*index.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    pkill -f "concurrently" 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start the application in background so we can wait on it
npm start &
APP_PID=$!

echo -e "${GREEN}✓ Services are running!${NC}\n"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Access your application at:${NC}"
echo -e "${GREEN}  ${FRONTEND_URL}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}Keep this terminal open. Press Ctrl+C to stop.${NC}\n"

wait $APP_PID
