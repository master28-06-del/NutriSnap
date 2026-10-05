import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  Check,
  Flame,
  Bookmark,
  Salad,
  ScanBarcode,
  Mic,
} from 'lucide-react';
import { analyzeMealImage, analyzeIngredients, analyzeSpokenMeal, analyzeVoiceAudio, MealAnalysis } from '../lib/gemini';
import {
  lookupBarcodeProduct,
  BarcodeProduct,
  SAMPLE_BARCODE_PRESETS,
  detectBarcodeInVideo,
  detectBarcodeInImage,
  scanBarcodeImageWithAI,
  playBarcodeBeep,
} from '../lib/barcodeScanner';
import { useMealTracker } from '../hooks/useMealTracker';
import { MealCategory, SavedDish } from '../types/meal';

// Modular Child Components
import { ScannerCameraView } from './ScannerCameraView';
import { ScannerGalleryUpload } from './ScannerGalleryUpload';
import { ScannerVoiceTab } from './ScannerVoiceTab';
import { ScannerIngredientsTab } from './ScannerIngredientsTab';
import { ScannerSavedDishesTab } from './ScannerSavedDishesTab';
import { ScannerBarcodeTab } from './ScannerBarcodeTab';
import { ScannerPresetsTab, PresetFoodItem } from './ScannerPresetsTab';
import { ScannerReviewView } from './ScannerReviewView';
import { CreateSavedDishModal } from './CreateSavedDishModal';

export type ScannerTab = 'gallery' | 'camera' | 'voice' | 'barcode' | 'ingredients' | 'saved' | 'presets';

interface MealScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onMealLogged?: () => void;
  initialImageBase64?: string | null;
  defaultTab?: ScannerTab;
  initialMealType?: MealCategory;
}

// Quick test food presets for desktop or quick instant testing
const TEST_FOOD_PRESETS = [
  {
    name: 'Avocado Toast & Egg',
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    fallbackMeal: {
      mealName: 'Avocado Toast with Poached Egg',
      calories: 420,
      protein: 18,
      carbs: 34,
      fat: 24,
      description: 'Artisan sourdough toast with mashed avocado, poached egg, chili flakes and herbs.',
      ingredients: ['Sourdough bread', 'Avocado', 'Egg', 'Chili flakes', 'Olive oil'],
      healthRating: 9,
    },
  },
  {
    name: 'Grilled Salmon Bowl',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    fallbackMeal: {
      mealName: 'Grilled Salmon Quinoa Bowl',
      calories: 580,
      protein: 46,
      carbs: 42,
      fat: 22,
      description: 'Grilled salmon fillet served with warm tricolor quinoa, steamed broccoli and sesame seeds.',
      ingredients: ['Salmon', 'Quinoa', 'Broccoli', 'Sesame seeds', 'Lemon dressing'],
      healthRating: 10,
    },
  },
  {
    name: 'Classic Cheeseburger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    fallbackMeal: {
      mealName: 'Gourmet Cheeseburger & Fries',
      calories: 780,
      protein: 38,
      carbs: 65,
      fat: 42,
      description: 'Beef patty topped with melted cheddar, crisp lettuce, tomato, and brioche bun with side of fries.',
      ingredients: ['Beef patty', 'Cheddar cheese', 'Brioche bun', 'Lettuce', 'Tomato', 'Potato fries'],
      healthRating: 5,
    },
  },
  {
    name: 'Acai Smoothie Bowl',
    url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&auto=format&fit=crop&q=80',
    fallbackMeal: {
      mealName: 'Berry Acai Superfood Bowl',
      calories: 360,
      protein: 11,
      carbs: 58,
      fat: 9,
      description: 'Chilled acai puree topped with fresh blueberries, banana slices, coconut flakes and honey oats.',
      ingredients: ['Acai puree', 'Blueberries', 'Banana', 'Granola', 'Coconut flakes'],
      healthRating: 9,
    },
  },
];

const QUICK_INGREDIENT_SUGGESTIONS = [
  '2 large eggs',
  '150g grilled chicken breast',
  '1 cup cooked white rice',
  '50g rolled oats',
  '1 medium banana',
  '1 tbsp extra virgin olive oil',
  '150g Greek yogurt 0%',
  '1/2 avocado',
  '1 scoop whey protein (30g)',
  '2 slices whole wheat bread',
  '1 cup steamed broccoli',
  '2 tbsp natural peanut butter',
];

export const MealScanner: React.FC<MealScannerProps> = ({
  isOpen,
  onClose,
  onMealLogged,
  initialImageBase64,
  defaultTab = 'gallery',
  initialMealType,
}) => {
  const { addMeal, savedDishes, saveDish, deleteSavedDish, logSavedDish } = useMealTracker();

  // State management
  const [activeTab, setActiveTab] = useState<ScannerTab>(defaultTab);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Scanning & loading state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('Preparing image...');
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);

  // Result state
  const [analyzedResult, setAnalyzedResult] = useState<MealAnalysis | null>(null);
  const [voiceTranscription, setVoiceTranscription] = useState<string | null>(null);
  const [currentInputSource, setCurrentInputSource] = useState<'camera' | 'voice' | 'ingredients' | 'barcode' | 'preset' | null>(null);
  const [editableMealName, setEditableMealName] = useState<string>('');
  const [editableCalories, setEditableCalories] = useState<number>(0);
  const [editableProtein, setEditableProtein] = useState<number>(0);
  const [editableCarbs, setEditableCarbs] = useState<number>(0);
  const [editableFat, setEditableFat] = useState<number>(0);
  const [selectedMealType, setSelectedMealType] = useState<MealCategory>(initialMealType || 'lunch');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToDishesCheckbox, setSaveToDishesCheckbox] = useState<boolean>(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Feature: Add Just Ingredients state
  const [ingredientsText, setIngredientsText] = useState<string>('');
  const [customDishName, setCustomDishName] = useState<string>('');
  const [ingredientsError, setIngredientsError] = useState<string | null>(null);

  // Feature: Voice Error State
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Feature: Create manual custom dish inside saved tab
  const [showCreateDishModal, setShowCreateDishModal] = useState<boolean>(false);
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCalories, setNewDishCalories] = useState<number>(400);
  const [newDishProtein, setNewDishProtein] = useState<number>(25);
  const [newDishCarbs, setNewDishCarbs] = useState<number>(40);
  const [newDishFat, setNewDishFat] = useState<number>(12);
  const [newDishCategory, setNewDishCategory] = useState<MealCategory>('lunch');
  const [newDishIngredients, setNewDishIngredients] = useState<string>('');

  // Feature: Barcode state
  const [barcodeInputText, setBarcodeInputText] = useState<string>('');
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const [isAnalyzingBarcode, setIsAnalyzingBarcode] = useState<boolean>(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeServingMode, setBarcodeServingMode] = useState<'serving' | '100g' | 'custom'>('serving');
  const [barcodeCustomMultiplier, setBarcodeCustomMultiplier] = useState<number>(1);
  const [barcodeCustomGrams, setBarcodeCustomGrams] = useState<number>(100);
  const barcodeFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedBarcodeRef = useRef<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // If initial image passed, analyze it immediately
  useEffect(() => {
    if (isOpen && initialImageBase64 && !capturedImageBase64) {
      processAndAnalyzeImage(initialImageBase64);
    }
  }, [isOpen, initialImageBase64]);

  // When defaultTab changes or modal opens
  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
    if (isOpen && initialMealType) {
      setSelectedMealType(initialMealType);
    }
  }, [isOpen, defaultTab, initialMealType]);

  // Initialize camera stream when in camera or barcode mode
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this browser device. You can pick photos from gallery.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permission or choose an image.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Handle open/close side-effects
  useEffect(() => {
    const shouldStartCamera =
      isOpen &&
      ((activeTab === 'camera' && !capturedImageBase64) ||
        (activeTab === 'barcode' && !barcodeProduct));

    if (shouldStartCamera) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, cameraFacing, capturedImageBase64, barcodeProduct]);

  // Continuous barcode detection loop while in live barcode camera mode
  useEffect(() => {
    let isMounted = true;
    let timerId: any = null;

    if (isOpen && activeTab === 'barcode' && cameraActive && !barcodeProduct && !isAnalyzingBarcode) {
      timerId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const detected = await detectBarcodeInVideo(videoRef.current);
          if (detected && isMounted && detected !== lastScannedBarcodeRef.current) {
            lastScannedBarcodeRef.current = detected;
            playBarcodeBeep();
            handleLookupBarcode(detected);
          }
        } catch {
          // ignore frame decode err
        }
      }, 250);
    }

    return () => {
      isMounted = false;
      if (timerId) clearInterval(timerId);
    };
  }, [isOpen, activeTab, cameraActive, barcodeProduct, isAnalyzingBarcode]);

  // Flip camera between front & back
  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Capture frame from live video stream
  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.88);
      stopCamera();
      processAndAnalyzeImage(base64Data);
    } catch (err: any) {
      console.error('Error capturing photo from canvas:', err);
      setCameraError('Failed to capture frame. Please try uploading an image.');
    }
  };

  const processFile = (file: File) => {
    const mimeType = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        processAndAnalyzeImage(base64, undefined, mimeType);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle image selected from gallery / file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  // Trigger Gemini analysis on base64 image
  const processAndAnalyzeImage = async (base64Image: string, fallback?: MealAnalysis, customMimeType?: string) => {
    setCapturedImageBase64(base64Image);
    setIsAnalyzing(true);
    setAnalyzedResult(null);

    // Multi-step progress animation focusing on DISH RECOGNITION
    setAnalyzingStep('Scanning food photograph...');
    const stepTimer1 = setTimeout(() => {
      setAnalyzingStep('Gemini Vision AI recognizing what dish this is...');
    }, 700);
    const stepTimer2 = setTimeout(() => {
      setAnalyzingStep('Identifying culinary recipe & dish title...');
    }, 1500);
    const stepTimer3 = setTimeout(() => {
      setAnalyzingStep('Calculating calories & macronutrients...');
    }, 2300);

    try {
      const result = await analyzeMealImage(base64Image, customMimeType);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const finalResult = fallback && result.mealName === 'Nutritious Bowl' ? fallback : result;

      setAnalyzedResult(finalResult);
      setEditableMealName(finalResult.mealName);
      setEditableCalories(finalResult.calories);
      setEditableProtein(finalResult.protein);
      setEditableCarbs(finalResult.carbs);
      setEditableFat(finalResult.fat);
    } catch (error) {
      console.error('Analysis error:', error);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      if (fallback) {
        setAnalyzedResult(fallback);
        setEditableMealName(fallback.mealName);
        setEditableCalories(fallback.calories);
        setEditableProtein(fallback.protein);
        setEditableCarbs(fallback.carbs);
        setEditableFat(fallback.fat);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Feature: Calculate nutrition from ingredients
  const handleAnalyzeIngredients = async () => {
    if (!ingredientsText.trim()) {
      setIngredientsError('Please enter at least one ingredient');
      return;
    }
    setIngredientsError(null);
    setIsAnalyzing(true);
    setAnalyzingStep('Analyzing ingredients with AI...');

    const stepTimer = setTimeout(() => {
      setAnalyzingStep('Calculating total calories & macro ratios...');
    }, 1000);

    try {
      const result = await analyzeIngredients(ingredientsText, customDishName);
      clearTimeout(stepTimer);

      setAnalyzedResult(result);
      setEditableMealName(result.mealName);
      setEditableCalories(result.calories);
      setEditableProtein(result.protein);
      setEditableCarbs(result.carbs);
      setEditableFat(result.fat);
      setCapturedImageBase64(null); // No photo for pure ingredient input
    } catch (err: any) {
      console.error('Ingredients analysis error:', err);
      setIngredientsError(err?.message || 'Failed to analyze ingredients. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Feature: Calculate nutrition from voice speech detection
  const handleAnalyzeSpokenMeal = async (speechText: string) => {
    if (!speechText.trim()) return;
    setVoiceError(null);
    setVoiceTranscription(speechText.trim());
    setCurrentInputSource('voice');
    setIsAnalyzing(true);
    setAnalyzingStep('Przetwarzam mowę z Gemini AI...');

    const stepTimer1 = setTimeout(() => {
      setAnalyzingStep('Rozpoznaję posiłek i składniki...');
    }, 900);
    const stepTimer2 = setTimeout(() => {
      setAnalyzingStep('Precyzyjnie wyliczam kalorie i makroskładniki...');
    }, 2200);

    try {
      const result = await analyzeSpokenMeal(speechText, selectedMealType);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setAnalyzedResult(result);
      setEditableMealName(result.mealName);
      setEditableCalories(result.calories);
      setEditableProtein(result.protein);
      setEditableCarbs(result.carbs);
      setEditableFat(result.fat);
      setCapturedImageBase64(null);

      if (
        result.suggestedMealType &&
        ['breakfast', 'lunch', 'dinner', 'snack'].includes(result.suggestedMealType)
      ) {
        setSelectedMealType(result.suggestedMealType as MealCategory);
      }
    } catch (error: any) {
      console.error('Voice analysis error:', error);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setVoiceError(
        error?.message || 'Nie zrozumiałem Twojej wypowiedzi. Proszę powtórz wyraźniej lub wpisz posiłek.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Feature: Calculate nutrition from recorded voice audio
  const handleAnalyzeVoiceAudio = async (base64Audio: string, mimeType?: string) => {
    if (!base64Audio) return;
    setVoiceError(null);
    setCurrentInputSource('voice');
    setIsAnalyzing(true);
    setAnalyzingStep('Gemini AI odsłuchuje Twoje nagranie głosu...');

    const stepTimer1 = setTimeout(() => {
      setAnalyzingStep('Rozpoznaję danie, gramatury i składniki...');
    }, 1200);
    const stepTimer2 = setTimeout(() => {
      setAnalyzingStep('Kalkuluję kalorie, białko, węglowodany i tłuszcze...');
    }, 3000);

    try {
      const result = await analyzeVoiceAudio(base64Audio, mimeType || 'audio/webm', selectedMealType);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (result.transcription) {
        setVoiceTranscription(result.transcription);
      } else {
        setVoiceTranscription(result.mealName);
      }
      setAnalyzedResult(result);
      setEditableMealName(result.mealName);
      setEditableCalories(result.calories);
      setEditableProtein(result.protein);
      setEditableCarbs(result.carbs);
      setEditableFat(result.fat);
      setCapturedImageBase64(null);

      if (
        result.suggestedMealType &&
        ['breakfast', 'lunch', 'dinner', 'snack'].includes(result.suggestedMealType)
      ) {
        setSelectedMealType(result.suggestedMealType as MealCategory);
      }
    } catch (error: any) {
      console.error('Voice audio analysis error:', error);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setVoiceError(
        error?.message || 'Nie zrozumiałem nagrania. Proszę powtórzyć wyraźniej lub wpisać posiłek.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Append a quick ingredient chip to the text area
  const appendIngredient = (ing: string) => {
    setIngredientsError(null);
    setIngredientsText((prev) => {
      if (!prev.trim()) return ing;
      return `${prev.trim()}, ${ing}`;
    });
  };

  // Helper to map Nutri-Score to 1-10 rating
  const mapNutriscoreToRating = (grade?: string | null): number => {
    if (!grade) return 7;
    const g = grade.toUpperCase();
    if (g === 'A') return 10;
    if (g === 'B') return 8;
    if (g === 'C') return 6;
    if (g === 'D') return 4;
    if (g === 'E') return 3;
    return 7;
  };

  // Perform barcode lookup
  const handleLookupBarcode = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setIsAnalyzingBarcode(true);
    setBarcodeError(null);

    try {
      const product = await lookupBarcodeProduct(clean);
      setBarcodeProduct(product);
      setBarcodeServingMode('serving');
      setBarcodeCustomMultiplier(1);
      setBarcodeCustomGrams(product.servingQuantity || 100);
      stopCamera();
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      setBarcodeError(err?.message || 'Could not find product for this barcode. Try entering details manually.');
    } finally {
      setIsAnalyzingBarcode(false);
    }
  };

  // Upload photo of barcode
  const handleBarcodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsAnalyzingBarcode(true);
    setBarcodeError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (!base64) {
        setIsAnalyzingBarcode(false);
        return;
      }

      try {
        // 1. Try detecting standard barcode lines from image
        const detected = await detectBarcodeInImage(base64);
        if (detected) {
          playBarcodeBeep();
          await handleLookupBarcode(detected);
          return;
        }

        // 2. If standard barcode line detector couldn't resolve, use Gemini Vision to read package & barcode digits!
        const aiResult = await scanBarcodeImageWithAI(base64);
        if (aiResult.barcode) {
          playBarcodeBeep();
          await handleLookupBarcode(aiResult.barcode);
          return;
        }

        // 3. If no barcode digits found, use AI recognized product nutrition directly!
        setBarcodeProduct({
          found: true,
          source: 'gemini-vision',
          barcode: 'PHOTO-DETECTED',
          productName: aiResult.productName || 'Recognized Product',
          brand: aiResult.brand || '',
          servingSize: aiResult.servingSize || '1 serving',
          servingQuantity: 100,
          per100g: {
            calories: aiResult.calories,
            protein: aiResult.protein,
            carbs: aiResult.carbs,
            fat: aiResult.fat,
          },
          perServing: {
            calories: aiResult.calories,
            protein: aiResult.protein,
            carbs: aiResult.carbs,
            fat: aiResult.fat,
          },
          imageUrl: base64,
          ingredients: aiResult.ingredients,
          nutriscore: null,
        });
        stopCamera();
      } catch (err: any) {
        console.error('Failed to decode barcode from image:', err);
        setBarcodeError('Could not detect barcode from image. Please ensure good lighting or enter barcode digits manually.');
      } finally {
        setIsAnalyzingBarcode(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculate live portion nutrition for barcode product
  const getBarcodeNutrition = () => {
    if (!barcodeProduct) return { calories: 0, protein: 0, carbs: 0, fat: 0, label: '' };

    if (barcodeServingMode === '100g') {
      return {
        calories: barcodeProduct.per100g.calories,
        protein: barcodeProduct.per100g.protein,
        carbs: barcodeProduct.per100g.carbs,
        fat: barcodeProduct.per100g.fat,
        label: '100g portion',
      };
    }

    if (barcodeServingMode === 'serving') {
      const mult = Math.max(0.1, Number(barcodeCustomMultiplier) || 1);
      return {
        calories: Math.round(barcodeProduct.perServing.calories * mult),
        protein: Math.round(barcodeProduct.perServing.protein * mult),
        carbs: Math.round(barcodeProduct.perServing.carbs * mult),
        fat: Math.round(barcodeProduct.perServing.fat * mult),
        label: mult === 1 ? barcodeProduct.servingSize : `${mult}x serving (${barcodeProduct.servingSize})`,
      };
    }

    // Custom grams
    const grams = Math.max(1, Number(barcodeCustomGrams) || 100);
    const ratio = grams / 100;
    return {
      calories: Math.round(barcodeProduct.per100g.calories * ratio),
      protein: Math.round(barcodeProduct.per100g.protein * ratio),
      carbs: Math.round(barcodeProduct.per100g.carbs * ratio),
      fat: Math.round(barcodeProduct.per100g.fat * ratio),
      label: `${grams}g`,
    };
  };

  // Log scanned barcode product into tracker
  const handleLogBarcodeProduct = () => {
    if (!barcodeProduct) return;
    const nut = getBarcodeNutrition();
    const displayName = barcodeProduct.brand
      ? `${barcodeProduct.productName} (${barcodeProduct.brand})`
      : barcodeProduct.productName;

    addMeal({
      name: displayName,
      calories: nut.calories,
      protein: nut.protein,
      carbs: nut.carbs,
      fat: nut.fat,
      mealType: selectedMealType,
      imageData: barcodeProduct.imageUrl || undefined,
      cuisine: 'Packaged Food',
      description: `Barcode: ${barcodeProduct.barcode} • Portion: ${nut.label}`,
      ingredients: barcodeProduct.ingredients,
      healthRating: mapNutriscoreToRating(barcodeProduct.nutriscore),
    });

    if (saveToDishesCheckbox) {
      saveDish({
        name: displayName,
        calories: nut.calories,
        protein: nut.protein,
        carbs: nut.carbs,
        fat: nut.fat,
        defaultMealType: selectedMealType,
        imageData: barcodeProduct.imageUrl || undefined,
        cuisine: 'Packaged Food',
        description: `Barcode: ${barcodeProduct.barcode}`,
        ingredients: barcodeProduct.ingredients,
        healthRating: mapNutriscoreToRating(barcodeProduct.nutriscore),
      });
    }

    setSavedSuccessMessage(`Logged ${displayName} (${nut.calories} kcal) to ${selectedMealType}!`);
    setTimeout(() => {
      handleClose();
      if (onMealLogged) onMealLogged();
    }, 700);
  };

  // Handle picking a preset sample meal
  const handleSelectPreset = async (preset: PresetFoodItem) => {
    setIsAnalyzing(true);
    setAnalyzingStep('Loading demo meal...');
    try {
      const response = await fetch(preset.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        processAndAnalyzeImage(base64, preset.fallbackMeal);
      };
      reader.readAsDataURL(blob);
    } catch {
      setCapturedImageBase64(preset.url);
      setAnalyzedResult(preset.fallbackMeal);
      setEditableMealName(preset.fallbackMeal.mealName);
      setEditableCalories(preset.fallbackMeal.calories);
      setEditableProtein(preset.fallbackMeal.protein);
      setEditableCarbs(preset.fallbackMeal.carbs);
      setEditableFat(preset.fallbackMeal.fat);
      setIsAnalyzing(false);
    }
  };

  // Direct 1-click log for saved dish
  const handleLogSavedDishDirectly = (dish: SavedDish) => {
    logSavedDish(dish, selectedMealType);
    setSavedSuccessMessage(`Logged ${dish.name} (${dish.calories} kcal) to ${selectedMealType}!`);
    setTimeout(() => {
      handleClose();
      if (onMealLogged) onMealLogged();
    }, 600);
  };

  // Create a brand new custom dish manually from saved tab
  const handleCreateCustomDish = () => {
    if (!newDishName.trim()) return;

    const ingArray = newDishIngredients
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    saveDish({
      name: newDishName.trim(),
      calories: newDishCalories,
      protein: newDishProtein,
      carbs: newDishCarbs,
      fat: newDishFat,
      defaultMealType: newDishCategory,
      ingredients: ingArray.length > 0 ? ingArray : undefined,
      cuisine: 'Custom Recipe',
      description: 'Handcrafted custom dish',
    });

    setSavedSuccessMessage(`Created and saved "${newDishName}" to My Dishes!`);
    setShowCreateDishModal(false);
    setNewDishName('');
    setNewDishIngredients('');
    setTimeout(() => setSavedSuccessMessage(null), 3000);
  };

  // Save the analyzed result into state and localStorage
  const handleConfirmLogMeal = () => {
    if (!analyzedResult) return;
    setIsSaving(true);

    const mealData = {
      name: editableMealName.trim() || analyzedResult.mealName,
      calories: editableCalories,
      protein: editableProtein,
      carbs: editableCarbs,
      fat: editableFat,
      mealType: selectedMealType,
      imageData: capturedImageBase64 || undefined,
      cuisine: analyzedResult.cuisine,
      description: analyzedResult.description,
      ingredients: analyzedResult.ingredients,
      healthRating: analyzedResult.healthRating,
    };

    addMeal(mealData);

    // If user checked "Save to My Dishes", store it in persistent library
    if (saveToDishesCheckbox) {
      saveDish({
        name: mealData.name,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        defaultMealType: selectedMealType,
        imageData: capturedImageBase64 || undefined,
        cuisine: analyzedResult.cuisine,
        description: analyzedResult.description,
        ingredients: analyzedResult.ingredients,
        healthRating: analyzedResult.healthRating,
      });
    }

    setSavedSuccessMessage(`Logged "${mealData.name}" (${mealData.calories} kcal) to ${selectedMealType}!`);

    setTimeout(() => {
      setIsSaving(false);
      handleClose();
      if (onMealLogged) {
        onMealLogged();
      }
    }, 700);
  };

  const handleRetake = () => {
    setCapturedImageBase64(null);
    setAnalyzedResult(null);
    setVoiceTranscription(null);
    setCurrentInputSource(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImageBase64(null);
    setAnalyzedResult(null);
    setVoiceTranscription(null);
    setCurrentInputSource(null);
    setBarcodeProduct(null);
    setBarcodeInputText('');
    setBarcodeError(null);
    setIsAnalyzingBarcode(false);
    lastScannedBarcodeRef.current = null;
    setIsAnalyzing(false);
    setSaveToDishesCheckbox(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/95 z-20 sticky top-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 flex-shrink-0">
              {activeTab === 'barcode' ? (
                <ScanBarcode className="w-4 h-4" />
              ) : activeTab === 'voice' ? (
                <Mic className="w-4 h-4 text-slate-950" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5 truncate">
                {analyzedResult
                  ? 'Review & Log Meal'
                  : barcodeProduct
                  ? 'Review Barcode Product'
                  : activeTab === 'voice'
                  ? 'Voice Meal Detector'
                  : 'NutriSnap Meal Logger'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {analyzedResult
                  ? 'Verify dish title, calories, and macros'
                  : barcodeProduct
                  ? 'Adjust portion and confirm nutrition facts'
                  : activeTab === 'voice'
                  ? 'Speak naturally to detect dish, calories & macros'
                  : 'AI photo recognition, voice detector, barcode, or ingredients'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* UNMISSABLE HEADER KCAL BADGE: ALWAYS VISIBLE EVEN WHEN SCROLLING */}
            {analyzedResult && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs sm:text-sm font-mono shadow-lg shadow-amber-500/30 border border-amber-300 animate-in fade-in zoom-in-95">
                <Flame className="w-3.5 h-3.5 fill-slate-950" />
                <span>{editableCalories} kcal</span>
              </div>
            )}
            {barcodeProduct && !analyzedResult && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs sm:text-sm font-mono shadow-lg shadow-emerald-500/30 border border-emerald-300 animate-in fade-in zoom-in-95">
                <Flame className="w-3.5 h-3.5 fill-slate-950" />
                <span>{getBarcodeNutrition().calories} kcal</span>
              </div>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Close scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FULL SCREEN LOADING SPINNER DURING SCANNING OR INGREDIENT ANALYSIS */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            {capturedImageBase64 ? (
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl mb-6 group">
                <img
                  src={capturedImageBase64}
                  alt="Analyzing meal"
                  className="w-full h-full object-cover brightness-95"
                />
                <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_20px_#10b981] animate-bounce duration-1000" />
                <div className="absolute inset-0 bg-emerald-500/15 mix-blend-overlay" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 animate-pulse">
                <Salad className="w-10 h-10" />
              </div>
            )}

            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
              <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
              <Sparkles className="absolute w-5 h-5 text-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                Gemini AI Nutrition Engine
              </span>
              <h3 className="text-lg font-bold text-slate-100">Recognizing What You Ate</h3>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-emerald-300 transition-all duration-300 min-h-[1.5rem] mt-2.5 bg-emerald-950/70 px-4 py-1.5 rounded-full border border-emerald-500/30">
              {analyzingStep}
            </p>

            <p className="text-[11px] text-slate-500 mt-4 max-w-xs leading-relaxed">
              Identifying the exact dish title, portion sizing, calories, and macronutrient breakdown.
            </p>
          </div>
        )}

        {/* Global Success Notification inside Modal */}
        {savedSuccessMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-300 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{savedSuccessMessage}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 [scrollbar-gutter:stable] overscroll-contain">
          {/* VIEW 1: Analysis Result Confirmation */}
          {analyzedResult ? (
            <ScannerReviewView
              analyzedResult={analyzedResult}
              capturedImageBase64={capturedImageBase64}
              spokenText={voiceTranscription}
              inputMode={currentInputSource || undefined}
              editableMealName={editableMealName}
              onEditableMealNameChange={setEditableMealName}
              editableCalories={editableCalories}
              onEditableCaloriesChange={setEditableCalories}
              editableProtein={editableProtein}
              onEditableProteinChange={setEditableProtein}
              editableCarbs={editableCarbs}
              onEditableCarbsChange={setEditableCarbs}
              editableFat={editableFat}
              onEditableFatChange={setEditableFat}
              selectedMealType={selectedMealType}
              onSelectMealType={setSelectedMealType}
              saveToDishesCheckbox={saveToDishesCheckbox}
              onSaveToDishesCheckboxChange={setSaveToDishesCheckbox}
              isSaving={isSaving}
              onRetake={handleRetake}
              onConfirmLogMeal={handleConfirmLogMeal}
            />
          ) : (
            /* VIEW 2: Input Modes (Tabs: Import Photo, Live Camera, Barcode, Add Ingredients, Saved Dishes, Presets) */
            <div className="space-y-4">
              {/* Tab Selector Navigation Bar */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('gallery');
                    stopCamera();
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'gallery'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Import Photo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('camera');
                    startCamera();
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'camera'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Camera
                </button>

                {/* VOICE DETECTOR TAB */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('voice');
                    stopCamera();
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'voice'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  Voice
                </button>

                {/* BARCODE SCANNER TAB */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('barcode');
                    startCamera();
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'barcode'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ScanBarcode className="w-3.5 h-3.5 text-emerald-400" />
                  Barcode
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ingredients');
                    stopCamera();
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'ingredients'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Salad className="w-3.5 h-3.5 text-emerald-400" />
                  Ingredients
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('saved');
                    stopCamera();
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'saved'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  Saved ({savedDishes.length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('presets');
                    stopCamera();
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                    activeTab === 'presets'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Quick Demos"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* TAB 1: GALLERY / IMPORT PHOTO */}
              {activeTab === 'gallery' && (
                <ScannerGalleryUpload
                  isDragging={isDragging}
                  fileInputRef={fileInputRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileChange={handleFileChange}
                />
              )}

              {/* TAB 2: LIVE CAMERA */}
              {activeTab === 'camera' && (
                <ScannerCameraView
                  videoRef={videoRef}
                  cameraActive={cameraActive}
                  cameraError={cameraError}
                  onStartCamera={() => startCamera()}
                  onToggleFacing={handleToggleCameraFacing}
                  onCapture={capturePhotoFromCamera}
                  onFileChange={handleFileChange}
                />
              )}

              {/* TAB: VOICE MEAL DETECTOR */}
              {activeTab === 'voice' && (
                <ScannerVoiceTab
                  onAnalyzeSpokenMeal={handleAnalyzeSpokenMeal}
                  onAnalyzeVoiceAudio={handleAnalyzeVoiceAudio}
                  isAnalyzing={isAnalyzing}
                  contextMealType={selectedMealType}
                  voiceError={voiceError}
                  onClearVoiceError={() => setVoiceError(null)}
                />
              )}

              {/* TAB 3: BARCODE SCANNER */}
              {activeTab === 'barcode' && (
                <ScannerBarcodeTab
                  videoRef={videoRef}
                  cameraActive={cameraActive}
                  cameraError={cameraError}
                  onStartCamera={() => startCamera()}
                  onToggleFacing={handleToggleCameraFacing}
                  barcodeFileInputRef={barcodeFileInputRef}
                  onBarcodeImageUpload={handleBarcodeImageUpload}
                  barcodeInputText={barcodeInputText}
                  onBarcodeInputTextChange={setBarcodeInputText}
                  onLookupBarcode={handleLookupBarcode}
                  isAnalyzingBarcode={isAnalyzingBarcode}
                  barcodeError={barcodeError}
                  barcodeProduct={barcodeProduct}
                  onClearBarcodeProduct={() => {
                    setBarcodeProduct(null);
                    setBarcodeInputText('');
                    setBarcodeError(null);
                    lastScannedBarcodeRef.current = null;
                    startCamera();
                  }}
                  barcodeServingMode={barcodeServingMode}
                  onBarcodeServingModeChange={setBarcodeServingMode}
                  barcodeCustomMultiplier={barcodeCustomMultiplier}
                  onBarcodeCustomMultiplierChange={setBarcodeCustomMultiplier}
                  barcodeCustomGrams={barcodeCustomGrams}
                  onBarcodeCustomGramsChange={setBarcodeCustomGrams}
                  getBarcodeNutrition={getBarcodeNutrition}
                  selectedMealType={selectedMealType}
                  onSelectMealType={setSelectedMealType}
                  saveToDishesCheckbox={saveToDishesCheckbox}
                  onSaveToDishesCheckboxChange={setSaveToDishesCheckbox}
                  onLogBarcodeProduct={handleLogBarcodeProduct}
                />
              )}

              {/* TAB 4: ADD JUST INGREDIENTS */}
              {activeTab === 'ingredients' && (
                <ScannerIngredientsTab
                  customDishName={customDishName}
                  onCustomDishNameChange={setCustomDishName}
                  ingredientsText={ingredientsText}
                  onIngredientsTextChange={(val) => {
                    setIngredientsText(val);
                    setIngredientsError(null);
                  }}
                  ingredientsError={ingredientsError}
                  quickSuggestions={QUICK_INGREDIENT_SUGGESTIONS}
                  onAppendIngredient={appendIngredient}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={handleAnalyzeIngredients}
                />
              )}

              {/* TAB 5: SAVED DISHES LIBRARY */}
              {activeTab === 'saved' && (
                <ScannerSavedDishesTab
                  savedDishes={savedDishes}
                  onOpenCreateDishModal={() => setShowCreateDishModal(true)}
                  onLogDishDirectly={handleLogSavedDishDirectly}
                  onDeleteDish={deleteSavedDish}
                />
              )}

              {/* TAB 6: PRESETS DEMO */}
              {activeTab === 'presets' && (
                <ScannerPresetsTab
                  presets={TEST_FOOD_PRESETS}
                  onSelectPreset={handleSelectPreset}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal: Create Custom Saved Dish Manually */}
        <CreateSavedDishModal
          isOpen={showCreateDishModal}
          onClose={() => setShowCreateDishModal(false)}
          dishName={newDishName}
          onDishNameChange={setNewDishName}
          calories={newDishCalories}
          onCaloriesChange={setNewDishCalories}
          protein={newDishProtein}
          onProteinChange={setNewDishProtein}
          carbs={newDishCarbs}
          onCarbsChange={setNewDishCarbs}
          fat={newDishFat}
          onFatChange={setNewDishFat}
          category={newDishCategory}
          onCategoryChange={setNewDishCategory}
          ingredients={newDishIngredients}
          onIngredientsChange={setNewDishIngredients}
          onCreateDish={handleCreateCustomDish}
        />
      </div>
    </div>
  );
};

export default MealScanner;
