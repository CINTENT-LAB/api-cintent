# CINTENT Platform - Demo Bypass Download Issue - FIX

**Problem:** When clicking "Launch Demo" or "Demo Bypass", the platform HTML file downloads instead of executing.

**Root Cause:** 
1. The CINTENT-PLATFORM-PROD.html is being served as a static file (with content-type: application/octet-stream)
2. The Express server is not configured to serve it with content-type: text/html
3. Browser downloads files that aren't served as HTML

**Solution:** Configure Express server to serve the HTML file correctly

---

## Fix 1: Update server-metadata-driven.js

Find this section in `server-metadata-driven.js`:

```javascript
// Serve frontend static files
app.use(express.static('public'));

// Serve main HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'CINTENT-DEVELOPER-PLATFORM-V2.html'));
});
```

**Replace with:**

```javascript
// Serve frontend static files with correct MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

app.use(express.static('public', {
  setHeaders: (res, path, stat) => {
    const ext = path.slice(path.lastIndexOf('.'));
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    // Prevent caching for HTML files
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Serve main HTML files with correct content-type
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'CINTENT-PLATFORM-PROD.html'));
});

// Also serve under specific route
app.get('/platform', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'CINTENT-PLATFORM-PROD.html'));
});

app.get('/admin', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'CINTENT-ADMIN-GOVERNANCE-CONSOLE.html'));
});
```

---

## Fix 2: Add Correct Headers Middleware

Add this near the top of server-metadata-driven.js (after requiring modules):

```javascript
// Middleware to set correct headers
app.use((req, res, next) => {
  // Prevent downloads, serve as HTML
  if (req.url.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');
  }
  
  // Allow CORS for localhost development
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  next();
});
```

---

## Fix 3: Update API Configuration in HTML

The HTML file needs to point to the correct API base URL. Add this to `CINTENT-PLATFORM-PROD.html` right after the opening `<body>` tag:

```html
<script>
  // Configure API endpoint
  window.API_CONFIG = {
    BASE_URL: window.location.origin, // http://localhost:3000 or https://api-cintent.cognivantalabs.com
    USE_METADATA_API: true,
    ENDPOINTS: {
      health: '/api/health',
      catalog: '/api/catalog',
      playground: '/api/playground/execute',
      cogni: '/api/cogni/ask',
      dashboard: '/api/dashboard/metrics',
      billing: '/api/billing/plans',
      auth: '/api/auth'
    }
  };
  
  console.log('CINTENT Platform configured. API Base:', window.API_CONFIG.BASE_URL);
</script>
```

---

## Fix 4: Update JavaScript in HTML to Use Correct Endpoints

Find where the HTML makes API calls (search for `fetch` or `XMLHttpRequest` in the HTML), and update to use the correct endpoints:

**Before:**
```javascript
fetch('https://api-cintent.cognivantalabs.com/api/catalog')
  .then(r => r.json())
  .then(data => { /* ... */ });
```

**After:**
```javascript
const apiBase = window.API_CONFIG?.BASE_URL || window.location.origin;
fetch(`${apiBase}/api/catalog`)
  .then(r => r.json())
  .then(data => { /* ... */ })
  .catch(err => {
    console.error('API call failed:', err);
    // Fallback to mock data for demo
  });
```

---

## Implementation Steps

### Step 1: Stop the Running Server
```bash
Ctrl+C  # In the terminal where npm run start:metadata is running
```

### Step 2: Back Up the Original File
```bash
cp server-metadata-driven.js server-metadata-driven.js.backup
```

### Step 3: Edit server-metadata-driven.js
Apply Fix 1 and Fix 2 above to the file.

### Step 4: Copy HTML to Public Folder
```bash
mkdir -p public
cp CINTENT-PLATFORM-PROD.html public/
cp CINTENT-ADMIN-GOVERNANCE-CONSOLE.html public/
```

### Step 5: Restart Server
```bash
npm run start:metadata
```

### Step 6: Test in Browser
```
http://localhost:3000
```

If you see the CINTENT platform UI load (not download), the fix worked! ✅

---

## Verification Checklist

- [ ] HTML file loads in browser (not downloaded)
- [ ] "Launch Demo" button doesn't trigger download
- [ ] API calls go to `http://localhost:3000/api/*` endpoints
- [ ] Health check responds: `curl http://localhost:3000/api/health`
- [ ] API catalog loads: `curl http://localhost:3000/api/catalog`
- [ ] Platform shows the 4 demo APIs

---

## Why This Happened

1. **Content-Type was wrong**: Server wasn't telling browser it's HTML
2. **Public folder missing**: HTML file wasn't in correct serving location
3. **API endpoints hardcoded**: HTML was calling different URLs than the server
4. **No CORS headers**: Cross-origin requests were failing

---

## After Fix: What Works

✅ Visit http://localhost:3000  
✅ See CINTENT platform UI  
✅ Click "Launch Demo"  
✅ See 4 demo APIs  
✅ Execute simulated travel booking  
✅ View orchestration traces  
✅ Ask COGNI questions  
✅ View dashboard metrics  

---

## Additional: If Using Production URL

If connecting to https://api-cintent.cognivantalabs.com:

Add to your HTML's script section:

```javascript
// Auto-detect API base from URL
if (window.location.hostname === 'localhost') {
  window.API_BASE = 'http://localhost:3000';
} else if (window.location.hostname.includes('cognivantalabs.com')) {
  window.API_BASE = 'https://api-cintent.cognivantalabs.com';
} else {
  window.API_BASE = window.location.origin;
}
```

---

## Need Help?

If the download still happens:

1. Check server logs for errors:
   ```
   Check the terminal where npm run start:metadata is running
   ```

2. Verify file exists:
   ```bash
   ls -la public/CINTENT-PLATFORM-PROD.html
   ```

3. Test API directly:
   ```bash
   curl -i http://localhost:3000/api/health
   # Should show Content-Type: application/json
   ```

---

**Status: Fix Ready to Apply**

Apply the steps above to resolve the download issue.
