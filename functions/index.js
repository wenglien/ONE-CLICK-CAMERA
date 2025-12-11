/**
 * Vision AI Proxy - 使用 Google Gemini 視覺模型
 * 用於食物辨識和拍攝建議
 * 
 * Firebase Cloud Functions v2
 * 使用 Gemini API
 * 
 * 環境變數設置：
 * firebase functions:secrets:set GEMINI_API_KEY
 */

const { onRequest } = require('firebase-functions/v2/https');

/**
 * Vision Proxy API - 處理食物照片分析請求
 */
exports.api = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '512MiB',
    // 聲明需要的密鑰
    secrets: ['GEMINI_API_KEY']
  },
  async (req, res) => {
    // 處理 CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { image, prompt } = req.body || {};
      
      if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
      }

      // 從環境變數獲取 API Key
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        console.error('GEMINI_API_KEY not configured');
        return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
      }

      // 處理 base64 圖像
      let imageBase64 = image;
      let mimeType = 'image/jpeg';
      if (image.includes('base64,')) {
        const parts = image.split('base64,');
        imageBase64 = parts[1];
        const mimeMatch = parts[0].match(/data:([^;]+);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      // 預設提示詞
      const userPrompt = prompt || `你是一位專業的食物攝影指導師。請仔細分析這張食物照片，並提供具體的改進建議。

請從以下幾個方面分析並給出建議：

1. **拍攝角度分析**：評估目前的拍攝角度，建議更好的角度
2. **色調與曝光分析**：評估亮度、對比度、飽和度，給出具體調整數值建議
3. **構圖建議**：目前構圖的優缺點及改進建議
4. **整體評分**：給這張照片 1-100 分

請用繁體中文回覆，並使用以下 JSON 格式：
{
  "overallScore": 75,
  "angleFeedback": {
    "current": "目前角度描述",
    "suggestion": "建議的角度",
    "reason": "原因說明"
  },
  "colorFeedback": {
    "brightness": { "current": "評估", "adjust": 10 },
    "contrast": { "current": "評估", "adjust": -5 },
    "saturation": { "current": "評估", "adjust": 0 },
    "warmth": { "current": "評估", "adjust": 15 }
  },
  "compositionFeedback": {
    "current": "目前構圖評估",
    "suggestion": "改進建議"
  },
  "quickTips": ["快速提示1", "快速提示2", "快速提示3"],
  "encouragement": "正面鼓勵的話"
}`;

      // 調用 Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: userPrompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            }
          })
        }
      );

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ response: responseText });
      }

      // 錯誤處理
      const errorText = await geminiResponse.text();
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorText;
      } catch (e) {}
      
      return res.status(500).json({ 
        error: 'Gemini API failed', 
        status: geminiResponse.status,
        details: errorDetails 
      });

    } catch (err) {
      console.error('Vision proxy error:', err);
      return res.status(500).json({ error: `Vision proxy error: ${err.message}` });
    }
  }
);
