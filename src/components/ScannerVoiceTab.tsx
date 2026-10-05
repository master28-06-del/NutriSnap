import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Volume2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Radio,
  Square,
  Loader2,
  ExternalLink,
  Languages,
} from 'lucide-react';
import { transcribeVoiceAudio } from '../lib/gemini';

interface ScannerVoiceTabProps {
  onAnalyzeSpokenMeal: (speechText: string) => void;
  onAnalyzeVoiceAudio?: (base64Audio: string, mimeType?: string) => void;
  isAnalyzing: boolean;
  contextMealType?: string;
  voiceError?: string | null;
  onClearVoiceError?: () => void;
}

const VOICE_SAMPLE_PROMPTS_PL = [
  {
    label: '🍳 Jajecznica z pieczywem',
    text: 'Dwa jajka sadzone na maśle, kromka chleba żytniego i czarna kawa na śniadanie',
  },
  {
    label: '🥗 Sałatka z kurczakiem',
    text: '150 gramów grillowanego kurczaka z mixem sałat, pomidorkami, oliwą i fetą na obiad',
  },
  {
    label: '🥣 Owsianka z borówkami',
    text: 'Miska owsianki z bananem, borówkami, odżywką białkową i łyżką masła orzechowego',
  },
  {
    label: '🥩 Schabowy z ziemniakami',
    text: 'Kotlet schabowy z puree ziemniaczanym i mizerią ze śmietaną na obiad',
  },
  {
    label: '🍎 Przekąska z owocem',
    text: 'Jedno duże jabłko, banan i garść orzechów włoskich',
  },
];

const VOICE_SAMPLE_PROMPTS_EN = [
  {
    label: '🍳 Breakfast Omelette',
    text: 'Two scrambled eggs with whole wheat toast, a slice of cheddar cheese, and black coffee for breakfast',
  },
  {
    label: '🥗 Chicken Salad',
    text: '150 grams of grilled chicken breast with mixed greens, cherry tomatoes, cucumbers, olive oil dressing, and feta cheese',
  },
  {
    label: '🥣 Protein Oatmeal',
    text: 'A bowl of rolled oats with sliced banana, blueberries, one scoop of vanilla whey protein, and a tablespoon of peanut butter',
  },
  {
    label: '🍣 Salmon Bowl',
    text: 'Grilled salmon fillet with one cup of white rice, steamed broccoli, and soy sauce for dinner',
  },
  {
    label: '🍎 Quick Snack',
    text: 'One medium green apple with two tablespoons of crunchy almond butter',
  },
];

const NUM_BARS = 18;

export const ScannerVoiceTab: React.FC<ScannerVoiceTabProps> = ({
  onAnalyzeSpokenMeal,
  onAnalyzeVoiceAudio,
  isAnalyzing,
  contextMealType,
  voiceError,
  onClearVoiceError,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(() => new Array(NUM_BARS).fill(8));
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isCheckingPermission, setIsCheckingPermission] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [emptySpeechWarning, setEmptySpeechWarning] = useState<string | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<string>(() => {
    if (typeof navigator !== 'undefined') {
      const l = (navigator.language || '').toLowerCase();
      if (l.startsWith('en')) return 'en-US';
    }
    return 'pl-PL';
  });

  // References
  const isListeningRef = useRef<boolean>(false);
  const spokenTextRef = useRef<string>('');
  const persistedTextRef = useRef<string>('');
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Dynamically monitor microphone permission without requiring page reload
  useEffect(() => {
    let permObj: PermissionStatus | null = null;

    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          permObj = status;
          setMicPermissionState(status.state as any);
          if (status.state === 'granted') {
            setPermissionError(null);
          }

          status.onchange = () => {
            setMicPermissionState(status.state as any);
            if (status.state === 'granted') {
              setPermissionError(null);
            } else if (status.state === 'denied') {
              setPermissionError(
                'Microphone permission is blocked in browser settings. You can allow it in your browser address bar without reloading the page.'
              );
            }
          };
        } catch {
          // 'microphone' query not supported in some browsers
        }
      }
    };

    checkPermission();

    // When user returns from browser address bar / site settings popup
    const handleWindowFocus = () => {
      checkPermission();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (permObj) {
        permObj.onchange = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Setup live audio visualizer
  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdate = 0;

      const loop = (timestamp: number) => {
        if (!isListeningRef.current) return;

        // Throttle updates to ~18 FPS to eliminate React layout thrashing and jumping
        if (timestamp - lastUpdate >= 55) {
          lastUpdate = timestamp;

          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            const newBars: number[] = [];
            const step = Math.max(1, Math.floor(dataArray.length / NUM_BARS));

            for (let i = 0; i < NUM_BARS; i++) {
              const val = dataArray[Math.min(dataArray.length - 1, i * step)] || 0;
              const pct = Math.max(8, Math.min(100, Math.round((val / 220) * 100)));
              newBars.push(pct);
              sum += val;
            }

            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 90) * 100));

            setAudioLevel(normalized);
            setFrequencyBars(newBars);
            setIsSpeaking(normalized > 10);
          }
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.warn('AudioContext visualizer error:', err);
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Microphone recording is not supported in this browser. You can type what you ate below.'
        );
      }

      // 1. Get microphone access with universal compatibility
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (errAudioTrue: any) {
        // Fallback without special constraints
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
          },
        });
      }

      // Clear any permission error only after stream is successfully acquired
      setPermissionError(null);
      setMicPermissionState('granted');

      micStreamRef.current = stream;
      isListeningRef.current = true;
      setIsListening(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // 2. Setup Audio Visualizer
      setupAudioVisualizer(stream);

      // 3. Setup MediaRecorder
      try {
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          '',
        ];
        let supportedMime = '';
        for (const type of mimeTypes) {
          if (!type || MediaRecorder.isTypeSupported(type)) {
            supportedMime = type;
            break;
          }
        }

        const recorderOptions = supportedMime ? { mimeType: supportedMime } : undefined;
        const mediaRecorder = new MediaRecorder(stream, recorderOptions);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(200); // 200ms slices
      } catch (recErr) {
        console.warn('MediaRecorder error:', recErr);
      }

      // Reset accumulated speech on new session start
      persistedTextRef.current = '';
      spokenTextRef.current = '';
      setTranscript('');
      setInterimText('');

      // 4. Real-Time Speech Recognition (continuously streams live text as you speak)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = speechLang;

          recognition.onstart = () => {
            setIsListening(true);
            isListeningRef.current = true;
          };

          recognition.onspeechstart = () => {
            setIsSpeaking(true);
          };

          recognition.onspeechend = () => {
            setIsSpeaking(false);
          };

          recognition.onresult = (event: any) => {
            let sessionFinal = '';
            let sessionInterim = '';

            for (let i = 0; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                sessionFinal += res[0].transcript + ' ';
              } else {
                sessionInterim += res[0].transcript;
              }
            }

            const prefix = persistedTextRef.current ? persistedTextRef.current.trim() + ' ' : '';
            const combinedFinal = (prefix + sessionFinal).trim();
            const combinedAll = (combinedFinal + (sessionInterim ? ' ' + sessionInterim : '')).trim();

            if (combinedAll) {
              spokenTextRef.current = combinedAll;
              setTranscript(combinedAll);
              setEmptySpeechWarning(null);
              setIsSpeaking(true);
            }
          };

          recognition.onerror = (event: any) => {
            if (event?.error === 'no-speech') return;
            console.warn('SpeechRecognition event:', event?.error);
          };

          recognition.onend = () => {
            if (spokenTextRef.current) {
              persistedTextRef.current = spokenTextRef.current;
            }
            // Seamlessly restart if user is still actively speaking/listening
            if (isListeningRef.current && recognitionRef.current) {
              try {
                recognition.start();
              } catch (e) {
                // ignore
              }
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (recogStartErr) {
          console.warn('SpeechRecognition start error:', recogStartErr);
          recognitionRef.current = null;
        }
      }
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setIsListening(false);
      isListeningRef.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionState('denied');
        setPermissionError(
          'Microphone permission is currently off. Click "Pop Up / Test Permission" below or toggle it to Allow in your browser address bar. No page reload needed!'
        );
      } else {
        setPermissionError(
          err.message || 'Could not access your microphone. You can type what you ate below.'
        );
      }
    }
  };

  // Manually prompt or test microphone permission without page reload or layout shift
  const handleRequestPermissionAgain = async () => {
    setIsCheckingPermission(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser.');
      }
      // Start recording directly with universal audio: true
      await startVoiceRecording();
      setIsCheckingPermission(false);
    } catch (err: any) {
      setIsCheckingPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionState('denied');
        setPermissionError(
          'Microphone permission is still off in browser settings. If you already allowed it in your browser address bar (🔒), tap "Try Microphone Now" again or open in a new tab.'
        );
      } else {
        setPermissionError(err.message || 'Could not access microphone. You can type what you ate below.');
      }
    }
  };

  // Stop UI meters, animations, and speech recognition
  const stopVoiceUiAndSpeech = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    setInterimText('');
    setFrequencyBars(new Array(NUM_BARS).fill(8));

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  // Release microphone hardware and audio context (called only after recorder has finished)
  const releaseMicHardware = () => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  };

  const cleanupAudio = () => {
    stopVoiceUiAndSpeech();
    releaseMicHardware();
  };

  // Stop recording and reliably return the complete audio Blob
  const stopVoiceRecordingAndGetBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      stopVoiceUiAndSpeech();

      let resolved = false;
      const finish = (blob: Blob | null) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimeout);
        releaseMicHardware();
        resolve(blob);
      };

      // 2000ms safety timeout: ensures browser has plenty of time to flush and encode audio
      const safetyTimeout = setTimeout(() => {
        if (audioChunksRef.current.length > 0) {
          const mime = recorder?.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mime });
          finish(blob);
        } else {
          finish(null);
        }
      }, 2000);

      if (!recorder || recorder.state === 'inactive') {
        if (audioChunksRef.current.length > 0) {
          finish(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        } else {
          finish(null);
        }
        return;
      }

      if (recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch (e) {
          // ignore
        }
      }

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const mime = recorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mime });
          finish(blob);
        } else {
          finish(null);
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        if (audioChunksRef.current.length > 0) {
          finish(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        } else {
          finish(null);
        }
      }
    });
  };

  // Stop recording and ensure the chat textarea has transcribed text!
  const handleStopRecordingAndTranscribe = async () => {
    setIsListening(false);
    isListeningRef.current = false;
    const audioBlob = await stopVoiceRecordingAndGetBlob();
    cleanupAudio();

    // Check if SpeechRecognition already populated the chat
    const currentText = spokenTextRef.current.trim() || transcript.trim() || fullSpokenText;
    if (currentText) {
      // SpeechRecognition captured text live!
      setEmptySpeechWarning(null);
      return;
    }

    // If SpeechRecognition didn't catch text (e.g. browser restriction), transcribe audio directly into chat!
    if (audioBlob && audioBlob.size > 80) {
      setIsTranscribingAudio(true);
      try {
        const base64Audio = await blobToBase64(audioBlob);
        const langCode = speechLang.startsWith('en') ? 'en' : 'pl';
        const res = await transcribeVoiceAudio(base64Audio, audioBlob.type || 'audio/webm', langCode);
        setIsTranscribingAudio(false);

        if (res.hasSpeech && res.transcription) {
          spokenTextRef.current = res.transcription;
          persistedTextRef.current = res.transcription;
          setTranscript(res.transcription);
          setEmptySpeechWarning(null);
        } else {
          setEmptySpeechWarning(
            speechLang === 'pl-PL'
              ? 'Nie usłyszałem mowy w nagraniu. Powtórz posiłek lub wpisz go w polu tekstowym poniżej.'
              : 'Could not detect speech in recording. Please repeat or type below.'
          );
        }
      } catch (err) {
        setIsTranscribingAudio(false);
        setEmptySpeechWarning(
          speechLang === 'pl-PL'
            ? 'Nie udało się rozpoznać mowy. Wpisz posiłek w polu tekstowym poniżej.'
            : 'Could not transcribe speech. Please type your meal below.'
        );
      }
    } else {
      setEmptySpeechWarning(
        speechLang === 'pl-PL'
          ? 'Nie wykryto dźwięku mowy. Powiedz posiłek lub wpisz go w pole poniżej.'
          : 'No speech detected. Please speak or type below.'
      );
    }
  };

  // User taps Speak or Stop
  const handleToggleListening = async () => {
    if (isListening) {
      await handleStopRecordingAndTranscribe();
    } else {
      startVoiceRecording();
    }
  };

  const fullSpokenText = (transcript + (interimText ? ' ' + interimText : '')).trim();

  // Core function to analyze spoken meal (handles verified text transcript from speech or manual input)
  const handleProcessSpokenMeal = async () => {
    cleanupAudio();
    setIsListening(false);
    isListeningRef.current = false;
    setIsProcessingAudio(false);

    if (onClearVoiceError) onClearVoiceError();

    const textCandidate = spokenTextRef.current.trim() || transcript.trim() || fullSpokenText;

    // Strict rule: If nothing is detected in the chat, DO NOT switch screen or show thinking loader!
    if (!textCandidate) {
      setEmptySpeechWarning(
        speechLang === 'pl-PL'
          ? 'Czat mowy jest pusty. Powiedz co zjadłeś lub wpisz posiłek w polu tekstowym poniżej, a następnie kliknij Przelicz.'
          : 'No speech text detected. Speak your meal or type it in the text area below to calculate.'
      );
      return;
    }

    // Verified text exists -> proceed to analyze with Gemini AI
    setEmptySpeechWarning(null);
    onAnalyzeSpokenMeal(textCandidate);
  };

  const handleClear = () => {
    cleanupAudio();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    spokenTextRef.current = '';
    persistedTextRef.current = '';
    setTranscript('');
    setInterimText('');
    setPermissionError(null);
    setEmptySpeechWarning(null);
    if (onClearVoiceError) onClearVoiceError();
    audioChunksRef.current = [];
    setRecordingSeconds(0);
  };

  const isBusy = isAnalyzing || isProcessingAudio;

  // Subtle Scale for the Microphone Button (smooth pulse without shaking layout)
  const dynamicScale = isListening
    ? 1 + Math.min(0.06, (audioLevel / 100) * 0.06)
    : 1;

  return (
    <div className="space-y-4 py-1">
      {/* Top Banner & Status */}
      <div className="bg-slate-950/70 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                AI Voice Meal Detector
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Voice
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Speak what you ate in natural language. Gemini AI extracts dish, calories & macros.
              </p>
            </div>
          </div>

          {contextMealType && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
              {contextMealType}
            </span>
          )}
        </div>

        {/* Dedicated Language Switcher Tab Bar */}
        <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2 pl-2 text-xs font-bold text-slate-300">
            <Languages className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{speechLang === 'pl-PL' ? 'Język mowy (Language):' : 'Speech Language:'}</span>
          </div>

          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800/90 rounded-lg gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setSpeechLang('pl-PL');
                setEmptySpeechWarning(null);
              }}
              className={`px-3 py-1.5 rounded-md font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                speechLang === 'pl-PL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>🇵🇱 Polski (Domyślny)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSpeechLang('en-US');
                setEmptySpeechWarning(null);
              }}
              className={`px-3 py-1.5 rounded-md font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                speechLang === 'en-US'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>🇬🇧 English</span>
            </button>
          </div>
        </div>

        {/* Central Voice Recording Interactive Stage */}
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Reactive Ambient Glow */}
          {isListening && (
            <>
              <div
                className="absolute inset-0 bg-radial from-emerald-500/25 via-emerald-500/5 to-transparent pointer-events-none transition-all duration-75"
                style={{
                  opacity: Math.max(0.15, audioLevel / 75),
                  transform: `scale(${1 + (audioLevel / 100) * 0.25})`,
                }}
              />
              <div className="absolute inset-0 bg-radial from-teal-400/15 via-transparent to-transparent pointer-events-none animate-pulse" />
            </>
          )}

          {/* Dynamic Voice Activity & Timer Badge (Clean emerald & teal, stable layout) */}
          <div className="mb-3 h-7 flex items-center justify-center">
            {isBusy ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing & Recognizing with Gemini AI...</span>
              </div>
            ) : isListening ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-850 border border-emerald-500/40 text-xs font-bold shadow-lg shadow-emerald-500/10 min-w-[130px] justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-100 font-mono">{formatTime(recordingSeconds)}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  Recording
                </span>
              </div>
            ) : fullSpokenText ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Speech Captured! Ready to analyze</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Tap the microphone below to start speaking
              </span>
            )}
          </div>

          {/* Interactive Microphone Button with Multi-Layer Moving Sound Rings */}
          <div className="relative mb-5 flex items-center justify-center w-36 h-36">
            {/* Concentric Animated Sound Waves */}
            {isListening && (
              <>
                {/* Wave Ring 3 */}
                <div
                  className="absolute rounded-full border border-teal-400/30 pointer-events-none transition-all duration-75 ease-out"
                  style={{
                    width: `${105 + audioLevel * 0.8}px`,
                    height: `${105 + audioLevel * 0.8}px`,
                    opacity: Math.max(0.1, Math.min(0.6, audioLevel / 80)),
                  }}
                />

                {/* Wave Ring 2 */}
                <div
                  className="absolute rounded-full border-2 border-emerald-400/40 pointer-events-none transition-all duration-75 ease-out"
                  style={{
                    width: `${90 + audioLevel * 0.55}px`,
                    height: `${90 + audioLevel * 0.55}px`,
                    opacity: Math.max(0.2, Math.min(0.8, audioLevel / 60)),
                  }}
                />

                {/* Inner Wave Ring 1 */}
                <div
                  className="absolute rounded-full bg-emerald-500/20 blur-md pointer-events-none transition-all duration-75 ease-out"
                  style={{
                    width: `${75 + audioLevel * 0.4}px`,
                    height: `${75 + audioLevel * 0.4}px`,
                  }}
                />
              </>
            )}

            {/* The Main Moving Microphone Button (Emerald/Teal/Cyan theme, never jumps to red) */}
            <button
              type="button"
              onClick={handleToggleListening}
              disabled={isBusy}
              style={{
                transform: `scale(${dynamicScale})`,
                transition: 'transform 0.08s ease-out',
              }}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl cursor-pointer select-none transition-colors duration-150 active:opacity-90 ${
                isListening
                  ? isSpeaking
                    ? 'bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-300 text-slate-950 ring-4 ring-emerald-300/80 shadow-emerald-400/60'
                    : 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 ring-4 ring-emerald-400/50 shadow-emerald-500/40'
                  : 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/30'
              }`}
              title={isListening ? 'Click to stop & analyze' : 'Click to start speaking'}
              aria-label={isListening ? 'Stop & analyze' : 'Start speaking'}
            >
              {isBusy ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-950" />
              ) : isListening ? (
                <>
                  <Square className="w-7 h-7 fill-current stroke-[2.5]" />
                  <span className="text-[10px] font-black tracking-wider mt-1 uppercase">
                    Stop
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9 stroke-[2.5]" />
                  <span className="text-[10px] font-black tracking-wider mt-1 uppercase">
                    Speak
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Dancing Audio Equalizer Waveform Bars */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-12 w-full max-w-xs mb-3 px-2">
            {frequencyBars.map((barLevel, i) => {
              const height = isListening
                ? Math.max(6, Math.min(44, Math.round((barLevel / 100) * 44)))
                : 6;

              return (
                <div
                  key={i}
                  className={`w-1.5 sm:w-2 rounded-full transition-all duration-75 flex flex-col justify-end ${
                    isListening
                      ? isSpeaking
                        ? 'bg-gradient-to-t from-emerald-500 via-teal-300 to-cyan-300 shadow-[0_0_8px_#10b981]'
                        : 'bg-gradient-to-t from-emerald-600 to-teal-400'
                      : 'bg-slate-800'
                  }`}
                  style={{
                    height: `${height}px`,
                  }}
                />
              );
            })}
          </div>

          {/* Status Instructions - Locked Fixed Height to prevent any layout jumping */}
          <div className="min-h-[44px] flex flex-col items-center justify-center max-w-sm px-2 text-center">
            {isBusy ? (
              <p className="text-xs font-bold text-emerald-300">
                {speechLang === 'pl-PL'
                  ? 'Gemini AI analizuje Twój posiłek i wylicza makroskładniki...'
                  : 'Gemini AI is analyzing your voice meal description...'}
              </p>
            ) : isListening ? (
              <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {speechLang === 'pl-PL'
                    ? 'Słucham na żywo... Mów co zjadłeś, potem dotknij Stop'
                    : 'Listening live... Speak your meal, then tap Stop'}
                </span>
              </p>
            ) : fullSpokenText ? (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {speechLang === 'pl-PL'
                    ? 'Mowa zarejestrowana! Dotknij przycisku poniżej, aby przeanalizować.'
                    : 'Speech recognized! Tap the button below to review summary.'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-300 font-medium">
                {speechLang === 'pl-PL'
                  ? 'Dotknij Speak, powiedz co zjadłeś, a potem dotknij Stop'
                  : 'Tap the microphone, say what you ate, then tap Stop to analyze'}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              {speechLang === 'pl-PL'
                ? 'Gemini AI automatycznie rozpoznaje danie, składniki, kalorie i makroskładniki.'
                : 'Gemini AI automatically recognizes the dish, estimates calories, and calculates macros.'}
            </p>
          </div>
        </div>

        {/* Permission / Error Warning with In-Place Action (No Page Reload Needed) */}
        {permissionError && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 transition-all duration-200 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-amber-300">Microphone Access</p>
                  <button
                    type="button"
                    onClick={() => setPermissionError(null)}
                    className="text-[10px] text-amber-400/80 hover:text-amber-200 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90">{permissionError}</p>
                <div className="pt-0.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestPermissionAgain}
                    disabled={isCheckingPermission}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:opacity-90 disabled:opacity-50"
                  >
                    {isCheckingPermission ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{isCheckingPermission ? 'Activating Microphone...' : 'Try Microphone Now'}</span>
                  </button>

                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Open app in a new top-level tab to ensure full microphone hardware access"
                  >
                    <span>Open in Full Tab</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <span className="text-[10px] text-slate-400 font-medium">
                    (No page reload required)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty Speech Warning (stays on the voice page, no screen switch) */}
        {emptySpeechWarning && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 transition-all shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-300">
                    {speechLang === 'pl-PL' ? 'Wpisz lub powiedz posiłek' : 'Speak or type your meal'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmptySpeechWarning(null)}
                    className="text-[10px] text-emerald-400/80 hover:text-emerald-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-100/90">
                  {emptySpeechWarning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Unrecognized Voice Notification */}
        {voiceError && (
          <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-xs text-amber-200 transition-all shadow-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-amber-300 text-sm">
                    {speechLang === 'pl-PL' ? 'Nie zrozumiałem Twojej wypowiedzi' : 'Speech Not Understood'}
                  </p>
                  {onClearVoiceError && (
                    <button
                      type="button"
                      onClick={onClearVoiceError}
                      className="text-[11px] text-amber-400/80 hover:text-amber-200 font-bold cursor-pointer"
                    >
                      {speechLang === 'pl-PL' ? 'Zamknij ✕' : 'Dismiss ✕'}
                    </button>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-amber-100 font-medium">
                  {voiceError}
                </p>
                <p className="text-[11px] text-amber-300/90 font-medium">
                  {speechLang === 'pl-PL'
                    ? '💡 Wskazówka: Powtórz wolniej i bliżej mikrofonu (np. "Dwa jajka sadzone na maśle, chleb i kawa"), lub wpisz posiłek bezpośrednio w pole tekstowe poniżej.'
                    : '💡 Please speak closer to your microphone or type what you ate in the text box below.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live / Editable Transcript Area (Displays what the user said in real time!) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <span>{speechLang === 'pl-PL' ? 'Transkrypcja mowy na żywo' : 'What You Said (Transcribed Speech)'}</span>
              {isListening && (
                <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                  {speechLang === 'pl-PL' ? '(Słucham i zapisuję na żywo...)' : '(Listening live...)'}
                </span>
              )}
            </label>
            {fullSpokenText && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[10px] font-semibold transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{speechLang === 'pl-PL' ? 'Wyczyść' : 'Clear / Reset'}</span>
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={fullSpokenText}
              onChange={(e) => {
                setTranscript(e.target.value);
                spokenTextRef.current = e.target.value;
                persistedTextRef.current = e.target.value;
                setInterimText('');
                setEmptySpeechWarning(null);
              }}
              placeholder={
                isTranscribingAudio
                  ? speechLang === 'pl-PL'
                    ? '🎙️ Gemini AI odsłuchuje Twoje nagranie i wpisuje tekst do czatu...'
                    : '🎙️ Gemini AI is listening to your recording and writing it down...'
                  : isListening
                  ? speechLang === 'pl-PL'
                    ? 'Słucham... Twoje słowa pojawiają się tutaj na żywo w trakcie mówienia (np. "Dwa jajka sadzone na maśle, chleb i kawa")...'
                    : 'Listening for your voice... words will appear here live as you speak (e.g. "Two scrambled eggs with toast and coffee")...'
                  : speechLang === 'pl-PL'
                    ? 'Dotknij Speak powyżej i powiedz co zjadłeś, lub wpisz posiłek ręcznie tutaj...'
                    : 'Your spoken meal transcription will appear here. You can also edit or type manually.'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
            />

            {isTranscribingAudio && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold text-emerald-300 border border-emerald-500/40">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>
                  {speechLang === 'pl-PL'
                    ? '🎙️ Gemini AI odsłuchuje i wpisuje mowę do czatu...'
                    : '🎙️ Gemini AI is transcribing audio into text...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: Analyze Spoken Meal */}
        <button
          type="button"
          onClick={isListening ? handleStopRecordingAndTranscribe : handleProcessSpokenMeal}
          disabled={isBusy || isTranscribingAudio || (!isListening && !fullSpokenText)}
          className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 ${
            !isListening && !fullSpokenText
              ? 'bg-slate-850 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25 cursor-pointer'
          }`}
        >
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{speechLang === 'pl-PL' ? 'Gemini AI analizuje Twój posiłek...' : 'Gemini AI Transcribing & Analyzing...'}</span>
            </>
          ) : isTranscribingAudio ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>{speechLang === 'pl-PL' ? 'Wpisywanie mowy do czatu...' : 'Transcribing into text...'}</span>
            </>
          ) : isListening ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>{speechLang === 'pl-PL' ? 'Zatrzymaj i wpisz do czatu' : 'Stop & Write to Chat'}</span>
            </>
          ) : fullSpokenText ? (
            <>
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>{speechLang === 'pl-PL' ? 'Przelicz posiłek z Gemini AI' : 'Analyze Spoken Meal with Gemini AI'}</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>{speechLang === 'pl-PL' ? 'Wpisz lub powiedz posiłek, aby przeliczyć' : 'Speak or type a meal to analyze'}</span>
            </>
          )}
        </button>

        {/* Quick Voice Sample Chips for 1-Tap Convenience */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {speechLang === 'pl-PL'
                ? 'Lub wypróbuj gotowy przykładowy posiłek (1 kliknięcie):'
                : 'Or try quick spoken meal examples:'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(speechLang === 'pl-PL' ? VOICE_SAMPLE_PROMPTS_PL : VOICE_SAMPLE_PROMPTS_EN).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  cleanupAudio();
                  setTranscript(prompt.text);
                  spokenTextRef.current = prompt.text;
                  persistedTextRef.current = prompt.text;
                  setInterimText('');
                }}
                className="py-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 hover:border-emerald-500/40 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-medium transition-all text-left flex items-center gap-1 cursor-pointer"
                title={prompt.text}
              >
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ScannerVoiceTab;
