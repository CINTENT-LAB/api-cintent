# CINTENT Developer Platform v2 - Hostinger Deployment Guide

**Status:** Ready for Deployment  
**Target Subdomain:** https://api-cintent.cognivantalabs.com  
**Version:** 2.0.0  
**Date:** May 13, 2026

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Direct Git Push to Hostinger (Recommended)

**Prerequisites:**
- SSH access to Hostinger account
- Git installed locally
- GitHub account (for repository)

**Steps:**

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial CINTENT Platform v2 deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/cintent-platform-v2.git
   git push -u origin main
   ```

2. **SSH into Hostinger**
   ```bash
   ssh user@your-hostinger-server.com
   cd /home/yourusername/public_html/api-cintent
   ```

3. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/cintent-platform-v2.git .
   npm install
   npm start
   ```

4. **Configure Subdomain**
   - In Hostinger Control Panel → Domains → Subdomains
   - Create subdomain: `api-cintent.cognivantalabs.com`
   - Point to: `/home/yourusername/public_html/api-cintent`

### Option 2: FTP Upload (Direct)

**Prerequisites:**
- FTP credentials from Hostinger
- FileZilla or similar FTP client

**Steps:**

1. **Prepare Local Files**
   ```bash
   # Ensure these files exist locally:
   - CINTENT-NODE-SERVER.js
   - CINTENT-DEVELOPER-PLATFORM-V2.html
   - CINTENT-ADMIN-GOVERNANCE-CONSOLE.html
   - package.json
   - .env
   ```

2. **Upload via FTP**
   - Connect to: `ftp.yourdomain.com`
   - Navigate to: `/public_html/api-cintent/`
   - Upload all files

3. **SSH to Install Dependencies**
   ```bash
   ssh user@your-hostinger-server.com
   cd /home/yourusername/public_html/api-cintent
   npm install
   npm start
   ```

---

## 📋 File Structure

```
/home/yourusername/public_html/api-cintent/
├── CINTENT-NODE-SERVER.js                    # Main Express server
├── CINTENT-DEVELOPER-PLATFORM-V2.html        # Developer platform UI
├── CINTENT-ADMIN-GOVERNANCE-CONSOLE.html     # Admin console UI
├── package.json                              # NPM dependencies
├── .env                                      # Environment variables (NOT in Git)
├── .env.example                              # Example env variables
├── .gitignore                                # Git ignore rules
├── README.md                                 # Documentation
├── public/                                   # Static files
│   ├── CINTENT-DEVELOPER-PLATFORM-V2.html
│   └── CINTENT-ADMIN-GOVERNANCE-CONSOLE.html
├── routes/                                   # API route handlers (future)
│   ├── auth.js
│   ├── marketplace.js
│   ├── playground.js
│   ├── billing.js
│   ├── analytics.js
│   ├── workspace.js
│   ├── cogni.js
│   └── admin.js
├── controllers/                              # Business logic (future)
├── models/                                   # Database models (future)
├── middleware/                               # Custom middleware (future)
├── config/                                   # Configuration files
│   ├── database.js
│   ├── stripe.js
│   └── sendgrid.js
└── tests/                                    # Test files (future)
```

---

## 🔧 Environment Setup

### 1. Create .env File

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cintent_v2
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# Payment Processing
STRIPE_API_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Service
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@cognivantalabs.com

# Ask COGNI
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Logging & Monitoring
SENTRY_DSN=your-sentry-dsn-url
LOG_LEVEL=info

# CORS Origins
CORS_ORIGINS=https://api-cintent.cognivantalabs.com,https://cintent.cognivantalabs.com,https://cognivantalabs.com
```

### 2. Create .env.example (For Git)

```bash
# Copy .env and remove sensitive values
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/cintent_v2
JWT_SECRET=your-secret-here
STRIPE_API_KEY=sk_live_xxx
SENDGRID_API_KEY=SG.xxx
# ... etc
```

### 3. Create .gitignore

```
node_modules/
.env
.env.local
.env.*.local
dist/
build/
*.log
npm-debug.log*
.DS_Store
.idea/
.vscode/
*.swp
*.swo
*~
coverage/
.nyc_output/
```

---

## 📦 Installation Steps

### Step 1: SSH into Hostinger

```bash
ssh user@your-hostinger-server.com
```

### Step 2: Navigate to Project Directory

```bash
cd /home/yourusername/public_html/api-cintent
```

### Step 3: Install Dependencies

```bash
npm install
```

Expected output:
```
added 150 packages in 12.5s
```

### Step 4: Create Environment File

```bash
nano .env
```

Copy the environment variables above. Edit values for your setup:
- `DATABASE_URL` - Point to your PostgreSQL instance
- `JWT_SECRET` - Generate a strong random string
- `STRIPE_API_KEY` - Your Stripe API key
- `SENDGRID_API_KEY` - Your SendGrid API key

Save: `Ctrl + X`, then `Y`, then `Enter`

### Step 5: Test Server Startup

```bash
npm start
```

Expected output:
```
╔═══════════════════════════════════════════════════════════════╗
║  CINTENT Developer Platform v2 - Backend Server              ║
║  Version: 2.0.0 | Environment: production                    ║
╚═══════════════════════════════════════════════════════════════╝

✅ Server Status:
   • Express running on port 3000
   • CORS enabled for cognivantalabs.com subdomains
   ...

🚀 Ready for incoming connections...
```

Press `Ctrl + C` to stop.

---

## 🌐 Subdomain Configuration

### In Hostinger Control Panel

1. **Login** to https://hpanel.hostinger.com
2. **Navigate** to Domains → Subdomains
3. **Create New Subdomain**
   - Subdomain name: `api-cintent`
   - Domain: `cognivantalabs.com`
   - Document root: `/home/yourusername/public_html/api-cintent`
4. **Click** "Create Subdomain"
5. **Wait** 5-10 minutes for DNS propagation

### Verify Setup

```bash
# Check DNS propagation
nslookup api-cintent.cognivantalabs.com

# Test server access
curl https://api-cintent.cognivantalabs.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-13T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "version": "2.0.0"
}
```

---

## 🔄 Process Management

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start CINTENT-NODE-SERVER.js --name "cintent-platform"

# Save PM2 configuration
pm2 save

# Setup auto-restart on server reboot
pm2 startup
```

### Using systemd (Alternative)

Create `/etc/systemd/system/cintent-platform.service`:

```ini
[Unit]
Description=CINTENT Developer Platform v2
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/home/yourusername/public_html/api-cintent
ExecStart=/usr/bin/node CINTENT-NODE-SERVER.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable cintent-platform
sudo systemctl start cintent-platform
sudo systemctl status cintent-platform
```

---

## 🔒 SSL/TLS Certificate

Hostinger typically provides free SSL via Let's Encrypt. If not:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d api-cintent.cognivantalabs.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🚀 Go Live Checklist

- [ ] Environment variables configured in `.env`
- [ ] Database connection tested
- [ ] npm dependencies installed (`npm install`)
- [ ] Server starts without errors (`npm start`)
- [ ] Health endpoint responds (`/api/health`)
- [ ] Subdomain created in Hostinger
- [ ] DNS propagated (wait 5-10 minutes)
- [ ] HTTPS/SSL certificate installed
- [ ] CORS origins configured correctly
- [ ] PM2 or systemd auto-restart configured
- [ ] Monitoring and logging setup
- [ ] Backup procedure documented

---

## 📊 Monitoring & Logs

### View Server Logs

```bash
# With PM2
pm2 logs cintent-platform

# With systemd
sudo journalctl -u cintent-platform -f

# Or check file logs
tail -f /home/yourusername/public_html/api-cintent/logs/error.log
```

### Health Check

```bash
# Every 5 minutes, curl health endpoint
curl https://api-cintent.cognivantalabs.com/api/health

# Monitor with uptime service like UptimeRobot
```

### Performance Metrics

Monitor these key metrics:
- Request latency (target: < 200ms p95)
- Error rate (target: < 0.1%)
- API call volume
- Server CPU usage (target: < 70%)
- Memory usage (target: < 80%)

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=3001
```

### Database Connection Error

```bash
# Test PostgreSQL connection
psql -h localhost -U user -d cintent_v2

# Check DATABASE_URL in .env is correct
```

### CORS Issues

Verify CORS_ORIGINS in `.env`:
```bash
CORS_ORIGINS=https://api-cintent.cognivantalabs.com,https://cintent.cognivantalabs.com
```

### DNS Not Resolving

```bash
# Flush DNS cache
sudo systemd-resolve --flush-caches

# Check DNS records
dig api-cintent.cognivantalabs.com
nslookup api-cintent.cognivantalabs.com
```

### 502 Bad Gateway Error

- Server not running → restart with `pm2 start` or `systemctl start`
- Port mismatch → check nginx/reverse proxy configuration
- Memory exhausted → check with `free -h` and restart

---

## 📈 Scaling (Future)

As traffic grows:

1. **Vertical Scaling** (More powerful server)
   - Upgrade Hostinger plan
   - Increase Node.js memory allocation

2. **Horizontal Scaling** (Multiple servers)
   - Load balance with nginx
   - Separate database server
   - Use Redis for caching

3. **Database Optimization**
   - Add indexes (provided in schema)
   - Connection pooling
   - Read replicas

4. **CDN Integration**
   - Cloudflare for static content
   - Faster global delivery

---

## 🔐 Security Best Practices

- [ ] Change default JWT_SECRET to strong random value
- [ ] Use environment variables for all secrets (never hardcode)
- [ ] Enable HTTPS (SSL/TLS) for all endpoints
- [ ] Implement rate limiting on API endpoints
- [ ] Add DDoS protection (Cloudflare)
- [ ] Regular security audits
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Implement request validation
- [ ] Add CORS properly (not allow-all)
- [ ] Secure database connections with encryption

---

## 📚 Resources

- **Express.js Documentation:** https://expressjs.com
- **Hostinger Node.js Docs:** https://support.hostinger.com/en/articles/4291498-how-to-deploy-node-js-application-on-hostinger
- **PM2 Documentation:** https://pm2.keymetrics.io
- **PostgreSQL Documentation:** https://www.postgresql.org/docs

---

## 🆘 Support

For deployment issues:
1. Check error logs (`pm2 logs` or `journalctl`)
2. Verify environment variables
3. Test database connection
4. Check Hostinger control panel for resource limits
5. Review Hostinger support documentation

---

## ✅ Deployment Complete

Once live at https://api-cintent.cognivantalabs.com:

- Developer Platform: https://api-cintent.cognivantalabs.com/
- Admin Console: https://api-cintent.cognivantalabs.com/admin
- API Health: https://api-cintent.cognivantalabs.com/api/health
- API Docs: https://api-cintent.cognivantalabs.com/docs

**Next Steps:**
1. Backend implementation (8-10 weeks)
2. Database integration
3. Payment processing setup
4. Email service configuration
5. Ask COGNI LLM integration

---

**Status:** Ready for Production Deployment  
**Version:** 2.0.0  
**Date:** May 13, 2026
