# TeleMeet Video Consultation - Step-by-Step Deployment & Live Testing Guide

This guide explains **why WebRTC camera/audio requires HTTPS on real devices**, and provides **3 easy methods** to deploy and test the application across different devices (phones, laptops, and tablets) anywhere in the world.

---

## ⚠️ Important: Why WebRTC Requires HTTPS on Real Devices

When you test on your local machine using `http://localhost:3000`, the browser treats `localhost` as a special secure exception. However:

1. **Browser Security Restriction:** Modern browsers (Google Chrome, Apple Safari on iPhone, Android Chrome, Edge) **strictly disable `navigator.mediaDevices.getUserMedia` on insecure `http://` IP addresses** (e.g. `http://192.168.x.x:3000`). Camera and microphone permissions will be blocked with:
   ```
   [Deprecation] getUserMedia() no longer works on insecure origins. To use this feature, you must use HTTPS.
   ```
2. **Cross-Network Firewalls (NAT):** When testing between devices on different networks (e.g. Laptop on home Wi-Fi and Phone on 4G/5G mobile data), direct peer-to-peer UDP is blocked by carrier NATs.
   - **Solution Added:** We have integrated **OpenRelay free public WebRTC TURN servers** in `webrtc.ts` so audio and video packets can relay across any mobile or corporate firewall.
3. **Mixed Content Security:** An `https://` site cannot send requests to `http://` backend endpoints.
   - **Solution Added:** `api.ts` has been updated with automatic HTTPS (`https://`) and Secure WebSocket (`wss://`) protocol detection.

---

## Method 1: Instant 60-Second Live Testing with HTTPS (Recommended for Quick Testing)

You can test immediately on your phone and laptop with real HTTPS **without creating cloud accounts** using a free tunnel:

### Using Cloudflare Tunnel (Free, no account needed)
1. Open a new terminal and run:
   ```bash
   # Install cloudflared via Homebrew (if not already installed)
   brew install cloudflared

   # Start local stack
   cd /Users/yug_gabani/Desktop/SE_Project/video-meet-consultation
   ./start-app.sh
   ```
2. In a separate terminal, expose the frontend over HTTPS:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. Cloudflare will print a secure URL like:
   ```
   https://random-name.trycloudflare.com
   ```
4. Expose the backend API over HTTPS:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```
5. Set `VITE_API_URL` to your backend Cloudflare HTTPS URL, or access the frontend URL on your phone!
   - Camera and microphone will be **instantly allowed** because the origin is genuine `https://`.

---

## Method 2: 100% Free Cloud Deployment on Render.com

Render provides free hosting for PostgreSQL databases, Python FastAPI web services, and React static sites with **automatic HTTPS certificates**.

### Step 1: Push your latest code to GitHub
Make sure your changes are pushed to your GitHub repository:
```bash
cd /Users/yug_gabani/Desktop/SE_Project/SE_2
git push origin feature/video-consultation
```

### Step 2: Deploy PostgreSQL Database on Render
1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
2. Click **New +** -> **PostgreSQL**.
3. Name: `telemeet-db`
4. Plan: **Free**
5. Click **Create Database**.
6. Once created, copy the **Internal Database URL** (e.g., `postgresql://telemeet_user:...@dpg-.../telemeet_db`).

### Step 3: Deploy FastAPI Backend on Render
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your GitHub repository (`SE_2` or forked repo).
3. Set the configuration:
   - **Name:** `telemeet-backend`
   - **Region:** Any (e.g., Oregon or Frankfurt)
   - **Root Directory:** `video-meet-consultation/backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
4. Under **Environment Variables**, add:
   - `DATABASE_URL` = (Paste your PostgreSQL URL from Step 2)
   - `JWT_SECRET` = `telemeet_production_jwt_secret_key_2026`
   - `OPENROUTER_API_KEY` = (Paste your OpenRouter API key from backend/.env)
   - `OPENROUTER_MODEL` = `nvidia/nemotron-3.5-lightning:free`
5. Click **Deploy Web Service**.
6. Copy your live backend URL (e.g. `https://telemeet-backend.onrender.com`).

### Step 4: Deploy React Frontend on Render (or Vercel)
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Select your GitHub repository.
3. Set the configuration:
   - **Name:** `telemeet-frontend`
   - **Root Directory:** `video-meet-consultation/frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://telemeet-backend.onrender.com` (Your backend URL from Step 3)
5. Under **Redirects/Rewrites**, add:
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
6. Click **Create Static Site**.
7. Render will provide your permanent public HTTPS URL (e.g., `https://telemeet-frontend.onrender.com`).

---

## Method 3: 1-Command Production Deployment with Docker Compose (On VPS / Cloud Server)

If you have a Linux cloud VM (AWS EC2, DigitalOcean Droplet, Linode, Google Compute Engine, or Ubuntu Server):

1. Clone repository on server:
   ```bash
   git clone -b feature/video-consultation https://github.com/Yug-Gabani/SE_2.git
   cd SE_2/video-meet-consultation
   ```
2. Set your environment variables in `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   # Add your OPENROUTER_API_KEY
   ```
3. Run with Docker Compose:
   ```bash
   docker compose -f docker/docker-compose.prod.yml up -d --build
   ```
4. Access your live server on port 80:
   - Frontend is served via Nginx on port 80.
   - API is reverse-proxied to backend on port 8000.
   - Database runs on PostgreSQL.
5. (Optional) Run `certbot` to attach a free Let's Encrypt SSL certificate for your custom domain:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

---

## Testing Verification Across 2 Real Devices

Once deployed or running with an HTTPS tunnel:

1. **Device 1 (e.g., Doctor on Laptop):**
   - Open your deployed URL `https://...`.
   - Click **Quick Doctor Demo (Dr. Sarah Mitchell)**.
   - View scheduled appointments on the doctor dashboard.
2. **Device 2 (e.g., Patient on iPhone/Android):**
   - Open the same deployed URL `https://...`.
   - Click **Quick Patient Demo (Alex Smith)**.
   - Click **Book Video Consultation**.
   - Select **Start Now (Join Immediately)**.
   - Notice the Join Consultation button is **green and active**.
   - Tap **Join Consultation** -> Allow camera and microphone permissions.
3. **Verify Audio, Video & AI Scribe:**
   - Both devices see each other in real-time HD video.
   - Audio is heard clearly through speakers with echo cancellation.
   - Speak into either microphone: the live captions and transcript update in real time.
   - Click **Run LangChain Medical Scribe** or **End Consultation** to generate the clinical note!
