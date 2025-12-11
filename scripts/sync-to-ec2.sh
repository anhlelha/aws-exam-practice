#!/bin/bash
# Sync database and diagrams from LOCAL to EC2

set -e

EC2_HOST="ec2-user@3.235.94.226"
SSH_KEY="../aws_exam.pem"
REMOTE_DIR="/home/ec2-user/aws-exam-practice"

echo "📤 Syncing from Local to EC2..."

# 1. Checkpoint local database (merge WAL)
echo "🔄 Checkpointing local database..."
sqlite3 data/exam.db "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

# 2. Backup EC2 database
echo "📦 Creating backup on EC2..."
ssh -i "$SSH_KEY" "$EC2_HOST" "cd $REMOTE_DIR && cp data/exam.db data/exam.db.backup.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# 3. Upload database to EC2
echo "⬆️  Uploading database..."
scp -i "$SSH_KEY" data/exam.db "$EC2_HOST:$REMOTE_DIR/data/exam.db"

# 4. Upload diagrams to EC2
echo "⬆️  Uploading diagrams..."
ssh -i "$SSH_KEY" "$EC2_HOST" "mkdir -p $REMOTE_DIR/uploads/diagrams"
scp -i "$SSH_KEY" -r uploads/diagrams/* "$EC2_HOST:$REMOTE_DIR/uploads/diagrams/" 2>/dev/null || echo "   No diagrams to sync"

# 5. Restart backend on EC2
echo "🔄 Restarting EC2 backend..."
ssh -i "$SSH_KEY" "$EC2_HOST" "pm2 restart aws-exam-api"

# 6. Show stats
echo ""
echo "✅ Sync to EC2 complete!"
ssh -i "$SSH_KEY" "$EC2_HOST" "sqlite3 $REMOTE_DIR/data/exam.db 'SELECT \"Questions: \" || COUNT(*) FROM questions; SELECT \"Tests: \" || COUNT(*) FROM tests;'"
