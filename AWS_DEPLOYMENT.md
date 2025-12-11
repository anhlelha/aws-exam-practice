# AWS EC2 Deployment Guide

## Prerequisites

- AWS Account
- SSH key pair (will create during EC2 setup)

---

## Step 1: Launch EC2 Instance

### 1.1 Go to AWS Console
1. Login to [AWS Console](https://console.aws.amazon.com)
2. Go to **EC2** → **Instances** → **Launch instance**

### 1.2 Configure Instance

| Setting | Value |
|---------|-------|
| **Name** | `aws-exam-practice` |
| **AMI** | Amazon Linux 2023 (or Ubuntu 22.04) |
| **Instance type** | `t3.micro` (free tier) or `t3.small` |
| **Key pair** | Create new → download `.pem` file |
| **Storage** | 20 GB gp3 |

### 1.3 Network Settings (Security Group)

Click **Edit** and add these rules:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | My IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web access |
| HTTPS | 443 | 0.0.0.0/0 | Secure web |

### 1.4 Launch
Click **Launch instance** and wait for it to start.

---

## Step 2: Connect to EC2

### Get Public IP
1. Go to EC2 → Instances
2. Click on your instance
3. Copy **Public IPv4 address**

### SSH Connection

**macOS/Linux:**
```bash
# Set permissions on key file
chmod 400 your-key.pem

# Connect (Amazon Linux)
ssh -i your-key.pem ec2-user@<PUBLIC-IP>

# Or (Ubuntu)
ssh -i your-key.pem ubuntu@<PUBLIC-IP>
```

**Windows (PowerShell):**
```powershell
ssh -i your-key.pem ec2-user@<PUBLIC-IP>
```

---

## Step 3: Run Deploy Script

Once connected via SSH, run these commands:

```bash
# Download and run deploy script
curl -O https://raw.githubusercontent.com/anhlelha/aws-exam-practice/main/scripts/deploy-ec2.sh
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

**Wait ~5-10 minutes for deployment to complete.**

---

## Step 4: Access Your App

Open browser and go to:
```
http://<YOUR-EC2-PUBLIC-IP>
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check backend status |
| `pm2 logs` | View backend logs |
| `pm2 restart all` | Restart backend |
| `sudo systemctl restart nginx` | Restart Nginx |
| `pm2 logs --lines 100` | View last 100 log lines |

---

## Updating the App

To update to latest version:

```bash
cd ~/aws-exam-practice
git pull
npm install
npm run build
cd server
npm install
pm2 restart all
```

---

## Optional: Setup HTTPS with Let's Encrypt

```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux
# OR
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

---

## Troubleshooting

### App not loading?
```bash
# Check if backend is running
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Port 80 blocked?
- Check Security Group in AWS Console
- Ensure HTTP (port 80) is allowed from 0.0.0.0/0

### Backend crashing?
```bash
# View backend logs
pm2 logs aws-exam-api

# Restart backend
pm2 restart aws-exam-api
```

---

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| EC2 t3.micro | **$0** (Free tier first 12 months) |
| EC2 t3.small | ~$15/month |
| Storage 20GB | ~$2/month |
| Data transfer | ~$0-5/month |
| **Total** | **$0-22/month** |

---

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────┐
│           EC2 Instance              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │       Nginx (Port 80)       │    │
│  │  ┌───────────────────────┐  │    │
│  │  │  Static files (/)     │  │    │
│  │  │  → /dist folder       │  │    │
│  │  ├───────────────────────┤  │    │
│  │  │  API proxy (/api)     │  │    │
│  │  │  → localhost:3001     │  │    │
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
│                │                    │
│                ▼                    │
│  ┌─────────────────────────────┐    │
│  │   Node.js + Express (3001) │    │
│  │   + SQLite Database        │    │
│  │   (managed by PM2)         │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```
