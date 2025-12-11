#ONE-CLICK Camera App

#網頁app部署版本：https://aicamera-bfa5b.web.app/

## 功能特色

- **AI相機**：即時物體偵測，自動調整拍攝參數
- **一鍵拍攝模式**：使用者可以一鍵拍攝五種不同風格的照片模式
- **地圖探索**：發現附近餐廳並分享拍攝參數
- **個人檔案**：保存喜愛的照片和拍攝偏好
- **多語言支援**：繁體中文、英文

## 技術架構

- **前端**：React 18 + Tailwind CSS
- **後端**：Firebase (Authentication, Firestore, Storage, Functions)
- **AI**：Google Gemini 2.5 Flash (視覺分析)
- **物體偵測**：TensorFlow.js + COCO-SSD
- **地圖**：Google Maps API

## 前置需求

- Node.js 18+
- npm 或 yarn
- Firebase 帳號
- Google Cloud 帳號（Maps API）
- Google AI Studio 帳號（Gemini API）

## 快速開始

### 1. clone 專案

```bash
git clone https://github.com/your-username/food-camera-app.git
cd food-camera-app
```

### 2. 安裝依賴

```bash
# 安裝前端依賴
npm install

# 安裝 Firebase Functions 依賴
cd functions && npm install && cd ..
```

### 3. 設置環境變數

```bash
# 複製環境變數範例
cp .env.example .env

# 編輯 .env 填入您的 API Keys
```

### 4. 設置 Firebase

```bash
# 登入 Firebase
firebase login

# 初始化專案（選擇您的專案）
firebase use your-project-id

# 設置 Gemini API Key
firebase functions:secrets:set GEMINI_API_KEY
```

### 5. 本地開發

```bash
# 啟動開發服務器
npm start

# 在另一個終端啟動 Firebase 模擬器（可選）
firebase emulators:start
```

### 6. 部署

```bash
# 建置前端
npm run build

# 部署到 Firebase
firebase deploy
```

## 專案結構

```
food-camera-app/
├── public/              # 靜態資源
├── src/
│   ├── components/      # React 組件
│   │   ├── FoodCameraModal.js   # 主相機組件
│   │   ├── MapView.js           # 地圖視圖
│   │   └── ...
│   ├── contexts/        # React Context
│   ├── locales/         # 多語言翻譯
│   ├── services/        # 服務層
│   │   ├── photoAnalysisService.js  # AI 分析服務
│   │   └── ...
│   └── App.js           # 應用入口
├── functions/           # Firebase Functions
│   └── index.js         # Gemini API 代理
├── api/                 # Vercel Functions（備用）
└── firebase.json        # Firebase 配置
```


- [Google Gemini](https://ai.google.dev/) - AI 視覺分析
- [TensorFlow.js](https://www.tensorflow.org/js) - 物體偵測
- [Firebase](https://firebase.google.com/) - 後端服務
- [Tailwind CSS](https://tailwindcss.com/) - UI 框架
