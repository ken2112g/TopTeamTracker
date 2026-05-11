# EtsyPulse — Project Context for Claude Code

> File này tổng hợp toàn bộ context, quyết định và roadmap của dự án EtsyPulse. Claude Code đọc file này tự động khi làm việc trong repo.

---

## 🎯 Project Overview

**EtsyPulse** là web app theo dõi và phân tích sản phẩm Etsy theo thời gian — tương tự HeyEtsy/EverBee/Sale Samurai nhưng có thêm khả năng **theo dõi trends theo ngày/giờ** trên từng listing cụ thể.

### Mục tiêu cốt lõi
- Track 500+ listings Etsy cùng lúc với snapshot daily/hourly
- Visualize biến động Sold/Views/Revenue/CVR theo thời gian (7-90 ngày)
- So sánh nhiều sản phẩm trên cùng biểu đồ
- Phục vụ team 2-5 người (POD sellers research thị trường)

### Pain point đang giải quyết
HeyEtsy/EverBee chỉ hiển thị **snapshot tại thời điểm hiện tại**. EtsyPulse biến những snapshot đó thành **time-series data** để xem trend, so sánh, phát hiện đối thủ tăng/giảm.

---

## 👥 Target User

- **Owner**: 1 person (POD seller VN, đang dùng HeyEtsy team plan)
- **Team size**: 2-5 người
- **Use case chính**:
  1. Research niche mới (search keyword → tick chọn → track)
  2. Theo dõi đối thủ chính (top sellers cùng niche)
  3. So sánh listing của mình vs đối thủ
  4. Phát hiện trending products

---

## ✅ Quyết định đã chốt

### Stack (đã quyết, KHÔNG đổi nữa)

| Phần | Tech | Lý do |
|---|---|---|
| Framework | **Next.js 15** App Router | Full-stack, SSR, Server Actions, deploy Vercel free |
| UI | **React 18** + TypeScript | Type-safe |
| Styling | **Tailwind CSS** | Mẫu 2 — Dark Etsy Orange theme |
| Charts | **Chart.js** + react-chartjs-2 | Đẹp, customize tốt |
| State | **Zustand** | Nhẹ, đủ dùng |
| Icons | **Lucide React** | |
| Database | **Supabase Postgres** (Phase 2) | Free 500MB, có Auth + Realtime |
| Scraper | **Playwright** trên VPS | Browser automation |
| Queue | **BullMQ + Redis** | Quản lý scrape jobs |
| Deploy Web | **Vercel** | Free tier |
| Deploy Scraper | **Hetzner VPS** €5/tháng | IP Châu Âu, rẻ |

### Design (Mẫu 2 — Dark Etsy Orange)

**Color tokens:**
```css
--bg-0: #0c0a09        /* Background đen warm */
--bg-1: #161310        /* Card bg */
--bg-2: #1f1a16        /* Elevated bg */
--bg-3: #2a221d        /* Highest elevation */
--orange: #f1641e      /* Primary brand (Etsy) */
--orange-bright: #ff7a3d
--green: #84cc16       /* Positive */
--red: #ef4444         /* Negative */
--amber: #facc15       /* Warning */
```

**Fonts:**
- Display: **Bricolage Grotesque** (titles, big numbers)
- Body: **Plus Jakarta Sans** (text)
- Mono: **DM Mono** (numbers, labels)

**Style notes:**
- Italic em tags với màu cam cho emphasis (vd: "Tìm sản phẩm *đáng theo dõi*")
- Noise texture background
- Underline animation dưới italic words
- Stagger animations cho cards (mỗi card delay 0.05s)
- Hover lift -translate-y-1.5 + shadow cam
- Cursor glow follow chuột (Phase chính, đã bỏ ở web vì over-engineered)

### Ngôn ngữ giao diện: **Tiếng Việt 100%**
- Mọi label, button, message đều là tiếng Việt
- Chỉ giữ tiếng Anh cho data gốc từ Etsy (titles sản phẩm, shop names)
- Date format: 15/04/2026 (DD/MM/YYYY)
- Currency: USD, có thể toggle VND ở Settings

### Data approach: **Mỗi sản phẩm hiển thị chỉ số RIÊNG**
- ❌ KHÔNG tổng hợp số liệu cả collection (vd: "Total Sold của niche")
- ✅ Mỗi listing có chart riêng, stats riêng
- ✅ Compare = multi-line chart, không phải sum
- → Collection chỉ để **gom nhóm** quản lý, không phải để cộng dồn

### Source data strategy

| Tier | Nguồn | Độ chính xác | Dùng cho |
|---|---|---|---|
| 1 | Etsy listing page scrape | 100% (static fields) | Title, price, rating, reviews, favorites |
| 2 | Etsy estimate (reviews × hệ số) | 70-80% | Sold/views khi không có HeyEtsy |
| 3 | HeyEtsy via headless browser | 90% | Sold/views chính xác cho top listings |

**User chấp nhận sai số ~80%** — không cần cực chính xác, miễn trend đúng.

**HeyEtsy access:** User có **team plan** (đắt nhất) → không lo limit, có nhiều seats parallel.

---

## 📋 Roadmap

### ✅ Phase 1 — MVP Web với Mock Data (HOÀN THÀNH)

Đã build xong:
- 6 pages: `/`, `/search`, `/collections/[id]`, `/listings/[id]`, `/compare`, `/settings`
- Components: Sidebar, Topbar, Modal, Toast, RangePicker, Sparkline, CollectionView
- Mock data: 13 sản phẩm + 4 collections + 30 ngày snapshots/SP
- Zustand store cho client state
- Tailwind theme cam Etsy (Mẫu 2)

**Trạng thái:** Đang test local. Deploy Vercel tiếp theo.

### 🚧 Phase 2 — Real Database & Scraper (TIẾP THEO)

**2.1: Setup Supabase** (~2-3 ngày)
- Tạo project Supabase free
- Migrate schema từ types/index.ts qua PostgreSQL
- Server Actions thay mock functions
- Connect web app → Supabase

**2.2: Setup VPS Scraper** (~1 tuần)
- Hetzner VPS Ubuntu 22.04
- Docker + Node.js + Playwright + Chromium
- Setup persistent Chromium profile có HeyEtsy extension
- Scraper test 1 listing thành công

**2.3: Tier 1+2 Scraper** (~1 tuần)
- Scrape Etsy native data (title, price, rating, reviews, favorites)
- Estimate sold từ reviews delta
- Save snapshots vào Supabase

**2.4: Tier 3 HeyEtsy Integration** (~1 tuần)
- 3 Chromium profiles song song (3 HeyEtsy team seats)
- DOM scrape HeyEtsy widget sau khi inject
- Cross-check với Tier 1+2

**2.5: Cron + Queue** (~3 ngày)
- BullMQ queue cho jobs
- Cron daily 02:00 AM UTC
- Cron hourly cho `snapshotMode === 'hourly'`
- Retry logic + dead-letter queue

**2.6: Wire vào Web App** (~3 ngày)
- Replace mock data
- Realtime updates (Supabase Realtime)
- Loading states, error handling

### Phase 3 — Team Features

- Auth Google login (Supabase Auth)
- Workspace + roles (Owner/Admin/Member)
- Activity log
- Comments trên listing
- Email digest hàng tuần

### Phase 4 — Advanced

- Telegram bot alerts
- Export PDF report
- Mobile app (PWA install)
- AI insights (Claude analyze trends)

---

## 🏗 Cấu trúc dự án (Phase 1)

```
etsypulse-web/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout với Sidebar + Topbar
│   ├── page.tsx                 # Trang chủ - bảng theo dõi
│   ├── globals.css              # Tailwind + custom CSS
│   ├── search/page.tsx          # Tìm kiếm Etsy
│   ├── collections/[id]/        # Collection theo ID
│   ├── listings/[id]/           # Chi tiết listing
│   │   └── ListingDetailClient.tsx  # 4 charts
│   ├── compare/                 # So sánh nhiều SP
│   └── settings/page.tsx        # Cấu hình
├── components/
│   ├── layout/                  # Sidebar, Topbar
│   ├── modals/AddListingModal.tsx
│   ├── ui/                      # RangePicker, Sparkline, Toast
│   └── CollectionView.tsx       # View dùng chung
├── lib/
│   ├── mock/data.ts            # Mock data Phase 1
│   └── store/useAppStore.ts    # Zustand
├── types/index.ts               # TypeScript types
└── package.json
```

---

## 🎨 UX Patterns đã chốt

### Search flow (Bước 1 đã design)

```
User nhập keyword "birthday romper"
  ↓
Tool gọi Etsy search → trả về N kết quả với Tier 2 estimate (nhanh)
  ↓
Cards hiển thị với badge "⚡ ƯỚC TÍNH"
  ↓
User tick chọn cards (multi-select)
  ↓
Click "+ Thêm vào bộ sưu tập" → modal:
  - Auto group theo keyword (default)
  - Hoặc tự đặt tên collection
  - Hoặc add vào collection có sẵn
  ↓
Background job: scrape Tier 1+3 cho data chính xác hơn
  ↓
Listings xuất hiện trong tracker, snapshots bắt đầu chạy daily
```

### View modes

**Date range picker:** 7N / 10N / 20N / 30N / 60N / 90N (default 30N)
**Granularity:** Theo giờ / Theo ngày (default) / Theo tuần

### 4 charts trong Listing Detail

1. **Sold per day** — bar chart cam
2. **Views per day** — line chart cam fill
3. **Revenue per day** — line chart xanh lá fill
4. **Conversion Rate** — line chart vàng with points

### Compare mode

- 2-6 listings cùng lúc
- Mỗi listing 1 màu: cam → tím → xanh lá → xanh dương → vàng → hồng
- 3 charts multi-line: Sold / Revenue / Views

---

## 🚨 Constraints & Rules

### NGUYÊN TẮC

1. **KHÔNG dùng better-sqlite3** hay native modules cần build C++ (gây lỗi trên Windows)
2. **KHÔNG bao giờ scrape liên tục** — luôn random delay 5-15s giữa requests
3. **KHÔNG tổng hợp số liệu collection** — luôn hiển thị riêng từng SP
4. **LUÔN có fallback** khi HeyEtsy fail → dùng Tier 2 estimate
5. **LUÔN tiếng Việt** trong UI (trừ data Etsy)

### Anti-detection (Phase 2)

- Random delays 5-15s
- User agent rotation
- Stealth plugin (`playwright-extra`)
- Proxy residential rotation sau 50-100 requests (IPRoyal ~$2/GB)
- Mimic human: scroll, hover, mouse moves

### Rate limits

- Daily snapshot per listing (default)
- Hourly chỉ cho listings được mark "hot"
- Khi scale 500+: chia time slot, scrape rải đều trong ngày

---

## 💰 Chi phí ước tính

**Phase 1 (hiện tại):** $0 — chạy local

**Phase 2 đầy đủ:**
- Vercel: $0 (free tier đủ team 2-5)
- Supabase: $0 (free 500MB)
- Hetzner VPS CX22: €5/tháng (~$5.5)
- IPRoyal proxy: $15-25/tháng (cho 500 listings/ngày)
- HeyEtsy team plan: đã có sẵn (user đang dùng)
- **Tổng: ~$25/tháng**

---

## 🐛 Known issues & gotchas

1. **Node 24 KHÔNG tương thích** — phải dùng Node 20 LTS
2. **Chromium cần xvfb** trên Linux server (vì extension cần `headless: false`)
3. **Etsy đôi khi đổi DOM selectors** — cần monitoring scrape success rate
4. **HeyEtsy widget load chậm** — cần `waitForSelector` với timeout 5-10s
5. **Vercel free tier** — Server Actions có timeout 10s → scrape jobs phải chạy trên VPS riêng

---

## 📝 Conversation history (tóm tắt)

### Quá trình quyết định

**Iteration 1**: User muốn build Chrome extension đọc data HeyEtsy
**Iteration 2**: Đổi sang desktop app + VPS + DB riêng
**Iteration 3**: User muốn build local-first trước (Electron + SQLite)
**Iteration 4**: Spec features chi tiết — Search Step 1 + Visualization Step 2
**Iteration 5**: Design 3 mẫu UI → user chọn Mẫu 2 (Dark Etsy Orange)
**Iteration 6**: Code Electron + React + Prisma — bị lỗi `better-sqlite3` trên Windows
**Iteration 7**: Phân tích Web vs Desktop → user chọn Web App
**Iteration 8**: Code Next.js Phase 1 với mock data — HOÀN THÀNH
**Iteration 9** (đang ở đây): Test local, planning Phase 2

### Lessons learned

- ❌ KHÔNG dùng Electron + native modules — quá nhiều rủi ro build
- ✅ Web app + mock data trước = iterate UX nhanh
- ✅ Tiếng Việt UI từ đầu, không refactor sau
- ✅ HeyEtsy team plan = lợi thế lớn cho Phase 2
- ✅ Mỗi product show riêng số liệu, KHÔNG tổng hợp collection

---

## 🚀 Commands quan trọng

```bash
# Dev
npm install
npm run dev               # localhost:3000

# Build & deploy
npm run build
npm start

# Deploy Vercel (Phase 1.5)
npx vercel

# Phase 2 sẽ thêm:
# npm run scrape:test       # Test scrape 1 listing
# npm run scrape:batch      # Scrape batch
# npm run cron:start        # Start scheduler
# npx prisma migrate dev    # Migrate DB
```

---

## 🎯 Khi user yêu cầu thay đổi

### Nếu user muốn đổi UI
- Giữ nguyên Mẫu 2 (cam Etsy) trừ khi user explicit yêu cầu khác
- Mọi text mới phải bằng tiếng Việt
- Animation phải mượt (cubic-bezier ease-out-expo)

### Nếu user muốn thêm chỉ số mới
- Hỏi rõ: lấy từ Tier 1, 2, hay 3?
- Nếu chỉ số liên quan đến Etsy → check trên listing page có public không
- Nếu cần HeyEtsy → confirm widget có hiển thị không

### Nếu user muốn thêm tính năng team
- Nhắc về Phase 3 (auth + workspace)
- Phase 1+2 chưa support multi-user — cần Supabase Auth trước

### Nếu gặp lỗi build/install
- Đầu tiên check Node version (phải v20.x.x)
- Xóa `node_modules` + `package-lock.json` rồi cài lại
- Tránh native modules cần build C++

---

## 📞 Câu hỏi thường gặp từ user

**Q: Sao lại Web mà không phải Desktop?**
A: Vì cần scraper 24/7 → bắt buộc có VPS → desktop app chỉ là viewer thừa. Web access mọi nơi, multi-user dễ.

**Q: Số liệu HeyEtsy có chính xác 100% không?**
A: Không. HeyEtsy cũng đoán Sold/Views (chỉ Favorites là public chính xác). Sai số ~10-30%. User chấp nhận ~80% accuracy.

**Q: Có vi phạm ToS Etsy không?**
A: Scrape ở quy mô cá nhân/research thường OK. Quy mô lớn (1000+/ngày) hoặc resell data có rủi ro pháp lý.

**Q: Khi nào dùng được scraper thật?**
A: Phase 2.2-2.5, ước tính 3-4 tuần sau khi finish Phase 2.1 (Supabase setup).

---

*File này nên được update mỗi khi có quyết định lớn về dự án. Claude Code sẽ tự đọc khi mở repo.*
