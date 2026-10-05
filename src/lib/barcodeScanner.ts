import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

export interface BarcodeProduct {
  found: boolean;
  source?: string;
  barcode: string;
  productName: string;
  brand?: string;
  servingSize: string;
  servingQuantity: number;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  imageUrl?: string | null;
  ingredients?: string[];
  nutriscore?: string | null;
}

// Popular food barcodes for fast testing on desktop/emulator without physical barcodes
export const SAMPLE_BARCODE_PRESETS = [
  {
    name: 'Coca-Cola (330ml Can)',
    barcode: '5449000000996',
    brand: 'Coca-Cola',
    calories: 139,
    protein: 0,
    carbs: 35,
    fat: 0,
    servingSize: '1 can (330 ml)',
    icon: '🥤',
  },
  {
    name: 'Nutella Hazelnut Spread',
    barcode: '3017620422003',
    brand: 'Ferrero',
    calories: 81,
    protein: 1,
    carbs: 9,
    fat: 5,
    servingSize: '1 tbsp (15 g)',
    icon: '🍫',
  },
  {
    name: 'Quaker Rolled Oats',
    barcode: '5000108011244',
    brand: 'Quaker',
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    servingSize: '40 g portion',
    icon: '🥣',
  },
  {
    name: 'Snickers Chocolate Bar',
    barcode: '5000159461122',
    brand: 'Mars',
    calories: 241,
    protein: 4,
    carbs: 29,
    fat: 12,
    servingSize: '1 bar (48 g)',
    icon: '🍬',
  },
  {
    name: 'Barilla Spaghetti n.5',
    barcode: '8076809513753',
    brand: 'Barilla',
    calories: 359,
    protein: 12,
    carbs: 71,
    fat: 2,
    servingSize: '100 g dry',
    icon: '🍝',
  },
  {
    name: 'Greek Yogurt 0% Fat',
    barcode: '5201051000030',
    brand: 'FAGE Total',
    calories: 100,
    protein: 18,
    carbs: 6,
    fat: 0,
    servingSize: '1 cup (170 g)',
    icon: '🥛',
  },
];

// Reusable ZXing MultiFormat reader configured with standard retail barcode formats
let zxingReaderInstance: BrowserMultiFormatReader | null = null;

function getZxingReader(): BrowserMultiFormatReader {
  if (!zxingReaderInstance) {
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    zxingReaderInstance = new BrowserMultiFormatReader(hints);
  }
  return zxingReaderInstance;
}

/**
 * Audio beep and haptic feedback on successful barcode recognition
 */
export function playBarcodeBeep(): void {
  try {
    if (typeof window !== 'undefined') {
      // Haptic vibration on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate?.(120);
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 clear chime
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      }
    }
  } catch (err) {
    // Ignore audio permission/context errors gracefully
  }
}

/**
 * Scans a live video element using hardware accelerated BarcodeDetector if available,
 * falling back to @zxing/library.
 */
export async function detectBarcodeInVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < 2) return null;

  // 1. Hardware accelerated native BarcodeDetector API (Chromium / Android / Edge)
  if ('BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // BarcodeDetector failed, proceed to ZXing fallback
    }
  }

  // 2. ZXing fallback using canvas capture and binary bitmap
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const luminanceSource = new RGBLuminanceSource(
      imgData.data,
      canvas.width,
      canvas.height
    );
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    const reader = getZxingReader();
    const result = reader.decodeBitmap(binaryBitmap);
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch {
    // No barcode found in current frame
  }

  return null;
}

/**
 * Decodes barcode from an image element or base64 data URL
 */
export async function detectBarcodeInImage(imageSource: string | HTMLImageElement): Promise<string | null> {
  // 1. Try native BarcodeDetector if supported
  if ('BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });

      let imgEl: HTMLImageElement;
      if (typeof imageSource === 'string') {
        imgEl = await loadImageElement(imageSource);
      } else {
        imgEl = imageSource;
      }

      const barcodes = await detector.detect(imgEl);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // Fallback to ZXing
    }
  }

  // 2. Try ZXing BrowserMultiFormatReader
  try {
    const reader = getZxingReader();
    let result;
    if (typeof imageSource === 'string') {
      result = await reader.decodeFromImageUrl(imageSource);
    } else {
      result = await reader.decodeFromImageElement(imageSource);
    }
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch {
    // Not found with ZXing
  }

  return null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Looks up detailed nutritional data for a barcode via server / Open Food Facts API
 */
export async function lookupBarcodeProduct(barcode: string): Promise<BarcodeProduct> {
  const cleanCode = barcode.replace(/[^0-9A-Za-z]/g, '').trim();
  if (!cleanCode) {
    throw new Error('Invalid barcode specified');
  }

  try {
    const response = await fetch(`/api/lookup-barcode/${encodeURIComponent(cleanCode)}`);
    if (!response.ok) {
      throw new Error(`Barcode lookup failed with status: ${response.status}`);
    }
    const data = await response.json();
    return data as BarcodeProduct;
  } catch (err: any) {
    console.warn('Server lookup failed, trying direct Open Food Facts fetch fallback:', err);
    // Direct client fallback to Open Food Facts in case backend proxy had an issue
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`);
      if (offRes.ok) {
        const offData = await offRes.json();
        if (offData.status === 1 && offData.product) {
          const p = offData.product;
          const nutriments = p.nutriments || {};
          const kcal100 = Math.round(Number(nutriments['energy-kcal_100g'] ?? 0));
          const p100 = Math.round(Number(nutriments.proteins_100g ?? 0));
          const c100 = Math.round(Number(nutriments.carbohydrates_100g ?? 0));
          const f100 = Math.round(Number(nutriments.fat_100g ?? 0));
          return {
            found: true,
            source: 'openfoodfacts-direct',
            barcode: cleanCode,
            productName: p.product_name || p.product_name_en || 'Packaged Product',
            brand: p.brands || '',
            servingSize: p.serving_size || '100g',
            servingQuantity: 100,
            per100g: { calories: kcal100, protein: p100, carbs: c100, fat: f100 },
            perServing: { calories: kcal100, protein: p100, carbs: c100, fat: f100 },
            imageUrl: p.image_front_url || null,
            ingredients: p.ingredients_text ? [p.ingredients_text] : [],
            nutriscore: p.nutriscore_grade ? String(p.nutriscore_grade).toUpperCase() : null,
          };
        }
      }
    } catch {
      // ignore
    }

    // Graceful offline fallback
    return {
      found: false,
      barcode: cleanCode,
      productName: `Scanned Item #${cleanCode}`,
      brand: 'Packaged Food',
      servingSize: '1 serving (100g)',
      servingQuantity: 100,
      per100g: { calories: 220, protein: 5, carbs: 28, fat: 8 },
      perServing: { calories: 220, protein: 5, carbs: 28, fat: 8 },
      imageUrl: null,
      ingredients: ['Standard ingredients'],
      nutriscore: null,
    };
  }
}

/**
 * Scans a food package photo directly with Gemini Vision if standard barcode decoding was blurred/obstructed
 */
export async function scanBarcodeImageWithAI(base64Image: string): Promise<{
  barcode: string | null;
  productName: string;
  brand: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}> {
  const response = await fetch('/api/scan-barcode-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze barcode image');
  }

  return response.json();
}
