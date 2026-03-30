#!/bin/bash

# Simple ngrok startup script that handles domain verification

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

DOMAIN="ddpmsoc.ngrok.app"

echo -e "${BLUE}Starting ngrok with domain: ${DOMAIN}${NC}\n"

# Check if ngrok is available
if [ ! -f "./ngrok" ]; then
    echo -e "${YELLOW}ngrok not found. Downloading...${NC}"
    wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz
    tar -xzf /tmp/ngrok.tgz -C /tmp
    mv /tmp/ngrok ./ngrok
    chmod +x ./ngrok
fi

# Try to start ngrok with the domain
echo -e "${GREEN}Attempting to start frontend tunnel (port 8080)...${NC}"
./ngrok http 8080 --domain=$DOMAIN > /tmp/ngrok-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

# Check if it's running
if ps -p $FRONTEND_PID > /dev/null; then
    FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ ! -z "$FRONTEND_URL" ]; then
        echo -e "${GREEN}✓ Frontend tunnel started: ${FRONTEND_URL}${NC}"
    else
        echo -e "${YELLOW}Frontend tunnel started but URL not detected yet${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start frontend tunnel${NC}"
    echo -e "${YELLOW}Error log:${NC}"
    cat /tmp/ngrok-frontend.log | tail -10
    echo ""
    echo -e "${YELLOW}Possible solutions:${NC}"
    echo -e "1. Verify the domain at: https://dashboard.ngrok.com/domains"
    echo -e "2. Make sure the domain ${DOMAIN} is activated in your ngrok account"
    echo -e "3. Try using a different domain or let ngrok assign one automatically"
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Start backend tunnel (without domain, let ngrok assign)
echo -e "\n${GREEN}Starting backend tunnel (port 3001)...${NC}"
./ngrok http 3001 --log=stdout > /tmp/ngrok-backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    # Get backend URL from ngrok API (different port)
    sleep 2
    BACKEND_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$BACKEND_URL" ]; then
        # Try alternative method
        BACKEND_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null)
    fi
    
    if [ ! -z "$BACKEND_URL" ]; then
        echo -e "${GREEN}✓ Backend tunnel started: ${BACKEND_URL}${NC}"
        
        # Create config file
        mkdir -p public
        cat > public/ngrok-config.js <<EOF
// Auto-generated ngrok configuration
window.NGROK_BACKEND_URL = "${BACKEND_URL}";
window.NGROK_FRONTEND_URL = "${FRONTEND_URL}";
EOF
        echo -e "${GREEN}✓ Created public/ngrok-config.js${NC}"
    else
        echo -e "${YELLOW}Backend tunnel started but URL not detected${NC}"
        echo -e "${YELLOW}Check http://localhost:4041 for backend tunnel URL${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start backend tunnel${NC}"
    cat /tmp/ngrok-backend.log | tail -10
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}ngrok tunnels are running${NC}"
echo -e "${GREEN}Frontend: ${FRONTEND_URL}${NC}"
if [ ! -z "$BACKEND_URL" ]; then
    echo -e "${GREEN}Backend:  ${BACKEND_URL}${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Note: Keep this terminal open. Press Ctrl+C to stop ngrok.${NC}"
echo -e "${YELLOW}Start your application in another terminal with: npm start${NC}\n"

# Wait for user interrupt
trap "echo -e '\n${YELLOW}Stopping ngrok...${NC}'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
