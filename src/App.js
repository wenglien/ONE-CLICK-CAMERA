import React, { useState, useEffect } from 'react';
import { Camera, MapPin, User, LogIn, Globe } from 'lucide-react';
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
      {/* App Content Area */}
      <div className="app-content">
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
              <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mb-6">
                  <User className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('profile.loginRequired') || '登入以查看個人資料'}</h2>
                <p className="text-gray-400 text-center mb-8 max-w-sm">
                  {t('profile.loginDescription') || '登入後可以儲存照片、追蹤拍攝紀錄，並獲得個人化的 AI 建議'}
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary px-8 py-4 rounded-2xl text-white font-bold text-lg flex items-center gap-3"
                >
                  <LogIn className="w-5 h-5" />
                  {t('auth.login') || '登入'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <nav className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}

        {/* Language Selector (positioned at right side) */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLanguageMenu(!showLanguageMenu);
            }}
            className="tab-item"
          >
            <Globe className="tab-icon" />
            <span className="tab-label">{currentLanguage === 'zh-TW' ? '中文' : 'EN'}</span>
          </button>

          {showLanguageMenu && (
            <div className="absolute bottom-full right-0 mb-2 py-2 bg-gray-800 rounded-xl shadow-xl border border-white/10 overflow-hidden min-w-[120px]">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${currentLanguage === lang.code
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-white hover:bg-white/10'
                    }`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal (kept as modal for login flow) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default App;
