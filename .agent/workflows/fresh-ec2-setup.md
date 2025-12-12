---
description: Setup AWS Exam Practice on a brand new EC2 instance from scratch
---

# Fresh EC2 Setup Workflow

Complete installation guide for deploying to a **new EC2 instance**.

## Prerequisites

Before starting, ensure:
- [ ] EC2 instance is **Running** (Amazon Linux 2023)
- [ ] Security Group has ports **22, 80, 443** open
- [ ] You have the correct **SSH key** (`../aws_exam.pem`)
- [ ] You know the **Public IP** address

---

## Step 1: Test SSH Connection

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "echo 'Connected!' && uname -a"
```

If timeout, check Security Group port 22.

---

## Step 2: Install Node.js 20.x

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo dnf install -y nodejs && node -v"
```

---

## Step 3: Install Build Tools, Git, Nginx, PM2

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "sudo dnf groupinstall -y 'Development Tools' && sudo dnf install -y git nginx && sudo npm install -g pm2"
```

---

## Step 4: Clone Repository & Build

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "cd ~ && git clone https://github.com/anhlelha/aws-exam-practice.git && cd aws-exam-practice && npm install && npm run build && cd server && npm install"
```

---

## Step 5: Configure Nginx

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "sudo tee /etc/nginx/conf.d/aws-exam.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /home/ec2-user/aws-exam-practice/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /diagrams {
        proxy_pass http://localhost:3001/diagrams;
    }
}
EOF"
```

---

## Step 6: Set Permissions & Start Nginx

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "chmod 711 /home/ec2-user && chmod -R 755 /home/ec2-user/aws-exam-practice && sudo systemctl enable nginx && sudo systemctl restart nginx"
```

---

## Step 7: Start Backend with PM2

```bash
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "cd ~/aws-exam-practice/server && pm2 start index.js --name aws-exam-api && pm2 save"
```

---

## Step 8: Sync Database & Diagrams

```bash
# Checkpoint local database first
sqlite3 data/exam.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Create uploads directory on EC2
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "mkdir -p ~/aws-exam-practice/uploads/diagrams"

# Stop backend before upload
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "pm2 stop aws-exam-api && rm -f ~/aws-exam-practice/data/exam.db*"

# Upload database
scp -i ../aws_exam.pem data/exam.db ec2-user@<PUBLIC_IP>:/home/ec2-user/aws-exam-practice/data/

# Upload diagrams
scp -i ../aws_exam.pem -r uploads/diagrams/* ec2-user@<PUBLIC_IP>:/home/ec2-user/aws-exam-practice/uploads/diagrams/

# Restart backend
ssh -i ../aws_exam.pem ec2-user@<PUBLIC_IP> "pm2 start aws-exam-api"
```

---

## Step 9: Verify Deployment

```bash
# Check API
curl -s http://<PUBLIC_IP>/api/tests

# Should return JSON with tests
```

---

## Step 10: Update Scripts with New IP

After successful deployment, update the IP in:
- `scripts/deploy-quick.sh`
- `scripts/sync-to-ec2.sh`
- `scripts/sync-from-ec2.sh`
- `.agent/workflows/context.md`
- `.agent/workflows/deploy.md`

```bash
# Quick sed command to update all at once
sed -i '' 's/OLD_IP/NEW_IP/g' scripts/*.sh
```

---

## Quick Reference

| Item | Command |
|------|---------|
| SSH | `ssh -i ../aws_exam.pem ec2-user@<IP>` |
| PM2 Status | `pm2 status` |
| PM2 Logs | `pm2 logs aws-exam-api --lines 50` |
| Restart Backend | `pm2 restart aws-exam-api` |
| Nginx Status | `sudo systemctl status nginx` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH timeout | Check Security Group port 22 |
| 0 questions | Stop PM2, delete exam.db*, re-upload, start PM2 |
| 403 Forbidden | `chmod 711 /home/ec2-user` |
| API localhost error | Rebuild frontend: `npm run build` |
