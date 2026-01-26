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
    img.onerror = reject;
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

  // Add extra space at the bottom for the footer (e.g., 60px)
  const footerHeight = 80;
  canvas.width = img.width;
  canvas.height = img.height + footerHeight;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Draw Footer Background (Black)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, img.height, canvas.width, footerHeight);

  // Draw Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'middle';

  const dateStr = data.timestamp.toLocaleDateString('pt-BR');
  const timeStr = data.timestamp.toLocaleTimeString('pt-BR');
  
  // Left side: PDV
  ctx.textAlign = 'left';
  ctx.fillText(data.supermarketName.substring(0, 30), 20, img.height + footerHeight / 2);

  // Right side: Date/Time
  ctx.textAlign = 'right';
  ctx.fillText(`${dateStr} ${timeStr}`, canvas.width - 20, img.height + footerHeight / 2);
  
  // Center: Promoter (Optional, if space permits, or put below)
  // Let's put Promoter below PDV in smaller font if needed, or next to it.
  // For simplicity and space, let's keep it simple: "PDV | Promotor"
  //Novo Enerlight, promotor system 
  // Refined Layout:
  // Top Line in Footer: PDV Name
  // Bottom Line in Footer: Promotor | Data Hora
  
  // Clear footer to redraw better layout
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, img.height, canvas.width, footerHeight);
  
  const padding = 20;
  const lineHeight = 30;
  const startY = img.height + padding;
  
  ctx.fillStyle = '#FFFFFF';
  
  // Line 1: PDV Name (Bold, Larger)
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(data.supermarketName, padding, startY);

  // Line 2: Promotor - Data Hora (Regular, Smaller)
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${data.promoterName} • ${dateStr} ${timeStr}`, padding, startY + lineHeight);

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
  // Resize for faster analysis
  const width = 100;
  const height = (img.height / img.width) * width;
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

  for (let i = 0; i < data.length; i += 4) {
    // RGB to Luminance (perceived brightness)
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    totalLuminance += luminance;
    if (luminance < minLuminance) minLuminance = luminance;
    if (luminance > maxLuminance) maxLuminance = luminance;
  }

  const avgLuminance = totalLuminance / (data.length / 4);

  // 1. Check Brightness (Dark/Light)
  if (avgLuminance < 40) {
    return { isValid: false, reason: 'A foto está muito escura. Procure um local mais iluminado.' };
  }
  if (avgLuminance > 220) {
    return { isValid: false, reason: 'A foto está muito clara (estourada). Evite luz direta forte.' };
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
  const avgEdge = edgeScore / ((width - 2) * (height - 2));
  
  // Threshold for blur is tricky and depends on image content.
  // 15 is a conservative threshold for "very blurry". Sharp images usually > 50.
  if (avgEdge < 10) {
      return { isValid: false, reason: 'A foto parece borrada. Segure o celular com firmeza e foque no produto.' };
  }

  return { isValid: true };
};
