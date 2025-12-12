#!/bin/bash
# Quick deploy to EC2 - pulls latest code and restarts backend

set -e

EC2_HOST="ec2-user@3.236.11.104"
SSH_KEY="../aws_exam.pem"
APP_DIR="aws-exam-practice"

echo "🚀 Deploying to EC2..."

ssh -i "$SSH_KEY" "$EC2_HOST" "cd $APP_DIR && git pull && npm run build && pm2 restart aws-exam-api"

echo "✅ Deployment complete!"
echo "🌐 http://3.236.11.104"
