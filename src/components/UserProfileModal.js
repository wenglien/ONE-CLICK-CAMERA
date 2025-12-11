import React, { useState, useEffect } from 'react';
import { X, User, Camera, Heart, Sparkles, LogOut, Settings, ChevronRight, Trash2, BarChart3, Zap, Palette, Loader2, Image, Download, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const UserProfileModal = ({ isOpen, onClose, isEmbedded = false }) => {
    const { t, currentLanguage, toggleLanguage } = useLanguage();
    const {
        currentUser,
        userProfile,
        logout,
        updatePreferences,
        updateUserProfile,
        getUserPhotos,
        deletePhoto,
        updatePhotoLikeStatus
    } = useAuth();

    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Photo gallery state
    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [deletingPhotoId, setDeletingPhotoId] = useState(null);

    // Local state for preferences
    const [preferences, setPreferences] = useState({
        favoriteMode: 'normal',
        enableSuggestions: true,
        autoApplyPreference: false,
        rememberLastMode: true,
    });

    // Sync with user profile
    useEffect(() => {
        if (userProfile?.preferences) {
            setPreferences(userProfile.preferences);
        }
    }, [userProfile]);

    // Load photos when photos tab is selected
    useEffect(() => {
        if (activeTab === 'photos' && currentUser) {
            loadPhotos();
        }
    }, [activeTab, currentUser]);

    const loadPhotos = async () => {
        if (!getUserPhotos) return;
        setLoadingPhotos(true);
        try {
            const userPhotos = await getUserPhotos(50);
            setPhotos(userPhotos);
        } catch (error) {
            console.error('Error loading photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const handleDeletePhoto = async (photo) => {
        if (!window.confirm(currentLanguage === 'zh-TW' ? '確定要刪除這張照片嗎？' : 'Delete this photo?')) return;

        setDeletingPhotoId(photo.id);
        try {
            const success = await deletePhoto(photo);
            if (success) {
                setPhotos(prev => prev.filter(p => p.id !== photo.id));
                if (selectedPhoto?.id === photo.id) {
                    setSelectedPhoto(null);
                }
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
        } finally {
            setDeletingPhotoId(null);
        }
    };

    const handleToggleLike = async (photo) => {
        try {
            const newLikedStatus = !photo.isLiked;
            await updatePhotoLikeStatus(photo.id, newLikedStatus);
            setPhotos(prev => prev.map(p =>
                p.id === photo.id ? { ...p, isLiked: newLikedStatus } : p
            ));
            if (selectedPhoto?.id === photo.id) {
                setSelectedPhoto({ ...selectedPhoto, isLiked: newLikedStatus });
            }
        } catch (error) {
            console.error('Error updating like status:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            onClose();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handlePreferenceChange = async (key, value) => {
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        // Auto save
        setLoading(true);
        try {
            await updatePreferences(newPreferences);
            setSaveMessage(t('profile.saved'));
            setTimeout(() => setSaveMessage(''), 2000);
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearLearning = async () => {
        if (!window.confirm(t('profile.confirmClear'))) return;

        setLoading(true);
        try {
            await updateUserProfile({
                learnedAdjustments: {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    warmth: 0,
                },
                foodTypePreferences: {},
                lightingPreferences: {},
                aiPatterns: {
                    colorTendency: 'neutral',
                    saturationPreference: 'normal',
                    brightnessPreference: 'normal',
                    contrastPreference: 'normal',
                },
            });

            // Also clear local storage
            localStorage.removeItem('userProfile');

            setSaveMessage(t('profile.cleared'));
            setTimeout(() => setSaveMessage(''), 2000);
        } catch (error) {
            console.error('Error clearing learning data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString(currentLanguage === 'zh-TW' ? 'zh-TW' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getPatternText = (pattern) => {
        const patterns = {
            warm: t('profile.patternWarm'),
            cool: t('profile.patternCool'),
            neutral: t('profile.patternNeutral'),
            high: t('profile.patternHigh'),
            low: t('profile.patternLow'),
            normal: t('profile.patternNormal'),
        };
        return patterns[pattern] || pattern;
    };

    const modeOptions = [
        { id: 'normal', name: '自然', nameEn: 'Natural', icon: '📷' },
        { id: 'warm', name: '暖色調', nameEn: 'Warm', icon: '🌅' },
        { id: 'cold', name: '冷色調', nameEn: 'Cool', icon: '❄️' },
        { id: 'vivid', name: '鮮豔', nameEn: 'Vivid', icon: '🎨' },
        { id: 'soft', name: '柔和', nameEn: 'Soft', icon: '🌸' },
        { id: 'dramatic', name: '戲劇', nameEn: 'Dramatic', icon: '🎭' },
    ];

    if (!isOpen || !currentUser) return null;

    // Define wrapper class based on embedded mode
    const wrapperClass = isEmbedded
        ? "absolute inset-0 flex items-center justify-center p-0 bg-gradient-to-b from-gray-900 to-gray-950"
        : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm";

    const contentClass = isEmbedded
        ? "relative w-full h-full flex flex-col overflow-hidden"
        : "relative w-full max-w-lg bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-scaleIn max-h-[90vh] flex flex-col";

    return (
        <div className={wrapperClass}>
            <div className={contentClass}>
                {/* Header */}
                <div className="relative p-4 border-b border-white/10 shrink-0">
                    {!isEmbedded && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}

                    {/* User info */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center overflow-hidden">
                            {userProfile?.photoURL ? (
                                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">
                                {userProfile?.displayName || t('profile.user')}
                            </h2>
                            <p className="text-gray-400 text-sm">{currentUser.email}</p>
                        </div>
                    </div>

                    {/* Save message */}
                    {saveMessage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                            <span className="text-green-400 text-sm">{saveMessage}</span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 shrink-0">
                    {[
                        { id: 'profile', icon: BarChart3, label: t('profile.stats') },
                        { id: 'photos', icon: Image, label: currentLanguage === 'zh-TW' ? '我的照片' : 'My Photos' },
                        { id: 'preferences', icon: Settings, label: t('profile.preferences') },
                        { id: 'learning', icon: Sparkles, label: t('profile.aiLearning') },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 flex items-center justify-center gap-1 text-xs font-medium transition-all ${activeTab === tab.id
                                ? 'text-green-400 border-b-2 border-green-400 bg-green-400/5'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Statistics Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            {/* Stats cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <Camera className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{userProfile?.stats?.totalPhotos || 0}</div>
                                    <div className="text-gray-400 text-xs">{t('profile.totalPhotos')}</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{userProfile?.stats?.likedPhotos || 0}</div>
                                    <div className="text-gray-400 text-xs">{t('profile.likedPhotos')}</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{userProfile?.stats?.photosThisMonth || 0}</div>
                                    <div className="text-gray-400 text-xs">{t('profile.thisMonth')}</div>
                                </div>
                            </div>

                            {/* Favorite mode */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Palette className="w-5 h-5 text-purple-400" />
                                    <span className="text-white font-medium">{t('profile.favoriteMode')}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">
                                        {modeOptions.find(m => m.id === userProfile?.preferences?.favoriteMode)?.icon || '📷'}
                                    </span>
                                    <span className="text-white text-lg">
                                        {currentLanguage === 'zh-TW'
                                            ? modeOptions.find(m => m.id === userProfile?.preferences?.favoriteMode)?.name || '自然'
                                            : modeOptions.find(m => m.id === userProfile?.preferences?.favoriteMode)?.nameEn || 'Natural'
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Language toggle */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🌐</span>
                                        <span className="text-white font-medium">{t('profile.language')}</span>
                                    </div>
                                    <button
                                        onClick={toggleLanguage}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                                    >
                                        {currentLanguage === 'zh-TW' ? 'English' : '繁體中文'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Photos Tab */}
                    {activeTab === 'photos' && (
                        <div className="space-y-4">
                            {loadingPhotos ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                                </div>
                            ) : photos.length === 0 ? (
                                <div className="text-center py-12">
                                    <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">
                                        {currentLanguage === 'zh-TW' ? '還沒有儲存的照片' : 'No saved photos yet'}
                                    </p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        {currentLanguage === 'zh-TW' ? '拍照後點擊「儲存」按鈕保存到這裡' : 'Save photos after capturing to see them here'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {photos.map((photo) => (
                                        <div key={photo.id} className="relative group">
                                            <img
                                                src={photo.imageURL}
                                                alt="Saved photo"
                                                className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setSelectedPhoto(photo)}
                                            />
                                            {/* Overlay with info */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <div className="text-white text-xs">{formatDate(photo.createdAt)}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {photo.isLiked && <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />}
                                                        <span className="text-gray-300 text-xs">{photo.mode}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePhoto(photo);
                                                }}
                                                disabled={deletingPhotoId === photo.id}
                                                className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {deletingPhotoId === photo.id ? (
                                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4 text-white" />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="space-y-4">
                            {/* Enable suggestions */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-white font-medium">{t('profile.enableSuggestions')}</div>
                                        <div className="text-gray-400 text-xs">{t('profile.enableSuggestionsDesc')}</div>
                                    </div>
                                    <button
                                        onClick={() => handlePreferenceChange('enableSuggestions', !preferences.enableSuggestions)}
                                        className={`w-12 h-6 rounded-full transition-colors ${preferences.enableSuggestions ? 'bg-green-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.enableSuggestions ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Auto apply preference */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-white font-medium">{t('profile.autoApply')}</div>
                                        <div className="text-gray-400 text-xs">{t('profile.autoApplyDesc')}</div>
                                    </div>
                                    <button
                                        onClick={() => handlePreferenceChange('autoApplyPreference', !preferences.autoApplyPreference)}
                                        className={`w-12 h-6 rounded-full transition-colors ${preferences.autoApplyPreference ? 'bg-green-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.autoApplyPreference ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Remember last mode */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-white font-medium">{t('profile.rememberMode')}</div>
                                        <div className="text-gray-400 text-xs">{t('profile.rememberModeDesc')}</div>
                                    </div>
                                    <button
                                        onClick={() => handlePreferenceChange('rememberLastMode', !preferences.rememberLastMode)}
                                        className={`w-12 h-6 rounded-full transition-colors ${preferences.rememberLastMode ? 'bg-green-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.rememberLastMode ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Favorite mode selector */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="text-white font-medium mb-3">{t('profile.selectFavoriteMode')}</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {modeOptions.map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => handlePreferenceChange('favoriteMode', mode.id)}
                                            className={`p-3 rounded-xl text-center transition-all ${preferences.favoriteMode === mode.id
                                                ? 'bg-green-500/20 border-2 border-green-500'
                                                : 'bg-white/5 border-2 border-transparent hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">{mode.icon}</span>
                                            <span className="text-white text-xs">
                                                {currentLanguage === 'zh-TW' ? mode.name : mode.nameEn}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Learning Tab */}
                    {activeTab === 'learning' && (
                        <div className="space-y-4">
                            {/* AI Patterns */}
                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    <span className="text-white font-medium">{t('profile.aiPatterns')}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">{t('profile.colorTendency')}</div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.colorTendency || 'neutral')}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">{t('profile.saturationPref')}</div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.saturationPreference || 'normal')}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">{t('profile.brightnessPref')}</div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.brightnessPreference || 'normal')}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">{t('profile.contrastPref')}</div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.contrastPreference || 'normal')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Learned adjustments */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Settings className="w-5 h-5 text-blue-400" />
                                    <span className="text-white font-medium">{t('profile.learnedAdjustments')}</span>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { key: 'brightness', label: t('profile.brightness'), color: 'amber' },
                                        { key: 'contrast', label: t('profile.contrast'), color: 'blue' },
                                        { key: 'saturation', label: t('profile.saturation'), color: 'pink' },
                                        { key: 'warmth', label: t('profile.warmth'), color: 'orange' },
                                    ].map((item) => {
                                        const value = userProfile?.learnedAdjustments?.[item.key] || 0;
                                        return (
                                            <div key={item.key} className="flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full bg-${item.color}-500 rounded-full transition-all`}
                                                            style={{
                                                                width: `${Math.min(100, Math.abs(value) + 50)}%`,
                                                                marginLeft: value < 0 ? `${50 - Math.abs(value)}%` : '50%',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className={`text-${item.color}-400 text-sm font-medium min-w-[40px] text-right`}>
                                                        {value > 0 ? '+' : ''}{value.toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Clear learning data */}
                            <button
                                onClick={handleClearLearning}
                                disabled={loading}
                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                                {t('profile.clearLearning')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white font-medium transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        {t('auth.logout')}
                    </button>
                </div>
            </div>

            {/* Photo Detail Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        {/* Photo */}
                        <img
                            src={selectedPhoto.imageURL}
                            alt="Photo detail"
                            className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
                        />

                        {/* Photo info */}
                        <div className="mt-4 bg-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-white font-medium">
                                    {formatDate(selectedPhoto.createdAt)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleLike(selectedPhoto)}
                                        className={`p-2 rounded-full transition-colors ${selectedPhoto.isLiked ? 'bg-pink-500/20' : 'bg-white/10 hover:bg-white/20'
                                            }`}
                                    >
                                        <Heart className={`w-5 h-5 ${selectedPhoto.isLiked ? 'text-pink-400 fill-pink-400' : 'text-white'}`} />
                                    </button>
                                    <a
                                        href={selectedPhoto.imageURL}
                                        download={`photo-${selectedPhoto.id}.jpg`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                    >
                                        <Download className="w-5 h-5 text-white" />
                                    </a>
                                </div>
                            </div>

                            {/* Parameters */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-400">{currentLanguage === 'zh-TW' ? '模式' : 'Mode'}: </span>
                                    <span className="text-white">{selectedPhoto.mode}</span>
                                </div>
                                {selectedPhoto.zoom && (
                                    <div>
                                        <span className="text-gray-400">{currentLanguage === 'zh-TW' ? '縮放' : 'Zoom'}: </span>
                                        <span className="text-white">{selectedPhoto.zoom.toFixed(1)}x</span>
                                    </div>
                                )}
                                {selectedPhoto.manualAdjustments && (
                                    <>
                                        <div>
                                            <span className="text-gray-400">{t('profile.brightness')}: </span>
                                            <span className="text-white">{selectedPhoto.manualAdjustments.brightness || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">{t('profile.contrast')}: </span>
                                            <span className="text-white">{selectedPhoto.manualAdjustments.contrast || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">{t('profile.saturation')}: </span>
                                            <span className="text-white">{selectedPhoto.manualAdjustments.saturation || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">{t('profile.warmth')}: </span>
                                            <span className="text-white">{selectedPhoto.manualAdjustments.warmth || 0}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileModal;
