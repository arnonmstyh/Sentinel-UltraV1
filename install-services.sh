#!/bin/bash

# Sentinel Dashboard - Systemd Service Installer
# Run this script with sudo: sudo ./install-services.sh

set -e

SERVICE_DIR="/etc/systemd/system"
PROJECT_DIR="/home/ddpm/Downloads/Sentinel-Dashboard-master"

echo "=========================================="
echo "  Sentinel Dashboard Service Installer"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script with sudo:"
    echo "   sudo ./install-services.sh"
    exit 1
fi

# Create logs directory
echo "Creating logs directory..."
mkdir -p "$PROJECT_DIR/logs"
chown ddpm:ddpm "$PROJECT_DIR/logs"

# Copy service files
echo "Copying service files..."
cp "$PROJECT_DIR/sentinel-dashboard.service" "$SERVICE_DIR/"
cp "$PROJECT_DIR/sentinel-ngrok.service" "$SERVICE_DIR/"

# Reload systemd
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Stop existing services if running
echo "Stopping existing services..."
systemctl stop sentinel-ngrok.service 2>/dev/null || true
systemctl stop sentinel-dashboard.service 2>/dev/null || true

# Kill any remaining processes
pkill -f "ngrok start" 2>/dev/null || true
sleep 2

# Enable services
echo "Enabling services to start on boot..."
systemctl enable sentinel-dashboard.service
systemctl enable sentinel-ngrok.service

# Start services
echo "Starting services..."
systemctl start sentinel-dashboard.service

# Wait for dashboard to start before starting ngrok
echo "Waiting for dashboard to initialize..."
sleep 8

systemctl start sentinel-ngrok.service

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Services status:"
echo "----------------"
systemctl status sentinel-dashboard.service --no-pager -l | head -10
echo ""
systemctl status sentinel-ngrok.service --no-pager -l | head -10
echo ""
echo "Useful commands:"
echo "  - Check dashboard:  sudo systemctl status sentinel-dashboard"
echo "  - Check ngrok:      sudo systemctl status sentinel-ngrok"
echo "  - View logs:        sudo journalctl -u sentinel-dashboard -f"
echo "  - Restart all:      sudo systemctl restart sentinel-dashboard sentinel-ngrok"
echo "  - Stop all:         sudo systemctl stop sentinel-ngrok sentinel-dashboard"
echo ""
echo "Log files:"
echo "  - Dashboard: $PROJECT_DIR/logs/dashboard.log"
echo "  - Ngrok:     $PROJECT_DIR/logs/ngrok.log"
echo ""
echo "Access URL: https://ddpmsoc.ngrok.app"
echo ""
