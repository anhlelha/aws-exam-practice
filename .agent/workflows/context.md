---
description: Load project context before starting any work on this codebase
---

# Project Context - AWS Exam Practice

Before starting any work, read these essential documentation files:

1. **Read PROJECT_STRUCTURE.md** - Cấu trúc project và deployment scripts
   ```
   File: docs/PROJECT_STRUCTURE.md
   ```

2. **Read DEVELOPMENT_GOTCHAS.md** - Các lưu ý quan trọng khi phát triển
   ```
   File: docs/DEVELOPMENT_GOTCHAS.md
   ```

3. **Read API_REFERENCE.md** - API endpoints reference
   ```
   File: docs/API_REFERENCE.md
   ```

## Project Structure After Cleanup

```
002. AWS exam/
├── aws-exam-app/           # Main application
│   ├── docs/               # App documentation (moved here)
│   │   ├── PROJECT_STRUCTURE.md
│   │   ├── API_REFERENCE.md
│   │   ├── DEVELOPMENT_GOTCHAS.md
│   │   ├── EC2_DEPLOYMENT.md
│   │   ├── AWS_DEPLOYMENT.md
│   │   └── *_TEST_REPORT.md
│   ├── data/               # SQLite database
│   ├── uploads/diagrams/   # Diagram images
│   ├── scripts/            # Deployment scripts
│   ├── src/                # Frontend source
│   ├── server/             # Backend source
│   └── README.md           # Project readme
│
├── docs/sprints/           # Sprint planning docs (archived)
│   ├── SPRINT2_*.md
│   ├── SPRINT3_*.md
│   ├── SPRINT4_*.md
│   └── TASK_*.md
│
├── mockups/                # UI Mockups
│   └── index.html
│
└── aws_exam.pem            # SSH key for EC2
```

## Quick Reference

### Key Folders
- `aws-exam-app/data/exam.db` - SQLite database (WAL mode)
- `aws-exam-app/uploads/diagrams/` - Diagram images
- `aws-exam-app/scripts/` - Deployment scripts
- `aws-exam-app/docs/` - Documentation

### Important Scripts
| Script | Purpose |
|--------|---------|
| `./scripts/sync-to-ec2.sh` | Sync DB + diagrams: Local → EC2 |
| `./scripts/sync-from-ec2.sh` | Sync DB + diagrams: EC2 → Local |
| `./scripts/deploy-quick.sh` | Deploy code to EC2 |

### Server Info
- EC2 IP: `3.236.11.104`
- SSH Key: `../aws_exam.pem`
- App URL: http://3.236.11.104

### Critical Gotchas
1. **SQLite WAL**: Run `PRAGMA wal_checkpoint(TRUNCATE)` before copying database
2. **Boolean in SQLite**: Use `Number(value) === 1` not truthy check
3. **is_multiple_choice**: Must be set to 1 for multiple choice questions
