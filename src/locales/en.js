// English translations - Food Camera App
const en = {
  // App
  app: {
    title: 'ONECLICK - CAMERA',
    subtitle: 'Food Photography Assistant - Real-time Detection & Tips',
    footer: 'Powered by TensorFlow.js & AI',
    openCamera: 'Open Camera'
  },

  // Features
  features: {
    detection: 'Real-time Detection',
    tips: 'Smart Photo Tips',
    tracking: 'Auto Focus Tracking',
    export: 'HD Export'
  },

  // Common
  common: {
    loading: 'Loading...',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    error: 'Error',
    retry: 'Retry'
  },

  // Camera
  camera: {
    title: 'ONECLICK - CAMERA',
    subtitle: 'AI Food Recognition & Phone Camera Tips',
    initializing: 'Initializing camera...',
    tip: 'Center the food in the frame and tap to capture',
    cameraError: 'Cannot access camera. Please grant camera permission.',
    analysisError: 'Analysis failed. Please try again.',
    analyzing: 'Analyzing...',
    aiWorking: 'AI is identifying the food and generating phone camera tips',
    identifiedFood: 'Identified Food',
    confidence: 'Confidence',
    photoTips: 'Phone Camera Settings',
    lighting: 'Exposure / White Balance / HDR',
    angle: 'Zoom / Portrait Mode / Angle',
    composition: 'Focus / Photo Mode / Ratio',
    proTips: 'Flash / Filters / Others',
    retake: 'Retake',
    capture: 'Capture',
    // New camera features
    loadingModel: 'Loading model...',
    loadingAI: 'Loading AI model...',
    clickToSelect: 'Click to select object',
    clickToFocus: 'Tap to select object',
    locked: 'Locked',
    searching: 'Searching',
    waitingSelect: 'Waiting',
    lockedObject: 'Object locked',
    clear: 'Clear',
    // Camera settings
    aiAutoAdjust: 'AI Auto Adjust',
    exposure: 'Exposure',
    whiteBalance: 'White Balance',
    hdr: 'HDR',
    contrast: 'Contrast',
    saturation: 'Saturation',
    shootAngle: 'Angle',
    on: 'On',
    off: 'Off',
    // Exposure descriptions
    exposureNormal: 'Exposure OK',
    exposureBacklit: 'Backlit, increase exposure',
    exposureLowLight: 'Low light, increase exposure',
    exposureDark: 'Slightly dark, increase exposure',
    exposureBright: 'Too bright, decrease exposure',
    // White balance
    wbAuto: 'Auto',
    wbCloudy: 'Cloudy',
    wbTungsten: 'Tungsten',
    wbNormal: 'Normal',
    wbWarm: 'Warm ambient',
    wbCold: 'Cold ambient',
    // Contrast
    contrastNormal: 'Normal',
    contrastIncrease: 'Increase contrast',
    contrastDecrease: 'Decrease contrast',
    // Saturation
    satNormal: 'Normal',
    satFood: 'Food enhance',
    satFruit: 'Fruit vivid',
    satDrink: 'Drink texture',
    satBowl: 'Bowl food',
    // Angles
    angle45: '45° diagonal',
    angle90: '90° overhead',
    angle15: '15° slight tilt',
    angle60: '60° overhead tilt',
    // HDR
    hdrRecommend: 'HDR recommended',
    hdrOff: 'HDR optional',
    // Tips
    tipNightMode: 'Enable night mode',
    tipLockExposure: 'Tap to lock exposure',
    // Warmth
    warmthWarm: 'Warm',
    warmthCold: 'Cold',
    warmthNeutral: 'Neutral',
    // Photo info
    originalQuality: 'Original Quality',
    zoomLevel: 'Zoom',
    // Download
    downloadJPG: 'JPG',
    downloadPNG: 'PNG',
    // Zoom
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    // Photo modes
    photoMode: 'Photo Mode',
    selectMode: 'Select Mode',
    captureAllModes: 'Capture All Modes',
    capturing: 'Capturing...',
    modeNormal: 'Normal',
    modeVintage: 'Vintage',
    modeDreamy: 'Dreamy',
    modeVibrant: 'Vibrant',
    modeMoody: 'Moody',
    modeWarm: 'Warm',
    // AI Learning
    aiLearning: 'AI Learning',
    learningEnabled: 'Preference learning enabled',
    learningDisabled: 'Preference learning disabled',
    preferenceRecorded: 'Your preference recorded',
    applyingPreference: 'Applying your preference',
    // Multi-capture
    multiCapture: 'Multi-Mode Capture',
    capturedModes: 'Captured Modes',
    downloadAll: 'Download All',
    // Color adjustment
    colorAdjustment: 'Color Adjustment',
    adjust: 'Adjust',
    brightness: 'Brightness',
    warmth: 'Warmth',
    reset: 'Reset',
    // Image preview
    clickToZoom: 'Tap to zoom in',
    imageError: 'Image load failed',
    // Preference learning
    likePhoto: 'Like this photo',
    likedPhoto: 'Marked as liked',
    preferenceApplied: 'Your preference applied',
    savePreference: 'Save preference',
    // User profile suggestions
    applyPreference: 'Apply Preference',
    suggestionTitle: 'Your Preferred Settings',
    suggestionDesc: 'Based on your shooting habits, AI suggests these settings:',
    applySuggestion: 'Apply Suggestion',
    dismissSuggestion: 'No thanks',
    suggestionMode: 'Suggested Mode',
    suggestionAdjustments: 'Suggested Adjustments',
    suggestionConfidence: 'Confidence',
    suggestionReasons: 'Based on:',
    foodTypePreference: 'Food type preference',
    lightingPreference: 'Lighting preference',
    likedPhotoStyle: 'Liked photo style',
    warmTonePreference: 'Warm tone preference',
    coolTonePreference: 'Cool tone preference',
    profileSettings: 'Profile Settings',
    enableSuggestions: 'Enable suggestions',
    autoApply: 'Auto-apply preferences',
    rememberMode: 'Remember last mode',
    clearLearning: 'Clear learning data',
    totalPhotos: 'Total photos',
    likedPhotos: 'Liked photos',
    learningProgress: 'Learning progress',
    // Grid overlay
    gridOverlay: 'Grid',
    gridOn: 'Grid on',
    gridOff: 'Grid off',
    // AI Panel
    clickToView: 'Tap to view',
    // Save to profile
    saveToProfile: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    download: 'Download',
    edited: 'Edited'
  },

  // Authentication
  auth: {
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    loginDesc: 'Sign in to sync your preferences',
    signupDesc: 'Create an account for personalized experience',
    displayName: 'Display Name',
    email: 'Email',
    password: 'Password',
    login: 'Log In',
    signup: 'Sign Up',
    logout: 'Log Out',
    loading: 'Processing...',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    benefits: 'Member Benefits',
    benefit1: 'Cloud sync for preferences',
    benefit2: 'AI learns your shooting style',
    benefit3: 'Cross-device data sync',
    loginFirst: 'Please log in first',
    loginToUse: 'Log in to use this feature'
  },

  // User Profile
  profile: {
    user: 'User',
    memberSince: 'Member since: ',
    stats: 'Stats',
    preferences: 'Settings',
    aiLearning: 'AI Learning',
    totalPhotos: 'Total',
    likedPhotos: 'Liked',
    thisMonth: 'This Month',
    favoriteMode: 'Favorite Mode',
    language: 'Language',
    enableSuggestions: 'Enable Suggestions',
    enableSuggestionsDesc: 'Show AI suggestions when food is detected',
    autoApply: 'Auto-apply Preferences',
    autoApplyDesc: 'Automatically apply learned settings',
    rememberMode: 'Remember Last Mode',
    rememberModeDesc: 'Use last mode when opening camera',
    selectFavoriteMode: 'Select Favorite Mode',
    aiPatterns: 'AI Learned Patterns',
    colorTendency: 'Color Tendency',
    saturationPref: 'Saturation',
    brightnessPref: 'Brightness',
    contrastPref: 'Contrast',
    learnedAdjustments: 'Learned Adjustments',
    brightness: 'Brightness',
    contrast: 'Contrast',
    saturation: 'Saturation',
    warmth: 'Warmth',
    clearLearning: 'Clear Learning Data',
    confirmClear: 'Are you sure you want to clear all learning data? This cannot be undone.',
    saved: 'Saved',
    cleared: 'Cleared',
    patternWarm: 'Warm tones',
    patternCool: 'Cool tones',
    patternNeutral: 'Neutral',
    patternHigh: 'High',
    patternLow: 'Low',
    patternNormal: 'Normal'
  }
};

export default en;

