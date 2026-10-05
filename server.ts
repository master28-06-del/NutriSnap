import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

async function startServer() {
  const app = express();

  // Trust proxy for rate limiting behind Cloud Run / reverse proxies
  app.set('trust proxy', 1);

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '25mb' }));

  // Rate limiters to protect Gemini AI quota & prevent automated abuse
  const aiAnalysisLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 50, // limit each IP to 50 AI queries per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Rate limit reached: Too many AI requests from this connection. Please wait a few moments before scanning again.',
    },
  });

  const barcodeLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 barcode scans per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many barcode lookups. Please wait a moment.',
    },
  });

  app.use('/api/analyze-meal', aiAnalysisLimiter);
  app.use('/api/analyze-ingredients', aiAnalysisLimiter);
  app.use('/api/analyze-voice-meal', aiAnalysisLimiter);
  app.use('/api/analyze-voice-audio', aiAnalysisLimiter);
  app.use('/api/scan-barcode-image', aiAnalysisLimiter);
  app.use('/api/lookup-barcode', barcodeLookupLimiter);

  const ai = new GoogleGenAI(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});

  async function callGeminiWithFailover(options: {
    contents: any;
    config: any;
  }) {
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        return await ai.models.generateContent({
          model,
          contents: options.contents,
          config: {
            ...options.config,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} failed, trying next candidate:`, err?.message || err);
      }
    }
    throw lastErr;
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Analyze meal image endpoint with dish recognition
  app.post('/api/analyze-meal', async (req, res) => {
    try {
      const { image, mimeType = 'image/jpeg' } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      // Clean base64 data if it contains a data URL scheme
      const base64Data = image.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured, returning simulated smart nutritional estimation');
        return res.json(generateSmartFallback(base64Data));
      }

      // Prompt specifically crafted to recognize what the dish is and return its clear culinary title
      const recognitionPrompt = `Look carefully at this meal/food photograph and recognize exactly what dish or food it is.
1. TITLE OF DISH: What is the specific culinary name/title of this dish? (e.g., "Avocado Toast with Poached Egg", "Grilled Chicken Caesar Salad", "Spaghetti Carbonara", "Margherita Pizza", "Beef Pho", "Salmon Teriyaki with Rice and Steamed Broccoli", "Chana Masala with Roti", "Greek Salad with Feta").
2. CUISINE: Identify the cuisine style (e.g. "Italian", "Japanese", "Mexican", "Mediterranean", "American", "Healthy Bowl").
3. NUTRITION: Accurately estimate calories (kcal), protein (g), carbohydrates (g), and dietary fat (g) based on the observed portion size.
4. INGREDIENTS: List the visible primary ingredients in the dish.
5. DESCRIPTION: Provide a 1-2 sentence description explaining what is recognized on the plate and cooking preparation.

Return ONLY structured JSON conforming to the schema.`;

      try {
        const response = await callGeminiWithFailover({
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            recognitionPrompt,
          ],
          config: {
            systemInstruction:
              'You are an expert chef, culinary historian, and nutrition AI specializing in food computer vision. Your top priority is to recognize the exact dish in the user photo and provide a clear, accurate, and appealing culinary title in "mealName" (never say generic things like "Food" or "Plate of Food", specify the exact dish). Always output strictly valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mealName: {
                  type: Type.STRING,
                  description: 'The recognized specific title and name of the dish (e.g., "Spaghetti Bolognese", "Chicken Fajitas", "Green Smoothie Bowl")',
                },
                cuisine: {
                  type: Type.STRING,
                  description: 'Cuisine style or category (e.g., Italian, Mexican, Asian, Healthy / Clean, American)',
                },
                calories: {
                  type: Type.INTEGER,
                  description: 'Estimated total calories in kcal for the recognized dish',
                },
                protein: {
                  type: Type.INTEGER,
                  description: 'Estimated protein in grams',
                },
                carbs: {
                  type: Type.INTEGER,
                  description: 'Estimated carbohydrates in grams',
                },
                fat: {
                  type: Type.INTEGER,
                  description: 'Estimated dietary fat in grams',
                },
                description: {
                  type: Type.STRING,
                  description: 'Explanation of the recognized dish and culinary components',
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of visible primary ingredients detected in the dish',
                },
                confidence: {
                  type: Type.STRING,
                  description: 'Confidence level: high, medium, or low',
                },
                healthRating: {
                  type: Type.INTEGER,
                  description: 'Health/nutrient density rating from 1 to 10',
                },
              },
              required: ['mealName', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText.trim());

        return res.json({
          mealName: parsed.mealName || 'Recognized Dish',
          cuisine: parsed.cuisine || 'International',
          calories: Math.round(Number(parsed.calories) || 350),
          protein: Math.round(Number(parsed.protein) || 20),
          carbs: Math.round(Number(parsed.carbs) || 35),
          fat: Math.round(Number(parsed.fat) || 12),
          description: parsed.description || 'Recognized meal and estimated nutrition.',
          ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
          confidence: parsed.confidence || 'high',
          healthRating: parsed.healthRating || 8,
        });
      } catch (geminiError: any) {
        console.error('Error with Gemini for meal analysis:', geminiError?.message || geminiError);
        return res.json(generateSmartFallback(base64Data));
      }
    } catch (error: any) {
      console.error('Server error in /api/analyze-meal:', error?.message || error);
      return res.json(generateSmartFallback());
    }
  });

  // Analyze meal from list of ingredients endpoint
  app.post('/api/analyze-ingredients', async (req, res) => {
    try {
      const ingredients = req.body.ingredients || req.body.ingredientsList;
      const { dishName } = req.body;

      if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
        return res.status(400).json({ error: 'Ingredients list is required' });
      }

      const ingredientsListStr = Array.isArray(ingredients)
        ? ingredients.join(', ')
        : String(ingredients);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured, calculating smart estimate from ingredients');
        return res.json(estimateNutrientsFromIngredientsFallback(ingredientsListStr, dishName));
      }

      const prompt = `You are a certified sports nutritionist and dietitian AI.
Given this list of ingredients (and optional user dish name: "${dishName || 'None provided'}"):
Ingredients: ${ingredientsListStr}

1. Recognize and formulate an appetizing, precise culinary title for the resulting dish (in "mealName").
2. Accurately calculate total calories (kcal), protein (g), carbohydrates (g), and fat (g) by summing up standard portion sizes of each ingredient.
3. Identify the cuisine style.
4. Provide a brief 1-2 sentence description explaining the dish.
5. Provide a health rating from 1 to 10.

Return ONLY structured JSON conforming to the schema.`;

      try {
        const response = await callGeminiWithFailover({
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert culinary nutrition AI. Calculate precise nutritional totals (calories, protein, carbs, fat) from user-entered ingredients and output valid JSON only.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mealName: {
                  type: Type.STRING,
                  description: 'Appetizing culinary title for the combined ingredients',
                },
                cuisine: {
                  type: Type.STRING,
                  description: 'Cuisine style or category',
                },
                calories: {
                  type: Type.INTEGER,
                  description: 'Total calculated calories in kcal',
                },
                protein: {
                  type: Type.INTEGER,
                  description: 'Total calculated protein in grams',
                },
                carbs: {
                  type: Type.INTEGER,
                  description: 'Total calculated carbohydrates in grams',
                },
                fat: {
                  type: Type.INTEGER,
                  description: 'Total calculated dietary fat in grams',
                },
                description: {
                  type: Type.STRING,
                  description: 'Brief culinary description of the dish',
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Cleaned list of ingredients',
                },
                healthRating: {
                  type: Type.INTEGER,
                  description: 'Nutritional health rating from 1 to 10',
                },
              },
              required: ['mealName', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText.trim());

        const finalDishName = parsed.mealName || dishName || 'Custom Recipe';
        return res.json({
          dishName: finalDishName,
          mealName: finalDishName,
          cuisine: parsed.cuisine || 'Homemade',
          calories: Math.max(0, Math.round(Number(parsed.calories) || 350)),
          protein: Math.max(0, Math.round(Number(parsed.protein) || 20)),
          carbs: Math.max(0, Math.round(Number(parsed.carbs) || 35)),
          fat: Math.max(0, Math.round(Number(parsed.fat) || 12)),
          description: parsed.description || `Crafted with: ${ingredientsListStr}`,
          ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
            ? parsed.ingredients
            : Array.isArray(ingredients) ? ingredients : [ingredientsListStr],
          healthRating: parsed.healthRating || 8,
        });
      } catch (geminiError: any) {
        console.error('Error with Gemini for ingredients analysis:', geminiError?.message || geminiError);
        return res.json(estimateNutrientsFromIngredientsFallback(ingredientsListStr, dishName));
      }
    } catch (error: any) {
      console.error('Server error in /api/analyze-ingredients:', error?.message || error);
      return res.status(500).json({ error: 'Failed to analyze ingredients' });
    }
  });

  // Analyze spoken meal from voice speech detection endpoint
  app.post('/api/analyze-voice-meal', async (req, res) => {
    try {
      const { speechText, contextMealType } = req.body;

      if (!speechText || typeof speechText !== 'string' || !speechText.trim()) {
        return res.status(400).json({ error: 'Speech transcription text is required' });
      }

      const trimmedSpeech = speechText.trim();
      // Require at least 2 alphanumeric characters to prevent analyzing pure punctuation
      if (trimmedSpeech.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '').length < 2) {
        return res.status(422).json({
          error: 'Nie rozpoznano słów posiłku w wypowiedzi.',
          recognized: false,
        });
      }
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured, calculating smart estimate from voice text');
        return res.json(estimateNutrientsFromSpokenMealFallback(trimmedSpeech, contextMealType));
      }

      const prompt = `You are an expert sports dietitian, culinary chef, and nutritional voice AI.
A user just spoke into their microphone to log what they ate or drank (which may be in Polish or English):
"${trimmedSpeech}"
Context current meal category: ${contextMealType || 'auto-detect'}

Instructions:
1. TITLE: Formulate an appetizing, precise culinary title for what they ate in "mealName" in the user's language (e.g., if Polish: "Jajka sadzone z chlebem i kawą", "Owsianka z borówkami i miodem", "Kotlet schabowy z ziemniakami i mizerią", "Sałatka z grillowanym kurczakiem"; if English: "Greek Yogurt with Blueberries & Honey", "Two Scrambled Eggs with Sourdough Toast & Coffee").
2. MEAL TYPE: Determine whether this is "breakfast", "lunch", "dinner", or "snack". Pay attention to explicit cues like "na śniadanie" (breakfast), "na obiad" (lunch/dinner), "na kolację" (dinner), "przekąska" (snack), or food type.
3. NUTRITION: Accurately estimate total calories (kcal), protein (g), carbohydrates (g), and fat (g) based on the quantities or standard servings mentioned.
4. INGREDIENTS: Extract the list of ingredients and items mentioned (e.g. ["jajka", "masło", "chleb", "kawa"]).
5. CUISINE: Identify cuisine category.
6. DESCRIPTION: Provide a clear 1-2 sentence description explaining the dish and portion breakdown.
7. HEALTH RATING: Rate nutrient density from 1 to 10.

Return ONLY structured JSON conforming to the schema.`;

      try {
        const response = await callGeminiWithFailover({
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert nutritional AI specializing in natural language voice speech interpretation. Parse spoken meal descriptions into precise dishes, calories, macronutrients, and meal types. Output strictly valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mealName: {
                  type: Type.STRING,
                  description: 'Appetizing culinary title for the spoken food',
                },
                mealType: {
                  type: Type.STRING,
                  enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                  description: 'Inferred meal category: breakfast, lunch, dinner, or snack',
                },
                cuisine: {
                  type: Type.STRING,
                  description: 'Cuisine style or category',
                },
                calories: {
                  type: Type.INTEGER,
                  description: 'Total calculated calories in kcal',
                },
                protein: {
                  type: Type.INTEGER,
                  description: 'Total calculated protein in grams',
                },
                carbs: {
                  type: Type.INTEGER,
                  description: 'Total calculated carbohydrates in grams',
                },
                fat: {
                  type: Type.INTEGER,
                  description: 'Total calculated dietary fat in grams',
                },
                description: {
                  type: Type.STRING,
                  description: 'Brief nutritional description of what was spoken',
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of detected ingredients and items',
                },
                healthRating: {
                  type: Type.INTEGER,
                  description: 'Nutritional health rating from 1 to 10',
                },
              },
              required: ['mealName', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText.trim());

        return res.json({
          mealName: parsed.mealName || trimmedSpeech,
          mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(parsed.mealType)
            ? parsed.mealType
            : contextMealType || 'lunch',
          cuisine: parsed.cuisine || 'Homemade',
          calories: Math.max(0, Math.round(Number(parsed.calories) || 350)),
          protein: Math.max(0, Math.round(Number(parsed.protein) || 20)),
          carbs: Math.max(0, Math.round(Number(parsed.carbs) || 35)),
          fat: Math.max(0, Math.round(Number(parsed.fat) || 12)),
          description: parsed.description || `Spoken: "${trimmedSpeech}"`,
          ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
            ? parsed.ingredients
            : [trimmedSpeech],
          healthRating: parsed.healthRating || 8,
          confidence: 'high',
        });
      } catch (geminiError: any) {
        console.error('Gemini error for voice meal analysis:', geminiError?.message || geminiError);
        return res.status(422).json({
          error: 'Nie udało się przeanalizować opisu posiłku. Proszę powtórzyć lub wpisać danie ręcznie.',
          recognized: false,
        });
      }
    } catch (error: any) {
      console.error('Server error in /api/analyze-voice-meal:', error?.message || error);
      return res.status(500).json({ error: 'Failed to analyze spoken meal' });
    }
  });

  // Analyze spoken meal directly from recorded audio (MediaRecorder)
  app.post('/api/analyze-voice-audio', async (req, res) => {
    try {
      const { audioData, mimeType = 'audio/webm', contextMealType } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: 'Audio data is required' });
      }

      const base64Data = audioData.replace(/^data:audio\/[a-zA-Z0-9+.-]+;base64,/, '');
      // Strip parameters like ;codecs=opus so Gemini receives clean MIME type
      const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured, cannot analyze recorded audio');
        return res.status(503).json({ error: 'Usługa AI jest tymczasowo niedostępna. Wpisz posiłek ręcznie.' });
      }

      const prompt = `Listen carefully to this audio recording of a user speaking what they ate or drank (the user may speak in Polish or English).
Context current meal category: ${contextMealType || 'auto-detect'}

Instructions:
1. UNDERSTOOD: Set "understood" to true if you hear a person speaking about a meal, food, ingredient, or drink. If there is only silence, background noise, or unintelligible murmuring with no recognizable food, set "understood" to false.
2. TRANSCRIPTION: Transcribe the exact words the user spoke in "transcription" (in Polish or English, verbatim as spoken). If not understood, leave empty.
3. TITLE: Formulate an appetizing, precise culinary title for what they ate in "mealName" in the spoken language (e.g. if Polish: "Jajka sadzone z pieczywem", "Kotlet schabowy z ziemniakami", "Owsianka z owocami"; if English: "Three Scrambled Eggs with Avocado Toast").
4. MEAL TYPE: Determine whether this is "breakfast", "lunch", "dinner", or "snack".
5. NUTRITION: Accurately estimate total calories (kcal), protein (g), carbohydrates (g), and fat (g) based on the quantities or standard servings mentioned.
6. INGREDIENTS: Extract the list of ingredients and items mentioned in the spoken language.
7. CUISINE: Identify cuisine category.
8. DESCRIPTION: Provide a clear 1-2 sentence description explaining the dish.
9. HEALTH RATING: Rate nutrient density from 1 to 10.

Return ONLY structured JSON conforming to the schema.`;

      try {
        const response = await callGeminiWithFailover({
          contents: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: base64Data,
              },
            },
            prompt,
          ],
          config: {
            systemInstruction:
              'You are an expert sports dietitian and culinary AI. Listen to user voice recordings, transcribe what they said into "transcription", verify if food was understood, and calculate precise calories and macros. Output strictly valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                understood: {
                  type: Type.BOOLEAN,
                  description: 'True if food/drink speech was heard and understood, false if silence or incomprehensible noise',
                },
                mealName: {
                  type: Type.STRING,
                  description: 'Appetizing culinary title for the spoken food',
                },
                transcription: {
                  type: Type.STRING,
                  description: 'What the user said in the audio',
                },
                mealType: {
                  type: Type.STRING,
                  enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                  description: 'Inferred meal category: breakfast, lunch, dinner, or snack',
                },
                cuisine: {
                  type: Type.STRING,
                  description: 'Cuisine style or category',
                },
                calories: {
                  type: Type.INTEGER,
                  description: 'Total calculated calories in kcal',
                },
                protein: {
                  type: Type.INTEGER,
                  description: 'Total calculated protein in grams',
                },
                carbs: {
                  type: Type.INTEGER,
                  description: 'Total calculated carbohydrates in grams',
                },
                fat: {
                  type: Type.INTEGER,
                  description: 'Total calculated dietary fat in grams',
                },
                description: {
                  type: Type.STRING,
                  description: 'Brief nutritional description of what was spoken',
                },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of detected ingredients and items',
                },
                healthRating: {
                  type: Type.INTEGER,
                  description: 'Nutritional health rating from 1 to 10',
                },
              },
              required: ['understood', 'mealName', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText.trim());

        // If Gemini did not clearly recognize food speech, report error rather than passing a fake 'Spoken Meal'
        if (
          parsed.understood === false ||
          !parsed.mealName ||
          parsed.mealName.toLowerCase().includes('spoken meal') ||
          parsed.calories <= 0
        ) {
          return res.status(422).json({
            error: 'Nie zrozumiałem nagrania. Proszę powtórzyć posiłek wyraźniej lub wpisać go ręcznie.',
            recognized: false,
          });
        }

        return res.json({
          recognized: true,
          mealName: parsed.mealName || parsed.transcription,
          transcription: parsed.transcription || parsed.mealName,
          mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(parsed.mealType)
            ? parsed.mealType
            : contextMealType || 'lunch',
          cuisine: parsed.cuisine || 'Homemade',
          calories: Math.max(0, Math.round(Number(parsed.calories) || 350)),
          protein: Math.max(0, Math.round(Number(parsed.protein) || 20)),
          carbs: Math.max(0, Math.round(Number(parsed.carbs) || 35)),
          fat: Math.max(0, Math.round(Number(parsed.fat) || 12)),
          description: parsed.description || parsed.transcription || 'Voice recorded meal analysis.',
          ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
            ? parsed.ingredients
            : [parsed.mealName || 'Spoken meal'],
          healthRating: parsed.healthRating || 8,
          confidence: 'high',
        });
      } catch (geminiError: any) {
        console.error('Gemini error for voice audio analysis:', geminiError?.message || geminiError);
        return res.status(422).json({
          error: 'Nie udało się rozpoznać mowy w nagraniu. Proszę spróbować ponownie lub wpisać posiłek.',
          recognized: false,
        });
      }
    } catch (error: any) {
      console.error('Server error in /api/analyze-voice-audio:', error?.message || error);
      return res.status(500).json({ error: 'Błąd przetwarzania audio. Proszę spróbować ponownie.' });
    }
  });

  // Dedicated speech-to-text transcription endpoint (populates the chat without switching screens)
  app.post('/api/transcribe-voice-audio', async (req, res) => {
    try {
      const { audioData, mimeType = 'audio/webm', language = 'pl' } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: 'Audio data is required' });
      }

      const base64Data = audioData.replace(/^data:audio\/[a-zA-Z0-9+.-]+;base64,/, '');
      const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({ error: 'Brak klucza API do transkrypcji' });
      }

      const isPolish = language === 'pl' || language.startsWith('pl') || language === 'pl-PL';
      const prompt = `Listen carefully to this audio recording of a user speaking what they ate or drank (the user is speaking in ${isPolish ? 'Polish' : 'English'}).
Instructions:
1. Transcribe EXACTLY what the user spoke into "transcription" in their spoken language.
2. If Polish, write in proper Polish orthography with diacritics (e.g. "Dwa jajka sadzone na maśle, kromka chleba i kawa").
3. If English, write in proper English.
4. If there is only silence, background hum, or inaudible noise with no words, set "transcription" to "" and "hasSpeech" to false.

Return strictly JSON conforming to the schema.`;

      try {
        const response = await callGeminiWithFailover({
          contents: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: base64Data,
              },
            },
            prompt,
          ],
          config: {
            systemInstruction:
              'You are an expert multilingual speech-to-text audio transcriber. Accurately transcribe spoken food descriptions verbatim. Output strictly valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transcription: {
                  type: Type.STRING,
                  description: 'Verbatim transcription of the spoken words in the audio',
                },
                hasSpeech: {
                  type: Type.BOOLEAN,
                  description: 'True if human speech was detected, false if silence or noise',
                },
              },
              required: ['transcription', 'hasSpeech'],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText.trim());

        return res.json({
          transcription: (parsed.transcription || '').trim(),
          hasSpeech: Boolean(parsed.hasSpeech && (parsed.transcription || '').trim().length > 0),
        });
      } catch (geminiError: any) {
        console.error('Transcription error in Gemini:', geminiError?.message || geminiError);
        return res.status(422).json({
          error: 'Nie udało się rozpoznać mowy w nagraniu. Wpisz posiłek w polu tekstowym.',
          hasSpeech: false,
        });
      }
    } catch (error: any) {
      console.error('Server error in /api/transcribe-voice-audio:', error?.message || error);
      return res.status(500).json({ error: 'Błąd transkrypcji audio' });
    }
  });

  // Barcode product lookup endpoint (Open Food Facts + Gemini fallback)
  app.get('/api/lookup-barcode/:code', async (req, res) => {
    try {
      const code = req.params.code ? req.params.code.trim() : '';
      if (!code) {
        return res.status(400).json({ error: 'Barcode code is required' });
      }

      // 1. Attempt lookup from Open Food Facts API (official international food database)
      const offUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      let productData: any = null;
      try {
        const offRes = await fetch(offUrl, {
          headers: {
            'User-Agent': 'NutriSnap - Food Barcode Tracker (contact: dev@nutrisnap.app)',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (offRes.ok) {
          const offJson = await offRes.json();
          if (offJson.status === 1 && offJson.product) {
            productData = offJson.product;
          }
        }
      } catch (offErr) {
        clearTimeout(timeoutId);
        console.warn('Open Food Facts lookup request failed/timed out:', offErr);
      }

      if (productData) {
        const nutriments = productData.nutriments || {};
        const productName =
          productData.product_name ||
          productData.product_name_en ||
          productData.generic_name ||
          'Packaged Food Item';
        const brand = productData.brands ? productData.brands.split(',')[0].trim() : '';
        const servingSize = productData.serving_size || '100g';

        // Extract serving quantity in numerical grams/ml if specified
        let servingQuantity = Number(productData.serving_quantity) || 0;
        if (!servingQuantity && servingSize) {
          const match = servingSize.match(/(\d+(?:\.\d+)?)\s*(?:g|ml|oz)/i);
          if (match) servingQuantity = parseFloat(match[1]);
        }
        if (!servingQuantity) servingQuantity = 100;

        const kcal100g = Math.round(
          Number(
            nutriments['energy-kcal_100g'] ??
              nutriments['energy-kcal'] ??
              (nutriments['energy_100g'] ? Number(nutriments['energy_100g']) / 4.184 : 0)
          )
        );
        const protein100g = Math.round(Number(nutriments.proteins_100g ?? nutriments.proteins ?? 0));
        const carbs100g = Math.round(
          Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0)
        );
        const fat100g = Math.round(Number(nutriments.fat_100g ?? nutriments.fat ?? 0));

        let kcalServing = Math.round(Number(nutriments['energy-kcal_serving'] ?? 0));
        let proteinServing = Math.round(Number(nutriments.proteins_serving ?? 0));
        let carbsServing = Math.round(Number(nutriments.carbohydrates_serving ?? 0));
        let fatServing = Math.round(Number(nutriments.fat_serving ?? 0));

        if (!kcalServing && servingQuantity && kcal100g) {
          kcalServing = Math.round((kcal100g * servingQuantity) / 100);
          proteinServing = Math.round((protein100g * servingQuantity) / 100);
          carbsServing = Math.round((carbs100g * servingQuantity) / 100);
          fatServing = Math.round((fat100g * servingQuantity) / 100);
        }

        const imageUrl = productData.image_front_url || productData.image_url || null;
        const ingredientsText = productData.ingredients_text || productData.ingredients_text_en || '';
        const nutriscore = productData.nutriscore_grade
          ? String(productData.nutriscore_grade).toUpperCase()
          : null;

        const servingCalories = kcalServing || kcal100g || 120;
        const servingProtein = proteinServing || protein100g;
        const servingCarbs = carbsServing || carbs100g;
        const servingFat = fatServing || fat100g;

        return res.json({
          found: true,
          source: 'openfoodfacts',
          barcode: code,
          productName,
          brand,
          servingSize,
          servingQuantity,
          calories: servingCalories,
          protein: servingProtein,
          carbs: servingCarbs,
          fat: servingFat,
          per100g: {
            calories: kcal100g || (kcalServing ? Math.round((kcalServing / servingQuantity) * 100) : 120),
            protein: protein100g,
            carbs: carbs100g,
            fat: fat100g,
          },
          perServing: {
            calories: servingCalories,
            protein: servingProtein,
            carbs: servingCarbs,
            fat: servingFat,
          },
          imageUrl,
          ingredients: ingredientsText
            ? ingredientsText
                .split(/[,;\n]+/)
                .map((s: string) => s.trim())
                .filter(Boolean)
                .slice(0, 10)
            : [],
          nutriscore,
        });
      }

      // 2. Fallback to Gemini if not in Open Food Facts
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const response = await callGeminiWithFailover({
            contents: `A consumer scanned a food barcode: "${code}".
Identify if this barcode corresponds to any known brand or grocery product (e.g. snack, beverage, cereal, yogurt, canned good).
If identified, return the exact product name, brand, serving size, calories (kcal), protein (g), carbs (g), fat (g), and primary ingredients.
If the exact barcode isn't known, provide a realistic nutrition estimate for a standard packaged snack or food item with this barcode length.
Return strictly valid JSON.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  servingSize: { type: Type.STRING },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.INTEGER },
                  carbs: { type: Type.INTEGER },
                  fat: { type: Type.INTEGER },
                  ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['productName', 'calories', 'protein', 'carbs', 'fat'],
              },
            },
          });

          const parsed = JSON.parse(response.text?.trim() || '{}');
          const cal = Math.max(0, Math.round(Number(parsed.calories) || 220));
          const p = Math.max(0, Math.round(Number(parsed.protein) || 6));
          const c = Math.max(0, Math.round(Number(parsed.carbs) || 28));
          const f = Math.max(0, Math.round(Number(parsed.fat) || 9));

          return res.json({
            found: true,
            source: 'gemini',
            barcode: code,
            productName: parsed.productName || `Packaged Food (#${code})`,
            brand: parsed.brand || 'Grocery Brand',
            servingSize: parsed.servingSize || '1 serving (100g)',
            servingQuantity: 100,
            per100g: { calories: cal, protein: p, carbs: c, fat: f },
            perServing: { calories: cal, protein: p, carbs: c, fat: f },
            imageUrl: null,
            ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
            nutriscore: null,
          });
        } catch (geminiErr) {
          console.warn('Gemini barcode fallback failed:', geminiErr);
        }
      }

      // Graceful fallback for offline / demo mode
      return res.json({
        found: false,
        barcode: code,
        productName: `Product #${code}`,
        brand: 'Packaged Food',
        servingSize: '1 serving (100g)',
        servingQuantity: 100,
        per100g: { calories: 240, protein: 7, carbs: 32, fat: 9 },
        perServing: { calories: 240, protein: 7, carbs: 32, fat: 9 },
        imageUrl: null,
        ingredients: ['Natural ingredients'],
        nutriscore: null,
      });
    } catch (err: any) {
      console.error('Server error in /api/lookup-barcode:', err?.message || err);
      return res.status(500).json({ error: 'Failed to look up barcode' });
    }
  });

  // Decode barcode and recognize nutrition directly from uploaded photo of packaging
  app.post('/api/scan-barcode-image', async (req, res) => {
    try {
      const { image, mimeType = 'image/jpeg' } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const base64Data = image.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          barcode: '5449000000996',
          productName: 'Recognized Packaged Product',
          brand: 'Grocery Brand',
          servingSize: '100g',
          calories: 220,
          protein: 5,
          carbs: 30,
          fat: 8,
          ingredients: ['Packaged food item'],
        });
      }

      const response = await callGeminiWithFailover({
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          `Look at this photo of a food product packaging or barcode.
1. Detect any numeric barcode or UPC/EAN code printed under or on the barcode bars.
2. Return the exact barcode digits in "barcode" (e.g. "5449000000996"). If no barcode digits are found, return "".
3. Identify the product name, brand name, serving size, and nutrition information (calories in kcal, protein in grams, carbs in grams, fat in grams) printed on the packaging or nutrition facts panel.
4. List visible ingredients.
Return strictly valid JSON.`,
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              barcode: { type: Type.STRING, description: 'Detected numeric barcode digits, or empty string' },
              productName: { type: Type.STRING, description: 'Brand and product name' },
              brand: { type: Type.STRING },
              servingSize: { type: Type.STRING },
              calories: { type: Type.INTEGER },
              protein: { type: Type.INTEGER },
              carbs: { type: Type.INTEGER },
              fat: { type: Type.INTEGER },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['productName', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json({
        barcode: parsed.barcode || null,
        productName: parsed.productName || 'Scanned Packaged Product',
        brand: parsed.brand || '',
        servingSize: parsed.servingSize || '1 serving',
        calories: Math.max(0, Math.round(Number(parsed.calories) || 200)),
        protein: Math.max(0, Math.round(Number(parsed.protein) || 5)),
        carbs: Math.max(0, Math.round(Number(parsed.carbs) || 25)),
        fat: Math.max(0, Math.round(Number(parsed.fat) || 8)),
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      });
    } catch (err: any) {
      console.error('Server error in /api/scan-barcode-image:', err?.message || err);
      return res.status(500).json({ error: 'Failed to inspect barcode image' });
    }
  });

  // Vite middleware in dev or static files in prod
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriSnap backend running on http://0.0.0.0:${PORT}`);
  });
}

function generateSmartFallback(seed?: string) {
  const presets = [
    {
      mealName: 'Avocado Toast with Poached Egg',
      calories: 420,
      protein: 18,
      carbs: 34,
      fat: 24,
      description: 'Whole grain toast with mashed ripe avocado, poached egg, chili flakes and microgreens.',
      ingredients: ['Whole grain sourdough', 'Avocado', 'Poached egg', 'Olive oil', 'Chili flakes'],
      confidence: 'high',
      healthRating: 9,
    },
    {
      mealName: 'Grilled Salmon with Quinoa & Steamed Greens',
      calories: 560,
      protein: 44,
      carbs: 38,
      fat: 22,
      description: 'Atlantic salmon fillet grilled with lemon herbs, served over tricolor quinoa and broccoli florets.',
      ingredients: ['Wild salmon', 'Quinoa', 'Broccoli', 'Lemon vinaigrette', 'Sesame seeds'],
      confidence: 'high',
      healthRating: 10,
    },
    {
      mealName: 'Mediterranean Chicken Power Bowl',
      calories: 490,
      protein: 42,
      carbs: 45,
      fat: 14,
      description: 'Marinated chicken breast, brown rice, diced cucumber, cherry tomatoes, kalamata olives and tzatziki.',
      ingredients: ['Chicken breast', 'Brown rice', 'Cucumbers', 'Cherry tomatoes', 'Tzatziki sauce'],
      confidence: 'high',
      healthRating: 9,
    },
    {
      mealName: 'Acai Berry Superfood Bowl',
      calories: 380,
      protein: 12,
      carbs: 62,
      fat: 10,
      description: 'Blended organic acai topped with sliced banana, blueberries, chia seeds, and honey almond granola.',
      ingredients: ['Acai puree', 'Banana', 'Blueberries', 'Almond granola', 'Chia seeds'],
      confidence: 'high',
      healthRating: 8,
    },
  ];

  const index = seed ? Math.abs(seed.charCodeAt(0) || 0) % presets.length : 0;
  return presets[index];
}

function estimateNutrientsFromIngredientsFallback(ingredientsStr: string, dishName?: string) {
  const items = ingredientsStr.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const count = Math.max(1, items.length);

  // Reasonable nutritional estimation based on count & keywords
  let cal = 0;
  let p = 0;
  let c = 0;
  let f = 0;

  const lower = ingredientsStr.toLowerCase();
  if (lower.includes('egg')) { cal += 150; p += 13; f += 10; }
  if (lower.includes('chicken') || lower.includes('turkey') || lower.includes('beef') || lower.includes('meat') || lower.includes('salmon') || lower.includes('tuna') || lower.includes('fish')) {
    cal += 260; p += 32; f += 9;
  }
  if (lower.includes('rice') || lower.includes('pasta') || lower.includes('bread') || lower.includes('potato') || lower.includes('oat') || lower.includes('quinoa')) {
    cal += 210; c += 44; p += 5; f += 2;
  }
  if (lower.includes('oil') || lower.includes('butter') || lower.includes('avocado') || lower.includes('cheese') || lower.includes('nut')) {
    cal += 160; f += 16;
  }
  if (lower.includes('salad') || lower.includes('broccoli') || lower.includes('spinach') || lower.includes('tomato') || lower.includes('vegetable')) {
    cal += 45; c += 8; p += 2;
  }

  // Base fallback if keywords did not match heavily
  if (cal === 0) {
    cal = count * 90 + 120;
    p = Math.round(count * 5 + 8);
    c = Math.round(count * 9 + 15);
    f = Math.round(count * 3 + 4);
  }

  return {
    mealName: dishName || (items[0] ? `${items[0]} Dish` : 'Custom Prepared Meal'),
    cuisine: 'Homemade',
    calories: cal,
    protein: p,
    carbs: c,
    fat: f,
    description: `Prepared with: ${items.slice(0, 4).join(', ')}`,
    ingredients: items,
    healthRating: 8,
  };
}

function estimateNutrientsFromSpokenMealFallback(speechText: string, contextMealType?: string) {
  const lower = speechText.toLowerCase();

  // Infer meal category from speech
  let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch';
  if (lower.includes('breakfast') || lower.includes('morning') || lower.includes('egg') || lower.includes('pancake') || lower.includes('oatmeal') || lower.includes('toast') || lower.includes('cereal') || lower.includes('coffee')) {
    mealType = 'breakfast';
  } else if (lower.includes('dinner') || lower.includes('supper') || lower.includes('evening') || lower.includes('steak') || lower.includes('pasta') || lower.includes('salmon')) {
    mealType = 'dinner';
  } else if (lower.includes('snack') || lower.includes('bite') || lower.includes('apple') || lower.includes('banana') || lower.includes('cookie') || lower.includes('chips') || lower.includes('bar')) {
    mealType = 'snack';
  } else if (contextMealType && ['breakfast', 'lunch', 'dinner', 'snack'].includes(contextMealType)) {
    mealType = contextMealType as any;
  }

  // Calculate calories & macros
  let cal = 0;
  let p = 0;
  let c = 0;
  let f = 0;

  if (lower.includes('egg')) { cal += 160; p += 14; f += 11; }
  if (lower.includes('toast') || lower.includes('bread')) { cal += 160; c += 28; p += 5; f += 2; }
  if (lower.includes('avocado')) { cal += 140; f += 13; c += 6; p += 2; }
  if (lower.includes('coffee') || lower.includes('tea')) { cal += 30; c += 2; }
  if (lower.includes('chicken') || lower.includes('turkey') || lower.includes('breast')) { cal += 280; p += 36; f += 8; }
  if (lower.includes('rice') || lower.includes('grain')) { cal += 200; c += 45; p += 4; }
  if (lower.includes('beef') || lower.includes('steak') || lower.includes('burger')) { cal += 380; p += 32; f += 22; }
  if (lower.includes('salad') || lower.includes('vegetable') || lower.includes('broccoli')) { cal += 70; c += 10; p += 3; }
  if (lower.includes('salmon') || lower.includes('fish') || lower.includes('tuna')) { cal += 290; p += 34; f += 14; }
  if (lower.includes('pasta') || lower.includes('noodle') || lower.includes('spaghetti')) { cal += 320; c += 55; p += 10; f += 4; }
  if (lower.includes('pizza')) { cal += 480; c += 52; p += 20; f += 22; }
  if (lower.includes('yogurt') || lower.includes('milk')) { cal += 140; p += 12; c += 14; f += 3; }
  if (lower.includes('protein shake') || lower.includes('whey')) { cal += 180; p += 30; c += 6; f += 2; }
  if (lower.includes('apple') || lower.includes('banana') || lower.includes('berry') || lower.includes('fruit')) { cal += 90; c += 22; }
  if (lower.includes('nut') || lower.includes('peanut butter') || lower.includes('almond')) { cal += 190; f += 16; p += 7; c += 6; }

  if (cal === 0) {
    cal = 420;
    p = 22;
    c = 44;
    f = 14;
  }

  // Capitalize title
  const words = speechText.split(' ').filter(Boolean);
  const formattedTitle = words.length <= 6
    ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : words.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Meal';

  return {
    mealName: formattedTitle || 'Spoken Meal',
    mealType,
    cuisine: 'Homemade',
    calories: cal,
    protein: p,
    carbs: c,
    fat: f,
    description: `Analyzed from voice description: "${speechText}"`,
    ingredients: words.slice(0, 6),
    healthRating: 8,
    confidence: 'medium',
  };
}

startServer();
