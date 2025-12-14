import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, User, Camera, Heart, Sparkles, LogOut, Settings, ChevronRight, Trash2, 
    BarChart3, Zap, Palette, Loader2, Image, Download, Eye, Filter, Clock,
    ChevronDown, ChevronUp, Sun, Moon, Droplets, Flame, TrendingUp, Calendar,
    PieChart, Activity, Star, RefreshCw, FileText, Info
} from 'lucide-react';
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
    const [photoFilter, setPhotoFilter] = useState('all'); // all, liked, recent
    const [photoModeFilter, setPhotoModeFilter] = useState('all');

    // Expandable sections
    const [expandedSections, setExpandedSections] = useState({
        modeUsage: true,
        foodTypes: false,
        lightingPrefs: false,
        learningHistory: false,
    });

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
            const userPhotos = await getUserPhotos(100);
            setPhotos(userPhotos);
        } catch (error) {
            console.error('Error loading photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    // Filtered photos
    const filteredPhotos = useMemo(() => {
        let result = photos;
        
        if (photoFilter === 'liked') {
            result = result.filter(p => p.isLiked);
        } else if (photoFilter === 'recent') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            result = result.filter(p => {
                const photoDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                return photoDate >= weekAgo;
            });
        }
        
        if (photoModeFilter !== 'all') {
            result = result.filter(p => p.mode === photoModeFilter);
        }
        
        return result;
    }, [photos, photoFilter, photoModeFilter]);

    // Calculate mode usage statistics
    const modeStats = useMemo(() => {
        const stats = {};
        photos.forEach(p => {
            if (p.mode) {
                stats[p.mode] = (stats[p.mode] || 0) + 1;
            }
        });
        return Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .map(([mode, count]) => ({ mode, count, percentage: Math.round((count / photos.length) * 100) }));
    }, [photos]);

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

            localStorage.removeItem('userProfile');

            setSaveMessage(t('profile.cleared'));
            setTimeout(() => setSaveMessage(''), 2000);
        } catch (error) {
            console.error('Error clearing learning data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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

    const formatShortDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString(currentLanguage === 'zh-TW' ? 'zh-TW' : 'en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getPatternText = (pattern) => {
        const patterns = {
            warm: currentLanguage === 'zh-TW' ? '暖色系' : 'Warm',
            cool: currentLanguage === 'zh-TW' ? '冷色系' : 'Cool',
            neutral: currentLanguage === 'zh-TW' ? '中性' : 'Neutral',
            high: currentLanguage === 'zh-TW' ? '較高' : 'High',
            low: currentLanguage === 'zh-TW' ? '較低' : 'Low',
            normal: currentLanguage === 'zh-TW' ? '標準' : 'Normal',
        };
        return patterns[pattern] || pattern;
    };

    const getFoodTypeText = (type) => {
        const types = {
            main_dish: currentLanguage === 'zh-TW' ? '主菜' : 'Main Dish',
            dessert: currentLanguage === 'zh-TW' ? '甜點' : 'Dessert',
            drink: currentLanguage === 'zh-TW' ? '飲品' : 'Drink',
            fruit: currentLanguage === 'zh-TW' ? '水果' : 'Fruit',
            soup: currentLanguage === 'zh-TW' ? '湯品' : 'Soup',
            salad: currentLanguage === 'zh-TW' ? '沙拉' : 'Salad',
            bread: currentLanguage === 'zh-TW' ? '麵包' : 'Bread',
            noodle: currentLanguage === 'zh-TW' ? '麵食' : 'Noodles',
            rice: currentLanguage === 'zh-TW' ? '飯類' : 'Rice',
            unknown: currentLanguage === 'zh-TW' ? '其他' : 'Other',
        };
        return types[type] || type;
    };

    const getLightingConditionText = (condition) => {
        const conditions = {
            normal: currentLanguage === 'zh-TW' ? '正常光線' : 'Normal',
            backlit: currentLanguage === 'zh-TW' ? '逆光' : 'Backlit',
            lowLight: currentLanguage === 'zh-TW' ? '低光源' : 'Low Light',
            dark: currentLanguage === 'zh-TW' ? '昏暗' : 'Dark',
            bright: currentLanguage === 'zh-TW' ? '明亮' : 'Bright',
        };
        return conditions[condition] || condition;
    };

    const modeOptions = [
        { id: 'normal', name: '自然', nameEn: 'Natural', icon: '📷', color: 'gray' },
        { id: 'warm', name: '暖色調', nameEn: 'Warm', icon: '🌅', color: 'orange' },
        { id: 'cold', name: '冷色調', nameEn: 'Cool', icon: '❄️', color: 'blue' },
        { id: 'vivid', name: '鮮豔', nameEn: 'Vivid', icon: '🎨', color: 'purple' },
        { id: 'soft', name: '柔和', nameEn: 'Soft', icon: '🌸', color: 'pink' },
        { id: 'dramatic', name: '戲劇', nameEn: 'Dramatic', icon: '🎭', color: 'red' },
    ];

    const getModeInfo = (modeId) => {
        return modeOptions.find(m => m.id === modeId) || modeOptions[0];
    };

    // Get food type preferences from profile
    const foodTypePreferences = useMemo(() => {
        const prefs = userProfile?.foodTypePreferences || {};
        return Object.entries(prefs)
            .map(([type, data]) => ({
                type,
                count: data.count || 0,
                avgAdjustments: data.avgAdjustments || {},
            }))
            .filter(p => p.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [userProfile]);

    // Get lighting preferences from profile
    const lightingPreferences = useMemo(() => {
        const prefs = userProfile?.lightingPreferences || {};
        return Object.entries(prefs)
            .map(([condition, data]) => ({
                condition,
                count: data.count || 0,
                avgAdjustments: data.avgAdjustments || {},
            }))
            .filter(p => p.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [userProfile]);

    if (!isOpen || !currentUser) return null;

    const wrapperClass = isEmbedded
        ? "absolute inset-0 flex items-center justify-center p-0 bg-gradient-to-b from-gray-900 to-gray-950"
        : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm";

    const contentClass = isEmbedded
        ? "relative w-full h-full flex flex-col overflow-hidden"
        : "relative w-full max-w-lg bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-scaleIn max-h-[90vh] flex flex-col";

    // Collapsible Section Component
    const CollapsibleSection = ({ title, icon: Icon, iconColor, isExpanded, onToggle, children, badge }) => (
        <div className="bg-white/5 rounded-xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                    <span className="text-white font-medium">{title}</span>
                    {badge && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );

    // Progress Bar Component
    const ProgressBar = ({ value, max, color = 'green', showLabel = true }) => {
        const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-${color}-500 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {showLabel && (
                    <span className="text-gray-400 text-xs w-10 text-right">{percentage}%</span>
                )}
            </div>
        );
    };

    // Adjustment Value Display
    const AdjustmentValue = ({ label, value, color = 'blue' }) => (
        <div className="flex items-center justify-between py-1">
            <span className="text-gray-400 text-xs">{label}</span>
            <span className={`text-${color}-400 text-xs font-medium`}>
                {value > 0 ? '+' : ''}{Math.round(value)}
            </span>
        </div>
    );

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

                    {saveMessage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                            <span className="text-green-400 text-sm">{saveMessage}</span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 shrink-0 overflow-x-auto">
                    {[
                        { id: 'profile', icon: BarChart3, label: currentLanguage === 'zh-TW' ? '統計' : 'Stats' },
                        { id: 'photos', icon: Image, label: currentLanguage === 'zh-TW' ? '照片' : 'Photos' },
                        { id: 'learning', icon: Sparkles, label: currentLanguage === 'zh-TW' ? 'AI 學習' : 'AI' },
                        { id: 'history', icon: Clock, label: currentLanguage === 'zh-TW' ? '歷史' : 'History' },
                        { id: 'preferences', icon: Settings, label: currentLanguage === 'zh-TW' ? '設定' : 'Settings' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 px-4 py-3 flex items-center justify-center gap-1 text-xs font-medium transition-all ${activeTab === tab.id
                                ? 'text-green-400 border-b-2 border-green-400 bg-green-400/5'
                                : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Statistics Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            {/* Quick Stats Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <Camera className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{userProfile?.stats?.totalPhotos || 0}</div>
                                    <div className="text-gray-400 text-xs">{currentLanguage === 'zh-TW' ? '總照片' : 'Total'}</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{userProfile?.stats?.likedPhotos || 0}</div>
                                    <div className="text-gray-400 text-xs">{currentLanguage === 'zh-TW' ? '喜愛' : 'Liked'}</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{userProfile?.stats?.photosThisMonth || 0}</div>
                                    <div className="text-gray-400 text-xs">{currentLanguage === 'zh-TW' ? '本月' : 'Month'}</div>
                                </div>
                            </div>

                            {/* Favorite Mode Card */}
                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="w-5 h-5 text-purple-400" />
                                    <span className="text-white font-medium">
                                        {currentLanguage === 'zh-TW' ? '最愛拍攝模式' : 'Favorite Mode'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">
                                        {getModeInfo(userProfile?.preferences?.favoriteMode).icon}
                                    </span>
                                    <div>
                                        <span className="text-white text-lg font-medium">
                                            {currentLanguage === 'zh-TW'
                                                ? getModeInfo(userProfile?.preferences?.favoriteMode).name
                                                : getModeInfo(userProfile?.preferences?.favoriteMode).nameEn
                                            }
                                        </span>
                                        <p className="text-gray-400 text-xs">
                                            {currentLanguage === 'zh-TW' ? '根據您的使用習慣' : 'Based on your usage'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mode Usage Distribution */}
                            <CollapsibleSection
                                title={currentLanguage === 'zh-TW' ? '模式使用分布' : 'Mode Usage'}
                                icon={PieChart}
                                iconColor="text-blue-400"
                                isExpanded={expandedSections.modeUsage}
                                onToggle={() => toggleSection('modeUsage')}
                                badge={modeStats.length > 0 ? `${modeStats.length}` : null}
                            >
                                <div className="mt-3 space-y-3">
                                    {modeStats.length > 0 ? (
                                        modeStats.map(({ mode, count, percentage }) => {
                                            const modeInfo = getModeInfo(mode);
                                            return (
                                                <div key={mode} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span>{modeInfo.icon}</span>
                                                            <span className="text-white text-sm">
                                                                {currentLanguage === 'zh-TW' ? modeInfo.name : modeInfo.nameEn}
                                                            </span>
                                                        </div>
                                                        <span className="text-gray-400 text-xs">{count} 次</span>
                                                    </div>
                                                    <ProgressBar value={count} max={photos.length} color={modeInfo.color} />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            {currentLanguage === 'zh-TW' ? '還沒有拍攝資料' : 'No data yet'}
                                        </p>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* Food Type Preferences */}
                            <CollapsibleSection
                                title={currentLanguage === 'zh-TW' ? '食物類型偏好' : 'Food Type Preferences'}
                                icon={Flame}
                                iconColor="text-orange-400"
                                isExpanded={expandedSections.foodTypes}
                                onToggle={() => toggleSection('foodTypes')}
                                badge={foodTypePreferences.length > 0 ? `${foodTypePreferences.length}` : null}
                            >
                                <div className="mt-3 space-y-3">
                                    {foodTypePreferences.length > 0 ? (
                                        foodTypePreferences.slice(0, 5).map(({ type, count, avgAdjustments }) => (
                                            <div key={type} className="bg-black/20 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white font-medium text-sm">
                                                        {getFoodTypeText(type)}
                                                    </span>
                                                    <span className="text-gray-400 text-xs">
                                                        {count} {currentLanguage === 'zh-TW' ? '次' : 'times'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <AdjustmentValue 
                                                        label={currentLanguage === 'zh-TW' ? '亮度' : 'Brightness'} 
                                                        value={avgAdjustments.brightness || 0} 
                                                        color="amber" 
                                                    />
                                                    <AdjustmentValue 
                                                        label={currentLanguage === 'zh-TW' ? '對比' : 'Contrast'} 
                                                        value={avgAdjustments.contrast || 0} 
                                                        color="blue" 
                                                    />
                                                    <AdjustmentValue 
                                                        label={currentLanguage === 'zh-TW' ? '飽和' : 'Saturation'} 
                                                        value={avgAdjustments.saturation || 0} 
                                                        color="pink" 
                                                    />
                                                    <AdjustmentValue 
                                                        label={currentLanguage === 'zh-TW' ? '色溫' : 'Warmth'} 
                                                        value={avgAdjustments.warmth || 0} 
                                                        color="orange" 
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            {currentLanguage === 'zh-TW' ? '還沒有食物類型資料' : 'No food type data yet'}
                                        </p>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* Language Toggle */}
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
                            {/* Filter Bar */}
                            <div className="flex flex-wrap gap-2">
                                {/* Photo Type Filter */}
                                <div className="flex bg-white/5 rounded-lg p-1">
                                    {[
                                        { id: 'all', label: currentLanguage === 'zh-TW' ? '全部' : 'All' },
                                        { id: 'liked', label: currentLanguage === 'zh-TW' ? '喜愛' : 'Liked', icon: Heart },
                                        { id: 'recent', label: currentLanguage === 'zh-TW' ? '近期' : 'Recent', icon: Clock },
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setPhotoFilter(filter.id)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                                                photoFilter === filter.id
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {filter.icon && <filter.icon className="w-3 h-3" />}
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Mode Filter */}
                                <select
                                    value={photoModeFilter}
                                    onChange={(e) => setPhotoModeFilter(e.target.value)}
                                    className="bg-white/5 text-white text-xs rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-green-500"
                                >
                                    <option value="all">{currentLanguage === 'zh-TW' ? '所有模式' : 'All Modes'}</option>
                                    {modeOptions.map(mode => (
                                        <option key={mode.id} value={mode.id}>
                                            {mode.icon} {currentLanguage === 'zh-TW' ? mode.name : mode.nameEn}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Photo Count */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">
                                    {currentLanguage === 'zh-TW' 
                                        ? `顯示 ${filteredPhotos.length} 張照片` 
                                        : `Showing ${filteredPhotos.length} photos`}
                                </span>
                                <button
                                    onClick={loadPhotos}
                                    className="text-green-400 hover:text-green-300 flex items-center gap-1"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {currentLanguage === 'zh-TW' ? '重新整理' : 'Refresh'}
                                </button>
                            </div>

                            {loadingPhotos ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                                </div>
                            ) : filteredPhotos.length === 0 ? (
                                <div className="text-center py-12">
                                    <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">
                                        {currentLanguage === 'zh-TW' ? '沒有符合條件的照片' : 'No photos found'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredPhotos.map((photo) => (
                                        <div key={photo.id} className="relative group">
                                            <img
                                                src={photo.imageURL}
                                                alt="Saved photo"
                                                className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setSelectedPhoto(photo)}
                                            />
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <div className="text-white text-xs">{formatShortDate(photo.createdAt)}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {photo.isLiked && <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />}
                                                        <span className="text-gray-300 text-xs">
                                                            {getModeInfo(photo.mode).icon} {currentLanguage === 'zh-TW' ? getModeInfo(photo.mode).name : getModeInfo(photo.mode).nameEn}
                                                        </span>
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

                    {/* AI Learning Tab */}
                    {activeTab === 'learning' && (
                        <div className="space-y-4">
                            {/* AI Patterns Overview */}
                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    <span className="text-white font-medium">
                                        {currentLanguage === 'zh-TW' ? 'AI 學習到的偏好' : 'AI Learned Preferences'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Palette className="w-4 h-4 text-orange-400" />
                                            <span className="text-gray-400 text-xs">
                                                {currentLanguage === 'zh-TW' ? '色彩傾向' : 'Color Tendency'}
                                            </span>
                                        </div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.colorTendency || 'neutral')}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Droplets className="w-4 h-4 text-pink-400" />
                                            <span className="text-gray-400 text-xs">
                                                {currentLanguage === 'zh-TW' ? '飽和度' : 'Saturation'}
                                            </span>
                                        </div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.saturationPreference || 'normal')}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sun className="w-4 h-4 text-amber-400" />
                                            <span className="text-gray-400 text-xs">
                                                {currentLanguage === 'zh-TW' ? '亮度' : 'Brightness'}
                                            </span>
                                        </div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.brightnessPreference || 'normal')}
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            <span className="text-gray-400 text-xs">
                                                {currentLanguage === 'zh-TW' ? '對比度' : 'Contrast'}
                                            </span>
                                        </div>
                                        <div className="text-white font-medium">
                                            {getPatternText(userProfile?.aiPatterns?.contrastPreference || 'normal')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Learned Adjustments */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                    <span className="text-white font-medium">
                                        {currentLanguage === 'zh-TW' ? '平均調整數值' : 'Average Adjustments'}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { key: 'brightness', label: currentLanguage === 'zh-TW' ? '亮度' : 'Brightness', icon: Sun, color: 'amber' },
                                        { key: 'contrast', label: currentLanguage === 'zh-TW' ? '對比' : 'Contrast', icon: Activity, color: 'blue' },
                                        { key: 'saturation', label: currentLanguage === 'zh-TW' ? '飽和度' : 'Saturation', icon: Droplets, color: 'pink' },
                                        { key: 'warmth', label: currentLanguage === 'zh-TW' ? '色溫' : 'Warmth', icon: Flame, color: 'orange' },
                                    ].map((item) => {
                                        const value = userProfile?.learnedAdjustments?.[item.key] || 0;
                                        const normalizedValue = Math.min(50, Math.max(-50, value));
                                        return (
                                            <div key={item.key} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                                                        <span className="text-gray-300 text-sm">{item.label}</span>
                                                    </div>
                                                    <span className={`text-${item.color}-400 text-sm font-medium`}>
                                                        {value > 0 ? '+' : ''}{Math.round(value)}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden relative">
                                                    <div className="absolute left-1/2 w-0.5 h-full bg-gray-500" />
                                                    <div
                                                        className={`absolute top-0 h-full bg-${item.color}-500 rounded-full transition-all`}
                                                        style={{
                                                            left: normalizedValue >= 0 ? '50%' : `${50 + normalizedValue}%`,
                                                            width: `${Math.abs(normalizedValue)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lighting Preferences */}
                            <CollapsibleSection
                                title={currentLanguage === 'zh-TW' ? '光線條件偏好' : 'Lighting Preferences'}
                                icon={Sun}
                                iconColor="text-amber-400"
                                isExpanded={expandedSections.lightingPrefs}
                                onToggle={() => toggleSection('lightingPrefs')}
                                badge={lightingPreferences.length > 0 ? `${lightingPreferences.length}` : null}
                            >
                                <div className="mt-3 space-y-3">
                                    {lightingPreferences.length > 0 ? (
                                        lightingPreferences.map(({ condition, count, avgAdjustments }) => (
                                            <div key={condition} className="bg-black/20 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white font-medium text-sm">
                                                        {getLightingConditionText(condition)}
                                                    </span>
                                                    <span className="text-gray-400 text-xs">
                                                        {count} {currentLanguage === 'zh-TW' ? '次' : 'times'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <AdjustmentValue 
                                                        label={currentLanguage === 'zh-TW' ? '亮度' : 'Brightness'} 
                                                        value={avgAdjustments.brightness || 0} 
                                                        color="amber" 
                                                    />
                                                    <AdjustmentValue 
                                                        label={currentLanguage === 'zh-TW' ? '對比' : 'Contrast'} 
                                                        value={avgAdjustments.contrast || 0} 
                                                        color="blue" 
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">
                                            {currentLanguage === 'zh-TW' ? '還沒有光線條件資料' : 'No lighting data yet'}
                                        </p>
                                    )}
                                </div>
                            </CollapsibleSection>

                            {/* Clear Learning Data */}
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
                                {currentLanguage === 'zh-TW' ? '清除學習資料' : 'Clear Learning Data'}
                            </button>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4 text-blue-400" />
                                <span className="text-gray-400 text-xs">
                                    {currentLanguage === 'zh-TW' 
                                        ? '顯示最近的拍攝記錄，包含詳細參數' 
                                        : 'Recent capture history with detailed parameters'}
                                </span>
                            </div>

                            {photos.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">
                                        {currentLanguage === 'zh-TW' ? '還沒有拍攝記錄' : 'No capture history yet'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {photos.slice(0, 20).map((photo) => (
                                        <div 
                                            key={photo.id} 
                                            className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer"
                                            onClick={() => setSelectedPhoto(photo)}
                                        >
                                            <div className="flex gap-3">
                                                <img
                                                    src={photo.imageURL}
                                                    alt="Photo"
                                                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{getModeInfo(photo.mode).icon}</span>
                                                            <span className="text-white font-medium text-sm">
                                                                {currentLanguage === 'zh-TW' ? getModeInfo(photo.mode).name : getModeInfo(photo.mode).nameEn}
                                                            </span>
                                                            {photo.isLiked && <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />}
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <div className="text-gray-400 text-xs mb-2">
                                                        {formatDate(photo.createdAt)}
                                                    </div>
                                                    {photo.manualAdjustments && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {photo.manualAdjustments.brightness !== 0 && (
                                                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                                                    {currentLanguage === 'zh-TW' ? '亮度' : 'B'} {photo.manualAdjustments.brightness > 0 ? '+' : ''}{photo.manualAdjustments.brightness}
                                                                </span>
                                                            )}
                                                            {photo.manualAdjustments.contrast !== 0 && (
                                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                                    {currentLanguage === 'zh-TW' ? '對比' : 'C'} {photo.manualAdjustments.contrast > 0 ? '+' : ''}{photo.manualAdjustments.contrast}
                                                                </span>
                                                            )}
                                                            {photo.manualAdjustments.saturation !== 0 && (
                                                                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs rounded">
                                                                    {currentLanguage === 'zh-TW' ? '飽和' : 'S'} {photo.manualAdjustments.saturation > 0 ? '+' : ''}{photo.manualAdjustments.saturation}
                                                                </span>
                                                            )}
                                                            {photo.manualAdjustments.warmth !== 0 && (
                                                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                                                    {currentLanguage === 'zh-TW' ? '色溫' : 'W'} {photo.manualAdjustments.warmth > 0 ? '+' : ''}{photo.manualAdjustments.warmth}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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
                    <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-2 right-2 w-10 h-10 bg-black/50 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        {/* Photo */}
                        <img
                            src={selectedPhoto.imageURL}
                            alt="Photo detail"
                            className="w-full h-auto max-h-[60vh] object-contain rounded-xl"
                        />

                        {/* Photo info */}
                        <div className="mt-4 bg-white/5 rounded-xl p-4 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getModeInfo(selectedPhoto.mode).icon}</span>
                                    <div>
                                        <div className="text-white font-medium">
                                            {currentLanguage === 'zh-TW' ? getModeInfo(selectedPhoto.mode).name : getModeInfo(selectedPhoto.mode).nameEn}
                                        </div>
                                        <div className="text-gray-400 text-xs">
                                            {formatDate(selectedPhoto.createdAt)}
                                        </div>
                                    </div>
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

                            {/* Detailed Parameters */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs mb-2">
                                        {currentLanguage === 'zh-TW' ? '手動調整' : 'Manual Adjustments'}
                                    </div>
                                    {selectedPhoto.manualAdjustments ? (
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '亮度' : 'Brightness'}</span>
                                                <span className="text-amber-400 text-xs">
                                                    {selectedPhoto.manualAdjustments.brightness > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.brightness || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '對比' : 'Contrast'}</span>
                                                <span className="text-blue-400 text-xs">
                                                    {selectedPhoto.manualAdjustments.contrast > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.contrast || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '飽和度' : 'Saturation'}</span>
                                                <span className="text-pink-400 text-xs">
                                                    {selectedPhoto.manualAdjustments.saturation > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.saturation || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '色溫' : 'Warmth'}</span>
                                                <span className="text-orange-400 text-xs">
                                                    {selectedPhoto.manualAdjustments.warmth > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.warmth || 0}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '無調整' : 'No adjustments'}</span>
                                    )}
                                </div>

                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs mb-2">
                                        {currentLanguage === 'zh-TW' ? '拍攝資訊' : 'Capture Info'}
                                    </div>
                                    <div className="space-y-1">
                                        {selectedPhoto.zoom && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '縮放' : 'Zoom'}</span>
                                                <span className="text-white text-xs">{selectedPhoto.zoom.toFixed(1)}x</span>
                                            </div>
                                        )}
                                        {selectedPhoto.aspectRatio && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '比例' : 'Ratio'}</span>
                                                <span className="text-white text-xs">{selectedPhoto.aspectRatio}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '狀態' : 'Status'}</span>
                                            <span className={`text-xs ${selectedPhoto.isLiked ? 'text-pink-400' : 'text-gray-400'}`}>
                                                {selectedPhoto.isLiked 
                                                    ? (currentLanguage === 'zh-TW' ? '已喜愛' : 'Liked') 
                                                    : (currentLanguage === 'zh-TW' ? '未標記' : 'Not liked')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Filters Applied */}
                            {selectedPhoto.filters && (
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-gray-400 text-xs mb-2">
                                        {currentLanguage === 'zh-TW' ? '套用的濾鏡' : 'Applied Filters'}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPhoto.filters.brightness && (
                                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">
                                                {currentLanguage === 'zh-TW' ? '亮度' : 'Brightness'}: {selectedPhoto.filters.brightness}%
                                            </span>
                                        )}
                                        {selectedPhoto.filters.contrast && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                {currentLanguage === 'zh-TW' ? '對比' : 'Contrast'}: {selectedPhoto.filters.contrast}%
                                            </span>
                                        )}
                                        {selectedPhoto.filters.saturate && (
                                            <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded">
                                                {currentLanguage === 'zh-TW' ? '飽和' : 'Saturate'}: {selectedPhoto.filters.saturate}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Delete Button */}
                            <button
                                onClick={() => handleDeletePhoto(selectedPhoto)}
                                disabled={deletingPhotoId === selectedPhoto.id}
                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium transition-all flex items-center justify-center gap-2"
                            >
                                {deletingPhotoId === selectedPhoto.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                                {currentLanguage === 'zh-TW' ? '刪除照片' : 'Delete Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileModal;
