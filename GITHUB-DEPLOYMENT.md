# CINTENT Platform v2 - GitHub to Hostinger Deployment

**Setup: Git Sync Automatic Deployment**  
**Status:** ✅ Production Ready  
**Version:** 2.0.0

---

## 🎯 What This Does

When you push code to GitHub, Hostinger **automatically pulls and deploys** it. No manual FTP uploads needed!

```
Your Local Computer
        ↓
    Git Push
        ↓
   GitHub Repo
        ↓
  Hostinger Git Sync
        ↓
  Auto Pulls & Deploys
        ↓
  Live at api-cintent.cognivantalabs.com
```

---

## ⚡ Quick Setup (15 Minutes)

### Step 1: Create GitHub Repository

Go to https://github.com/new

**Settings:**
- Repository name: `cintent-platform-v2`
- Description: `CINTENT Developer Platform v2 - Enterprise API Operating Ecosystem`
- Public or Private: **Your choice**
- Initialize: **Do NOT** initialize with README (we have our own)
- Create repository

### Step 2: Initialize Git Locally

On your local machine in your project folder:

```bash
# Navigate to your project
cd C:\Users\rpm_T\RAJA_REP

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial CINTENT Platform v2 - Frontend, Server, Documentation

- Developer Platform V2 (61 KB) - 15 core modules, fully functional
- Admin Governance Console (54 KB) - Full admin dashboard
- Express.js Backend Server - Ready for integration
- Complete deployment guides and architecture specs
- 8-10 week implementation roadmap
- Ready for production deployment to Hostinger"

# Add GitHub as origin
git remote add origin https://github.com/YOUR_USERNAME/cintent-platform-v2.git

# Create main branch and push
git branch -M main
git push -u origin main
```

### Step 3: Verify on GitHub

1. Go to https://github.com/YOUR_USERNAME/cintent-platform-v2
2. Should see all your files
3. Click "Code" → green button to verify connection works

### Step 4: Set Up Git Sync in Hostinger

1. **Login to Hostinger** (hpanel.hostinger.com)
2. **Navigate:** Hosting → Source Control
3. **Click:** Connect Repository
4. **Authorize GitHub** (you'll be redirected to GitHub to authenticate)
5. **Select:**
   - Repository: `cintent-platform-v2`
   - Branch: `main`
   - Deploy to: `/home/username/public_html/api-cintent`
6. **Click:** Deploy

### Step 5: Create Subdomain

1. **In Hostinger:** Domains → Subdomains
2. **Create:**
   - Name: `api-cintent`
   - Domain: `cognivantalabs.com`
   - Root: `/home/username/public_html/api-cintent`
3. **Wait:** 5-10 minutes for DNS

### Step 6: Test Deployment

```bash
# SSH into Hostinger
ssh username@your-hostinger-ip

# Check if files are there
cd /home/username/public_html/api-cintent
ls -la

# Install dependencies (first time only)
npm install

# Start server
npm install -g pm2
pm2 start server.js --name "cintent-platform"
pm2 save
pm2 startup
```

### Step 7: Verify Live

Test these URLs:
- https://api-cintent.cognivantalabs.com/ → Developer Platform
- https://api-cintent.cognivantalabs.com/admin → Admin Console
- https://api-cintent.cognivantalabs.com/api/health → Health check

---

## 📝 Usage Guide

### Making Code Changes

**Local Development:**

```bash
# Make changes to your files
# Edit server.js, update HTML, etc.

# Check what changed
git status

# Stage changes
git add .

# Commit with message
git commit -m "Update API endpoints for marketplace integration"

# Push to GitHub
git push origin main
```

**Hostinger Auto-Deploys:**

```
Hostinger Git Sync watches for changes
  ↓
Sees your push to GitHub
  ↓
Automatically pulls new code
  ↓
Runs: npm install (if package.json changed)
  ↓
Restarts server automatically
  ↓
Live within 1-2 minutes
```

### Update Server.js

```bash
# Edit SIMPLE-SERVER.js
# Add new endpoints, fix bugs, etc.

git add SIMPLE-SERVER.js
git commit -m "Add marketplace endpoint stubs"
git push origin main

# Wait 1-2 minutes for Hostinger to sync
# Server automatically restarts
# Changes live immediately
```

### Update Frontend

```bash
# Edit CINTENT-DEVELOPER-PLATFORM-V2.html
# Or CINTENT-ADMIN-GOVERNANCE-CONSOLE.html

git add *.html
git commit -m "Update UI styling and add new features"
git push origin main

# Changes visible immediately on next page load
# (No server restart needed for HTML)
```

### Add Dependencies

```bash
# Add new npm package locally
npm install express-validator

# Update package.json is automatic
# Commit
git add package.json
git commit -m "Add express-validator for input validation"
git push origin main

# Hostinger sees package.json changed
# Automatically runs: npm install
# New dependency installed on server
```

---

## 🔄 Git Workflow

### Daily Development

```bash
# Pull latest from GitHub (in case of conflicts)
git pull origin main

# Make your changes
# Edit files...

# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "Clear description of what changed"

# Push to GitHub & Hostinger
git push origin main
```

### Best Practices

1. **Descriptive Commit Messages**
   ```bash
   # ✅ GOOD
   git commit -m "Implement authentication service with JWT support"
   
   # ❌ AVOID
   git commit -m "updates"
   ```

2. **Commit Frequently**
   - Don't wait to commit everything at once
   - Small, logical commits are easier to review/rollback

3. **Use Branches for Big Features** (Optional)
   ```bash
   # Create feature branch
   git checkout -b feature/ask-cogni-backend
   
   # Work on feature
   # Commit changes...
   
   # When ready, push
   git push origin feature/ask-cogni-backend
   
   # Create Pull Request on GitHub
   # Review, then merge to main
   ```

---

## 🛠️ Setup on Hostinger (Detailed)

### Enable Git Sync

1. **Login to Hostinger Control Panel**
2. **Go to:** Hosting → Source Control
3. **If no "Source Control" option:**
   - Go to: Account → Setting
   - Find: "Git Support" or "Version Control"
   - Enable it

4. **Connect Repository:**
   - Click "Connect New Repository"
   - Choose "GitHub"
   - Authorize (sign in to GitHub)
   - Select your repository
   - Branch: `main`
   - Deploy to: `/home/username/public_html/api-cintent`

### Manual Pull (If Auto-Sync Not Available)

If Hostinger doesn't have auto-sync, do this after each push:

```bash
# SSH into Hostinger
ssh username@hostinger

# Go to project
cd /home/username/public_html/api-cintent

# Pull latest from GitHub
git pull origin main

# Install any new dependencies
npm install

# Restart server
pm2 restart cintent-platform

# Or, if not using PM2:
# ctrl+c (stop current process)
# npm start
```

---

## 📊 File Structure (What's in GitHub)

```
cintent-platform-v2/
├── CINTENT-DEVELOPER-PLATFORM-V2.html
├── CINTENT-ADMIN-GOVERNANCE-CONSOLE.html
├── SIMPLE-SERVER.js                          (Copy as server.js)
├── CINTENT-NODE-SERVER.js
├── package.json
├── .gitignore                                (Prevents .env upload)
├── .env.example                              (Template for .env)
├── README.md                                 (Project info)
│
├── public/                                   (Create on server)
│   ├── CINTENT-DEVELOPER-PLATFORM-V2.html
│   └── CINTENT-ADMIN-GOVERNANCE-CONSOLE.html
│
└── Documentation/
    ├── CINTENT-DEVELOPER-PLATFORM-V2-SPEC.md
    ├── CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md
    └── (other guides)
```

---

## 🔐 Important: .env File

**NEVER commit .env to GitHub!** It contains secrets.

### Setup on Hostinger

```bash
# SSH into Hostinger
ssh username@hostinger
cd /home/username/public_html/api-cintent

# Create .env (NOT in Git)
cat > .env << EOF
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://api-cintent.cognivantalabs.com,https://cintent.cognivantalabs.com
JWT_SECRET=your-super-secret-key-change-this
STRIPE_API_KEY=sk_live_your_stripe_key
SENDGRID_API_KEY=SG.your_sendgrid_key
EOF

# Verify it's not in Git
git status
# Should NOT show .env
```

### .env.example in GitHub

Commit a template without secrets:

```
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://api-cintent.cognivantalabs.com
JWT_SECRET=your-secret-here-change-this
STRIPE_API_KEY=sk_live_xxx
SENDGRID_API_KEY=SG.xxx
```

---

## 🚀 Common Workflows

### Update Server Code

```bash
# 1. Edit server.js
# Add endpoints, fix bugs, etc.

# 2. Test locally (if possible)
node server.js

# 3. Commit
git add server.js
git commit -m "Add playground API endpoint with validation"

# 4. Push
git push origin main

# 5. Hostinger syncs automatically
# Check with: curl https://api-cintent.cognivantalabs.com/api/health
```

### Update Frontend UI

```bash
# 1. Edit CINTENT-DEVELOPER-PLATFORM-V2.html
# Update styles, add features, etc.

# 2. Test in browser locally

# 3. Commit
git add CINTENT-DEVELOPER-PLATFORM-V2.html
git commit -m "Update dashboard styling and add new metrics display"

# 4. Push
git push origin main

# 5. Refresh browser at:
# https://api-cintent.cognivantalabs.com
# Changes visible immediately
```

### Add New Dependency

```bash
# 1. Install locally
npm install pg redis jsonwebtoken

# 2. package.json is automatically updated

# 3. Commit
git add package.json package-lock.json
git commit -m "Add database and auth dependencies

- pg: PostgreSQL driver
- redis: Caching
- jsonwebtoken: JWT auth"

# 4. Push
git push origin main

# 5. Hostinger runs npm install automatically
# New packages installed on server
```

### Rollback to Previous Version

If something breaks:

```bash
# 1. See previous commits
git log --oneline

# 2. Revert to a working commit
git revert abc1234def

# 3. Or reset (if not pushed yet)
git reset --hard HEAD~1

# 4. Push
git push origin main

# 5. Hostinger rolls back automatically
```

---

## 📈 Monitoring Deployments

### View Deployment Status

1. **In Hostinger:** Hosting → Source Control
   - See deployment history
   - View logs
   - Check last deployment time

2. **On Server:**
   ```bash
   ssh username@hostinger
   cd /home/username/public_html/api-cintent
   
   # Check if latest code is there
   git log --oneline -5
   
   # Check server is running
   pm2 status
   pm2 logs cintent-platform
   ```

3. **On GitHub:**
   - See all commits
   - View contributor activity
   - Track changes over time

---

## ✅ Verification Checklist

- [ ] Created GitHub repository
- [ ] Cloned locally with `git init`
- [ ] Pushed all files to main branch
- [ ] Authorized Hostinger to access GitHub
- [ ] Set up Git Sync in Hostinger panel
- [ ] Created subdomain `api-cintent.cognivantalabs.com`
- [ ] SSH'd into Hostinger
- [ ] Ran `npm install`
- [ ] Started server with `pm2`
- [ ] Verified at https://api-cintent.cognivantalabs.com/
- [ ] Made test commit and verified auto-deployment worked

---

## 🎯 Your First Push

```bash
# 1. Navigate to project folder
cd C:\Users\rpm_T\RAJA_REP

# 2. Initialize (if not done)
git init

# 3. Add all files
git add .

# 4. Initial commit
git commit -m "Initial CINTENT Platform v2 deployment"

# 5. Add GitHub origin
git remote add origin https://github.com/YOUR_USERNAME/cintent-platform-v2.git

# 6. Push to GitHub
git branch -M main
git push -u origin main

# 7. Visit GitHub repo to verify
# https://github.com/YOUR_USERNAME/cintent-platform-v2

# 8. Set up Git Sync in Hostinger (as described above)

# Done! 🎉
```

---

## 💡 Pro Tips

1. **Use `.gitignore` to prevent accidents**
   - Already created for you
   - Prevents `node_modules/`, `.env`, etc.

2. **Keep commits atomic (one change per commit)**
   ```bash
   # ✅ GOOD
   git commit -m "Add marketplace search endpoint"
   git commit -m "Update admin dashboard styling"
   
   # ❌ AVOID
   git commit -m "Many changes at once"
   ```

3. **Push frequently**
   - Don't accumulate many commits before pushing
   - Push at end of each feature/fix

4. **Use descriptive branch names** (optional)
   ```bash
   # For big features
   git checkout -b feature/billing-integration
   git checkout -b feature/ask-cogni-backend
   git checkout -b fix/cors-headers
   ```

5. **Monitor deployment times**
   - Hostinger usually deploys within 1-2 minutes
   - Check logs if taking longer

---

## 🆘 Troubleshooting

### "Hostinger can't find repository"

- Verify repository is public (or grant access)
- Check you authorized GitHub correctly
- Try re-connecting in Hostinger panel

### "Git pull fails with permission denied"

```bash
# Hostinger needs SSH key for GitHub
# Contact Hostinger support to set up SSH key
# Or use HTTPS with Personal Access Token
```

### "Files don't update after push"

- Wait 2-3 minutes for Hostinger to sync
- Check Hostinger → Source Control → Deployment logs
- Manually pull: `git pull origin main`
- Restart server: `pm2 restart cintent-platform`

### "npm install fails after push"

```bash
# SSH in and check
npm install

# Check logs
npm list

# If stuck, clear cache
npm cache clean --force
npm install
```

---

## 📚 Reference

**GitHub CLI** (Optional - faster workflows):

```bash
# Install GitHub CLI
# Then use:
gh repo create cintent-platform-v2 --public
gh repo clone cintent-platform-v2
```

**Useful Git Commands:**

```bash
git status           # See what changed
git log --oneline    # See commit history
git diff             # See exact changes
git branch           # See all branches
git pull             # Update from GitHub
git push             # Send to GitHub
```

---

## ✨ You're Ready!

Your GitHub → Hostinger sync is set up. Now:

1. **Make changes locally**
2. **Commit:** `git commit -m "description"`
3. **Push:** `git push origin main`
4. **Hostinger auto-deploys** within 1-2 minutes
5. **Check live:** https://api-cintent.cognivantalabs.com

**No manual uploads needed ever again!** 🚀

---

**Status:** ✅ Ready for GitHub Sync Deployment  
**Version:** 2.0.0  
**Date:** May 13, 2026
