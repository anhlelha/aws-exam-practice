# Project Structure - AWS Exam Practice

Tài liệu mô tả cấu trúc thư mục và các file quan trọng của dự án.

---

## 📁 Cấu Trúc Thư Mục Chính

```
aws-exam-app/
├── data/                      # 🗄️ DATABASE (SQLite)
│   └── exam.db               # File database chính
│
├── uploads/                   # 📤 USER UPLOADS
│   ├── diagrams/             # 🖼️ Diagram images (PNG, SVG)
│   └── *.pdf                 # PDF files được upload
│
├── dist/                      # 📦 Frontend build (Vite output)
│
├── src/                       # ⚛️ Frontend source (React + TypeScript)
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── contexts/
│   └── config/
│       └── api.ts            # API URL configuration
│
├── server/                    # 🖥️ Backend source (Express + Node.js)
│   ├── routes/
│   ├── services/
│   └── db/
│       └── schema.js         # Database schema & initialization
│
├── scripts/                   # 🔧 Deployment scripts
│   ├── deploy-ec2.sh         # Full EC2 deployment
│   ├── deploy-quick.sh       # Quick code update
│   └── restart-all.sh        # Local dev restart
│
└── mockups/                   # 🎨 UI Mockups (HTML)
    └── index.html
```

---

## 🗄️ Data Folder (`data/`)

| File | Mô tả |
|------|-------|
| `exam.db` | SQLite database chính |
| `exam.db-shm` | Shared memory file (WAL mode) |
| `exam.db-wal` | Write-ahead log (WAL mode) |
| `exam.db.backup.*` | Backup files |

### ⚠️ Lưu ý quan trọng về SQLite WAL Mode:

SQLite sử dụng **WAL mode** để cải thiện hiệu năng. Khi sync database:

```bash
# PHẢI chạy lệnh này trước khi copy database!
sqlite3 data/exam.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Sau đó mới scp lên server
scp -i aws_exam.pem data/exam.db ec2-user@<IP>:~/aws-exam-practice/data/
```

**Nếu không checkpoint:** Server sẽ thấy database cũ hoặc thiếu data!

---

## 🖼️ Uploads Folder (`uploads/`)

| Subfolder | Mô tả |
|-----------|-------|
| `uploads/diagrams/` | Architecture diagrams cho questions |
| `uploads/*.pdf` | PDF files được upload để xử lý |

### Diagram files naming convention:
```
diagram_{question_id}_{timestamp}.{png|svg}
```

Ví dụ: `diagram_10_1765341243040.svg`

---

## 🚀 Deployment Scripts

### Scripts có sẵn trong `scripts/`:

| Script | Mục đích |
|--------|----------|
| `sync-to-ec2.sh` | Sync DB + diagrams từ **Local → EC2** |
| `sync-from-ec2.sh` | Sync DB + diagrams từ **EC2 → Local** |
| `deploy-quick.sh` | Deploy code (git pull + build + restart) |
| `deploy-ec2.sh` | Full EC2 deployment từ đầu |
| `restart-all.sh` | Restart local dev servers |
| `restart-backend.sh` | Restart local backend only |
| `restart-frontend.sh` | Restart local frontend only |
| `stop-all.sh` | Stop all local dev servers |

---

### 1. Sync Data: Local → EC2 (Upload)

```bash
./scripts/sync-to-ec2.sh
```

Script này sẽ:
1. ✅ Checkpoint SQLite database (WAL)
2. ✅ Backup database cũ trên EC2
3. ✅ Upload `data/exam.db`
4. ✅ Upload `uploads/diagrams/*`
5. ✅ Restart PM2 server
6. ✅ Hiển thị stats

---

### 2. Sync Data: EC2 → Local (Download)

```bash
./scripts/sync-from-ec2.sh
```

Script này sẽ:
1. ✅ Checkpoint EC2 database (WAL)
2. ✅ Backup database local
3. ✅ Download database từ EC2
4. ✅ Download diagrams từ EC2
5. ✅ Hiển thị stats

---

### 3. Deploy Code (Git + Build)

```bash
./scripts/deploy-quick.sh
```

Hoặc manual:
```bash
git add -A && git commit -m "message" && git push

# Trên EC2
ssh -i ../aws_exam.pem ec2-user@3.235.94.226 \
    "cd aws-exam-practice && git pull && npm run build && pm2 restart aws-exam-api"
```

---

## 🔗 Server Information

| Item | Value |
|------|-------|
| EC2 IP | `3.235.94.226` |
| SSH Key | `../aws_exam.pem` |
| App URL | http://3.235.94.226 |
| API URL | http://3.235.94.226/api |
| SSH User | `ec2-user` |
| App Directory | `~/aws-exam-practice` |
| PM2 Process | `aws-exam-api` |

---

## 📋 Database Schema (Main Tables)

| Table | Mô tả |
|-------|-------|
| `questions` | Câu hỏi (text, is_multiple_choice, category_id, diagram_path) |
| `answers` | Đáp án (question_id, text, is_correct, order_index) |
| `tests` | Bộ đề thi (name, duration_minutes) |
| `test_questions` | Mapping test ↔ questions |
| `practice_sessions` | Session làm bài thi |
| `session_answers` | Câu trả lời trong session |
| `categories` | Danh mục (Compute, Storage, Networking...) |
| `tags` | Tags cho questions |
| `question_tags` | Mapping question ↔ tags |

### Lưu ý về `is_multiple_choice`:

- SQLite lưu boolean dạng `0` hoặc `1`
- Trong code TypeScript, check bằng: `Number(question.is_multiple_choice) === 1`
- **KHÔNG** dùng truthy check: `if (question.is_multiple_choice)` ❌

---

## 🛠️ Local Development

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend  
npm run dev

# Hoặc dùng script
./scripts/restart-all.sh
```

**Local URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Multiple choice không hiển thị | Check `is_multiple_choice = 1` trong DB |
| Diagrams không load trên server | Sync folder `uploads/diagrams/` |
| Database không cập nhật | Chạy `PRAGMA wal_checkpoint(TRUNCATE)` trước khi copy |
| API 503 trên server | `pm2 restart aws-exam-api` |
| Build lỗi trên server | `npm run build` trong thư mục app |
