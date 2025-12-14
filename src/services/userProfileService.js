class UserProfileService {
    constructor() {
        this.storageKey = 'food_camera_user_profile';
        this.profile = this.loadProfile();
    }

    loadProfile() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const profile = JSON.parse(stored);
                return this.validateProfile(profile);
            }
        } catch (e) {
            console.error('Failed to load user profile:', e);
        }
        return this.createDefaultProfile();
    }

    createDefaultProfile() {
        return {
            id: this.generateUserId(),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            preferredSettings: {
                favoriteMode: null,
                modeUsageCount: {},
                averageAdjustments: {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    warmth: 0
                },
                foodTypePreferences: {},
                lightingConditionPreferences: {},
            },
            learningHistory: [],
            likedPhotoSettings: [],
            aiLearnedPatterns: {
                colorTendency: 'neutral',
                saturationPreference: 'normal',
                brightnessPreference: 'normal',
                contrastPreference: 'normal',
            },
            settings: {
                enableSuggestions: true,
                autoApplyPreferences: false,
                rememberLastMode: true,
            },
            stats: {
                totalPhotos: 0,
                likedPhotos: 0,
                mostUsedFoodTypes: [],
            }
        };
    }

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

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveProfile() {
        try {
            this.profile.lastActive = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
        } catch (e) {
            console.error('Failed to save user profile:', e);
        }
    }

    recordPhotoCapture(photoData) {
        const {
            mode,
            filters,
            manualAdjustments,
            context,
            isLiked = false,
            zoom = 1,
        } = photoData;

        this.profile.stats.totalPhotos++;

        if (mode) {
            this.profile.preferredSettings.modeUsageCount[mode] =
                (this.profile.preferredSettings.modeUsageCount[mode] || 0) + 1;
            this.updateFavoriteMode();
        }

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

        if (this.profile.learningHistory.length > 200) {
            this.profile.learningHistory = this.profile.learningHistory.slice(-200);
        }

        this.updateAverageAdjustments(manualAdjustments, isLiked ? 3 : 1);

        if (context?.objectType && context.objectType !== 'unknown') {
            this.updateFoodTypePreference(context.objectType, filters, manualAdjustments);
        }

        this.updateLightingPreference(context, filters, manualAdjustments);

        if (isLiked) {
            this.profile.stats.likedPhotos++;
            this.profile.likedPhotoSettings.push({
                timestamp: new Date().toISOString(),
                mode,
                filters: { ...filters },
                manualAdjustments: { ...manualAdjustments },
                context: { ...context },
            });

            if (this.profile.likedPhotoSettings.length > 50) {
                this.profile.likedPhotoSettings = this.profile.likedPhotoSettings.slice(-50);
            }
        }

        this.performAILearning();
        this.saveProfile();
        return learningEntry;
    }

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

    updateAverageAdjustments(adjustments, weight = 1) {
        const avg = this.profile.preferredSettings.averageAdjustments;
        const historyCount = this.profile.learningHistory.length;
        const totalWeight = historyCount + weight;

        for (const key of ['brightness', 'contrast', 'saturation', 'warmth']) {
            if (typeof adjustments[key] === 'number') {
                avg[key] = Math.round(
                    ((avg[key] || 0) * historyCount + adjustments[key] * weight) / totalWeight
                );
            }
        }
    }

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

        for (const key in filters) {
            if (typeof filters[key] === 'number') {
                pref.avgFilters[key] = Math.round(
                    ((pref.avgFilters[key] || 0) * (pref.count - 1) + filters[key]) / pref.count
                );
            }
        }
    }

    performAILearning() {
        const recentHistory = this.profile.learningHistory.slice(-30);
        const likedSettings = this.profile.likedPhotoSettings.slice(-20);

        if (recentHistory.length < 5) return;

        let warmthSum = 0;
        let warmthCount = 0;

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
    }

    getSuggestedSettings(context) {
        if (this.profile.learningHistory.length < 3) {
            return null;
        }

        if (!this.profile.settings.enableSuggestions) {
            return null;
        }

        const suggestion = {
            mode: this.profile.preferredSettings.favoriteMode || 'normal',
            adjustments: { ...this.profile.preferredSettings.averageAdjustments },
            confidence: 0,
            reason: [],
        };

        if (context?.objectType && this.profile.preferredSettings.foodTypePreferences[context.objectType]) {
            const foodPref = this.profile.preferredSettings.foodTypePreferences[context.objectType];
            if (foodPref.count >= 2) {
                suggestion.adjustments = { ...foodPref.avgAdjustments };
                suggestion.filters = { ...foodPref.avgFilters };
                suggestion.confidence += 30;
                suggestion.reason.push('食物類型偏好');
            }
        }

        let lightingCondition = 'normal';
        if (context?.isBacklit) lightingCondition = 'backlit';
        else if (context?.isLowLight) lightingCondition = 'lowLight';
        else if (context?.brightness < 80) lightingCondition = 'dark';
        else if (context?.brightness > 180) lightingCondition = 'bright';

        if (this.profile.preferredSettings.lightingConditionPreferences[lightingCondition]) {
            const lightPref = this.profile.preferredSettings.lightingConditionPreferences[lightingCondition];
            if (lightPref.count >= 2) {
                for (const key in lightPref.avgAdjustments) {
                    suggestion.adjustments[key] = Math.round(
                        (suggestion.adjustments[key] + lightPref.avgAdjustments[key]) / 2
                    );
                }
                suggestion.confidence += 25;
                suggestion.reason.push('光線條件偏好');
            }
        }

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

        if (this.profile.likedPhotoSettings.length >= 3) {
            suggestion.confidence += 25;
            suggestion.reason.push('喜歡的照片風格');
        }

        if (suggestion.confidence < 30) {
            return null;
        }

        suggestion.confidence = Math.min(100, suggestion.confidence);
        return suggestion;
    }

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

    getSettings() {
        return { ...this.profile.settings };
    }

    updateSettings(newSettings) {
        this.profile.settings = {
            ...this.profile.settings,
            ...newSettings,
        };
        this.saveProfile();
    }

    clearLearningData() {
        this.profile.learningHistory = [];
        this.profile.likedPhotoSettings = [];
        this.profile.preferredSettings = this.createDefaultProfile().preferredSettings;
        this.profile.aiLearnedPatterns = this.createDefaultProfile().aiLearnedPatterns;
        this.saveProfile();
    }

    getProfile() {
        return { ...this.profile };
    }

    exportProfile() {
        return JSON.stringify(this.profile, null, 2);
    }

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

const userProfileService = new UserProfileService();

export default userProfileService;
