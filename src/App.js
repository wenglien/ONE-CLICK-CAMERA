import React, { useState, useEffect } from 'react';
import { Camera, MapPin, User, LogIn, Globe, Sparkles, Award } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import FoodCameraModal from './components/FoodCameraModal';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import MapView from './components/MapView';

function App() {
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();
  const { currentUser, userProfile, loading } = useAuth();

  // Tab navigation state - 'camera' is the default
  const [activeTab, setActiveTab] = useState('camera');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [appliedParams, setAppliedParams] = useState(null);

  // Track previous tab for animation direction
  const [prevTab, setPrevTab] = useState('camera');

  // Trigger for MapView to refresh data
  const [mapRefreshTrigger, setMapRefreshTrigger] = useState(0);

  // Callback when photo params are shared to a restaurant
  const handlePhotoShared = () => {
    console.log('📍 Photo shared, triggering map refresh');
    setMapRefreshTrigger(prev => prev + 1);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setPrevTab(activeTab);
      setActiveTab(tab);
    }
  };

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowLanguageMenu(false);
    if (showLanguageMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLanguageMenu]);

  // Tab configuration
  const tabs = [
    { id: 'camera', icon: Camera, label: t('app.camera') || '相機' },
    { id: 'map', icon: MapPin, label: t('app.explore') || '探索' },
    { id: 'profile', icon: User, label: t('app.profile') || '個人' },
  ];

  return (
    <div className="app-shell">
      {/* Liquid Background Blobs */}
      <div className="blob-container">
        <div className="blob w-96 h-96 bg-green-500/20 top-[-10%] left-[-10%]" />
        <div className="blob w-80 h-80 bg-emerald-500/15 bottom-[10%] right-[-5%]" />
        <div className="blob w-64 h-64 bg-teal-500/10 top-[40%] left-[20%] animation-delay-2000" />
      </div>

      {/* App Content Area */}
      <div className="app-content" style={{ paddingBottom: 0 }}>
        {/* Camera Page */}
        {activeTab === 'camera' && (
          <div className="camera-page animate-fadeIn">
            <FoodCameraModal
              isOpen={true}
              onClose={() => { }} // Camera is always open as a page
              appliedParams={appliedParams}
              onParamsApplied={() => setAppliedParams(null)}
              onPhotoShared={handlePhotoShared} // Callback when photo is shared
              isEmbedded={true} // New prop to indicate embedded mode
            />
          </div>
        )}

        {/* Map/Explore Page */}
        {activeTab === 'map' && (
          <div className="map-page animate-fadeIn">
            <MapView
              isOpen={true}
              onClose={() => handleTabChange('camera')}
              onApplyParams={(params) => {
                setAppliedParams(params);
                handleTabChange('camera');
              }}
              refreshTrigger={mapRefreshTrigger} // Trigger refresh when photo is shared
              isEmbedded={true} // New prop to indicate embedded mode
            />
          </div>
        )}

        {/* Profile Page */}
        {activeTab === 'profile' && (
          <div className="profile-page animate-fadeIn">
            {currentUser ? (
              <UserProfileModal
                isOpen={true}
                onClose={() => handleTabChange('camera')}
                isEmbedded={true} // New prop to indicate embedded mode
              />
            ) : (
              // Login prompt for non-authenticated users
              <div className="flex flex-col items-center justify-center h-full p-6 animate-fadeIn relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  {/* Animated icon container */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-green-500/20 rounded-[32px] blur-2xl animate-pulse" />
                    <div className="relative w-32 h-32 liquid-glass flex items-center justify-center">
                      <User className="w-16 h-16 text-green-400" />
                    </div>
                  </div>

                  {/* Text content */}
                  <h2 className="text-3xl font-extrabold text-white mb-3 text-center tracking-tight">
                    {t('profile.loginRequired') || '登入以查看個人資料'}
                  </h2>
                  <p className="text-gray-400 text-center mb-10 max-w-sm leading-relaxed font-medium">
                    {t('profile.loginDescription') || '登入後可以儲存照片、追蹤拍攝紀錄，並獲得個人化的 AI 建議'}
                  </p>

                  {/* Login button */}
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="btn-liquid px-12 py-4 text-lg flex items-center gap-3"
                    aria-label={t('auth.login') || '登入'}
                  >
                    <LogIn className="w-6 h-6" />
                    {t('auth.login') || '登入'}
                  </button>

                  {/* Feature highlights */}
                  <div className="mt-16 grid grid-cols-3 gap-8 max-w-md">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 liquid-glass">
                        <Camera className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentLanguage === 'zh-TW' ? '雲端備份' : 'Cloud Backup'}</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 liquid-glass">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                      </div>
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentLanguage === 'zh-TW' ? 'AI 建議' : 'AI Tips'}</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 liquid-glass">
                        <Award className="w-6 h-6 text-amber-400" />
                      </div>
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentLanguage === 'zh-TW' ? '成就系統' : 'Achievements'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar - Redesigned Liquid Glass */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom,20px)]">
        <div className="liquid-glass-dark mx-4 mb-4 p-2 flex items-center gap-2 pointer-events-auto max-w-md w-full justify-around border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-500 relative group ${activeTab === tab.id ? 'text-green-400' : 'text-gray-400 hover:text-white'
                }`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-green-500/10 rounded-2xl blur-sm animate-pulse" />
              )}
              <tab.icon className={`w-6 h-6 mb-1 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute -bottom-1 w-1 h-1 bg-green-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              )}
            </button>
          ))}

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLanguageMenu(!showLanguageMenu);
              }}
              className="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-gray-400 hover:text-white transition-all"
              aria-label={currentLanguage === 'zh-TW' ? '切換語言' : 'Change language'}
              aria-expanded={showLanguageMenu}
              aria-haspopup="true"
            >
              <Globe className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{currentLanguage === 'zh-TW' ? '中文' : 'EN'}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute bottom-full right-0 mb-4 liquid-glass-dark p-2 min-w-[140px] animate-slideUp">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium rounded-xl transition-colors ${currentLanguage === lang.code
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-white hover:bg-white/10'
                      }`}
                    aria-label={lang.nativeName}
                    aria-selected={currentLanguage === lang.code}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default App;
