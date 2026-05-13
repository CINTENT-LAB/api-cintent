# CINTENT Developer Platform v2 - Complete Deployment Setup

**Status:** Production Ready for Hostinger Deployment  
**Target:** https://api-cintent.cognivantalabs.com  
**Version:** 2.0.0

---

## 📦 FILES YOU HAVE

```
✅ CINTENT-DEVELOPER-PLATFORM-V2.html         (61 KB - Frontend)
✅ CINTENT-ADMIN-GOVERNANCE-CONSOLE.html      (54 KB - Admin UI)
✅ CINTENT-DEVELOPER-PLATFORM-V2-SPEC.md      (Specification)
✅ CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md
✅ CINTENT-DEPLOYMENT-GUIDE-HOSTINGER.md      (Detailed guide)
✅ CINTENT-NODE-SERVER.js                     (Express server)
```

---

## 🚀 QUICK START (3 Steps)

### Step 1: Create These Files

**Create `server.js` in your project root:**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
    origin: ['https://api-cintent.cognivantalabs.com', 'https://cintent.cognivantalabs.com'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CINTENT-DEVELOPER-PLATFORM-V2.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CINTENT-ADMIN-GOVERNANCE-CONSOLE.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', version: '2.0.0' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`CINTENT Platform running on port ${PORT}`);
});
```

**Create `package.json`:**
```json
{
  "name": "cintent-platform-v2",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "NODE_ENV=development node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.3"
  }
}
```

**Create `.env`:**
```
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://api-cintent.cognivantalabs.com,https://cintent.cognivantalabs.com
```

**Create `.gitignore`:**
```
node_modules/
.env
.env.local
npm-debug.log
```

**Create `public/` folder structure:**
```
public/
├── CINTENT-DEVELOPER-PLATFORM-V2.html
└── CINTENT-ADMIN-GOVERNANCE-CONSOLE.html
```

### Step 2: Deploy to Hostinger

**Option A: Via GitHub (Recommended)**

1. Create GitHub repository
   ```bash
   git init
   git add .
   git commit -m "Initial CINTENT Platform v2"
   git remote add origin https://github.com/yourusername/cintent-platform-v2.git
   git push -u origin main
   ```

2. SSH into Hostinger
   ```bash
   ssh user@your-hostinger-ip
   cd /home/yourusername/public_html
   mkdir api-cintent
   cd api-cintent
   git clone https://github.com/yourusername/cintent-platform-v2.git .
   npm install
   ```

**Option B: Via FTP**

1. Create folder: `/public_html/api-cintent`
2. Upload all files via FTP
3. SSH to Hostinger
4. Run: `cd /public_html/api-cintent && npm install`

### Step 3: Start Server & Test

```bash
# Start server
npm start

# Test (in another terminal)
curl http://localhost:3000/api/health
# Should return: {"status":"healthy","version":"2.0.0"}
```

---

## 🌐 Configure Subdomain in Hostinger

1. **Login** to Hostinger control panel
2. **Go to:** Domains → Subdomains
3. **Create Subdomain:**
   - Name: `api-cintent`
   - Domain: `cognivantalabs.com`
   - Document root: `/home/yourusername/public_html/api-cintent`
4. **Wait** 5-10 minutes for DNS propagation

---

## 🔄 Keep Server Running (Choose One)

### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name "cintent"
pm2 save
pm2 startup
```

### Option 2: Hostinger App Manager
- In Hostinger panel, look for "Node.js App Manager"
- Create new app pointing to `/public_html/api-cintent`
- Set entry point to `server.js`

### Option 3: Screen/Tmux
```bash
screen -S cintent
npm start
# Press Ctrl+A then D to detach
```

---

## ✅ Verify Deployment

Test these URLs:

| URL | Expected |
|-----|----------|
| https://api-cintent.cognivantalabs.com | Developer Platform (HTML) |
| https://api-cintent.cognivantalabs.com/admin | Admin Console (HTML) |
| https://api-cintent.cognivantalabs.com/api/health | `{"status":"healthy"}` |
| https://api-cintent.cognivantalabs.com/docs | API Documentation |

---

## 🎯 What's Working Now

✅ Developer Platform frontend  
✅ Admin Console frontend  
✅ Health check API  
✅ Static file serving  
✅ CORS configured for subdomains  

---

## 📋 What Needs Backend Implementation

⏳ Authentication (signup, login)  
⏳ API marketplace database  
⏳ Playground execution  
⏳ Billing/payments  
⏳ Usage analytics  
⏳ Ask COGNI LLM  
⏳ Replay service  

See `CINTENT-PLATFORM-V2-IMPLEMENTATION-SUMMARY.md` for 8-10 week roadmap.

---

## 🚀 You're Live!

Your platform is now accessible at:
- **https://api-cintent.cognivantalabs.com**

Next: Implement backend services (see implementation guide).

---

## 💡 Pro Tips

1. **Monitor logs:**
   ```bash
   pm2 logs cintent
   ```

2. **Update code:**
   ```bash
   cd /home/yourusername/public_html/api-cintent
   git pull origin main
   npm install
   pm2 restart cintent
   ```

3. **Check status:**
   ```bash
   pm2 status
   ```

4. **Debug issues:**
   ```bash
   curl -v https://api-cintent.cognivantalabs.com/api/health
   ```

---

**Questions? Check CINTENT-DEPLOYMENT-GUIDE-HOSTINGER.md for detailed instructions.**
