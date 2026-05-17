# CINTENT Platform v2 - Hostinger Quick Start

**5-Minute Setup Guide**

---

## What You're Deploying

- ✅ **Developer Platform Frontend** - Full-featured web interface
- ✅ **Admin Console Frontend** - Internal governance dashboard  
- ✅ **Node.js/Express Server** - Handles routing & API stubs
- 📈 **Ready for Backend** - Architecture & specs provided

---

## Prerequisites

- Hostinger account with SSH/FTP access
- Git installed (for deployment)
- Node.js 14+ (usually pre-installed on Hostinger)

---

## Deployment Steps

### 1. SSH into Hostinger

```bash
ssh username@your-ip-address
# Enter password when prompted
```

### 2. Navigate to Web Root

```bash
cd /home/username/public_html
```

### 3. Create Project Directory

```bash
mkdir api-cintent
cd api-cintent
```

### 4. Initialize & Install

**Via Git (Recommended):**
```bash
git clone https://github.com/yourusername/cintent-platform-v2.git .
npm install
```

**Or manually upload files and run:**
```bash
npm install
```

### 5. Create Environment File

```bash
cat > .env << EOF
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://api-cintent.cognivantalabs.com,https://cintent.cognivantalabs.com
EOF
```

### 6. Start Server with PM2

server.js is the only supported runtime entrypoint for this project. Do not deploy or restart legacy server variants for the live app.

```bash
# Optional preflight: if this returns healthy, stop the old process before restarting
curl http://127.0.0.1:3000/api/health

npm install -g pm2
pm2 start server.js --name "cintent-platform"
pm2 save
pm2 startup
```

### 7. Configure Hostinger Subdomain

1. Login to Hostinger control panel
2. Domains → Subdomains
3. Create subdomain:
   - Name: `api-cintent`
   - Domain: `cognivantalabs.com`
   - Root: `/home/username/public_html/api-cintent`

### 8. Verify It Works

```bash
curl http://localhost:3000/api/health
# Should return: {"status":"healthy","version":"2.0.0"}
```

---

## Access Your Platform

| URL | Purpose |
|-----|---------|
| https://api-cintent.cognivantalabs.com | Developer Platform |
| https://api-cintent.cognivantalabs.com/admin | Admin Console |
| https://api-cintent.cognivantalabs.com/api/health | Health Check |

---

## Troubleshooting

**Port in use?**
```bash
curl http://127.0.0.1:3000/api/health
pm2 delete cintent-platform
pm2 start server.js --name "cintent-platform"
```

**Need to update code?**
```bash
cd /home/username/public_html/api-cintent
git pull
npm install
pm2 restart cintent-platform
```

**Check logs?**
```bash
pm2 logs cintent-platform
```

---

## File Structure

```
/home/username/public_html/api-cintent/
├── server.js                              # Express server
├── package.json                           # NPM config
├── .env                                   # Environment vars
├── .gitignore
└── public/
    ├── CINTENT-DEVELOPER-PLATFORM-V2.html
    └── CINTENT-ADMIN-GOVERNANCE-CONSOLE.html
```

---

## Files Provided

| File | Purpose |
|------|---------|
| `CINTENT-DEVELOPER-PLATFORM-V2.html` | Frontend UI (61 KB) |
| `CINTENT-ADMIN-GOVERNANCE-CONSOLE.html` | Admin UI (54 KB) |
| `server.js` | Express backend |
| `package.json` | Dependencies |
| `.env` | Configuration |
| `.gitignore` | Git ignore rules |

---

## Next Steps

1. ✅ Frontend is live and fully functional
2. 📝 Backend implementation (8-10 weeks)
3. 🔌 Connect database & APIs
4. 💳 Integrate payment processing
5. 🚀 Go live with full platform

See `CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md` for backend roadmap.

---

## Support Resources

- **Deployment Help:** CINTENT-DEPLOYMENT-GUIDE-HOSTINGER.md
- **Implementation Plan:** CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md
- **Architecture:** CINTENT-DEVELOPER-PLATFORM-V2-SPEC.md

---

**🎉 You're Live!**

Your CINTENT Developer Platform is now accessible at:
### https://api-cintent.cognivantalabs.com
