---
description: Deploy code changes to production EC2 server
---

# Deploy to EC2

## Quick Deploy (Code Only)

If you just need to push code changes:

// turbo
1. Commit and push changes to GitHub
```bash
cd aws-exam-app
git add -A && git commit -m "Your message" && git push origin main
```

// turbo
2. Deploy to EC2
```bash
./scripts/deploy-quick.sh
```

---

## Full Sync (Code + Data)

If you need to sync database and diagrams too:

// turbo
1. Commit and push changes
```bash
cd aws-exam-app
git add -A && git commit -m "Your message" && git push origin main
```

// turbo
2. Sync data from Local → EC2
```bash
./scripts/sync-to-ec2.sh
```

// turbo
3. Deploy code
```bash
./scripts/deploy-quick.sh
```

---

## Fresh EC2 Setup

For a brand new EC2 instance:

1. SSH into the new EC2
```bash
ssh -i ../aws_exam.pem ec2-user@<NEW_IP>
```

2. Run the full setup script
```bash
# From local aws-exam-app folder:
ssh -i ../aws_exam.pem ec2-user@<NEW_IP> 'bash -s' < scripts/deploy-ec2.sh
```

3. Sync database and diagrams
```bash
./scripts/sync-to-ec2.sh
```

---

## Server Info

| Item | Value |
|------|-------|
| EC2 IP | `3.236.11.104` |
| SSH Key | `../aws_exam.pem` |
| App URL | http://3.236.11.104 |
| PM2 Process | `aws-exam-api` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH timeout | Check Security Group port 22 |
| 0 questions after sync | Run `PRAGMA wal_checkpoint(TRUNCATE)` before scp |
| 403 on frontend | Run `chmod 711 /home/ec2-user` on EC2 |
| API localhost error | Rebuild: `npm run build` |

---

## Useful SSH Commands

```bash
# SSH into EC2
ssh -i ../aws_exam.pem ec2-user@3.236.11.104

# Check PM2 status
ssh -i ../aws_exam.pem ec2-user@3.236.11.104 "pm2 status"

# View logs
ssh -i ../aws_exam.pem ec2-user@3.236.11.104 "pm2 logs aws-exam-api --lines 50"

# Restart backend
ssh -i ../aws_exam.pem ec2-user@3.236.11.104 "pm2 restart aws-exam-api"
```
