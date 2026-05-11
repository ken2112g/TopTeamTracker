# 🍊 EtsyPulse Web

> Web app theo dõi và phân tích sản phẩm Etsy theo thời gian — Track · Compare · Win

Web app full-stack được build với Next.js 15, sẵn sàng deploy lên Vercel free tier.

## 🎯 Phase 1 — Mock Data Mode (đang ở đây)

Phase này focus vào hoàn thiện UI/UX với mock data, không cần database thật. Mục tiêu:
- ✅ Tất cả pages hoạt động đầy đủ
- ✅ Charts render với data mẫu
- ✅ Search, filter, compare hoạt động
- ✅ Animations, transitions mượt
- ✅ Deploy được lên Vercel để team dùng thử

Sau khi UX OK → Phase 2 sẽ wire real Supabase + scraper.

## 🚀 Cách chạy

### Yêu cầu
- **Node.js 20 LTS** (https://nodejs.org/)
- **npm** hoặc **pnpm** hoặc **yarn**

### Cài đặt

```bash
cd etsypulse-web
npm install
```

⚠️ **Nếu bạn đang dùng Node 24 và gặp lỗi**, hãy downgrade về Node 20 LTS để tránh các lỗi compatibility.

### Chạy dev server

```bash
npm run dev
```

Mở browser tại `http://localhost:3000`. App tự reload khi sửa code.

### Build production

```bash
npm run build
npm start
```

## 📁 Cấu trúc thư mục

```
etsypulse-web/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Trang chủ - bảng theo dõi
│   ├── globals.css        # CSS toàn cục
│   ├── search/            # Trang tìm kiếm
│   ├── collections/[id]/  # Trang collection
│   ├── listings/[id]/     # Trang chi tiết SP
│   ├── compare/           # Trang so sánh
│   └── settings/          # Trang cấu hình
├── components/
│   ├── layout/            # Sidebar, Topbar
│   ├── charts/            # Chart components
│   ├── modals/            # Add Listing modal
│   ├── ui/                # RangePicker, Sparkline, Toast
│   └── CollectionView.tsx # View dùng chung
├── lib/
│   ├── mock/data.ts       # Mock data (Phase 1)
│   ├── store/             # Zustand store
│   └── utils/             # Utilities
├── types/index.ts         # TypeScript types
└── public/                # Static assets
```

## 🧪 Test các trang

Sau khi `npm run dev`, mở `http://localhost:3000`:

1. **`/`** - Bảng theo dõi tất cả sản phẩm (13 SP mock)
2. **`/search`** - Search "birthday romper" → xem kết quả → tick chọn → "Thêm vào bộ sưu tập"
3. **`/collections/coll_birthday`** - Xem 1 bộ sưu tập cụ thể
4. **`/listings/listing_1`** - Chi tiết 1 SP với 4 charts (Sold/Views/Revenue/CVR)
5. **`/compare`** - So sánh 3 SP đầu (mỗi SP 1 màu)
6. **`/settings`** - Trang cấu hình

Click sidebar collections (Birthday romper, Personalized mug, etc.) để filter.

## ☁️ Deploy lên Vercel (FREE)

### Cách 1: CLI (nhanh nhất)

```bash
npm install -g vercel
vercel
```

Làm theo hướng dẫn, deploy xong sẽ có URL như `etsypulse-xxx.vercel.app`.

### Cách 2: Git push

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import Project → chọn repo
3. Click Deploy → xong (~2 phút)
4. Mỗi lần `git push` → tự deploy bản mới

### Cấu hình domain riêng (sau)

Vercel Settings → Domains → Add `your-domain.com`

## 🔮 Roadmap Phase 2+

- [ ] **Phase 2**: Setup Supabase (PostgreSQL + Auth)
  - [ ] Schema từ Prisma
  - [ ] Server actions cho CRUD
  - [ ] Migrate mock data sang real
- [ ] **Phase 2.5**: Scraper VPS
  - [ ] Playwright scraper Etsy
  - [ ] HeyEtsy data integration
  - [ ] BullMQ queue + cron daily
- [ ] **Phase 3**: Team features
  - [ ] Auth (Google login)
  - [ ] Workspace + roles (Owner/Admin/Member)
  - [ ] Activity log
  - [ ] Comments trên listing
  - [ ] Realtime updates (Supabase Realtime)
- [ ] **Phase 4**: Advanced
  - [ ] Email digest hàng ngày
  - [ ] Telegram bot alerts
  - [ ] Export PDF report
  - [ ] PWA install

## 🛠 Tech Stack

| Phần | Tech | Lý do |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, SSR, deploy Vercel free |
| UI | React 18 + TypeScript | Type-safe |
| Styling | Tailwind CSS | Đẹp sẵn, nhanh |
| Charts | Chart.js + react-chartjs-2 | Đẹp, customize tốt |
| State | Zustand | Nhẹ hơn Redux |
| Icons | Lucide React | Đẹp, lightweight |

## 📝 Scripts

```bash
npm run dev      # Chạy dev server (localhost:3000)
npm run build    # Build production
npm start        # Chạy production server
npm run lint     # Check lỗi code
```

## 🐛 Troubleshooting

**App trắng tinh, F12 console có error:**
- Đảm bảo Node 20+ (gõ `node -v` để check)
- Xóa `.next` folder rồi chạy lại

**Lỗi font không load:**
- Check kết nối internet (Google Fonts cần online)
- Đợi 5-10s reload

**Tailwind không apply style:**
- Kill server (Ctrl+C) và chạy lại `npm run dev`
- Đảm bảo file `app/globals.css` được import trong `app/layout.tsx`

---

🍊 **EtsyPulse Web** · Phase 1 · Built with Next.js + Tailwind
