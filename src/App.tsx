import React, { useState, useRef } from 'react';
import { Camera, Plus, Calendar, ChevronLeft, ChevronRight, Sparkles, UploadCloud, Image as ImageIcon, Salad, Bookmark, ScanBarcode, BellRing, Download, Mic } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { MealTrackerProvider } from './context/MealTrackerContext';
import { useMealTracker } from './hooks/useMealTracker';
import { DashboardCard } from './components/DashboardCard';
import { MealHistoryList } from './components/MealHistoryList';
import { MealScanner, ScannerTab } from './components/MealScanner';
import { EditGoalsModal } from './components/EditGoalsModal';
import { MealDetailModal } from './components/MealDetailModal';
import { MealRemindersModal } from './components/MealRemindersModal';
import { ReminderBanner } from './components/ReminderBanner';
import { PWAInstallButton } from './components/PWAInstallButton';
import { InstallAppModal } from './components/InstallAppModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UserAccountButton } from './components/UserAccountButton';
import { ExportDataModal } from './components/ExportDataModal';
import { LoggedMeal, MealCategory } from './types/meal';

function MainApp() {
  const { selectedDate, setSelectedDate, isToday, unreadNotificationCount } = useMealTracker();

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerDefaultTab, setScannerDefaultTab] = useState<ScannerTab>('gallery');
  const [scannerInitialMealType, setScannerInitialMealType] = useState<MealCategory | undefined>(undefined);
  const [initialImageBase64, setInitialImageBase64] = useState<string | null>(null);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState<boolean>(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [inspectedMeal, setInspectedMeal] = useState<LoggedMeal | null>(null);
  const [showInfoBanner, setShowInfoBanner] = useState<boolean>(true);

  const mainFileInputRef = useRef<HTMLInputElement | null>(null);

  // Date navigation helpers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleResetToToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const openScannerWithTab = (tab: ScannerTab = 'gallery', mealType?: MealCategory) => {
    setInitialImageBase64(null);
    setScannerDefaultTab(tab);
    setScannerInitialMealType(mealType);
    setIsScannerOpen(true);
  };

  const handleDirectPhotoImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setInitialImageBase64(base64);
        setScannerDefaultTab('gallery');
        setScannerInitialMealType(undefined);
        setIsScannerOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white pb-24 sm:pb-16 w-full max-w-[100vw] overflow-x-hidden">
      {/* Hidden file input for 1-click photo import */}
      <input
        ref={mainFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDirectPhotoImport}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 w-full overflow-x-hidden">
        <div className="max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5">
          {/* Main Top Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/25 shrink-0">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white truncate">
                    NutriSnap
                  </span>
                  <span className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    AI Vision
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block truncate">
                  Smart Food & Dish Recognition
                </p>
              </div>
            </div>

            {/* Right Action Icons & Desktop Date Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Desktop Date Selector: hidden on mobile, visible on sm+ */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0 h-9 sm:h-10">
                <button
                  onClick={() => handleShiftDate(-1)}
                  className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetToToday}
                  className={`h-7 sm:h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isToday
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{isToday ? 'Today' : formattedDate}</span>
                </button>

                <button
                  onClick={() => handleShiftDate(1)}
                  className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Install PWA Button */}
              <PWAInstallButton onOpenInstallModal={() => setIsInstallModalOpen(true)} />

              {/* Reminders Button */}
              <button
                type="button"
                onClick={() => setIsRemindersModalOpen(true)}
                className="relative h-9 sm:h-10 w-9 sm:w-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-850 transition-colors flex items-center justify-center shrink-0"
                title="Meal Reminders & Tracking Consistency"
                aria-label="Open Meal Reminders"
              >
                <BellRing className="w-4 h-4 text-amber-400" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Export Report Button */}
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-sky-400 hover:bg-slate-850 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                title="Export Nutrition Data (CSV / PDF)"
                aria-label="Export Nutrition Data"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline text-xs font-semibold">Export</span>
              </button>

              {/* Multi-Device Account Sync Button */}
              <UserAccountButton />
            </div>
          </div>

          {/* Mobile Date Navigation Bar: visible on mobile (< sm), perfectly proportioned with zero horizontal overflow */}
          <div className="flex sm:hidden items-center justify-between mt-2 pt-2 border-t border-slate-850/80">
            <button
              onClick={() => handleShiftDate(-1)}
              className="py-1 px-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1 active:scale-95 transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <button
              onClick={handleResetToToday}
              className={`py-1 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                isToday
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isToday ? 'Today' : formattedDate}</span>
            </button>

            <button
              onClick={() => handleShiftDate(1)}
              className="py-1 px-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1 active:scale-95 transition-all"
              title="Next Day"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-4xl lg:max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5 pb-10 space-y-6 flex-1">
        {/* Gemini Vision Feature Banner */}
        {showInfoBanner && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">
                  Gemini AI Dish Recognition Active
                </span>
                <span className="text-slate-400">
                  Import or snap your food photo to recognize what dish it is and view its title & nutrition.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowInfoBanner(false)}
              className="text-xs font-bold text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Dashboard Card */}
        <DashboardCard
          onOpenGoalsModal={() => setIsGoalsModalOpen(true)}
          onOpenScanner={(tab) => openScannerWithTab(tab || 'gallery')}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
        />

        {/* In-App Meal Reminder Banner */}
        <ReminderBanner
          onOpenScannerForCategory={(cat) => openScannerWithTab('gallery', cat)}
          onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
        />

        {/* Scrollable List of Logged Meals */}
        <MealHistoryList
          onOpenScanner={(cat) => openScannerWithTab('gallery', cat)}
          onSelectMealDetail={(meal) => setInspectedMeal(meal)}
          onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
        />
      </main>

      {/* Bottom Floating Action Bar / Mobile Shutter CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-2 sm:p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pointer-events-none">
        <div className="w-full max-w-[96vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-2 md:gap-3 pointer-events-auto bg-slate-900/95 backdrop-blur-xl p-1.5 sm:p-2.5 rounded-full border border-slate-800/90 shadow-2xl shadow-slate-950/90">
          {/* Main Primary Button: Import Photo to Recognize Dish */}
          <button
            onClick={() => mainFileInputRef.current?.click()}
            className="flex-1 sm:flex-initial group relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all shrink-0"
            aria-label="Import Photo & Recognize Dish"
          >
            <UploadCloud className="w-4 h-4 stroke-[2.5]" />
            <span>Photo</span>
          </button>

          {/* Voice Detector Button */}
          <button
            onClick={() => openScannerWithTab('voice')}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-750 text-emerald-300 font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-emerald-500/40 shrink-0"
            aria-label="Voice Meal Detector"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Barcode Scanner Button */}
          <button
            onClick={() => openScannerWithTab('barcode')}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-emerald-500/30 shrink-0"
            aria-label="Barcode Scanner"
          >
            <ScanBarcode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Barcode</span>
          </button>

          {/* Secondary Button: Camera */}
          <button
            onClick={() => openScannerWithTab('camera')}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
            aria-label="Camera Scan"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          {/* Ingredients Button */}
          <button
            onClick={() => openScannerWithTab('ingredients')}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
            aria-label="Add Just Ingredients"
          >
            <Salad className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Ingredients</span>
          </button>

          {/* Saved Dishes Button */}
          <button
            onClick={() => openScannerWithTab('saved')}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-750 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
            aria-label="My Saved Dishes"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Dishes</span>
          </button>
        </div>
      </div>

      {/* Camera & Photo Selection UI (MealScanner Component) */}
      <MealScanner
        isOpen={isScannerOpen}
        defaultTab={scannerDefaultTab}
        initialImageBase64={initialImageBase64}
        initialMealType={scannerInitialMealType}
        onClose={() => {
          setIsScannerOpen(false);
          setInitialImageBase64(null);
          setScannerInitialMealType(undefined);
        }}
      />

      {/* Goal Adjustment Modal */}
      <EditGoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
      />

      {/* Detailed Meal Modal View */}
      <MealDetailModal
        meal={inspectedMeal}
        onClose={() => setInspectedMeal(null)}
      />

      {/* Meal Reminders Configuration Modal */}
      <MealRemindersModal
        isOpen={isRemindersModalOpen}
        onClose={() => setIsRemindersModalOpen(false)}
        onOpenScannerForCategory={(cat) => {
          setIsRemindersModalOpen(false);
          openScannerWithTab('gallery', cat);
        }}
      />

      {/* PWA Phone Installation Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Export Nutrition Report Modal */}
      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Connectivity Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MealTrackerProvider>
        <MainApp />
      </MealTrackerProvider>
    </AuthProvider>
  );
}
