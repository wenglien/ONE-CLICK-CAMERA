/**
 * AI 偏好學習服務
 * 記錄使用者喜歡的拍照參數，並在相似情境中自動應用
 */

class PreferenceService {
  constructor() {
    this.storageKey = 'food_camera_preferences';
    this.preferences = this.loadPreferences();
  }

  /**
   * 從 localStorage 載入偏好設定
   */
  loadPreferences() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
    
    return {
      userPreferences: [], // 使用者喜歡的參數組合
      modePresets: this.getDefaultModePresets(), // 預設模式
      learningEnabled: true
    };
  }

  /**
   * 儲存偏好設定
   */
  savePreferences() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }

  /**
   * 取得預設模式
   */
  getDefaultModePresets() {
    return {
      normal: {
        name: '正常',
        nameEn: 'Normal',
        icon: '📷',
        filters: {
          brightness: 100,
          contrast: 100,
          saturate: 100,
          warmth: 0
        },
        settings: {
          exposure: 0,
          contrast: 55,
          saturation: 55,
          warmth: 5
        }
      },
      vintage: {
        name: '復古',
        nameEn: 'Vintage',
        icon: '🎞️',
        filters: {
          brightness: 95,
          contrast: 110,
          saturate: 80,
          warmth: 25
        },
        settings: {
          exposure: -0.3,
          contrast: 65,
          saturation: 45,
          warmth: 30
        }
      },
      dreamy: {
        name: '唯美',
        nameEn: 'Dreamy',
        icon: '✨',
        filters: {
          brightness: 105,
          contrast: 90,
          saturate: 110,
          warmth: 15
        },
        settings: {
          exposure: 0.5,
          contrast: 45,
          saturation: 70,
          warmth: 20
        }
      },
      vibrant: {
        name: '鮮豔',
        nameEn: 'Vibrant',
        icon: '🌈',
        filters: {
          brightness: 100,
          contrast: 110,
          saturate: 130,
          warmth: 10
        },
        settings: {
          exposure: 0,
          contrast: 70,
          saturation: 80,
          warmth: 15
        }
      },
      moody: {
        name: '暗調',
        nameEn: 'Moody',
        icon: '🌙',
        filters: {
          brightness: 85,
          contrast: 120,
          saturate: 90,
          warmth: -10
        },
        settings: {
          exposure: -0.5,
          contrast: 75,
          saturation: 50,
          warmth: -5
        }
      },
      warm: {
        name: '暖色',
        nameEn: 'Warm',
        icon: '☀️',
        filters: {
          brightness: 100,
          contrast: 100,
          saturate: 105,
          warmth: 35
        },
        settings: {
          exposure: 0,
          contrast: 55,
          saturation: 60,
          warmth: 40
        }
      }
    };
  }

  /**
   * 記錄使用者喜歡的參數組合
   * @param {Object} context - 拍攝情境（食物類型、光線條件等）
   * @param {Object} settings - 使用者調整後的參數
   * @param {Object} filters - 應用的濾鏡參數
   * @param {Object} options - 額外選項（模式、手動調整等）
   */
  recordPreference(context, settings, filters, options = {}) {
    if (!this.preferences.learningEnabled) return;

    const preference = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      context: {
        objectType: context.objectType || 'unknown',
        brightness: context.brightness || 0,
        colorTemp: context.colorTemp || 0,
        isBacklit: context.isBacklit || false,
        isLowLight: context.isLowLight || false,
        // 增強情境信息
        saturation: context.saturation || 50,
        isWarmTone: context.isWarmTone || false,
        isCoolTone: context.isCoolTone || false,
        colorVibrancy: context.colorVibrancy || 'medium'
      },
      settings: { ...settings },
      filters: { ...filters },
      // 記錄完整參數狀態
      mode: options.mode || 'normal',
      manualAdjustments: options.manualAdjustments || { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
      zoom: options.zoom || 1,
      isLiked: options.isLiked || false, // 用戶明確標記為喜歡
      usageCount: 1,
      lastUsed: new Date().toISOString()
    };

    // 如果用戶明確標記為喜歡，給予更高權重
    const weight = preference.isLiked ? 3 : 1;

    // 檢查是否有相似的偏好
    const similar = this.findSimilarPreference(context);
    if (similar) {
      // 更新現有偏好（加權平均）
      similar.settings = this.mergeSettings(similar.settings, settings, similar.usageCount, weight);
      similar.filters = this.mergeFilters(similar.filters, filters, similar.usageCount, weight);
      similar.usageCount += weight;
      similar.lastUsed = new Date().toISOString();
      // 如果用戶標記為喜歡，更新標記
      if (preference.isLiked) {
        similar.isLiked = true;
      }
      // 更新模式和其他參數（使用最新值）
      if (options.mode) similar.mode = options.mode;
      if (options.manualAdjustments) {
        similar.manualAdjustments = this.mergeFilters(
          similar.manualAdjustments || { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
          options.manualAdjustments,
          similar.usageCount,
          weight
        );
      }
    } else {
      // 添加新偏好
      this.preferences.userPreferences.push(preference);
      
      // 限制偏好數量（保留最常用的 100 個，因為現在記錄更多信息）
      if (this.preferences.userPreferences.length > 100) {
        this.preferences.userPreferences.sort((a, b) => {
          // 優先保留被標記為喜歡的
          if (a.isLiked && !b.isLiked) return -1;
          if (!a.isLiked && b.isLiked) return 1;
          return b.usageCount - a.usageCount;
        });
        this.preferences.userPreferences = this.preferences.userPreferences.slice(0, 100);
      }
    }

    this.savePreferences();
    console.log('✅ Preference recorded:', preference);
    return preference;
  }

  /**
   * 找到相似的偏好設定
   */
  findSimilarPreference(context) {
    const threshold = 0.7; // 相似度閾值
    
    for (const pref of this.preferences.userPreferences) {
      const similarity = this.calculateSimilarity(pref.context, context);
      if (similarity >= threshold) {
        return pref;
      }
    }
    
    return null;
  }

  /**
   * 計算情境相似度（增強版）
   */
  calculateSimilarity(context1, context2) {
    let score = 0;
    let factors = 0;

    // 食物類型匹配（最重要）
    if (context1.objectType === context2.objectType) {
      score += 0.35;
    }
    factors += 0.35;

    // 光線條件相似度
    const brightnessDiff = Math.abs((context1.brightness || 0) - (context2.brightness || 0));
    const brightnessScore = Math.max(0, 1 - brightnessDiff / 120);
    score += brightnessScore * 0.15;
    factors += 0.15;

    // 色溫相似度
    const tempDiff = Math.abs((context1.colorTemp || 0) - (context2.colorTemp || 0));
    const tempScore = Math.max(0, 1 - tempDiff / 60);
    score += tempScore * 0.15;
    factors += 0.15;

    // 飽和度相似度（新增）
    const satDiff = Math.abs((context1.saturation || 50) - (context2.saturation || 50));
    const satScore = Math.max(0, 1 - satDiff / 100);
    score += satScore * 0.1;
    factors += 0.1;

    // 色調相似度（新增）
    if (context1.isWarmTone === context2.isWarmTone) score += 0.05;
    if (context1.isCoolTone === context2.isCoolTone) score += 0.05;
    factors += 0.1;

    // 特殊條件匹配
    if (context1.isBacklit === context2.isBacklit) score += 0.05;
    if (context1.isLowLight === context2.isLowLight) score += 0.05;
    factors += 0.1;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * 合併設定（加權平均）
   */
  mergeSettings(oldSettings, newSettings, oldWeight, newWeight) {
    const totalWeight = oldWeight + newWeight;
    const merged = { ...oldSettings };

    for (const key in newSettings) {
      if (typeof newSettings[key] === 'number') {
        merged[key] = (oldSettings[key] * oldWeight + newSettings[key] * newWeight) / totalWeight;
      } else {
        merged[key] = newSettings[key];
      }
    }

    return merged;
  }

  /**
   * 合併濾鏡（加權平均）
   */
  mergeFilters(oldFilters, newFilters, oldWeight, newWeight) {
    const totalWeight = oldWeight + newWeight;
    const merged = { ...oldFilters };

    for (const key in newFilters) {
      if (typeof newFilters[key] === 'number') {
        merged[key] = Math.round(
          (oldFilters[key] * oldWeight + newFilters[key] * newWeight) / totalWeight
        );
      } else {
        merged[key] = newFilters[key];
      }
    }

    return merged;
  }

  /**
   * 根據情境自動應用偏好參數（增強版）
   * @param {Object} context - 當前拍攝情境
   * @param {Object} baseSettings - 基礎 AI 建議的參數
   * @returns {Object} 應用偏好後的參數
   */
  applyPreference(context, baseSettings) {
    if (!this.preferences.learningEnabled) {
      return { settings: baseSettings, filters: null, source: 'ai' };
    }

    // 增強 context 以匹配記錄的格式
    const enhancedContext = {
      objectType: context.objectType || 'unknown',
      brightness: context.brightness || 0,
      colorTemp: context.colorTemp || 0,
      isBacklit: context.isBacklit || false,
      isLowLight: context.isLowLight || false,
      saturation: context.saturation || 50,
      isWarmTone: context.isWarmTone || false,
      isCoolTone: context.isCoolTone || false,
      colorVibrancy: context.colorVibrancy || 'medium'
    };

    const preference = this.findSimilarPreference(enhancedContext);
    
    if (preference) {
      // 根據偏好權重調整混合比例
      // 如果用戶明確標記為喜歡，使用更高權重（80% 使用者偏好）
      // 否則使用標準權重（70% 使用者偏好）
      const userWeight = preference.isLiked ? 8 : 7;
      const aiWeight = preference.isLiked ? 2 : 3;
      
      const settings = this.mergeSettings(preference.settings, baseSettings, userWeight, aiWeight);
      const filters = preference.filters;
      
      console.log('🎯 Applying user preference:', {
        id: preference.id,
        isLiked: preference.isLiked,
        usageCount: preference.usageCount,
        mode: preference.mode
      });
      
      return { 
        settings, 
        filters, 
        source: 'user', 
        preferenceId: preference.id,
        isLiked: preference.isLiked,
        mode: preference.mode,
        manualAdjustments: preference.manualAdjustments
      };
    }

    return { settings: baseSettings, filters: null, source: 'ai' };
  }

  /**
   * 取得所有模式
   */
  getModes() {
    return this.preferences.modePresets;
  }

  /**
   * 取得特定模式的參數
   */
  getModeParams(modeId) {
    return this.preferences.modePresets[modeId] || this.preferences.modePresets.normal;
  }

  /**
   * 啟用/停用學習功能
   */
  setLearningEnabled(enabled) {
    this.preferences.learningEnabled = enabled;
    this.savePreferences();
  }

  /**
   * 清除所有偏好記錄
   */
  clearPreferences() {
    this.preferences.userPreferences = [];
    this.savePreferences();
  }

  /**
   * 取得偏好統計
   */
  getStats() {
    return {
      totalPreferences: this.preferences.userPreferences.length,
      mostUsed: this.preferences.userPreferences
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5),
      learningEnabled: this.preferences.learningEnabled
    };
  }
}

// 創建單例
const preferenceService = new PreferenceService();

export default preferenceService;

