/**
 * User Profile Service
 * 管理使用者資料檔案並記錄拍攝偏好
 * 透過 AI 學習使用者的拍攝習慣，在下次拍照時提供個性化建議
 */

class UserProfileService {
    constructor() {
        this.storageKey = 'food_camera_user_profile';
        this.profile = this.loadProfile();
    }

    /**
     * 從 localStorage 載入使用者資料
     */
    loadProfile() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const profile = JSON.parse(stored);
                // 確保所有必要欄位存在
                return this.validateProfile(profile);
            }
        } catch (e) {
            console.error('Failed to load user profile:', e);
        }

        return this.createDefaultProfile();
    }

    /**
     * 建立預設的使用者資料
     */
    createDefaultProfile() {
        return {
            // 使用者基本資訊
            id: this.generateUserId(),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),

            // 拍攝偏好記錄
            preferredSettings: {
                // 最常使用的模式
                favoriteMode: null,
                modeUsageCount: {},

                // 常用的手動調整參數
                averageAdjustments: {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    warmth: 0
                },

                // 根據食物類型的偏好
                foodTypePreferences: {},

                // 根據光線條件的偏好
                lightingConditionPreferences: {},
            },

            // 學習歷史記錄
            learningHistory: [],

            // 喜歡的照片設定
            likedPhotoSettings: [],

            // AI 學習結果
            aiLearnedPatterns: {
                colorTendency: 'neutral', // warm, cool, neutral
                saturationPreference: 'normal', // low, normal, high
                brightnessPreference: 'normal', // low, normal, high
                contrastPreference: 'normal', // low, normal, high
            },

            // 設定
            settings: {
                enableSuggestions: true,
                autoApplyPreferences: false,
                rememberLastMode: true,
            },

            // 統計
            stats: {
                totalPhotos: 0,
                likedPhotos: 0,
                mostUsedFoodTypes: [],
            }
        };
    }

    /**
     * 驗證並補全使用者資料
     */
    validateProfile(profile) {
        const defaultProfile = this.createDefaultProfile();

        return {
            ...defaultProfile,
            ...profile,
            preferredSettings: {
                ...defaultProfile.preferredSettings,
                ...profile.preferredSettings,
                averageAdjustments: {
                    ...defaultProfile.preferredSettings.averageAdjustments,
                    ...profile.preferredSettings?.averageAdjustments,
                },
            },
            aiLearnedPatterns: {
                ...defaultProfile.aiLearnedPatterns,
                ...profile.aiLearnedPatterns,
            },
            settings: {
                ...defaultProfile.settings,
                ...profile.settings,
            },
            stats: {
                ...defaultProfile.stats,
                ...profile.stats,
            }
        };
    }

    /**
     * 產生唯一的使用者 ID
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 儲存使用者資料
     */
    saveProfile() {
        try {
            this.profile.lastActive = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
            console.log('✅ User profile saved');
        } catch (e) {
            console.error('Failed to save user profile:', e);
        }
    }

    /**
     * 記錄拍攝行為
     * @param {Object} photoData - 照片資訊
     */
    recordPhotoCapture(photoData) {
        const {
            mode,
            filters,
            manualAdjustments,
            context,
            isLiked = false,
            zoom = 1,
        } = photoData;

        // 更新統計
        this.profile.stats.totalPhotos++;

        // 更新模式使用次數
        if (mode) {
            this.profile.preferredSettings.modeUsageCount[mode] =
                (this.profile.preferredSettings.modeUsageCount[mode] || 0) + 1;

            // 更新最常用模式
            this.updateFavoriteMode();
        }

        // 記錄學習歷史
        const learningEntry = {
            timestamp: new Date().toISOString(),
            mode,
            filters: { ...filters },
            manualAdjustments: { ...manualAdjustments },
            context: { ...context },
            isLiked,
            zoom,
        };

        this.profile.learningHistory.push(learningEntry);

        // 限制歷史記錄數量
        if (this.profile.learningHistory.length > 200) {
            this.profile.learningHistory = this.profile.learningHistory.slice(-200);
        }

        // 更新平均調整值（加權）
        this.updateAverageAdjustments(manualAdjustments, isLiked ? 3 : 1);

        // 更新食物類型偏好
        if (context?.objectType && context.objectType !== 'unknown') {
            this.updateFoodTypePreference(context.objectType, filters, manualAdjustments);
        }

        // 更新光線條件偏好
        this.updateLightingPreference(context, filters, manualAdjustments);

        // 如果喜歡這張照片，特別記錄
        if (isLiked) {
            this.profile.stats.likedPhotos++;
            this.profile.likedPhotoSettings.push({
                timestamp: new Date().toISOString(),
                mode,
                filters: { ...filters },
                manualAdjustments: { ...manualAdjustments },
                context: { ...context },
            });

            // 限制喜歡的照片設定數量
            if (this.profile.likedPhotoSettings.length > 50) {
                this.profile.likedPhotoSettings = this.profile.likedPhotoSettings.slice(-50);
            }
        }

        // 執行 AI 學習分析
        this.performAILearning();

        this.saveProfile();

        return learningEntry;
    }

    /**
     * 更新最常用模式
     */
    updateFavoriteMode() {
        const modeUsage = this.profile.preferredSettings.modeUsageCount;
        let maxCount = 0;
        let favoriteMode = null;

        for (const [mode, count] of Object.entries(modeUsage)) {
            if (count > maxCount) {
                maxCount = count;
                favoriteMode = mode;
            }
        }

        this.profile.preferredSettings.favoriteMode = favoriteMode;
    }

    /**
     * 更新平均調整值
     */
    updateAverageAdjustments(adjustments, weight = 1) {
        const avg = this.profile.preferredSettings.averageAdjustments;
        const historyCount = this.profile.learningHistory.length;

        // 加權平均
        const totalWeight = historyCount + weight;

        for (const key of ['brightness', 'contrast', 'saturation', 'warmth']) {
            if (typeof adjustments[key] === 'number') {
                avg[key] = Math.round(
                    ((avg[key] || 0) * historyCount + adjustments[key] * weight) / totalWeight
                );
            }
        }
    }

    /**
     * 更新食物類型偏好
     */
    updateFoodTypePreference(foodType, filters, adjustments) {
        if (!this.profile.preferredSettings.foodTypePreferences[foodType]) {
            this.profile.preferredSettings.foodTypePreferences[foodType] = {
                count: 0,
                avgFilters: { ...filters },
                avgAdjustments: { ...adjustments },
            };
        }

        const pref = this.profile.preferredSettings.foodTypePreferences[foodType];
        pref.count++;

        // 更新平均值
        for (const key in filters) {
            if (typeof filters[key] === 'number') {
                pref.avgFilters[key] = Math.round(
                    ((pref.avgFilters[key] || 0) * (pref.count - 1) + filters[key]) / pref.count
                );
            }
        }

        for (const key in adjustments) {
            if (typeof adjustments[key] === 'number') {
                pref.avgAdjustments[key] = Math.round(
                    ((pref.avgAdjustments[key] || 0) * (pref.count - 1) + adjustments[key]) / pref.count
                );
            }
        }
    }

    /**
     * 更新光線條件偏好
     */
    updateLightingPreference(context, filters, adjustments) {
        let conditionKey = 'normal';

        if (context?.isBacklit) {
            conditionKey = 'backlit';
        } else if (context?.isLowLight) {
            conditionKey = 'lowLight';
        } else if (context?.brightness < 80) {
            conditionKey = 'dark';
        } else if (context?.brightness > 180) {
            conditionKey = 'bright';
        }

        if (!this.profile.preferredSettings.lightingConditionPreferences[conditionKey]) {
            this.profile.preferredSettings.lightingConditionPreferences[conditionKey] = {
                count: 0,
                avgFilters: { ...filters },
                avgAdjustments: { ...adjustments },
            };
        }

        const pref = this.profile.preferredSettings.lightingConditionPreferences[conditionKey];
        pref.count++;

        // 更新平均值
        for (const key in filters) {
            if (typeof filters[key] === 'number') {
                pref.avgFilters[key] = Math.round(
                    ((pref.avgFilters[key] || 0) * (pref.count - 1) + filters[key]) / pref.count
                );
            }
        }
    }

    /**
     * 執行 AI 學習分析
     * 分析使用者的拍攝偏好模式
     */
    performAILearning() {
        const recentHistory = this.profile.learningHistory.slice(-30); // 分析最近 30 次
        const likedSettings = this.profile.likedPhotoSettings.slice(-20); // 重點分析喜歡的

        if (recentHistory.length < 5) return; // 不夠多資料

        // 分析色溫偏好
        let warmthSum = 0;
        let warmthCount = 0;

        // 喜歡的照片權重更高
        for (const entry of likedSettings) {
            warmthSum += (entry.manualAdjustments?.warmth || 0) * 3;
            warmthSum += (entry.filters?.warmth || 0) * 2;
            warmthCount += 5;
        }

        for (const entry of recentHistory) {
            warmthSum += entry.manualAdjustments?.warmth || 0;
            warmthSum += entry.filters?.warmth || 0;
            warmthCount += 2;
        }

        const avgWarmth = warmthSum / warmthCount;

        if (avgWarmth > 10) {
            this.profile.aiLearnedPatterns.colorTendency = 'warm';
        } else if (avgWarmth < -10) {
            this.profile.aiLearnedPatterns.colorTendency = 'cool';
        } else {
            this.profile.aiLearnedPatterns.colorTendency = 'neutral';
        }

        // 分析飽和度偏好
        let satSum = 0;
        let satCount = 0;

        for (const entry of likedSettings) {
            satSum += (entry.manualAdjustments?.saturation || 0) * 3;
            satCount += 3;
        }

        for (const entry of recentHistory) {
            satSum += entry.manualAdjustments?.saturation || 0;
            satCount += 1;
        }

        const avgSat = satSum / satCount;

        if (avgSat > 15) {
            this.profile.aiLearnedPatterns.saturationPreference = 'high';
        } else if (avgSat < -15) {
            this.profile.aiLearnedPatterns.saturationPreference = 'low';
        } else {
            this.profile.aiLearnedPatterns.saturationPreference = 'normal';
        }

        // 分析亮度偏好
        let brightSum = 0;
        let brightCount = 0;

        for (const entry of likedSettings) {
            brightSum += (entry.manualAdjustments?.brightness || 0) * 3;
            brightCount += 3;
        }

        for (const entry of recentHistory) {
            brightSum += entry.manualAdjustments?.brightness || 0;
            brightCount += 1;
        }

        const avgBright = brightSum / brightCount;

        if (avgBright > 10) {
            this.profile.aiLearnedPatterns.brightnessPreference = 'high';
        } else if (avgBright < -10) {
            this.profile.aiLearnedPatterns.brightnessPreference = 'low';
        } else {
            this.profile.aiLearnedPatterns.brightnessPreference = 'normal';
        }

        // 分析對比度偏好
        let contrastSum = 0;
        let contrastCount = 0;

        for (const entry of likedSettings) {
            contrastSum += (entry.manualAdjustments?.contrast || 0) * 3;
            contrastCount += 3;
        }

        for (const entry of recentHistory) {
            contrastSum += entry.manualAdjustments?.contrast || 0;
            contrastCount += 1;
        }

        const avgContrast = contrastSum / contrastCount;

        if (avgContrast > 10) {
            this.profile.aiLearnedPatterns.contrastPreference = 'high';
        } else if (avgContrast < -10) {
            this.profile.aiLearnedPatterns.contrastPreference = 'low';
        } else {
            this.profile.aiLearnedPatterns.contrastPreference = 'normal';
        }

        console.log('🧠 AI Learning patterns updated:', this.profile.aiLearnedPatterns);
    }

    /**
     * 取得針對當前情境的建議設定
     * @param {Object} context - 當前拍攝情境
     * @returns {Object|null} 建議設定或 null
     */
    getSuggestedSettings(context) {
        // 如果沒有足夠的學習資料，不提供建議
        if (this.profile.learningHistory.length < 3) {
            return null;
        }

        // 如果使用者關閉了建議功能
        if (!this.profile.settings.enableSuggestions) {
            return null;
        }

        const suggestion = {
            mode: this.profile.preferredSettings.favoriteMode || 'normal',
            adjustments: { ...this.profile.preferredSettings.averageAdjustments },
            confidence: 0,
            reason: [],
        };

        // 根據食物類型提供建議
        if (context?.objectType && this.profile.preferredSettings.foodTypePreferences[context.objectType]) {
            const foodPref = this.profile.preferredSettings.foodTypePreferences[context.objectType];
            if (foodPref.count >= 2) {
                suggestion.adjustments = { ...foodPref.avgAdjustments };
                suggestion.filters = { ...foodPref.avgFilters };
                suggestion.confidence += 30;
                suggestion.reason.push('食物類型偏好');
            }
        }

        // 根據光線條件提供建議
        let lightingCondition = 'normal';
        if (context?.isBacklit) lightingCondition = 'backlit';
        else if (context?.isLowLight) lightingCondition = 'lowLight';
        else if (context?.brightness < 80) lightingCondition = 'dark';
        else if (context?.brightness > 180) lightingCondition = 'bright';

        if (this.profile.preferredSettings.lightingConditionPreferences[lightingCondition]) {
            const lightPref = this.profile.preferredSettings.lightingConditionPreferences[lightingCondition];
            if (lightPref.count >= 2) {
                // 合併調整
                for (const key in lightPref.avgAdjustments) {
                    suggestion.adjustments[key] = Math.round(
                        (suggestion.adjustments[key] + lightPref.avgAdjustments[key]) / 2
                    );
                }
                suggestion.confidence += 25;
                suggestion.reason.push('光線條件偏好');
            }
        }

        // 根據 AI 學習模式調整
        const patterns = this.profile.aiLearnedPatterns;

        if (patterns.colorTendency === 'warm') {
            suggestion.adjustments.warmth = Math.max(suggestion.adjustments.warmth, 10);
            suggestion.reason.push('暖色調偏好');
        } else if (patterns.colorTendency === 'cool') {
            suggestion.adjustments.warmth = Math.min(suggestion.adjustments.warmth, -10);
            suggestion.reason.push('冷色調偏好');
        }

        if (patterns.saturationPreference === 'high') {
            suggestion.adjustments.saturation = Math.max(suggestion.adjustments.saturation, 15);
        } else if (patterns.saturationPreference === 'low') {
            suggestion.adjustments.saturation = Math.min(suggestion.adjustments.saturation, -10);
        }

        suggestion.confidence += 20;

        // 如果有喜歡的照片，增加信心度
        if (this.profile.likedPhotoSettings.length >= 3) {
            suggestion.confidence += 25;
            suggestion.reason.push('喜歡的照片風格');
        }

        // 只有信心度夠高才提供建議
        if (suggestion.confidence < 30) {
            return null;
        }

        suggestion.confidence = Math.min(100, suggestion.confidence);

        console.log('💡 Profile suggestion generated:', suggestion);

        return suggestion;
    }

    /**
     * 取得使用者的拍攝統計
     */
    getStats() {
        return {
            ...this.profile.stats,
            favoriteMode: this.profile.preferredSettings.favoriteMode,
            modeUsageCount: this.profile.preferredSettings.modeUsageCount,
            aiPatterns: this.profile.aiLearnedPatterns,
            historyCount: this.profile.learningHistory.length,
            likedCount: this.profile.likedPhotoSettings.length,
        };
    }

    /**
     * 取得使用者設定
     */
    getSettings() {
        return { ...this.profile.settings };
    }

    /**
     * 更新使用者設定
     */
    updateSettings(newSettings) {
        this.profile.settings = {
            ...this.profile.settings,
            ...newSettings,
        };
        this.saveProfile();
    }

    /**
     * 清除所有學習資料
     */
    clearLearningData() {
        this.profile.learningHistory = [];
        this.profile.likedPhotoSettings = [];
        this.profile.preferredSettings = this.createDefaultProfile().preferredSettings;
        this.profile.aiLearnedPatterns = this.createDefaultProfile().aiLearnedPatterns;
        this.saveProfile();
        console.log('🗑️ Learning data cleared');
    }

    /**
     * 取得使用者資料
     */
    getProfile() {
        return { ...this.profile };
    }

    /**
     * 匯出使用者資料
     */
    exportProfile() {
        return JSON.stringify(this.profile, null, 2);
    }

    /**
     * 匯入使用者資料
     */
    importProfile(profileJson) {
        try {
            const profile = JSON.parse(profileJson);
            this.profile = this.validateProfile(profile);
            this.saveProfile();
            return true;
        } catch (e) {
            console.error('Failed to import profile:', e);
            return false;
        }
    }
}

// 創建單例
const userProfileService = new UserProfileService();

export default userProfileService;
