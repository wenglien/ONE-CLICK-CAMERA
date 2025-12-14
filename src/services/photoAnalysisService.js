class PhotoAnalysisService {
  constructor() {
    this.proxyUrl = process.env.REACT_APP_VISION_PROXY_URL || '';
  }

  async analyzePhoto(imageBase64, metadata = {}, language = 'zh-TW') {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    try {
      const compressedImage = await this.compressImage(imageBase64, 600, 0.5);
      const prompt = this.buildAnalysisPrompt(metadata, language);
      const response = await this.callAnalysisAPI(compressedImage, prompt, requestId);
      const result = this.parseAnalysisResult(response);
      result._source = 'ai';
      result._requestId = requestId;
      return result;
    } catch (error) {
      console.error(`Photo analysis error [${requestId}]:`, error.message);
      const fallback = this.getDefaultSuggestions(language);
      fallback._source = 'fallback';
      fallback._error = error.message;
      fallback._requestId = requestId;
      return fallback;
    }
  }

  buildAnalysisPrompt(metadata, language) {
    const currentSettings = metadata.filters ? 
      `目前的拍攝設定：亮度 ${metadata.filters.brightness}%，對比度 ${metadata.filters.contrast}%，飽和度 ${metadata.filters.saturate}%，色溫 ${metadata.filters.warmth > 0 ? '+' : ''}${metadata.filters.warmth}` : 
      '';

    if (language === 'zh-TW') {
      return `你是一位專業的食物攝影指導師。請分析這張食物照片，並提供具體的改進建議。

${currentSettings}

請從以下幾個方面分析並給出建議：

1. **拍攝角度分析**：
   - 評估目前的拍攝角度
   - 建議更好的角度（如：45度俯拍、正俯拍、平視等）
   - 說明為什麼這個角度更適合這道食物

2. **色調與曝光分析**：
   - 評估目前的亮度、對比度、飽和度
   - 具體建議應該調整多少（例如：亮度+10%，飽和度-5%）
   - 色溫是否需要調整（偏暖或偏冷）

3. **構圖建議**：
   - 目前構圖的優缺點
   - 如何改進構圖（如：留白、重心位置等）

4. **整體評分**：給這張照片 1-100 分

請用 JSON 格式回覆：
{
  "overallScore": 75,
  "angleFeedback": {
    "current": "目前角度描述",
    "suggestion": "建議的角度",
    "reason": "原因說明"
  },
  "colorFeedback": {
    "brightness": { "current": "評估", "adjust": "+10" },
    "contrast": { "current": "評估", "adjust": "-5" },
    "saturation": { "current": "評估", "adjust": "0" },
    "warmth": { "current": "評估", "adjust": "+15" }
  },
  "compositionFeedback": {
    "current": "目前構圖評估",
    "suggestion": "改進建議"
  },
  "quickTips": ["快速提示1", "快速提示2", "快速提示3"],
  "encouragement": "正面鼓勵的話"
}`;
    }

    return `You are a professional food photography coach. Please analyze this food photo and provide specific improvement suggestions.

${currentSettings ? `Current settings: Brightness ${metadata.filters?.brightness}%, Contrast ${metadata.filters?.contrast}%, Saturation ${metadata.filters?.saturate}%, Warmth ${metadata.filters?.warmth > 0 ? '+' : ''}${metadata.filters?.warmth}` : ''}

Please analyze and provide suggestions on:

1. **Angle Analysis**: Current angle evaluation and better angle suggestions
2. **Color & Exposure Analysis**: Specific adjustments for brightness, contrast, saturation, warmth
3. **Composition Feedback**: Current composition pros/cons and improvement suggestions
4. **Overall Score**: Rate this photo 1-100

Respond in JSON format.`;
  }

  async callAnalysisAPI(imageBase64, prompt, requestId = 'unknown') {
    const endpoint = this.proxyUrl || '/api';
    
    const requestBody = {
      image: imageBase64,
      prompt: prompt,
      metadata: {
        type: 'photo_analysis',
        timestamp: new Date().toISOString(),
        requestId: requestId
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('請求超時，請檢查網路連線');
      }
      throw new Error(`網路錯誤: ${fetchError.message}`);
    }

    const rawText = await response.text();
    
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`API 返回格式錯誤: ${rawText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP ${response.status}`);
    }

    if (!data.response) {
      throw new Error('API 返回空回應');
    }

    return data.response;
  }

  parseAnalysisResult(response) {
    try {
      let jsonStr = response;

      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }

      const result = JSON.parse(jsonStr);

      return {
        overallScore: Math.min(100, Math.max(0, result.overallScore || 70)),
        angleFeedback: {
          current: result.angleFeedback?.current || '角度適中',
          suggestion: result.angleFeedback?.suggestion || '嘗試 45 度角拍攝',
          reason: result.angleFeedback?.reason || '可以展示更多食物細節'
        },
        colorFeedback: {
          brightness: {
            current: result.colorFeedback?.brightness?.current || '正常',
            adjust: this.parseAdjustment(result.colorFeedback?.brightness?.adjust)
          },
          contrast: {
            current: result.colorFeedback?.contrast?.current || '正常',
            adjust: this.parseAdjustment(result.colorFeedback?.contrast?.adjust)
          },
          saturation: {
            current: result.colorFeedback?.saturation?.current || '正常',
            adjust: this.parseAdjustment(result.colorFeedback?.saturation?.adjust)
          },
          warmth: {
            current: result.colorFeedback?.warmth?.current || '正常',
            adjust: this.parseAdjustment(result.colorFeedback?.warmth?.adjust)
          }
        },
        compositionFeedback: {
          current: result.compositionFeedback?.current || '構圖良好',
          suggestion: result.compositionFeedback?.suggestion || '可以嘗試三分法構圖'
        },
        quickTips: result.quickTips || ['保持相機穩定', '善用自然光', '注意背景整潔'],
        encouragement: result.encouragement || '很棒的嘗試！繼續練習會越來越好！'
      };
    } catch (error) {
      console.warn('Failed to parse analysis result:', error);
      return this.getDefaultSuggestions('zh-TW');
    }
  }

  parseAdjustment(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/[^-\d]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  getDefaultSuggestions(language) {
    return {
      overallScore: 75,
      angleFeedback: {
        current: '目前的拍攝角度還不錯',
        suggestion: '可以嘗試 45 度角俯拍',
        reason: '這個角度可以同時展示食物的頂部和側面，呈現更好的立體感'
      },
      colorFeedback: {
        brightness: { current: '適中', adjust: 5 },
        contrast: { current: '適中', adjust: 0 },
        saturation: { current: '適中', adjust: 10 },
        warmth: { current: '偏冷', adjust: 10 }
      },
      compositionFeedback: {
        current: '構圖基本合理',
        suggestion: '可以嘗試將主體放在畫面的三分之一處，並適當留白'
      },
      quickTips: [
        '使用自然光源可以讓食物看起來更新鮮',
        '保持相機與食物的適當距離',
        '注意背景的顏色搭配'
      ],
      encouragement: '你的拍攝已經很棒了！試試這些小調整，效果會更好！'
    };
  }

  async compressImage(imageBase64, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(imageBase64);
      img.src = imageBase64;
    });
  }

  generateAdjustmentPreset(colorFeedback) {
    return {
      brightness: colorFeedback.brightness.adjust,
      contrast: colorFeedback.contrast.adjust,
      saturation: colorFeedback.saturation.adjust,
      warmth: colorFeedback.warmth.adjust
    };
  }
}

const photoAnalysisService = new PhotoAnalysisService();

export default photoAnalysisService;
