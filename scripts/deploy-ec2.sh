#!/bin/bash
# =============================================================================
# AWS Exam Practice - EC2 Deployment Script
# =============================================================================
# This script automatically deploys the entire application on an EC2 instance
# Tested on: Amazon Linux 2023 and Ubuntu 22.04
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  AWS Exam Practice - EC2 Deployment   ${NC}"
echo -e "${GREEN}========================================${NC}"

# =============================================================================
# CONFIGURATION - Modify these if needed
# =============================================================================
REPO_URL="https://github.com/anhlelha/aws-exam-practice.git"
APP_DIR="/home/ec2-user/aws-exam-practice"
NODE_VERSION="18"
BACKEND_PORT="3001"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

echo -e "${YELLOW}Detected OS: $OS${NC}"

# =============================================================================
# Step 1: Update System
# =============================================================================
echo -e "\n${GREEN}[1/8] Updating system packages...${NC}"

if [ "$OS" == "amzn" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
    sudo yum update -y
    PKG_MANAGER="yum"
elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    sudo apt update && sudo apt upgrade -y
    PKG_MANAGER="apt"
else
    echo -e "${RED}Unsupported OS. Please use Amazon Linux 2023 or Ubuntu 22.04${NC}"
    exit 1
fi

# =============================================================================
# Step 2: Install Node.js
# =============================================================================
echo -e "\n${GREEN}[2/8] Installing Node.js ${NODE_VERSION}...${NC}"

if [ "$PKG_MANAGER" == "yum" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
    sudo yum install -y nodejs
else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo -e "Node.js version: $(node -v)"
echo -e "npm version: $(npm -v)"

# =============================================================================
# Step 3: Install Nginx and Git
# =============================================================================
echo -e "\n${GREEN}[3/8] Installing Nginx and Git...${NC}"

if [ "$PKG_MANAGER" == "yum" ]; then
    sudo yum install -y nginx git
else
    sudo apt install -y nginx git
fi

# =============================================================================
# Step 4: Install PM2
# =============================================================================
echo -e "\n${GREEN}[4/8] Installing PM2 process manager...${NC}"
sudo npm install -g pm2

# =============================================================================
# Step 5: Clone Repository
# =============================================================================
echo -e "\n${GREEN}[5/8] Cloning repository...${NC}"

# Change to home directory based on OS
if [ "$OS" == "ubuntu" ]; then
    APP_DIR="/home/ubuntu/aws-exam-practice"
fi

cd $(dirname "$APP_DIR")

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Directory exists. Pulling latest changes...${NC}"
    cd "$APP_DIR"
    git pull
else
    git clone "$REPO_URL"
    cd "$APP_DIR"
fi

# =============================================================================
# Step 6: Build Frontend
# =============================================================================
echo -e "\n${GREEN}[6/8] Building frontend...${NC}"

npm install
npm run build

# =============================================================================
# Step 7: Setup Backend
# =============================================================================
echo -e "\n${GREEN}[7/8] Setting up backend...${NC}"

cd server
npm install

# Create data directory
mkdir -p ../data

# Start backend with PM2
pm2 delete aws-exam-api 2>/dev/null || true
pm2 start index.js --name aws-exam-api
pm2 save

# Setup PM2 to start on boot
if [ "$OS" == "amzn" ]; then
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
else
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
fi

# =============================================================================
# Step 8: Configure Nginx
# =============================================================================
echo -e "\n${GREEN}[8/8] Configuring Nginx...${NC}"

# Determine the correct user for app directory
if [ "$OS" == "ubuntu" ]; then
    APP_USER="ubuntu"
else
    APP_USER="ec2-user"
fi

# Create Nginx config
sudo tee /etc/nginx/conf.d/aws-exam.conf > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Increase body size for file uploads
    client_max_body_size 50M;
    
    # Serve frontend build files
    root ${APP_DIR}/dist;
    index index.html;
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # Serve diagram images
    location /diagrams {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Remove default nginx config if exists
sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test and restart Nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# =============================================================================
# Done!
# =============================================================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Deployment Complete!              ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Your application is now running at:"
echo -e "  ${YELLOW}http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<YOUR-EC2-PUBLIC-IP>')${NC}"
echo -e ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}pm2 status${NC}       - Check backend status"
echo -e "  ${YELLOW}pm2 logs${NC}         - View backend logs"
echo -e "  ${YELLOW}pm2 restart all${NC}  - Restart backend"
echo -e "  ${YELLOW}sudo nginx -t${NC}    - Test Nginx config"
echo -e ""
echo -e "${GREEN}Enjoy your AWS Exam Practice app! 🎉${NC}"
