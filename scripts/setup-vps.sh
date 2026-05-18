#!/bin/bash
# TopTeamTracker — VPS Setup Script (Ubuntu 22.04)
# Chạy với: bash scripts/setup-vps.sh
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${YELLOW}[→]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  TopTeamTracker — VPS Setup (Ubuntu)    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. System update ──────────────────────────────────────────────────────────
info "Cập nhật hệ thống..."
apt-get update -y -q && apt-get upgrade -y -q
log "System updated"

# ── 2. Node.js 20 LTS ────────────────────────────────────────────────────────
info "Cài Node.js 20 LTS..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -q
  apt-get install -y -q nodejs
fi
log "Node.js $(node -v) | npm $(npm -v)"

# ── 3. Chromium system dependencies ──────────────────────────────────────────
info "Cài dependencies cho Chromium..."
apt-get install -y -q \
  xvfb \
  x11vnc \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2 libpangocairo-1.0-0 libpango-1.0-0 \
  libcairo2 libatspi2.0-0 libgtk-3-0 \
  fonts-liberation fonts-noto-color-emoji
log "Chromium dependencies installed"

# ── 4. PM2 (process manager) ─────────────────────────────────────────────────
info "Cài PM2..."
npm install -g pm2 -q
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
log "PM2 $(pm2 --version)"

# ── 5. Xvfb systemd service ──────────────────────────────────────────────────
info "Cấu hình Xvfb service..."
cat > /etc/systemd/system/xvfb.service << 'EOF'
[Unit]
Description=X Virtual Frame Buffer
After=network.target

[Service]
ExecStart=/usr/bin/Xvfb :99 -screen 0 1366x768x24 -ac
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xvfb -q
systemctl restart xvfb
sleep 2
log "Xvfb running on DISPLAY=:99"

# ── 6. npm install + Playwright Chromium ─────────────────────────────────────
info "Cài npm packages..."
npm install -q
log "npm packages installed"

info "Tải Playwright Chromium..."
PLAYWRIGHT_BROWSERS_PATH=/root/.playwright-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/root/.playwright-browsers npx playwright install-deps chromium
log "Playwright Chromium installed"

# ── 7. Tạo thư mục cần thiết ─────────────────────────────────────────────────
mkdir -p chrome-profiles logs heyetsy-extension
log "Directories created"

# ── 8. Kiểm tra .env ─────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  info ".env chưa có → đã copy từ .env.example. Cần điền ETSYPULSE_API_URL và HEYETSY_EXT_PATH!"
else
  log ".env already exists"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup hoàn thành!                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Bước tiếp theo:                                            ║"
echo "║                                                              ║"
echo "║  1. Upload HeyEtsy extension vào thư mục heyetsy-extension/ ║"
echo "║     (xem hướng dẫn trong .env.example)                      ║"
echo "║                                                              ║"
echo "║  2. Điền thông tin vào file .env                            ║"
echo "║                                                              ║"
echo "║  3. Setup Chrome profiles (đăng nhập HeyEtsy):              ║"
echo "║     DISPLAY=:99 npm run harvest:setup                       ║"
echo "║     (kết nối VNC để thấy màn hình, xem .env.example)        ║"
echo "║                                                              ║"
echo "║  4. Chạy thử 1 lần:                                         ║"
echo "║     npm run harvest:now                                      ║"
echo "║                                                              ║"
echo "║  5. Bật daemon tự động hàng ngày:                           ║"
echo "║     pm2 start ecosystem.config.cjs                          ║"
echo "║     pm2 save                                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
