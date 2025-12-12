#!/bin/bash
# Sync database and diagrams from EC2 to local

set -e

EC2_HOST="ec2-user@3.236.11.104"
SSH_KEY="../aws_exam.pem"
REMOTE_DIR="/home/ec2-user/aws-exam-practice"

echo "📥 Syncing from EC2 to local..."

# 1. Checkpoint EC2 database (merge WAL)
echo "🔄 Checkpointing EC2 database..."
ssh -i "$SSH_KEY" "$EC2_HOST" "sqlite3 $REMOTE_DIR/data/exam.db 'PRAGMA wal_checkpoint(TRUNCATE);'"

# 2. Backup local database
if [ -f "data/exam.db" ]; then
    BACKUP="data/exam.db.backup.$(date +%Y%m%d_%H%M%S)"
    mv data/exam.db "$BACKUP"
    echo "📦 Local backup: $BACKUP"
fi

# 3. Download database from EC2
echo "⬇️  Downloading database..."
scp -i "$SSH_KEY" "$EC2_HOST:$REMOTE_DIR/data/exam.db" data/exam.db

# 4. Download diagrams from EC2
echo "⬇️  Downloading diagrams..."
mkdir -p uploads/diagrams
scp -i "$SSH_KEY" -r "$EC2_HOST:$REMOTE_DIR/uploads/diagrams/"* uploads/diagrams/ 2>/dev/null || echo "   No diagrams to sync"

# 5. Show stats
echo ""
echo "✅ Sync complete!"
sqlite3 data/exam.db "SELECT 'Questions: ' || COUNT(*) FROM questions; SELECT 'Tests: ' || COUNT(*) FROM tests;"
