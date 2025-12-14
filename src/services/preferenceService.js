class PreferenceService {
  constructor() {
    this.storageKey = 'food_camera_preferences';
    this.preferences = this.loadPreferences();
  }

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
      userPreferences: [],
      modePresets: this.getDefaultModePresets(),
      learningEnabled: true
    };
  }

  savePreferences() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }

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
        saturation: context.saturation || 50,
        isWarmTone: context.isWarmTone || false,
        isCoolTone: context.isCoolTone || false,
        colorVibrancy: context.colorVibrancy || 'medium'
      },
      settings: { ...settings },
      filters: { ...filters },
      mode: options.mode || 'normal',
      manualAdjustments: options.manualAdjustments || { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
      zoom: options.zoom || 1,
      isLiked: options.isLiked || false,
      usageCount: 1,
      lastUsed: new Date().toISOString()
    };

    const weight = preference.isLiked ? 3 : 1;
    const similar = this.findSimilarPreference(context);
    
    if (similar) {
      similar.settings = this.mergeSettings(similar.settings, settings, similar.usageCount, weight);
      similar.filters = this.mergeFilters(similar.filters, filters, similar.usageCount, weight);
      similar.usageCount += weight;
      similar.lastUsed = new Date().toISOString();
      if (preference.isLiked) {
        similar.isLiked = true;
      }
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
      this.preferences.userPreferences.push(preference);
      
      if (this.preferences.userPreferences.length > 100) {
        this.preferences.userPreferences.sort((a, b) => {
          if (a.isLiked && !b.isLiked) return -1;
          if (!a.isLiked && b.isLiked) return 1;
          return b.usageCount - a.usageCount;
        });
        this.preferences.userPreferences = this.preferences.userPreferences.slice(0, 100);
      }
    }

    this.savePreferences();
    return preference;
  }

  findSimilarPreference(context) {
    const threshold = 0.7;
    
    for (const pref of this.preferences.userPreferences) {
      const similarity = this.calculateSimilarity(pref.context, context);
      if (similarity >= threshold) {
        return pref;
      }
    }
    
    return null;
  }

  calculateSimilarity(context1, context2) {
    let score = 0;
    let factors = 0;

    if (context1.objectType === context2.objectType) {
      score += 0.35;
    }
    factors += 0.35;

    const brightnessDiff = Math.abs((context1.brightness || 0) - (context2.brightness || 0));
    const brightnessScore = Math.max(0, 1 - brightnessDiff / 120);
    score += brightnessScore * 0.15;
    factors += 0.15;

    const tempDiff = Math.abs((context1.colorTemp || 0) - (context2.colorTemp || 0));
    const tempScore = Math.max(0, 1 - tempDiff / 60);
    score += tempScore * 0.15;
    factors += 0.15;

    const satDiff = Math.abs((context1.saturation || 50) - (context2.saturation || 50));
    const satScore = Math.max(0, 1 - satDiff / 100);
    score += satScore * 0.1;
    factors += 0.1;

    if (context1.isWarmTone === context2.isWarmTone) score += 0.05;
    if (context1.isCoolTone === context2.isCoolTone) score += 0.05;
    factors += 0.1;

    if (context1.isBacklit === context2.isBacklit) score += 0.05;
    if (context1.isLowLight === context2.isLowLight) score += 0.05;
    factors += 0.1;

    return factors > 0 ? score / factors : 0;
  }

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

  applyPreference(context, baseSettings) {
    if (!this.preferences.learningEnabled) {
      return { settings: baseSettings, filters: null, source: 'ai' };
    }

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
      const userWeight = preference.isLiked ? 8 : 7;
      const aiWeight = preference.isLiked ? 2 : 3;
      
      const settings = this.mergeSettings(preference.settings, baseSettings, userWeight, aiWeight);
      const filters = preference.filters;
      
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

  getModes() {
    return this.preferences.modePresets;
  }

  getModeParams(modeId) {
    return this.preferences.modePresets[modeId] || this.preferences.modePresets.normal;
  }

  setLearningEnabled(enabled) {
    this.preferences.learningEnabled = enabled;
    this.savePreferences();
  }

  clearPreferences() {
    this.preferences.userPreferences = [];
    this.savePreferences();
  }

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

const preferenceService = new PreferenceService();

export default preferenceService;
