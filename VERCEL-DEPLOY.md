# 🚀 Deploy PixelWar lên Vercel

## Cách 1: Vercel CLI (Nhanh nhất)

```bash
cd frontend
vercel --prod
```

Làm theo các bước:
1. Login vào Vercel (nếu chưa)
2. Link với project (nếu chưa)
3. Đợi build và deploy

## Cách 2: Vercel Dashboard (Dễ nhất)

### Bước 1: Truy cập Vercel
1. Vào https://vercel.com
2. Đăng nhập bằng GitHub

### Bước 2: Import Project
1. Click "Add New" → "Project"
2. Chọn repository: `HandQ2212/pixel-war`
3. Click "Import"

### Bước 3: Cấu hình
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Bước 4: Deploy
1. Click "Deploy"
2. Đợi 2-3 phút
3. Nhận link website: `https://your-project.vercel.app`

## ⚙️ Biến môi trường (nếu cần)

Nếu muốn tách config ra khỏi code:

1. Trong Vercel Dashboard → Settings → Environment Variables
2. Thêm:
   - `VITE_PACKAGE_ID` = `0xa4887ed1309c8d82b6be1d0052d564d9cba7d33889cf637837bc5693f5f0e9b0`
   - `VITE_GAME_ID` = `0x96f401fa0ab3802195a15d386c222b7751d3e90298495a80be09ba788030a5e7`
   - `VITE_ADMIN_CAP_ID` = `0x8fd0283fee52aba4a6c34d5cd6d6e4dbc110d520513e802f9bbd79558fa6a33b`

3. Sửa `App.tsx`:
```typescript
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0xa488...'
```

## 📝 Sau khi Deploy

1. ✅ Test game trên production URL
2. ✅ Share link với bạn bè
3. ✅ Monitor performance trong Vercel Dashboard

## 🔄 Auto Deploy

Mỗi khi push code lên GitHub, Vercel sẽ tự động rebuild và deploy!

```bash
git add .
git commit -m "Update game"
git push origin main
# Vercel tự động deploy sau 2-3 phút
```

## 🌐 Custom Domain (Optional)

1. Trong Vercel Dashboard → Settings → Domains
2. Add domain của bạn: `pixelwar.yourdomain.com`
3. Cấu hình DNS theo hướng dẫn

---

**Repository**: https://github.com/HandQ2212/pixel-war
**Tech Stack**: React + TypeScript + Vite + Sui Blockchain
