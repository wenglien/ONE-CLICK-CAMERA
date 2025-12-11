/**
 * Food Photo Analysis Service
 * 用於調用 Vision AI 進行食物分析
 */

class FoodPhotoService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isVercel = window.location.hostname.includes('vercel.app');
    this.proxyUrl = process.env.REACT_APP_VISION_PROXY_URL || '';
    
    console.log('Food Photo Service Initialized');
  }

  /**
   * Analyze food photo - use vision AI
   * @param {string} imageBase64 - Base64 encoded image data
   * @param {string} language - User language preference ('zh-TW' or 'en')
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeFoodPhoto(imageBase64, language = 'zh-TW') {
    try {
      console.log('📸 Starting food photo analysis...');
      
      // Build appropriate language prompt
      const prompt = this.buildPrompt(language);
      
      // Call vision AI API
      const response = await this.callVisionAPI(imageBase64, prompt);
      
      // Parse AI response
      return this.parseAnalysisResult(response);
    } catch (error) {
      console.error('Food photo analysis error:', error);
      throw new Error('Failed to analyze food photo');
    }
  }

  /**
   * Build analysis prompt
   * @param {string} language - 語言
   */
  buildPrompt(language) {
    if (language === 'zh-TW') {
      return `請仔細分析這張食物照片：
1. 識別這是什麼食物
2. 描述這道食物的特點
3. 根據這個具體食物的特性，提供專業的攝影建議讓它看起來更美味

請用繁體中文回覆，並使用 JSON 格式。`;
    }
    
    return `Please analyze this food photo carefully:
1. Identify what food this is
2. Describe the characteristics of this dish
3. Based on this specific food's characteristics, provide professional photography tips to make it look more appetizing

Please respond in English using JSON format.`;
  }

  /**
   * Call vision AI API
   * @param {string} imageBase64 - Base64 image data
   * @param {string} prompt - Analysis prompt
   */
  async callVisionAPI(imageBase64, prompt) {
    try {
      // Use external proxy if configured
      if (this.proxyUrl) {
        return await this.callViaExternalProxy(imageBase64, prompt);
      }
      
      // Use internal vision proxy
      return await this.callViaVisionProxy(imageBase64, prompt);
    } catch (error) {
      console.error('Vision API call error:', error);
      throw error;
    }
  }

  /**
   * Call vision AI API via internal proxy
   */
  async callViaVisionProxy(imageBase64, prompt) {
    try {
      console.log('Calling Vision AI proxy for food analysis...');
      
      const endpoint = '/api/vision-proxy';
      
      const requestBody = {
        image: imageBase64,
        prompt: prompt,
        metadata: {
          type: 'food_photo_analysis',
          timestamp: new Date().toISOString()
        }
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Vision API error:', data);
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }
      
      if (data.fallback) {
        console.log('Using fallback analysis (vision model unavailable)');
      } else {
        console.log('Vision analysis successful!');
      }
      
      return data.response;
    } catch (error) {
      console.error('Vision proxy error:', error);
      throw error;
    }
  }

  /**
   * Call vision AI API via external proxy
   */
  async callViaExternalProxy(imageBase64, prompt) {
    try {
      console.log('🔄 Calling external Vision AI proxy...');
      
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageBase64,
          prompt: prompt,
          metadata: {
            type: 'food_photo_analysis'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.result || '';
    } catch (error) {
      console.error('External vision proxy error:', error);
      throw error;
    }
  }

  /**
   * Parse AI response
   * @param {string} response - AI response text
   */
  parseAnalysisResult(response) {
    try {
      // Try to extract JSON from response
      let jsonStr = response;
      
      // If response contains markdown code block, extract JSON from it
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Try to find JSON object
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
      
      // Try to parse as JSON
      const result = JSON.parse(jsonStr);
      
      // Ensure all necessary fields exist
      return {
        foodName: result.foodName || result.food_name || result.name || '未識別的食物',
        description: result.description || result.desc || '',
        confidence: Math.min(95, Math.max(50, result.confidence || 80)),
        tips: {
          lighting: result.tips?.lighting || result.tips?.light || result.lighting || '',
          angle: result.tips?.angle || result.angle || '',
          composition: result.tips?.composition || result.tips?.styling || result.composition || '',
          extra: result.tips?.extra || result.tips?.additional || result.extra || ''
        }
      };
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', parseError);
      
      // If cannot parse as JSON, try to extract information from text
      return this.extractFromText(response);
    }
  }

  /**
   * Extract analysis result from pure text
   * @param {string} text - Original text response
   */
  extractFromText(text) {
    // Try to identify food name - find common keywords
    let foodName = '美味佳餚';
    const namePatterns = [
      /(?:這是|這道|識別為|食物是|看起來是|這份)[\s：:]*[「"']?([^」"'\n,，。]+)[」"']?/,
      /(?:food|dish|this is|identified as)[\s:]*["']?([^"'\n,]+)["']?/i,
      /^([^，。,.\n]{2,15})(?:，|。|,|\.|\n)/
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        foodName = match[1].trim();
        break;
      }
    }

    // Extract description
    let description = '';
    const descMatch = text.match(/(?:描述|特點|特色|description)[\s：:]*([^\n]+)/i);
    if (descMatch) {
      description = descMatch[1].trim();
    } else {
      // Take first paragraph as description
      const firstPara = text.split('\n').find(line => line.trim().length > 20);
      if (firstPara) {
        description = firstPara.trim().slice(0, 150);
      }
    }

    // Extract various suggestions
    const tips = {
      lighting: this.extractTip(text, ['光線', '燈光', 'lighting', 'light']),
      angle: this.extractTip(text, ['角度', 'angle', '視角']),
      composition: this.extractTip(text, ['構圖', '擺設', 'composition', 'styling', '擺盤']),
      extra: this.extractTip(text, ['技巧', '建議', 'tips', '額外', 'additional', 'pro tip'])
    };

    // If no suggestions extracted, provide generic suggestions
    if (!tips.lighting && !tips.angle && !tips.composition && !tips.extra) {
      return this.getDefaultResult(foodName, description);
    }

    return {
      foodName,
      description: description || `這是一道${foodName}`,
      confidence: 75,
      tips
    };
  }

  /**
   * Extract specific type of suggestions from text
   */
  extractTip(text, keywords) {
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}[\\s：:：]*([^\\n]+)`, 'i');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  /**
   * Get default result (when completely unable to parse)
   */
  getDefaultResult(foodName = '美食', description = '') {
    return {
      foodName: foodName,
      description: description || '這看起來是一道精心準備的美食。',
      confidence: 70,
      tips: {
        lighting: '建議使用自然光從側面45度角照射，創造出柔和的陰影增加立體感。避免使用直射的閃光燈，會造成過度反光。',
        angle: '嘗試45度角拍攝，這是最經典的食物攝影角度，可以同時展示食物的頂部和側面細節。也可以嘗試俯拍（90度）來展示整體擺盤。',
        composition: '使用三分法構圖，將主體放在畫面的交叉點上。添加一些配角道具如餐具、餐巾、調味料來豐富畫面層次。',
        extra: '拍攝前確保食物擺盤整齊美觀，可以用噴霧瓶輕噴一些水霧讓食物看起來更加新鮮有光澤。趁熱拍攝可以捕捉蒸氣效果。'
      }
    };
  }

  /**
   * Compress image to reduce transmission size
   * @param {string} imageBase64 - Original base64 image data
   * @param {number} maxWidth - Maximum width
   * @param {number} quality - Image quality (0-1)
   */
  async compressImage(imageBase64, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // If image is too large, resize it
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = imageBase64;
    });
  }
}

// Create singleton
const foodPhotoService = new FoodPhotoService();

export default foodPhotoService;

