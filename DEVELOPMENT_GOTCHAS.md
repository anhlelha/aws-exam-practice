# Development Gotchas & Lessons Learned

This document captures common issues encountered during development to prevent them from recurring.

---

## 🚨 File Path Issues

### 1. Relative vs Absolute Paths in Backend

**Problem:** When using `multer` or any file system operations, relative paths behave differently depending on the current working directory (CWD).

**Example:**
```javascript
// ❌ WRONG - depends on where node is started from
const dir = 'uploads/diagrams/';

// ✅ CORRECT - always resolves to correct path
const dir = path.join(__dirname, '../../uploads/diagrams/');
```

**Why it matters:**
- Local development: CWD might be `aws-exam-app/`
- EC2 with PM2: CWD is `aws-exam-app/server/`
- This causes files to be saved in wrong location

**Files affected:**
- `server/routes/questions.js` - multer diagram storage
- Any future file upload handlers

---

## 🚨 API Endpoint Mismatches

### 2. Frontend/Backend Endpoint Sync

**Problem:** Frontend calls different URL than backend defines.

**Examples fixed:**
| Frontend (wrong) | Backend (correct) | File |
|------------------|-------------------|------|
| `/questions/:id/diagram` | `/questions/:id/diagram/upload` | `questionService.ts` |
| `/settings/certifications` | `/questions/categories` | `questionService.ts` |

**Prevention:**
1. Always check `API_REFERENCE.md` before adding new endpoints
2. Update `API_REFERENCE.md` when adding new routes
3. Run integration tests before deployment

---

## 🚨 HTTP Method Mismatches

### 3. POST vs PUT Confusion

**Problem:** Frontend uses wrong HTTP method (POST instead of PUT for updates).

**Rule of thumb:**
- `POST` = Create new resource
- `PUT` = Update existing resource (idempotent)
- `DELETE` = Remove resource

**Files to check:**
- All files in `src/services/`
- All routes in `server/routes/`

---

## 🚨 Data Structure Confusion

### 4. Certifications vs Categories

**Problem:** Frontend loaded certifications (SAA-C03, SAP-C02) instead of categories (Design Secure, Design Resilient).

**Database structure:**
```
certifications
├── id: 1, code: SAA-C03, name: AWS Solutions Architect - Associate
│   └── categories (via certification_id)
│       ├── Design Secure Architectures
│       ├── Design Resilient Architectures
│       └── ...
```

**Correct endpoints:**
- `/api/settings/certifications` → Get certification list (for certification dropdown)
- `/api/questions/categories` → Get categories list (for category dropdown)

---

## 🚨 EC2 Deployment Pitfalls

### 5. Static Files Not Served

**Problem:** Diagrams uploaded on EC2 but can't be viewed.

**Checklist:**
1. ✅ Nginx proxies `/diagrams` to backend
2. ✅ Express serves `../uploads/diagrams/` as static
3. ✅ Multer saves to correct path using `path.join(__dirname, ...)`
4. ✅ Directory has correct permissions

### 6. Database vs Files Sync

**Problem:** Database contains diagram_path but file doesn't exist.

**When syncing:**
- Sync database: `./scripts/sync-from-ec2.sh`
- **Also sync diagrams!** (handled in script now)

---

## ✅ Pre-Deployment Checklist

Before deploying to EC2:

- [ ] All file paths use `path.join(__dirname, ...)` not relative paths
- [ ] API endpoints match between frontend services and backend routes
- [ ] HTTP methods (GET/POST/PUT/DELETE) are correct
- [ ] `API_REFERENCE.md` is updated with any new endpoints
- [ ] Run `npm run build` locally first
- [ ] Check for TypeScript errors

---

## 📁 Key Files to Reference

| Purpose | File |
|---------|------|
| API endpoints documentation | `API_REFERENCE.md` |
| Deployment guide | `EC2_DEPLOYMENT.md` |
| Quick deploy script | `scripts/deploy-quick.sh` |
| Sync from EC2 | `scripts/sync-from-ec2.sh` |
