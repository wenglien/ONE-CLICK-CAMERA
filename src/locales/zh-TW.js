// 繁體中文翻譯 - 食物相機專用
const zhTW = {
  // App
  app: {
    title: 'ONECLICK - CAMERA',
    subtitle: '攝影助手 - 即時物體偵測與拍攝建議',
    footer: '由 TensorFlow.js 和 Gemini 技術提供支援',
    openCamera: '開啟相機'
  },

  // Features
  features: {
    detection: '即時物體偵測',
    tips: 'AI拍攝建議',
    tracking: '自動追蹤對焦',
    export: '高畫質匯出'
  },

  // Common
  common: {
    loading: '載入中...',
    close: '關閉',
    cancel: '取消',
    confirm: '確認',
    error: '錯誤',
    retry: '重試'
  },

  // Camera
  camera: {
    title: 'ONECLICK - CAMERA',
    subtitle: 'AI 食物辨識與手機拍攝建議',
    initializing: '正在啟動相機...',
    tip: '將食物置於取景框中央，點擊拍照',
    cameraError: '無法存取相機，請確認已授予相機權限',
    analysisError: '分析失敗，請重試',
    analyzing: '正在分析...',
    aiWorking: 'AI 正在識別食物並產生手機拍攝建議',
    identifiedFood: '識別結果',
    confidence: '信心度',
    photoTips: '手機拍攝設定',
    lighting: '曝光 / 白平衡 / HDR',
    angle: '變焦 / 人像模式 / 角度',
    composition: '對焦 / 拍攝模式 / 比例',
    proTips: '閃光燈 / 濾鏡 / 其他',
    retake: '重拍',
    capture: '拍照',
    // New camera features
    loadingModel: '載入模型中...',
    loadingAI: '載入 AI 模型...',
    clickToSelect: '點擊選擇物體',
    clickToFocus: '點擊畫面選擇物體',
    locked: '已鎖定',
    searching: '搜尋中',
    waitingSelect: '等待選擇',
    lockedObject: '已鎖定物體',
    clear: '清除',
    // Camera settings
    aiAutoAdjust: 'AI 自動調整參數',
    exposure: '曝光',
    whiteBalance: '白平衡',
    hdr: 'HDR',
    contrast: '對比',
    saturation: '飽和',
    shootAngle: '角度',
    on: '開啟',
    off: '關閉',
    // Exposure descriptions
    exposureNormal: '曝光正常',
    exposureBacklit: '背光環境，增加曝光',
    exposureLowLight: '低光環境，增加曝光',
    exposureDark: '稍暗，增加曝光',
    exposureBright: '過亮，降低曝光',
    // White balance
    wbAuto: '自動',
    wbCloudy: '陰天',
    wbTungsten: '鎢絲燈',
    wbNormal: '色溫正常',
    wbWarm: '環境偏暖',
    wbCold: '環境偏冷',
    // Contrast
    contrastNormal: '對比適中',
    contrastIncrease: '增加對比',
    contrastDecrease: '降低對比',
    // Saturation
    satNormal: '適度飽和',
    satFood: '熟食增艷',
    satFruit: '蔬果鮮豔',
    satDrink: '飲品質感',
    satBowl: '碗裝食物',
    // Angles
    angle45: '45度斜拍',
    angle90: '90度俯拍',
    angle15: '15度微斜拍',
    angle60: '60度俯斜拍',
    // HDR
    hdrRecommend: '建議開啟 HDR',
    hdrOff: '可關閉 HDR',
    // Tips
    tipNightMode: '建議開啟夜間模式',
    tipLockExposure: '點擊主體鎖定曝光',
    // Warmth
    warmthWarm: '暖',
    warmthCold: '冷',
    warmthNeutral: '中',
    // Photo info
    originalQuality: '原始品質',
    zoomLevel: '焦段',
    // Download
    downloadJPG: 'JPG',
    downloadPNG: 'PNG',
    // Zoom
    zoomIn: '放大',
    zoomOut: '縮小',
    // Photo modes
    photoMode: '拍照模式',
    selectMode: '選擇模式',
    captureAllModes: '一鍵拍攝所有模式',
    capturing: '拍攝中...',
    modeNormal: '正常',
    modeVintage: '復古',
    modeDreamy: '唯美',
    modeVibrant: '鮮豔',
    modeMoody: '暗調',
    modeWarm: '暖色',
    // AI Learning
    aiLearning: 'AI 學習',
    learningEnabled: '已啟用偏好學習',
    learningDisabled: '偏好學習已停用',
    preferenceRecorded: '已記錄您的偏好',
    applyingPreference: '應用您的偏好設定',
    // Multi-capture
    multiCapture: '多模式拍攝',
    capturedModes: '已拍攝模式',
    downloadAll: '下載全部',
    // Color adjustment
    colorAdjustment: '色調調整',
    adjust: '調整',
    brightness: '亮度',
    warmth: '色溫',
    reset: '重置',
    // Image preview
    clickToZoom: '點擊圖片放大檢視',
    imageError: '圖片載入失敗',
    // Preference learning
    likePhoto: '喜歡這張照片',
    likedPhoto: '已標記為喜歡',
    preferenceApplied: '已應用您的偏好',
    savePreference: '儲存偏好設定',
    // User profile suggestions
    applyPreference: '套用偏好設定',
    suggestionTitle: '發現您的偏好設定',
    suggestionDesc: '根據您之前的拍攝習慣，AI 建議使用以下設定：',
    applySuggestion: '套用建議',
    dismissSuggestion: '不用了，謝謝',
    suggestionMode: '推薦模式',
    suggestionAdjustments: '推薦調整',
    suggestionConfidence: '信心度',
    suggestionReasons: '根據：',
    foodTypePreference: '食物類型偏好',
    lightingPreference: '光線條件偏好',
    likedPhotoStyle: '喜歡的照片風格',
    warmTonePreference: '暖色調偏好',
    coolTonePreference: '冷色調偏好',
    profileSettings: '個人偏好設定',
    enableSuggestions: '啟用拍攝建議',
    autoApply: '自動套用偏好',
    rememberMode: '記住上次模式',
    clearLearning: '清除學習資料',
    totalPhotos: '累計拍攝',
    likedPhotos: '喜歡的照片',
    learningProgress: '學習進度',
    // Grid overlay
    gridOverlay: '九宮格',
    gridOn: '格線開啟',
    gridOff: '格線關閉',
    // AI Panel
    clickToView: '點擊查看',
    // Save to profile
    saveToProfile: '儲存',
    saving: '儲存中...',
    saved: '已儲存',
    download: '下載',
    edited: '已編輯'
  },

  // Authentication
  auth: {
    welcomeBack: '歡迎回來',
    createAccount: '建立帳號',
    loginDesc: '登入以同步您的拍攝偏好',
    signupDesc: '建立帳號開始個人化體驗',
    displayName: '顯示名稱',
    email: '電子郵件',
    password: '密碼',
    login: '登入',
    signup: '註冊',
    logout: '登出',
    loading: '處理中...',
    or: '或',
    continueWithGoogle: '使用 Google 繼續',
    noAccount: '還沒有帳號？',
    hasAccount: '已有帳號？',
    benefits: '登入會員專屬功能',
    benefit1: '雲端同步拍攝偏好設定',
    benefit2: 'AI 學習您的拍攝風格',
    benefit3: '跨裝置同步拍攝資料',
    loginFirst: '請先登入',
    loginToUse: '登入以使用此功能'
  },

  // User Profile
  profile: {
    user: '使用者',
    memberSince: '加入日期：',
    stats: '統計',
    preferences: '設定',
    aiLearning: 'AI 學習',
    totalPhotos: '總拍攝',
    likedPhotos: '喜歡照片',
    thisMonth: '本月',
    favoriteMode: '常用模式',
    language: '語言',
    enableSuggestions: '啟用拍攝建議',
    enableSuggestionsDesc: '偵測到食物時顯示 AI 建議',
    autoApply: '自動套用偏好',
    autoApplyDesc: '自動應用學習的拍攝設定',
    rememberMode: '記住上次模式',
    rememberModeDesc: '開啟相機時使用上次的拍攝模式',
    selectFavoriteMode: '選擇偏好模式',
    aiPatterns: 'AI 學習的拍攝風格',
    colorTendency: '色調偏好',
    saturationPref: '飽和度偏好',
    brightnessPref: '亮度偏好',
    contrastPref: '對比度偏好',
    learnedAdjustments: '學習的調整值',
    brightness: '亮度',
    contrast: '對比',
    saturation: '飽和',
    warmth: '色溫',
    clearLearning: '清除學習資料',
    confirmClear: '確定要清除所有學習資料嗎？此操作無法復原。',
    saved: '已儲存',
    cleared: '已清除',
    patternWarm: '偏暖色調',
    patternCool: '偏冷色調',
    patternNeutral: '中性',
    patternHigh: '偏高',
    patternLow: '偏低',
    patternNormal: '正常'
  }
};

export default zhTW;

