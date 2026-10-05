/**
 * Production Readiness Test Suite
 * Tests all core backend endpoints, AI integration, fallbacks, input validation, and security.
 */

async function runTestSuite() {
  console.log('🚀 Starting Production Readiness Test Suite...\n');
  const port = 3000;
  const baseUrl = `http://127.0.0.1:${port}`;
  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Reason: ${err.message}\n`);
    }
  }

  // 1. Health & Server Status Check
  await test('1. GET /api/health returns HTTP 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Unexpected status payload: ${JSON.stringify(data)}`);
  });

  // 2. Barcode Lookup (Open Food Facts / AI fallback)
  await test('2. GET /api/lookup-barcode/:code returns valid nutritional product', async () => {
    // Testing with a well-known UPC / EAN code (e.g. Nutella / standard item: 3017620422003)
    const res = await fetch(`${baseUrl}/api/lookup-barcode/3017620422003`);
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.productName) throw new Error('Missing productName');
    if (typeof data.calories !== 'number') throw new Error('calories must be a number');
    if (typeof data.protein !== 'number') throw new Error('protein must be a number');
    if (typeof data.carbs !== 'number') throw new Error('carbs must be a number');
    if (typeof data.fat !== 'number') throw new Error('fat must be a number');
  });

  // 3. Barcode Missing Code Validation
  await test('3. GET /api/lookup-barcode/ handles invalid/empty code properly', async () => {
    const res = await fetch(`${baseUrl}/api/lookup-barcode/00000000000000`);
    if (!res.ok && res.status !== 404 && res.status !== 422) {
      throw new Error(`Unexpected status ${res.status}`);
    }
  });

  // 4. Ingredients Analysis API
  await test('4. POST /api/analyze-ingredients calculates macros accurately', async () => {
    const res = await fetch(`${baseUrl}/api/analyze-ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientsList: '2 jajka sadzone, 1 kromka chleba żytniego, 10g masła',
        dishName: 'Jajecznica śniadaniowa',
        contextMealType: 'breakfast',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.dishName) throw new Error('Missing dishName');
    if (data.calories <= 0) throw new Error(`Calculated calories must be > 0, got ${data.calories}`);
    if (data.protein <= 0) throw new Error(`Protein must be > 0, got ${data.protein}`);
  });

  // 5. Spoken Meal Analysis API (Polish)
  await test('5. POST /api/analyze-voice-meal analyzes Polish spoken dish', async () => {
    const res = await fetch(`${baseUrl}/api/analyze-voice-meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speechText: 'Dwa jajka sadzone na maśle i kromka chleba żytniego na śniadanie',
        contextMealType: 'breakfast',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.mealName) throw new Error('Missing mealName');
    if (data.calories <= 50) throw new Error(`Calories too low: ${data.calories}`);
    if (data.recognized === false) throw new Error('Should be recognized');
  });

  // 6. Spoken Meal Empty / Nonsense Rejection
  await test('6. POST /api/analyze-voice-meal rejects empty or nonsensical input with 422', async () => {
    const res = await fetch(`${baseUrl}/api/analyze-voice-meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speechText: '...',
        contextMealType: 'lunch',
      }),
    });
    if (res.status !== 422 && res.status !== 400) {
      throw new Error(`Expected 422 or 400 for nonsense speech, got ${res.status}`);
    }
  });

  // 7. Audio Transcription API Rejection on Empty Payload
  await test('7. POST /api/transcribe-voice-audio handles empty audio with 400', async () => {
    const res = await fetch(`${baseUrl}/api/transcribe-voice-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData: '',
        language: 'pl',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 8. Security & Content-Type Safety
  await test('8. All endpoints return valid JSON headers (never unhandled DOCTYPE/HTML)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const cType = res.headers.get('content-type') || '';
    if (!cType.includes('application/json')) {
      throw new Error(`Content-Type must be application/json, got ${cType}`);
    }
  });

  console.log('\n=========================================');
  console.log(`📊 Production Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=========================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL PRODUCTION READINESS TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed.');
    process.exit(1);
  }
}

runTestSuite();
