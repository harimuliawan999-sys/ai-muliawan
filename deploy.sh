#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# AI-MULIAWAN FINAL GOD VERSION v6.0 — VPS Deploy Script
# Run: bash deploy.sh
# ══════════════════════════════════════════════════════════════════

set -e  # Exit on any error

APP_NAME="ai-muliawan-god"
APP_DIR="/var/www/$APP_NAME"
PORT=3000
NODE_VERSION="18"

echo "🔥 Deploying AI-MULIAWAN FINAL GOD VERSION v6.0..."
echo "=================================================="

# ─── Check dependencies ───────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install Node.js $NODE_VERSION first."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found."; exit 1; }

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt "18" ]; then
    echo "❌ Node.js v18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# ─── Create app directory ─────────────────────────────────────────
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

# ─── Copy files ───────────────────────────────────────────────────
echo "📁 Copying application files..."
cp -r . "$APP_DIR/"
cd "$APP_DIR"

# ─── Install dependencies ─────────────────────────────────────────
echo "📦 Installing dependencies..."
npm ci --only=production --silent

# ─── Configure environment ────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit $APP_DIR/.env with your API keys!"
fi

# ─── Install PM2 (process manager) ───────────────────────────────
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# ─── Start/Restart with PM2 ───────────────────────────────────────
echo "🚀 Starting application with PM2..."
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start server.js \
    --name "$APP_NAME" \
    --max-memory-restart 400M \
    --log "/var/log/$APP_NAME.log" \
    --env production \
    --watch false

# ─── Save PM2 config ──────────────────────────────────────────────
pm2 save
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true

# ─── Verify deployment ────────────────────────────────────────────
sleep 3
echo "🔍 Verifying deployment..."
if curl -sf "http://localhost:$PORT/api/health" > /dev/null; then
    echo "✅ Application is running!"
    echo "🌐 URL: http://localhost:$PORT"
else
    echo "❌ Health check failed. Check logs: pm2 logs $APP_NAME"
    exit 1
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ AI-MULIAWAN GOD VERSION deployed successfully!"
echo "📋 Commands:"
echo "   View logs:   pm2 logs $APP_NAME"
echo "   Restart:     pm2 restart $APP_NAME"
echo "   Stop:        pm2 stop $APP_NAME"
echo "   Status:      pm2 status"
echo "══════════════════════════════════════════════════════════════"
