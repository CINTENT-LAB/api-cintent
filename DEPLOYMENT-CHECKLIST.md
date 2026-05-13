# CINTENT Platform v2 - Hostinger Deployment Checklist

---

## PRE-DEPLOYMENT (Local Machine)

- [ ] Clone/download repository
- [ ] Run `npm install` locally
- [ ] Test locally: `npm start`
- [ ] Verify `http://localhost:3000` works
- [ ] Verify `/admin` page loads
- [ ] Verify `/api/health` returns JSON
- [ ] Create GitHub repository (optional but recommended)
- [ ] Push code to GitHub

---

## HOSTINGER SETUP

### Create Project Directory
- [ ] SSH into Hostinger
- [ ] Navigate to `/home/username/public_html`
- [ ] Create folder: `mkdir api-cintent`
- [ ] Enter folder: `cd api-cintent`

### Deploy Code
- [ ] Clone from GitHub: `git clone https://github.com/username/repo.git .`
- [ ] **OR** Upload files via FTP to `/public_html/api-cintent/`
- [ ] Copy HTML files to `public/` subfolder (create if needed)
- [ ] Verify files exist: `ls -la`

### Install Dependencies
- [ ] Run: `npm install`
- [ ] Wait for completion (should see "added XXX packages")
- [ ] Verify: `ls node_modules` (should have many folders)

### Configure Environment
- [ ] Create `.env` file: `nano .env`
- [ ] Add content:
  ```
  PORT=3000
  NODE_ENV=production
  CORS_ORIGINS=https://api-cintent.cognivantalabs.com
  ```
- [ ] Save file (Ctrl+X, Y, Enter)

### Test Locally
- [ ] Run: `npm start`
- [ ] Wait for startup message
- [ ] Test endpoint: `curl http://localhost:3000/api/health`
- [ ] Should return: `{"status":"healthy"...}`
- [ ] Stop server: Ctrl+C

---

## PROCESS MANAGEMENT

### Option A: PM2 (Recommended)
- [ ] Install globally: `npm install -g pm2`
- [ ] Start server: `pm2 start server.js --name "cintent-platform"`
- [ ] Save config: `pm2 save`
- [ ] Auto-restart on reboot: `pm2 startup`
- [ ] Verify running: `pm2 status`
- [ ] View logs: `pm2 logs cintent-platform`

### Option B: Hostinger App Manager
- [ ] Login to Hostinger control panel
- [ ] Find "Node.js App Manager" or "App Manager"
- [ ] Create new application
- [ ] Set root directory: `/home/username/public_html/api-cintent`
- [ ] Set startup script: `server.js`
- [ ] Set port: `3000`
- [ ] Click "Create" or "Deploy"

### Option C: Screen/Tmux
- [ ] Create screen: `screen -S cintent`
- [ ] Run: `npm start`
- [ ] Detach: Ctrl+A, then D
- [ ] Re-attach: `screen -r cintent`
- [ ] Exit: Type `exit` or Ctrl+D

---

## HOSTINGER SUBDOMAIN CONFIGURATION

- [ ] Login to Hostinger hPanel
- [ ] Navigate to: **Domains → Subdomains**
- [ ] Click: **Create New Subdomain**
  - [ ] Subdomain name: `api-cintent`
  - [ ] Domain: `cognivantalabs.com`
  - [ ] Document root: `/home/username/public_html/api-cintent`
- [ ] Click: **Create Subdomain**
- [ ] Wait: 5-10 minutes for DNS propagation
- [ ] Test: `nslookup api-cintent.cognivantalabs.com`

---

## VERIFICATION & TESTING

### Local Tests (on Hostinger server)
- [ ] SSH: `ssh user@hostinger`
- [ ] Test HTTP: `curl http://localhost:3000/`
- [ ] Test API: `curl http://localhost:3000/api/health`
- [ ] Test Admin: `curl http://localhost:3000/admin`

### Remote Tests (from your machine)
- [ ] Test subdomain: `curl https://api-cintent.cognivantalabs.com/`
- [ ] Should return HTML (developer platform)
- [ ] Test API: `curl https://api-cintent.cognivantalabs.com/api/health`
- [ ] Should return JSON

### Browser Tests
- [ ] Open: `https://api-cintent.cognivantalabs.com/`
- [ ] Developer Platform should load
- [ ] Open: `https://api-cintent.cognivantalabs.com/admin`
- [ ] Admin Console should load
- [ ] Check browser console for errors

---

## SSL/TLS CERTIFICATE

- [ ] Hostinger usually provides free SSL
- [ ] If not, install Certbot:
  ```bash
  sudo apt-get install certbot
  sudo certbot certonly --standalone -d api-cintent.cognivantalabs.com
  ```
- [ ] Verify HTTPS works: `curl -I https://api-cintent.cognivantalabs.com`
- [ ] Should return `HTTP/2 200` (not errors)

---

## MAINTENANCE & MONITORING

### Daily
- [ ] Check server status: `pm2 status`
- [ ] Monitor logs: `pm2 logs cintent-platform`
- [ ] Test health endpoint: `curl https://api-cintent.cognivantalabs.com/api/health`

### Weekly
- [ ] Check disk space: `df -h`
- [ ] Check memory: `free -h`
- [ ] Check log file sizes

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Check for security issues: `npm audit`
- [ ] Backup database (when implemented)
- [ ] Review error logs

---

## TROUBLESHOOTING

### Server Won't Start
```bash
# Check port is not in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Try starting again
npm start
```

### Node/NPM Not Found
```bash
# Check Node version
node --version
npm --version

# If not found, install Node
# Contact Hostinger support for Node installation
```

### CORS Errors
```bash
# Edit .env
nano .env

# Verify CORS_ORIGINS includes your domain
CORS_ORIGINS=https://api-cintent.cognivantalabs.com,https://cintent.cognivantalabs.com

# Save and restart
pm2 restart cintent-platform
```

### DNS Not Resolving
```bash
# Flush DNS cache
sudo systemd-resolve --flush-caches

# Check DNS records
dig api-cintent.cognivantalabs.com
nslookup api-cintent.cognivantalabs.com

# May take 5-10 minutes to propagate
```

### 502 Bad Gateway
- Server not running → Start with `pm2 start`
- Wrong port → Check `.env` and verify port 3000
- Reverse proxy issue → Check Hostinger reverse proxy settings

---

## SUCCESS INDICATORS

✅ When you see these, you're done:

1. `https://api-cintent.cognivantalabs.com/` loads in browser
2. Developer Platform UI is visible
3. Admin console at `/admin` loads
4. `/api/health` returns `{"status":"healthy"}`
5. No CORS errors in browser console
6. Server running with `pm2 status` shows "online"
7. Logs show no errors: `pm2 logs cintent-platform`

---

## NEXT STEPS

✅ Frontend is live and fully functional
📝 Backend implementation begins (8-10 weeks)

See: `CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md`

For backend tasks:
1. Implement authentication service
2. Connect to PostgreSQL database
3. Implement API marketplace
4. Integrate Stripe for billing
5. Build Ask COGNI backend
6. Implement replay service

---

## QUICK REFERENCE COMMANDS

```bash
# SSH in
ssh user@hostinger-ip

# Navigate to project
cd /home/user/public_html/api-cintent

# Install dependencies
npm install

# Start server (foreground - for testing)
npm start

# Start with PM2 (background - for production)
pm2 start server.js --name "cintent-platform"

# Check status
pm2 status
pm2 logs cintent-platform

# Update code
git pull
npm install
pm2 restart cintent-platform

# Stop server
pm2 stop cintent-platform

# Delete from PM2
pm2 delete cintent-platform
```

---

## SUPPORT

- **Quick Start:** HOSTINGER-QUICK-START.md
- **Detailed Guide:** CINTENT-DEPLOYMENT-GUIDE-HOSTINGER.md
- **Implementation Plan:** CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md
- **Architecture:** CINTENT-DEVELOPER-PLATFORM-V2-SPEC.md

---

**Status: Ready for Deployment ✅**

When all checkboxes are checked, your platform is live at:
### https://api-cintent.cognivantalabs.com
