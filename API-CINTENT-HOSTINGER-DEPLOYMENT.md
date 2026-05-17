# API-CINTENT Hostinger Deployment

## Target

Initial production URL:

`https://api-cintent.cognivantalabs.com`

Later migration target:

`https://cintent.ai`

## What This Deploys

This deploys `CINTENT-PLATFORM-PROD.html` as a Node.js web app using `server.js`.

The app exposes:

- `/` -> CINTENT Enterprise API Operating Ecosystem
- `/index.html` -> same page
- `/cintent` -> same page
- `/api-cintent` -> same page
- `/platform` -> same page
- `/health` -> JSON health check
- `/api/health` -> JSON health check
- Static logo/assets used by the page

## Hostinger Setup

1. In Hostinger hPanel, create a subdomain:

   `api-cintent.cognivantalabs.com`

2. Create a Node.js application for that subdomain.

3. Use this project/repository as the application root.

4. Configure the startup file:

   `server.js`

5. Configure the start command:

   `npm start`

   `server.js` is the only supported runtime entrypoint for deployment.

6. Set Node version:

   Node.js 18+ recommended.

7. Set environment variables:

   `NODE_ENV=production`

   Hostinger usually injects `PORT`. If it does not, the app defaults to `3000`.

8. Install dependencies:

   `npm install`

9. Restart the Node.js application.

10. Verify:

   `https://api-cintent.cognivantalabs.com/health`

   If a restart fails because port `3000` is still occupied, stop the existing process first and retry the start command.

   Expected response:

   ```json
   {
     "status": "healthy",
     "version": "2.0.0"
   }
   ```

## GitHub Deployment Flow

Use this if the Hostinger app is connected to GitHub.

1. Commit these files:

   - `CINTENT-PLATFORM-PROD.html`
   - `server.js`
   - `package.json`
   - `API-CINTENT-HOSTINGER-DEPLOYMENT.md`

2. Push to the deployment branch configured in Hostinger.

3. In Hostinger, pull/sync the latest commit or trigger auto-deploy.

4. Run:

   `npm install`

5. Restart the Node.js app.

## Direct Upload Flow

Use this if deploying manually through Hostinger File Manager or SSH.

Upload at minimum:

- `CINTENT-PLATFORM-PROD.html`
- `server.js`
- `package.json`
- `ui/assets/cintent_logo.png`
- `downloads/cognivantalabs-site/assets/images/chaxu-logo.webp`

Then run:

`npm install`

Restart the Node.js app.

## DNS Note

Subdomains are normally lowercase. Use:

`api-cintent.cognivantalabs.com`

instead of:

`API-CINTENT.cognivantalabs.com`

Browsers treat hostnames case-insensitively, but DNS and hosting panels conventionally display lowercase names.

## Current Positioning

This subdomain should be positioned as:

`CINTENT Enterprise Cognitive API Operating Ecosystem`

Not:

- A chatbot site
- A generic API listing
- A Swagger-only page
- A demo app

