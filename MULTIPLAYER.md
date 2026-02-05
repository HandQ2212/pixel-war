# 🎮 Hướng Dẫn Chơi Multiplayer - PixelWar

Có 3 cách để bạn bè cùng chơi PixelWar với bạn!

---

## 🌐 Cách 1: Deploy lên Vercel (Miễn phí, Dễ nhất)

### Bước 1: Tạo GitHub Repository

```bash
cd d:\DaiHoc\sui\pixel-war
git init
git add .
git commit -m "Initial commit - PixelWar game"
```

Tạo repo mới trên GitHub và push code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/pixel-war.git
git branch -M main
git push -u origin main
```

### Bước 2: Deploy lên Vercel

1. Truy cập https://vercel.com
2. Sign in bằng GitHub
3. Click "New Project"
4. Import repository `pixel-war`
5. Chọn thư mục root: `frontend`
6. Click "Deploy"

**✅ Xong!** Vercel sẽ tạo link kiểu: `https://pixel-war-abc123.vercel.app`

### Bước 3: Chia sẻ link

Gửi link cho bạn bè:
- Link: `https://pixel-war-abc123.vercel.app`
- Bạn bè chỉ cần vào link và chơi
- Trong mock mode, mỗi người vẽ trên browser riêng

---

## 🔗 Cách 2: Dùng Ngrok (Nhanh, tạm thời)

### Bước 1: Tải Ngrok
- Truy cập: https://ngrok.com/download
- Tải và giải nén ngrok.exe

### Bước 2: Expose localhost

```powershell
# Frontend đang chạy ở http://localhost:5173
.\ngrok http 5173
```

Ngrok sẽ tạo link public:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5173
```

### Bước 3: Chia sẻ link

Gửi link ngrok cho bạn bè: `https://abc123.ngrok.io`

**⚠️ Lưu ý:**
- Link ngrok chỉ hoạt động khi máy bạn bật và app đang chạy
- Link sẽ thay đổi mỗi lần restart ngrok
- Miễn phí có giới hạn 40 requests/phút

---

## 👥 Cách 3: Bạn bè clone code (Chơi local riêng)

### Bạn bè làm theo:

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/pixel-war.git
cd pixel-war

# 2. Cài dependencies
cd frontend
npm install

# 3. Chạy dev server
npm run dev

# 4. Mở browser
# http://localhost:5173
```

**⚠️ Hạn chế:** Mỗi người chơi trên máy riêng, không thể cùng canvas.

---

## 🎯 Chơi Multiplayer THẬT với Sui Blockchain

Để chơi multiplayer thật (cùng canvas, live updates), cần deploy smart contract:

### 1. Deploy Smart Contract lên Sui Testnet

```powershell
cd d:\DaiHoc\sui\pixel-war
.\deploy.ps1
```

Lưu lại:
- `PACKAGE_ID`: 0xabc...
- `GAME_ID`: 0xdef...

### 2. Update Frontend

Sửa file `frontend/src/App.tsx`:
```typescript
const MOCK_MODE = false  // Tắt mock mode
const PACKAGE_ID = '0xABC_YOUR_PACKAGE_ID'  // Paste package ID
const GAME_ID = '0xDEF_YOUR_GAME_ID'  // Paste game ID
```

### 3. Redeploy Frontend

```bash
git add .
git commit -m "Update contract addresses"
git push
```

Vercel sẽ tự động deploy lại.

### 4. Chia sẻ và chơi!

Giờ mọi người:
1. Vào link Vercel: `https://pixel-war-abc123.vercel.app`
2. Connect Sui Wallet (cần có testnet SUI)
3. Join team và vẽ pixels
4. **Mọi người thấy cùng canvas realtime!** 🎨⚔️

---

## 💡 So Sánh

| Phương pháp | Độ khó | Multiplayer thật? | Chi phí | Tốc độ setup |
|-------------|---------|-------------------|---------|--------------|
| **Vercel** | ⭐⭐ | ❌ (mock) hoặc ✅ (sau deploy contract) | Miễn phí | 5 phút |
| **Ngrok** | ⭐ | ❌ (mock) | Miễn phí | 1 phút |
| **Clone local** | ⭐ | ❌ | Miễn phí | 2 phút |
| **Deploy contract + Vercel** | ⭐⭐⭐⭐ | ✅ | Testnet free | 15 phút |

---

## 🎮 Khuyến nghị

**Cho Demo nhanh (hôm nay):**
→ Dùng **Ngrok** - 1 phút setup, gửi link cho bạn bè ngay

**Cho Bootcamp/Presentation:**
→ Dùng **Vercel + Deploy Contract** - Professional, multiplayer thật

**Cho Development:**
→ **Clone local** - Mỗi người dev riêng

---

## 🚀 Quick Start: Deploy ngay lập tức

```powershell
# Cài Vercel CLI
npm install -g vercel

# Deploy frontend
cd d:\DaiHoc\sui\pixel-war\frontend
vercel --prod

# Lấy link và share!
```

---

## ❓ FAQ

**Q: Trong mock mode, bạn bè thấy pixel tôi vẽ không?**
A: Không. Mock mode là local, mỗi người có canvas riêng.

**Q: Khi nào thì multiplayer thật?**
A: Khi deploy smart contract lên Sui và set `MOCK_MODE = false`

**Q: Vercel có tính tiền không?**
A: Miễn phí cho personal projects, unlimited bandwidth.

**Q: Bạn bè cần cài gì?**
A: Chỉ cần browser và Sui Wallet (nếu chơi on-chain). Mock mode không cần wallet.

**Q: Có giới hạn người chơi không?**
A: Vercel: không giới hạn. Ngrok free: ~40 requests/phút.

---

**Ready to share?** Pick a method and let the pixel war begin! 🎨⚔️
