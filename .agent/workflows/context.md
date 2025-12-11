---
description: Load project context before starting any work on this codebase
---

# Project Context - AWS Exam Practice

Before starting any work, read these essential documentation files:

1. **Read PROJECT_STRUCTURE.md** - Cấu trúc project và deployment scripts
   ```
   File: PROJECT_STRUCTURE.md
   ```

2. **Read DEVELOPMENT_GOTCHAS.md** - Các lưu ý quan trọng khi phát triển
   ```
   File: DEVELOPMENT_GOTCHAS.md
   ```

3. **Read API_REFERENCE.md** - API endpoints reference
   ```
   File: API_REFERENCE.md
   ```

## Quick Reference

### Key Folders
- `data/exam.db` - SQLite database (WAL mode)
- `uploads/diagrams/` - Diagram images
- `scripts/` - Deployment scripts

### Important Scripts
| Script | Purpose |
|--------|---------|
| `./scripts/sync-to-ec2.sh` | Sync DB + diagrams: Local → EC2 |
| `./scripts/sync-from-ec2.sh` | Sync DB + diagrams: EC2 → Local |
| `./scripts/deploy-quick.sh` | Deploy code to EC2 |

### Server Info
- EC2 IP: `3.235.94.226`
- SSH Key: `../aws_exam.pem`
- App URL: http://3.235.94.226

### Critical Gotchas
1. **SQLite WAL**: Run `PRAGMA wal_checkpoint(TRUNCATE)` before copying database
2. **Boolean in SQLite**: Use `Number(value) === 1` not truthy check
3. **is_multiple_choice**: Must be set to 1 for multiple choice questions
