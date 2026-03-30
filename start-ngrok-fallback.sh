#!/bin/bash

# ngrok startup script with fallback to auto-assigned domains

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

DOMAIN="ddpmsoc.ngrok.app"

echo -e "${BLUE}Starting ngrok tunnels...${NC}\n"

# Check if ngrok is available
if [ ! -f "./ngrok" ]; then
    echo -e "${YELLOW}ngrok not found. Downloading...${NC}"
    wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz
    tar -xzf /tmp/ngrok.tgz -C /tmp
    mv /tmp/ngrok ./ngrok
    chmod +x ./ngrok
fi

# Function to get tunnel URL from ngrok API
get_tunnel_url() {
    local port=$1
    sleep 2
    curl -s http://localhost:$port/api/tunnels 2>/dev/null | \
        python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else '')" 2>/dev/null || \
        curl -s http://localhost:$port/api/tunnels 2>/dev/null | \
        grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4
}

# Try to start frontend with domain first
echo -e "${GREEN}Attempting to start frontend tunnel with domain: ${DOMAIN}${NC}"
./ngrok http 8080 --domain=$DOMAIN --log=stdout > /tmp/ngrok-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 4

# Check if it's running and working
if ps -p $FRONTEND_PID > /dev/null; then
    FRONTEND_URL=$(get_tunnel_url 4040)
    
    # Check for error in log
    if grep -q "ERR_NGROK_3200\|offline\|error" /tmp/ngrok-frontend.log; then
        echo -e "${RED}✗ Domain error detected. Stopping and trying fallback...${NC}"
        kill $FRONTEND_PID 2>/dev/null
        sleep 2
        
        # Fallback: use auto-assigned domain
        echo -e "${YELLOW}Using auto-assigned domain for frontend...${NC}"
        ./ngrok http 8080 --log=stdout > /tmp/ngrok-frontend.log 2>&1 &
        FRONTEND_PID=$!
        sleep 3
        FRONTEND_URL=$(get_tunnel_url 4040)
    fi
    
    if [ ! -z "$FRONTEND_URL" ]; then
        echo -e "${GREEN}✓ Frontend tunnel: ${FRONTEND_URL}${NC}"
    else
        echo -e "${YELLOW}Frontend tunnel started but URL not detected${NC}"
        echo -e "${YELLOW}Check http://localhost:4040 for details${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start frontend tunnel${NC}"
    cat /tmp/ngrok-frontend.log | tail -5
    exit 1
fi

# Start backend tunnel (always use auto-assigned)
echo -e "\n${GREEN}Starting backend tunnel (port 3001)...${NC}"
./ngrok http 3001 --log=stdout > /tmp/ngrok-backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    BACKEND_URL=$(get_tunnel_url 4041)
    
    if [ ! -z "$BACKEND_URL" ]; then
        echo -e "${GREEN}✓ Backend tunnel: ${BACKEND_URL}${NC}"
        
        # Create config file
        mkdir -p public
        cat > public/ngrok-config.js <<EOF
// Auto-generated ngrok configuration
window.NGROK_BACKEND_URL = "${BACKEND_URL}";
window.NGROK_FRONTEND_URL = "${FRONTEND_URL}";
EOF
        echo -e "${GREEN}✓ Created public/ngrok-config.js${NC}\n"
    else
        echo -e "${YELLOW}Backend tunnel started but URL not detected${NC}"
        echo -e "${YELLOW}Check http://localhost:4041 for backend tunnel URL${NC}"
    fi
else
    echo -e "${RED}✗ Failed to start backend tunnel${NC}"
    cat /tmp/ngrok-backend.log | tail -5
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}ngrok tunnels are running${NC}"
if [ ! -z "$FRONTEND_URL" ]; then
    echo -e "${GREEN}Frontend: ${FRONTEND_URL}${NC}"
fi
if [ ! -z "$BACKEND_URL" ]; then
    echo -e "${GREEN}Backend:  ${BACKEND_URL}${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ "$FRONTEND_URL" != *"$DOMAIN"* ]]; then
    echo -e "\n${YELLOW}⚠ Note: Using auto-assigned domain instead of ${DOMAIN}${NC}"
    echo -e "${YELLOW}To use your custom domain:${NC}"
    echo -e "${YELLOW}1. Visit https://dashboard.ngrok.com/domains${NC}"
    echo -e "${YELLOW}2. Verify/activate: ${DOMAIN}${NC}"
    echo -e "${YELLOW}3. Restart this script${NC}\n"
fi

echo -e "${YELLOW}Keep this terminal open. Press Ctrl+C to stop ngrok.${NC}"
echo -e "${YELLOW}Start your application with: npm start${NC}\n"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping ngrok tunnels...${NC}"
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    pkill -f "ngrok http" 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Wait
wait
