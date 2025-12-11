# EC2 Deployment Guide - AWS Exam Practice

Complete guide to deploy the AWS Exam Practice application on a fresh EC2 instance.

---

## Prerequisites

| Item | Description |
|------|-------------|
| EC2 Instance | Amazon Linux 2023 or Ubuntu |
| Public IP | e.g., `3.235.94.226` |
| SSH Key | `aws_exam.pem` in local directory |
| Security Group | Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open |

---

## Quick Deploy (One Command)

```bash
# From local machine, run the deploy script on EC2
ssh -i aws_exam.pem ec2-user@<PUBLIC_IP> 'bash -s' < scripts/deploy-ec2.sh
```

---

## Manual Step-by-Step Deployment

### Step 1: SSH into EC2

```bash
ssh -i aws_exam.pem ec2-user@<PUBLIC_IP>
```

### Step 2: Install Node.js 20.x + Build Tools

```bash
# Install Node.js 20.x (Amazon Linux)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install build tools for native modules (better-sqlite3)
sudo dnf groupinstall -y "Development Tools"

# Verify
node -v  # Should show v20.x.x
```

### Step 3: Install Git, Nginx, PM2

```bash
sudo dnf install -y git nginx
sudo npm install -g pm2
```

### Step 4: Clone Repository

```bash
cd ~
git clone https://github.com/anhlelha/aws-exam-practice.git
cd aws-exam-practice
```

### Step 5: Install Dependencies & Build

```bash
# Frontend
npm install
npm run build

# Backend
cd server
npm install
cd ..
```

### Step 6: Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/aws-exam.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /home/ec2-user/aws-exam-practice/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Diagrams
    location /diagrams {
        proxy_pass http://localhost:3001/diagrams;
    }
}
EOF

# Set permissions
chmod 711 /home/ec2-user
chmod -R 755 /home/ec2-user/aws-exam-practice

# Start Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### Step 7: Start Backend with PM2

```bash
cd ~/aws-exam-practice/server
pm2 start index.js --name aws-exam-api
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

---

## Sync Database & Diagrams from Local

> **IMPORTANT:** SQLite uses WAL mode - must checkpoint before copying!

### From Local Machine:

```bash
# 1. Checkpoint database (merge WAL into main file)
sqlite3 data/exam.db "PRAGMA wal_checkpoint(TRUNCATE);"

# 2. Upload database
scp -i ../aws_exam.pem data/exam.db \
    ec2-user@<PUBLIC_IP>:/home/ec2-user/aws-exam-practice/data/

# 3. Upload diagrams
scp -i ../aws_exam.pem -r uploads/diagrams/* \
    ec2-user@<PUBLIC_IP>:/home/ec2-user/aws-exam-practice/uploads/diagrams/

# 4. Restart backend
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "pm2 restart aws-exam-api"
```

---

## Update Deployment

```bash
# SSH into EC2
ssh -i aws_exam.pem ec2-user@<PUBLIC_IP>

# Pull latest code and rebuild
cd ~/aws-exam-practice
git pull
npm run build
pm2 restart aws-exam-api
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `0 questions` after upload | Run `PRAGMA wal_checkpoint(TRUNCATE)` before scp |
| `FOREIGN KEY constraint` | Already fixed in code - manual cascade delete |
| `403 Forbidden` on frontend | Run `chmod 711 /home/ec2-user` |
| PM2 using old Node.js | Run `pm2 kill && pm2 start` |
| API returns localhost error | Rebuild frontend: `npm run build` |

---

## Key Code Fixes for EC2

| File | Change |
|------|--------|
| `src/config/api.ts` | Uses relative URL `/api` in production |
| `server/db/schema.js` | Added `foreign_keys = ON` pragma |
| `server/routes/questions.js` | Manual cascade delete for questions |
| `server/routes/tests.js` | Manual cascade delete for tests |

---

## Access Application

```
http://<PUBLIC_IP>
```

Hard refresh (Ctrl+Shift+R) if seeing old cached version.
