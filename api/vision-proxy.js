/**
 * Vision AI Proxy - 使用 Google Gemini 視覺模型
 * 用於食物辨識和拍攝建議
 * 
 * 此檔案用於 Vercel Serverless Functions
 * 部署時請設定環境變數 GEMINI_API_KEY
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
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
};
