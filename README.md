# PPAP Project Tracking System

ระบบติดตามงาน **PPAP** (Production Part Approval Process) สำหรับผู้ผลิตชิ้นส่วนยานยนต์ TIER 2
A PWA + Cloudflare Workers/D1 system for tracking PPAP projects, trials, and the 18 PPAP elements.

> **Status:** v0.1 — Core modules working in **Demo mode** (data stored locally in the browser).
> The Cloudflare Worker + D1 backend is included and ready to deploy; connect it in **Settings → API URL**.

---

## ✨ Features (v0.1 — Core)

| Module | Status |
|---|---|
| 1. Project Management (CRUD, status, progress) | ✅ |
| 2. Trial Tracking (timeline, checks, photos, mobile camera) | ✅ |
| 3. PPAP 18-Element Checklist | ✅ |
| 5. PSW Generator (auto-fill + print) | ✅ |
| 6. Project Dashboard (risk flag, countdown, readiness %) | ✅ |
| 8. Auth + Roles (admin / engineer / viewer) + Audit log | ✅ |
| Bilingual UI — **ไทย / English** toggle | ✅ |
| 4. Custom Form Builder | 🟡 scaffold |
| 7. R2 photo storage | 🟡 Worker-ready (demo stores inline) |

**Language:** ปุ่ม 🌐 สลับ TH/EN ได้ทุกหน้า — โหมดไทยใช้ทับศัพท์เทคนิค PPAP, โหมดอังกฤษเป็นอังกฤษทั้งหมด.

---

## 🚀 Run locally (Demo mode)

No build step. Serve the folder over HTTP (service worker needs http/https, not `file://`):

```bash
# any static server, e.g.
npx serve .
# or
python -m http.server 8080
```

Open the URL, then sign in with a demo account:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin1234` | Admin (full access + Form Builder + Audit log) |
| `engineer` | `eng1234` | Engineer (create/edit projects & data) |
| `viewer` | `view1234` | Viewer (read-only; confidential part numbers masked) |

Demo data is seeded automatically. Reset it any time in **Settings → Reset demo data**.

---

## ☁️ Deploy the real backend (Cloudflare)

```bash
npm i -g wrangler
cd worker

# 1) Create D1 + R2
wrangler d1 create ppap-db          # paste database_id into wrangler.toml
wrangler r2 bucket create ppap-files

# 2) Apply schema
wrangler d1 execute ppap-db --file=schema.sql --remote

# 3) Set the JWT signing secret
wrangler secret put JWT_SECRET

# 4) Seed a first admin user
#    Open worker/hash-password.html in a browser → generate the INSERT SQL → run it:
wrangler d1 execute ppap-db --command "INSERT INTO users (...) VALUES (...);" --remote

# 5) Deploy
wrangler deploy
```

Then in the app: **Settings → API URL** = your `https://ppap-api.<acct>.workers.dev`.
Leaving API URL blank keeps the app in Demo mode.

### Frontend hosting
Static files (`index.html`, `css/`, `js/`, `icons/`, `manifest.webmanifest`, `sw.js`) deploy to **Netlify** (or Cloudflare Pages / GitHub Pages). The `worker/` folder is backend-only and is not served as part of the site.

---

## 🔐 Security notes
- Every `/api/*` route (except `/api/login`) requires a valid Bearer **JWT** (HS256, 12 h expiry).
- Passwords stored as **PBKDF2-SHA256** (`salt$hash`) — never plaintext.
- Role-based access enforced in the Worker (viewers are read-only).
- Projects flagged **CONFIDENTIAL** hide their part number from non-assigned viewers.
- **Audit log** records login / create / update / delete with user + timestamp.
- HTTPS enforced by Cloudflare. Sensitive data is not persisted in `localStorage` in online mode (only the session token).

---

## 🗂 Project structure
```
index.html              app shell + PWA registration
css/styles.css          dark industrial theme, responsive (desktop sidebar / mobile bottom-nav)
js/i18n.js              TH/EN dictionary + language toggle
js/store.js             data layer — Demo (localStorage) OR live Worker API
js/app.js               router, views, forms, PSW print
manifest.webmanifest    PWA manifest
sw.js                   service worker (offline app-shell cache)
worker/worker.js        Cloudflare Worker API (auth + CRUD)
worker/schema.sql       D1 schema (9 tables)
worker/wrangler.toml    Worker config (D1 + R2 bindings)
worker/hash-password.html  PBKDF2 hash generator for seeding users
```

## 🗺 Roadmap
- Module 4 — visual Form Builder (draw zones on uploaded form → map to fields)
- Module 7 — wire camera photos to R2 + photo gallery per project
- Offline write queue + background sync
- Per-project member access (`project_members`) management UI
- Gantt-style milestone timeline
