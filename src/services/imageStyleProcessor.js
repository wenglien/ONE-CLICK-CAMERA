/**
 * 像素級圖像處理引擎 - 穩定版
 * 使用 Image 物件而非直接傳遞 canvas 來避免數據丟失問題
 */

// 工具函數：限制值在 0-255 之間
const clamp = (value, min = 0, max = 255) => Math.max(min, Math.min(max, value));

// 5 種預設風格
export const STYLE_PRESETS = [
    {
        id: 'japanese-fresh',
        name: '日系清新',
        nameEn: 'Japanese Fresh',
        brightness: 1.1,
        contrast: 0.95,
        saturation: 0.9,
        warmth: 8,
    },
    {
        id: 'cinematic-teal-orange',
        name: '電影感 Teal&Orange',
        nameEn: 'Cinematic Teal&Orange',
        brightness: 0.98,
        contrast: 1.15,
        saturation: 1.05,
        warmth: 5,
    },
    {
        id: 'vintage-film',
        name: '底片復古',
        nameEn: 'Vintage Film',
        brightness: 1.03,
        contrast: 1.0,
        saturation: 0.92,
        warmth: 12,
    },
    {
        id: 'bw-hard',
        name: '黑白硬派',
        nameEn: 'B&W Hard',
        brightness: 0.98,
        contrast: 1.25,
        saturation: 0.0,
        warmth: 0,
    },
    {
        id: 'cool-blue',
        name: '冷冽藍調',
        nameEn: 'Cool Blue',
        brightness: 0.95,
        contrast: 1.12,
        saturation: 0.98,
        warmth: -12,
    }
];

/**
 * 從 dataURL 創建 Image 物件
 */
const loadImageFromDataURL = (dataURL) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataURL;
    });
};

/**
 * 應用風格到圖像數據
 */
const applyStyleToImageData = (imageData, style) => {
    const data = new Uint8ClampedArray(imageData.data);
    const length = data.length;

    for (let i = 0; i < length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 亮度調整
        r *= style.brightness;
        g *= style.brightness;
        b *= style.brightness;

        // 對比度調整  
        r = 128 + (r - 128) * style.contrast;
        g = 128 + (g - 128) * style.contrast;
        b = 128 + (b - 128) * style.contrast;

        // 飽和度調整
        if (style.saturation !== 1.0) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * style.saturation;
            g = gray + (g - gray) * style.saturation;
            b = gray + (b - gray) * style.saturation;
        }

        // 色溫調整
        if (style.warmth && style.warmth !== 0) {
            r += style.warmth;
            b -= style.warmth;
        }

        // Clamp
        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
    }

    return new ImageData(data, imageData.width, imageData.height);
};

/**
 * Yield control back to the event loop via MessageChannel (zero-delay, higher priority than setTimeout)
 */
const yieldToMain = () => new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = resolve;
    channel.port2.postMessage(undefined);
});

/**
 * 批次處理圖像風格 - 使用 dataURL 作為輸入（更穩定）
 * @param {string} imageDataURL - base64 圖像數據
 * @param {Array} styles - 風格陣列
 * @param {Number} maxWidth - 處理最大寬度
 * @param {Function} onProgress - 進度回調
 */
export const batchProcessStyles = async (sourceCanvas, styles = STYLE_PRESETS, maxWidth = 960, onProgress = null) => {
    const results = [];

    console.log('📸 Starting batch processing...');

    try {
        // 先將 canvas 轉為 dataURL，確保數據被正確保存
        const imageDataURL = sourceCanvas.toDataURL('image/jpeg', 0.95);
        console.log('📷 Created dataURL, length:', imageDataURL.length);

        if (imageDataURL.length < 1000) {
            console.error('❌ DataURL too short, likely empty image');
            return results;
        }

        // 從 dataURL 創建 Image 物件
        const img = await loadImageFromDataURL(imageDataURL);
        console.log('🖼️ Loaded image:', img.width, 'x', img.height);

        // 計算處理尺寸
        const scale = Math.min(1, maxWidth / img.width);
        const processWidth = Math.round(img.width * scale);
        const processHeight = Math.round(img.height * scale);

        // 創建處理用的 canvas
        const processCanvas = document.createElement('canvas');
        processCanvas.width = processWidth;
        processCanvas.height = processHeight;
        const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
        processCtx.drawImage(img, 0, 0, processWidth, processHeight);

        // 獲取圖像數據
        const sourceImageData = processCtx.getImageData(0, 0, processWidth, processHeight);
        console.log('📊 Source image data ready:', processWidth, 'x', processHeight);

        // 檢查是否有實際內容
        let hasContent = false;
        for (let i = 0; i < Math.min(1000, sourceImageData.data.length); i += 4) {
            if (sourceImageData.data[i] > 10 || sourceImageData.data[i + 1] > 10 || sourceImageData.data[i + 2] > 10) {
                hasContent = true;
                break;
            }
        }

        if (!hasContent) {
            console.error('❌ Source image appears to be black!');
            // 嘗試直接使用 dataURL 作為結果
            for (const style of styles) {
                results.push({
                    style,
                    canvas: null,
                    blob: null,
                    url: imageDataURL  // 使用原始圖片
                });
            }
            return results;
        }

        // 逐個處理風格
        for (let i = 0; i < styles.length; i++) {
            const style = styles[i];
            console.log(`🎨 Processing ${i + 1}/${styles.length}: ${style.name}`);

            try {
                // 應用風格
                const processedImageData = applyStyleToImageData(sourceImageData, style);

                // 創建輸出 canvas
                const outputCanvas = document.createElement('canvas');
                outputCanvas.width = processWidth;
                outputCanvas.height = processHeight;
                const outputCtx = outputCanvas.getContext('2d');
                outputCtx.putImageData(processedImageData, 0, 0);

                // 轉換為 Blob
                const blob = await new Promise(resolve => {
                    outputCanvas.toBlob(resolve, 'image/jpeg', 0.92);
                });

                if (blob) {
                    const url = URL.createObjectURL(blob);
                    results.push({
                        style,
                        canvas: outputCanvas,
                        blob,
                        url
                    });
                    console.log(`✅ ${style.name} done`);
                } else {
                    // 如果 blob 創建失敗，使用 dataURL
                    const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.92);
                    results.push({
                        style,
                        canvas: outputCanvas,
                        blob: null,
                        url: dataUrl
                    });
                    console.log(`⚠️ ${style.name} done (dataURL fallback)`);
                }

                if (onProgress) {
                    onProgress(((i + 1) / styles.length) * 100, style.name);
                }

                // 讓出執行權給主執行緒（MessageChannel 比 setTimeout 更即時）
                await yieldToMain();

            } catch (err) {
                console.error(`❌ Error processing ${style.name}:`, err);
            }
        }

        console.log(`✅ Batch complete. Generated ${results.length} styles`);

    } catch (error) {
        console.error('❌ Batch processing error:', error);
    }

    return results;
};

/**
 * 清理 Blob URLs
 */
export const cleanupBlobUrls = (results) => {
    if (!results) return;
    results.forEach(result => {
        if (result && result.url && result.url.startsWith('blob:')) {
            URL.revokeObjectURL(result.url);
        }
    });
};

export default {
    STYLE_PRESETS,
    batchProcessStyles,
    cleanupBlobUrls
};
