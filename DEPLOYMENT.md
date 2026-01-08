# Deployment Guide - Partículas Elementales

Complete guide to deploy both frontend (Netlify) and backend (Render/Railway) for the Kindle-inspired eReader.

## 📋 Pre-Deployment Checklist

- [ ] All code tested locally
- [ ] Backend running on localhost:3000
- [ ] Frontend running on localhost:8080
- [ ] Article reader working correctly
- [ ] Blog management functional
- [ ] Highlighting working
- [ ] Git repository ready

---

## 🎨 Frontend Deployment (Netlify)

### Step 1: Prepare Repository

1. **Ensure www directory structure**:
   ```
   www/
   ├── index.html
   ├── css/
   │   └── styles.css
   ├── js/
   │   ├── app.js
   │   └── reader.js
   └── server-simple.js (not deployed)
   ```

2. **Commit all changes**:
   ```bash
   git add www/
   git commit -m "Prepare frontend for Netlify deployment"
   git push origin main
   ```

### Step 2: Connect to Netlify

1. **Go to** [netlify.com](https://netlify.com)
2. **Sign in** with GitHub
3. **Click** "Add new site" → "Import an existing project"
4. **Select** GitHub as provider
5. **Choose** your repository

### Step 3: Configure Build Settings

```
Site Settings:
├── Base directory: www
├── Build command: (leave empty)
├── Publish directory: www
└── Functions directory: (leave empty)
```

### Step 4: Deploy

1. **Click** "Deploy site"
2. **Wait** for deployment (~1 minute)
3. **Get** your site URL: `https://[random-name].netlify.app`

### Step 5: Custom Domain (Optional)

1. Go to "Domain management"
2. Add custom domain
3. Configure DNS records as instructed

---

## 🚀 Backend Deployment

### Option 1: Render.com (Recommended - Free Tier Available)

#### Why Render?
- ✅ Free tier available
- ✅ Auto-deploys from GitHub
- ✅ Built-in SSL
- ✅ Easy environment variables
- ✅ No credit card required for free tier

#### Step 1: Prepare Backend

1. **Ensure package.json has start script**:
   ```json
   {
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

2. **Commit backend code**:
   ```bash
   git add backend/
   git commit -m "Prepare backend for deployment"
   git push origin main
   ```

#### Step 2: Create Render Service

1. **Go to** [render.com](https://render.com)
2. **Sign up** with GitHub
3. **Click** "New +" → "Web Service"
4. **Connect** your repository

#### Step 3: Configure Service

```
Settings:
├── Name: particulas-backend
├── Region: Frankfurt (EU Central)
├── Branch: main
├── Root Directory: backend
├── Runtime: Node
├── Build Command: npm install
├── Start Command: npm start
├── Instance Type: Free
```

#### Step 4: Environment Variables

Add these in the "Environment" section:

```
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
```

**Important**: Replace `your-netlify-site.netlify.app` with your actual Netlify URL.

#### Step 5: Deploy

1. **Click** "Create Web Service"
2. **Wait** for deployment (~3-5 minutes)
3. **Copy** your backend URL: `https://particulas-backend.onrender.com`

#### Step 6: Update Frontend

Update `www/js/app.js` line 10:

```javascript
// Change from:
window.API_BASE_URL = 'http://localhost:3000';

// To:
window.API_BASE_URL = 'https://particulas-backend.onrender.com';
```

Commit and push:

```bash
git add www/js/app.js
git commit -m "Update API URL for production"
git push origin main
```

Netlify will auto-deploy the update.

---

### Option 2: Railway.app (Alternative)

#### Step 1: Setup

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

#### Step 2: Configure

1. **Set Root Directory**: `backend`
2. Railway auto-detects Node.js
3. Add environment variables:
   ```
   PORT=3000
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
   ```

#### Step 3: Deploy

1. Railway deploys automatically
2. Get your URL from the deployment
3. Update frontend API_BASE_URL

---

### Option 3: Heroku (Classic Option)

#### Prerequisites
- Heroku CLI installed
- Heroku account

#### Steps

```bash
# Login to Heroku
heroku login

# Create app
heroku create particulas-backend

# Deploy backend only
git subtree push --prefix backend heroku main

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=https://your-netlify-site.netlify.app

# Open app
heroku open
```

---

## 🔧 Post-Deployment Configuration

### 1. Test Backend API

```bash
# Health check
curl https://your-backend-url.com/health

# Should return:
{"status":"ok","timestamp":"...","uptime":...}
```

### 2. Test Article Extraction

```bash
curl "https://your-backend-url.com/api/article?url=https://example.com/post"
```

### 3. Update CORS Settings

In `backend/.env` on your deployment platform:

```env
# For multiple origins, comma-separate:
ALLOWED_ORIGINS=https://site1.netlify.app,https://site2.com
```

### 4. Test Frontend

1. Open your Netlify site
2. Try opening an article
3. Check browser console for errors
4. Test highlighting
5. Test blog management

---

## 🐛 Troubleshooting Deployment Issues

### Frontend Issues

#### Issue: "Failed to fetch" when opening articles

**Cause**: Backend URL not updated or CORS issue

**Fix**:
```javascript
// Check www/js/app.js line 10:
window.API_BASE_URL = 'https://your-actual-backend-url.com';
```

#### Issue: Old version loading

**Cause**: Browser cache

**Fix**: Hard refresh (Ctrl + Shift + R)

### Backend Issues

#### Issue: 503 Service Unavailable

**Cause**: Render free tier sleeping (after 15 min inactivity)

**Fix**: Wait 30 seconds for wake-up, or upgrade to paid tier

#### Issue: CORS errors in browser console

**Cause**: ALLOWED_ORIGINS not set correctly

**Fix**: Update environment variable on Render:
```
ALLOWED_ORIGINS=https://your-actual-netlify-url.netlify.app
```

#### Issue: "Cannot find module" error

**Cause**: Dependencies not installed

**Fix**: Check Render build logs, ensure `npm install` ran

---

## 💰 Cost Breakdown

### Free Tier (Recommended for MVP)

| Service | Cost | Limits |
|---------|------|--------|
| **Netlify** | Free | 100GB bandwidth/month |
| **Render** | Free | 750 hours/month, sleeps after 15min |
| **Total** | $0/month | Good for personal use |

### Paid Tier (For Production)

| Service | Cost | Benefits |
|---------|------|----------|
| **Netlify Pro** | $19/month | 400GB bandwidth, build plugins |
| **Render Starter** | $7/month | Always on, no sleep |
| **Total** | $26/month | Reliable for public use |

---

## 📊 Monitoring & Maintenance

### Netlify Monitoring

1. **Dashboard** → Your site → "Analytics"
2. Monitor:
   - Page views
   - Bandwidth usage
   - Deploy history

### Render Monitoring

1. **Dashboard** → Your service
2. Monitor:
   - Request logs
   - Error rates
   - Response times
   - Disk usage

### Set Up Alerts

#### Render
1. Go to service settings
2. Enable "Email notifications"
3. Get alerts for:
   - Deploy failures
   - Service crashes
   - High error rates

---

## 🔄 Update Workflow

### Making Changes

```bash
# 1. Make changes locally
# 2. Test thoroughly
# 3. Commit
git add .
git commit -m "Description of changes"

# 4. Push to GitHub
git push origin main

# 5. Auto-deploys:
#    - Netlify: ~1 minute
#    - Render: ~3 minutes
```

### Rollback if Needed

#### Netlify
1. Go to "Deploys"
2. Find previous working deploy
3. Click "..." → "Publish deploy"

#### Render
1. Go to "Events"
2. Find previous deploy
3. Click "Redeploy"

---

## 🎯 Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend API_BASE_URL updated
- [ ] CORS configured correctly
- [ ] Both sites use HTTPS
- [ ] Health check endpoint working
- [ ] Article extraction tested with multiple sites
- [ ] Blog management functional
- [ ] Highlighting works
- [ ] Mobile responsive
- [ ] Error handling graceful
- [ ] Environment variables set
- [ ] Monitoring enabled

---

## 📝 Quick Reference

### Your URLs
```
Frontend: https://[your-site].netlify.app
Backend: https://[your-service].onrender.com
Health Check: https://[your-service].onrender.com/health
```

### Important Files
```
Frontend config: www/js/app.js (line 10)
Backend config: backend/.env
Build config: package.json
```

### Support Links
- [Netlify Docs](https://docs.netlify.com)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)

---

Need help? Check the troubleshooting section or open an issue on GitHub!
