import Compressor from 'compressorjs';

export interface ImageValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface WatermarkData {
  supermarketName: string;
  promoterName: string;
  timestamp: Date;
}

// Helper to load image to an HTMLImageElement
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar a imagem. O arquivo pode estar corrompido ou formato inválido.'));
    img.src = src;
  });
};

export const processImage = async (
  file: File, 
  data: WatermarkData
): Promise<{ blob: Blob; previewUrl: string }> => {
  // 1. Compress first to reduce memory usage and standardise size
  const compressedFile = await new Promise<File | Blob>((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      success: resolve,
      error: reject,
    });
  });

  const src = URL.createObjectURL(compressedFile);
  const img = await loadImage(src);

  // 2. Validate Image Quality
  const validation = validateImageQuality(img);
  if (!validation.isValid) {
    URL.revokeObjectURL(src);
    throw new Error(validation.reason);
  }

  // 3. Add Watermark
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = img.width;
  canvas.height = img.height;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Watermark Configuration - Top-Left Corner, 1/4 of Image Area (50% W x 50% H)
  const wmWidth = canvas.width * 0.5;
  const wmHeight = canvas.height * 0.5;
  const wmX = 0;
  const wmY = 0;

  // Draw Watermark Background (Semi-transparent black)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(wmX, wmY, wmWidth, wmHeight);

  // Text Configuration
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Dynamic font size based on image width
  const fontSize = Math.floor(canvas.width * 0.035); // ~3.5% of width
  const lineHeight = fontSize * 1.4;
  const padding = Math.floor(canvas.width * 0.03); // 3% padding

  let currentY = wmY + padding;

  // Helper to draw label and value
  const drawField = (label: string, value: string) => {
    // Label
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText(label, wmX + padding, currentY);
    currentY += lineHeight;

    // Value
    ctx.font = `${fontSize}px Arial`;
    // Use maxWidth to scale text if it exceeds the box width (minus padding)
    ctx.fillText(value, wmX + padding, currentY, wmWidth - (padding * 2));
    currentY += lineHeight * 1.5; // Extra spacing between fields
  };

  // 1. Date/Time
  const dateStr = data.timestamp.toLocaleDateString('pt-BR');
  const timeStr = data.timestamp.toLocaleTimeString('pt-BR');
  drawField("DATA / HORA:", `${dateStr} ${timeStr}`);

  // 2. PDV (Supermarket)
  drawField("PDV:", data.supermarketName);

  // 3. Promoter
  drawField("PROMOTOR:", data.promoterName);

  // Convert to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          previewUrl: canvas.toDataURL('image/jpeg', 0.8)
        });
      } else {
        reject(new Error('Canvas conversion failed'));
      }
    }, 'image/jpeg', 0.8);
  });
};

const validateImageQuality = (img: HTMLImageElement): ImageValidationResult => {
  const canvas = document.createElement('canvas');
  // Resize for faster analysis, but keep enough detail for blur detection
  // Increased from 100 to 300 to better detect blur
  const width = 300;
  const height = Math.floor((img.height / img.width) * width);
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return { isValid: true }; // Skip if context fails

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let totalLuminance = 0;
  let minLuminance = 255;
  let maxLuminance = 0;
  let darkPixelCount = 0;
  let brightPixelCount = 0;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    // RGB to Luminance (perceived brightness)
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    totalLuminance += luminance;
    if (luminance < minLuminance) minLuminance = luminance;
    if (luminance > maxLuminance) maxLuminance = luminance;
    
    // Count very dark pixels (< 30)
    if (luminance < 30) darkPixelCount++;
    // Count very bright pixels (> 230)
    if (luminance > 230) brightPixelCount++;
  }

  const avgLuminance = totalLuminance / totalPixels;
  const darkRatio = darkPixelCount / totalPixels;
  const brightRatio = brightPixelCount / totalPixels;

  console.log(`[ImageValidation] Brightness Stats: Avg=${avgLuminance.toFixed(2)}, DarkRatio=${(darkRatio*100).toFixed(1)}%, BrightRatio=${(brightRatio*100).toFixed(1)}%`);

  // 1. Check Brightness (Dark/Light)
  // Stricter check: Average < 50 OR more than 50% of pixels are very dark
  if (avgLuminance < 50 || darkRatio > 0.5) {
    return { isValid: false, reason: 'A foto está muito escura. Procure um local mais iluminado ou use o flash.' };
  }
  
  if (avgLuminance > 230 || brightRatio > 0.6) {
    return { isValid: false, reason: 'A foto está muito clara (estourada). Evite luz direta forte ou reflexos.' };
  }

  // 2. Check Blur (Edge Detection Variance)
  // Simple Laplacian edge detection approximation
  let edgeScore = 0;
  // Iterate excluding borders
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const iLeft = (y * width + (x - 1)) * 4;
        const iRight = (y * width + (x + 1)) * 4;
        const iUp = ((y - 1) * width + x) * 4;
        const iDown = ((y + 1) * width + x) * 4;

        // Using green channel for edge detection (usually best detail)
        const val = data[i + 1]; 
        const valLeft = data[iLeft + 1];
        const valRight = data[iRight + 1];
        const valUp = data[iUp + 1];
        const valDown = data[iDown + 1];

        // Laplacian kernel [0, -1, 0, -1, 4, -1, 0, -1, 0]
        const laplacian = Math.abs(4 * val - valLeft - valRight - valUp - valDown);
        edgeScore += laplacian;
    }
  }
  const avgEdge = edgeScore / Math.max(1, (width - 2) * (height - 2));
  
  console.log(`[ImageValidation] Blur Score (Avg Edge): ${avgEdge.toFixed(2)}`);
  
  // Threshold for blur
  // With higher resolution (300px), we expect higher edge scores for sharp images.
  // Blurry images will have low edge scores.
  // Adjusted threshold to 5 based on user feedback (11 was triggering false positives).
  // Very sharp images often > 20-30. Blurry often < 5-8.
  // Also check if avgEdge is NaN (can happen with very small images), treat as valid to avoid blocking
  if (!isNaN(avgEdge) && avgEdge < 5) {
      return { isValid: false, reason: 'A foto parece borrada ou fora de foco. Por favor, tente novamente segurando o celular com firmeza.' };
  }

  return { isValid: true };
};
