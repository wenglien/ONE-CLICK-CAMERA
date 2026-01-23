import React, { useState, useEffect, useMemo } from 'react';
import {
    X, User, Camera, Heart, Sparkles, LogOut, Settings, ChevronRight, Trash2,
    BarChart3, Zap, Palette, Loader2, Image, Download, Eye, Filter, Clock,
    ChevronDown, ChevronUp, Sun, Moon, Droplets, Flame, TrendingUp, Calendar,
    PieChart, Activity, Star, RefreshCw, FileText, Info, Edit2, Award, Check, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDialog from './ConfirmDialog';

const UserProfileModal = ({ isOpen, onClose, isEmbedded = false }) => {
    const { t, currentLanguage, toggleLanguage } = useLanguage();
    const {
        currentUser,
        userProfile,
        logout,
        updatePreferences,
        updateUserProfile,
        updateProfileImage,
        getUserPhotos,
        deletePhoto,
        updatePhotoLikeStatus
    } = useAuth();

    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [deletingPhotoId, setDeletingPhotoId] = useState(null);
    const [photoFilter, setPhotoFilter] = useState('all'); // all, liked, recent
    const [photoModeFilter, setPhotoModeFilter] = useState('all');

    const [expandedSections, setExpandedSections] = useState({
        modeUsage: true,
        foodTypes: false,
        lightingPrefs: false,
        learningHistory: false,
        achievements: true,
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        displayName: '',
        bio: '',
    });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, config: null });
    const [errorMessage, setErrorMessage] = useState(null);

    const [preferences, setPreferences] = useState({
        favoriteMode: 'normal',
        enableSuggestions: true,
        autoApplyPreference: false,
        rememberLastMode: true,
    });

    useEffect(() => {
        if (userProfile) {
            if (userProfile.preferences) {
                setPreferences(userProfile.preferences);
            }
            setEditForm({
                displayName: userProfile.displayName || '',
                bio: userProfile.bio || '',
            });
        }
    }, [userProfile]);

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
        setConfirmDialog({
            isOpen: true,
            config: {
                title: currentLanguage === 'zh-TW' ? '刪除照片' : 'Delete Photo',
                message: currentLanguage === 'zh-TW' ? '確定要刪除這張照片嗎？此操作無法復原。' : 'Are you sure you want to delete this photo? This action cannot be undone.',
                confirmText: currentLanguage === 'zh-TW' ? '刪除' : 'Delete',
                cancelText: currentLanguage === 'zh-TW' ? '取消' : 'Cancel',
                variant: 'danger',
                onConfirm: async () => {
                    setDeletingPhotoId(photo.id);
                    try {
                        const success = await deletePhoto(photo);
                        if (success) {
                            setPhotos(prev => prev.filter(p => p.id !== photo.id));
                            if (selectedPhoto?.id === photo.id) {
                                setSelectedPhoto(null);
                            }
                            setSaveMessage(currentLanguage === 'zh-TW' ? '照片已刪除' : 'Photo deleted');
                            setTimeout(() => setSaveMessage(''), 2000);
                        } else {
                            setErrorMessage(currentLanguage === 'zh-TW' ? '刪除失敗，請重試' : 'Failed to delete photo. Please try again.');
                            setTimeout(() => setErrorMessage(null), 3000);
                        }
                    } catch (error) {
                        console.error('Error deleting photo:', error);
                        setErrorMessage(currentLanguage === 'zh-TW' ? '刪除失敗，請重試' : 'Failed to delete photo. Please try again.');
                        setTimeout(() => setErrorMessage(null), 3000);
                    } finally {
                        setDeletingPhotoId(null);
                    }
                }
            }
        });
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
            setErrorMessage(currentLanguage === 'zh-TW' ? '更新失敗，請重試' : 'Failed to update like status. Please try again.');
            setTimeout(() => setErrorMessage(null), 3000);
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
            setErrorMessage(currentLanguage === 'zh-TW' ? '儲存失敗，請重試' : 'Failed to save preferences. Please try again.');
            setTimeout(() => setErrorMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const success = await updateUserProfile(editForm);
            if (success) {
                setSaveMessage(t('profile.saved'));
                setIsEditing(false);
                setTimeout(() => setSaveMessage(''), 2000);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrorMessage(currentLanguage === 'zh-TW' ? '更新失敗，請重試' : 'Failed to update profile. Please try again.');
            setTimeout(() => setErrorMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            setUploadingAvatar(true);
            try {
                const downloadURL = await updateProfileImage(reader.result);
                if (downloadURL) {
                    setSaveMessage(t('profile.saved'));
                    setTimeout(() => setSaveMessage(''), 2000);
                }
            } catch (error) {
                console.error('Error uploading avatar:', error);
                setErrorMessage(currentLanguage === 'zh-TW' ? '上傳失敗，請重試' : 'Failed to upload avatar. Please try again.');
                setTimeout(() => setErrorMessage(null), 3000);
            } finally {
                setUploadingAvatar(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleClearLearning = async () => {
        setConfirmDialog({
            isOpen: true,
            config: {
                title: currentLanguage === 'zh-TW' ? '清除學習資料' : 'Clear Learning Data',
                message: currentLanguage === 'zh-TW'
                    ? '確定要清除所有 AI 學習資料嗎？這將重置您的個人化偏好設定，此操作無法復原。'
                    : 'Are you sure you want to clear all AI learning data? This will reset your personalized preferences and cannot be undone.',
                confirmText: currentLanguage === 'zh-TW' ? '清除' : 'Clear',
                cancelText: currentLanguage === 'zh-TW' ? '取消' : 'Cancel',
                variant: 'warning',
                onConfirm: async () => {
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

                        const clearedMessage = t('profile.cleared') || (currentLanguage === 'zh-TW' ? '已清除學習資料' : 'Learning data cleared');
                        setSaveMessage(clearedMessage);
                        setTimeout(() => setSaveMessage(''), 2000);
                    } catch (error) {
                        console.error('Error clearing learning data:', error);
                        setErrorMessage(currentLanguage === 'zh-TW' ? '清除失敗，請重試' : 'Failed to clear learning data. Please try again.');
                        setTimeout(() => setErrorMessage(null), 3000);
                    } finally {
                        setLoading(false);
                    }
                }
            }
        });
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

    const foodieLevel = useMemo(() => {
        const total = userProfile?.stats?.totalPhotos || 0;
        if (total >= 100) return { level: 'Master', color: 'text-purple-400', xp: total, next: 500 };
        if (total >= 50) return { level: 'Expert', color: 'text-blue-400', xp: total, next: 100 };
        if (total >= 20) return { level: 'Pro', color: 'text-green-400', xp: total, next: 50 };
        if (total >= 5) return { level: 'Foodie', color: 'text-amber-400', xp: total, next: 20 };
        return { level: 'Newbie', color: 'text-gray-400', xp: total, next: 5 };
    }, [userProfile]);

    const achievements = useMemo(() => {
        const total = userProfile?.stats?.totalPhotos || 0;
        const liked = userProfile?.stats?.likedPhotos || 0;
        return [
            { id: 'first_shot', icon: Camera, title: 'First Shot', unlocked: total >= 1, desc: 'Take your first food photo' },
            { id: 'rising_star', icon: Star, title: 'Rising Star', unlocked: total >= 10, desc: 'Take 10 food photos' },
            { id: 'popular', icon: Heart, title: 'Popular', unlocked: liked >= 5, desc: 'Get 5 liked photos' },
            { id: 'night_owl', icon: Moon, title: 'Night Owl', unlocked: userProfile?.lightingPreferences?.dark?.count > 0, desc: 'Capture food in low light' },
            { id: 'vivid_lover', icon: Palette, title: 'Vivid Lover', unlocked: userProfile?.modeUsageCount?.vivid > 5, desc: 'Use Vivid mode 5 times' },
        ];
    }, [userProfile]);

    if (!isOpen || !currentUser) return null;

    const wrapperClass = isEmbedded
        ? "absolute inset-0 flex items-center justify-center p-0"
        : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md";

    const contentClass = isEmbedded
        ? "relative w-full h-full flex flex-col overflow-hidden"
        : "relative w-full max-w-lg liquid-glass-dark overflow-hidden shadow-2xl border border-white/10 animate-scaleIn max-h-[90vh] flex flex-col";

    const CollapsibleSection = ({ title, icon: Icon, iconColor, isExpanded, onToggle, children, badge }) => (
        <div className="liquid-glass border-white/5 overflow-hidden mb-4">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${iconColor.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
                        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                    </div>
                    <span className="text-white font-semibold tracking-tight">{title}</span>
                    {badge && (
                        <span className="px-2.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
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
                <div className="px-5 pb-5 border-t border-white/5 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );

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

                <div className="relative p-6 border-b border-white/10 shrink-0 profile-header-gradient">
                    {!isEmbedded && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20"
                            aria-label={currentLanguage === 'zh-TW' ? '關閉' : 'Close'}
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}

                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="profile-avatar-container">
                            <div className="profile-avatar-inner">
                                {uploadingAvatar ? (
                                    <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                                ) : userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-gray-400" />
                                )}
                            </div>
                            <label className="profile-edit-badge" aria-label={currentLanguage === 'zh-TW' ? '更換大頭貼' : 'Change avatar'}>
                                <Camera className="w-4 h-4" />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    disabled={uploadingAvatar}
                                    aria-label={currentLanguage === 'zh-TW' ? '上傳大頭貼' : 'Upload avatar'}
                                />
                            </label>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-center gap-2">
                                <h2 className="text-2xl font-bold text-white">
                                    {userProfile?.displayName || t('profile.user')}
                                </h2>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                    aria-label={currentLanguage === 'zh-TW' ? '編輯個人資料' : 'Edit profile'}
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className={`text-xs font-bold uppercase tracking-wider ${foodieLevel.color}`}>
                                    {foodieLevel.level}
                                </span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span className="text-gray-400 text-xs">LV. {Math.floor(foodieLevel.xp / 5) + 1}</span>
                            </div>
                            {userProfile?.bio && (
                                <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2 line-clamp-2 italic">
                                    "{userProfile.bio}"
                                </p>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/10 animate-scaleIn">
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">{currentLanguage === 'zh-TW' ? '顯示名稱' : 'Display Name'}</label>
                                    <input
                                        type="text"
                                        value={editForm.displayName}
                                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                        className="input-premium text-sm"
                                        placeholder={t('profile.user')}
                                        aria-label={currentLanguage === 'zh-TW' ? '顯示名稱' : 'Display Name'}
                                        autoComplete="name"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">{currentLanguage === 'zh-TW' ? '個人簡介' : 'Bio'}</label>
                                    <textarea
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                        className="input-premium text-sm resize-none h-20"
                                        placeholder={currentLanguage === 'zh-TW' ? '介紹一下你自己...' : 'Tell us about yourself...'}
                                        aria-label={currentLanguage === 'zh-TW' ? '個人簡介' : 'Bio'}
                                        maxLength={200}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                                    >
                                        {currentLanguage === 'zh-TW' ? '取消' : 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {currentLanguage === 'zh-TW' ? '儲存' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {saveMessage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full z-30 animate-fadeIn">
                            <span className="text-green-400 text-sm">{saveMessage}</span>
                        </div>
                    )}
                    {errorMessage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full z-30 animate-fadeIn">
                            <span className="text-red-400 text-sm">{errorMessage}</span>
                        </div>
                    )}
                </div>


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


                <div className="flex-1 overflow-y-auto p-4">

                    {activeTab === 'profile' && (
                        <div className="space-y-4">

                            <div className="grid grid-cols-3 gap-3">
                                <div className="stat-card-premium">
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                                        <Camera className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div className="text-xl font-bold text-white">{userProfile?.stats?.totalPhotos || 0}</div>
                                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{currentLanguage === 'zh-TW' ? '總照片' : 'Total'}</div>
                                </div>
                                <div className="stat-card-premium">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center mb-1">
                                        <Heart className="w-5 h-5 text-pink-400" />
                                    </div>
                                    <div className="text-xl font-bold text-white">{userProfile?.stats?.likedPhotos || 0}</div>
                                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{currentLanguage === 'zh-TW' ? '喜愛' : 'Liked'}</div>
                                </div>
                                <div className="stat-card-premium">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
                                        <Award className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div className="text-xl font-bold text-white">{achievements.filter(a => a.unlocked).length}</div>
                                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{currentLanguage === 'zh-TW' ? '成就' : 'Badges'}</div>
                                </div>
                            </div>


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


                            <CollapsibleSection
                                title={currentLanguage === 'zh-TW' ? '成就勳章' : 'Achievements'}
                                icon={Award}
                                iconColor="text-amber-400"
                                isExpanded={expandedSections.achievements}
                                onToggle={() => toggleSection('achievements')}
                                badge={achievements.filter(a => a.unlocked).length > 0 ? `${achievements.filter(a => a.unlocked).length}` : null}
                            >
                                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                                    {achievements.map((achievement) => (
                                        <div key={achievement.id} className="flex flex-col items-center gap-1 group relative">
                                            <div className={`achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                                                <achievement.icon className={`w-6 h-6 ${achievement.unlocked ? 'text-green-400' : 'text-gray-600'}`} />
                                                {achievement.unlocked && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                                                        <Check className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-medium">{achievement.title}</span>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 p-2 bg-gray-800 rounded-lg text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                                                {achievement.desc}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>

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


                    {activeTab === 'photos' && (
                        <div className="space-y-4">

                            <div className="flex flex-wrap gap-2">

                                <div className="flex bg-white/5 rounded-lg p-1">
                                    {[
                                        { id: 'all', label: currentLanguage === 'zh-TW' ? '全部' : 'All' },
                                        { id: 'liked', label: currentLanguage === 'zh-TW' ? '喜愛' : 'Liked', icon: Heart },
                                        { id: 'recent', label: currentLanguage === 'zh-TW' ? '近期' : 'Recent', icon: Clock },
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setPhotoFilter(filter.id)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${photoFilter === filter.id
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {filter.icon && <filter.icon className="w-3 h-3" />}
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>


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
                                <div className="grid grid-cols-3 gap-2">
                                    {filteredPhotos.map((photo) => (
                                        <div
                                            key={photo.id}
                                            className="photo-grid-item group"
                                            onClick={() => setSelectedPhoto(photo)}
                                        >
                                            <img
                                                src={photo.imageURL}
                                                alt="Saved photo"
                                            />
                                            <div className="photo-overlay-gradient" />

                                            {/* Mode badge - always visible */}
                                            <div className="absolute top-1.5 left-1.5 pointer-events-none">
                                                <span className="text-sm drop-shadow-lg">{getModeInfo(photo.mode).icon}</span>
                                            </div>

                                            {/* Like indicator */}
                                            {photo.isLiked && (
                                                <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
                                                    <Heart className="w-3 h-3 text-pink-400 fill-pink-400 drop-shadow-lg" />
                                                </div>
                                            )}

                                            {/* Restaurant indicator */}
                                            {photo.restaurantName && (
                                                <div className="absolute bottom-1.5 left-6 pointer-events-none">
                                                    <MapPin className="w-3 h-3 text-green-400 drop-shadow-lg" />
                                                </div>
                                            )}

                                            {/* Hover info overlay */}
                                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 pointer-events-none">
                                                <span className="text-2xl mb-1">{getModeInfo(photo.mode).icon}</span>
                                                <span className="text-white text-xs font-medium text-center">
                                                    {currentLanguage === 'zh-TW' ? getModeInfo(photo.mode).name : getModeInfo(photo.mode).nameEn}
                                                </span>
                                                <span className="text-gray-400 text-[10px] mt-1">
                                                    {formatShortDate(photo.createdAt)}
                                                </span>
                                                {photo.photoInfo && (
                                                    <span className="text-gray-500 text-[9px] mt-0.5">
                                                        {photo.photoInfo.width}x{photo.photoInfo.height}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePhoto(photo);
                                                }}
                                                disabled={deletingPhotoId === photo.id}
                                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                {deletingPhotoId === photo.id ? (
                                                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3 text-white" />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}


                    {activeTab === 'learning' && (
                        <div className="space-y-4">

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
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {photo.manualAdjustments.brightness !== 0 && (
                                                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-lg">
                                                                    {currentLanguage === 'zh-TW' ? '亮度' : 'B'} {photo.manualAdjustments.brightness > 0 ? '+' : ''}{photo.manualAdjustments.brightness}
                                                                </span>
                                                            )}
                                                            {photo.manualAdjustments.contrast !== 0 && (
                                                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-medium rounded-lg">
                                                                    {currentLanguage === 'zh-TW' ? '對比' : 'C'} {photo.manualAdjustments.contrast > 0 ? '+' : ''}{photo.manualAdjustments.contrast}
                                                                </span>
                                                            )}
                                                            {photo.manualAdjustments.saturation !== 0 && (
                                                                <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] font-medium rounded-lg">
                                                                    {currentLanguage === 'zh-TW' ? '飽和' : 'S'} {photo.manualAdjustments.saturation > 0 ? '+' : ''}{photo.manualAdjustments.saturation}
                                                                </span>
                                                            )}
                                                            {photo.manualAdjustments.warmth !== 0 && (
                                                                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-medium rounded-lg">
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


                    {activeTab === 'preferences' && (
                        <div className="space-y-4">

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


            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-2 right-2 w-10 h-10 bg-black/50 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>


                        <img
                            src={selectedPhoto.imageURL}
                            alt="Photo detail"
                            className="w-full h-auto max-h-[60vh] object-contain rounded-xl"
                        />


                        <div className="mt-4 bg-white/5 rounded-xl p-4 space-y-4">

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


                            {selectedPhoto.restaurantName && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-sm">{selectedPhoto.restaurantName}</div>
                                        <div className="text-gray-400 text-xs">{currentLanguage === 'zh-TW' ? '拍攝地點' : 'Capture Location'}</div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/30 rounded-xl p-3">
                                    <div className="text-gray-400 text-xs font-medium mb-2">
                                        {currentLanguage === 'zh-TW' ? '手動調整' : 'Adjustments'}
                                    </div>
                                    {selectedPhoto.manualAdjustments ? (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '亮度' : 'Bright'}</span>
                                                <span className="text-amber-400 text-xs font-medium">
                                                    {selectedPhoto.manualAdjustments.brightness > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.brightness || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '對比' : 'Contrast'}</span>
                                                <span className="text-blue-400 text-xs font-medium">
                                                    {selectedPhoto.manualAdjustments.contrast > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.contrast || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '飽和' : 'Sat'}</span>
                                                <span className="text-pink-400 text-xs font-medium">
                                                    {selectedPhoto.manualAdjustments.saturation > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.saturation || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '色溫' : 'Warmth'}</span>
                                                <span className="text-orange-400 text-xs font-medium">
                                                    {selectedPhoto.manualAdjustments.warmth > 0 ? '+' : ''}{selectedPhoto.manualAdjustments.warmth || 0}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '無調整' : 'None'}</span>
                                    )}
                                </div>

                                <div className="bg-black/30 rounded-xl p-3">
                                    <div className="text-gray-400 text-xs font-medium mb-2">
                                        {currentLanguage === 'zh-TW' ? '技術規格' : 'Tech Specs'}
                                    </div>
                                    <div className="space-y-1.5">
                                        {selectedPhoto.photoInfo ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '解析度' : 'Res'}</span>
                                                    <span className="text-white text-xs font-medium">{selectedPhoto.photoInfo.width}x{selectedPhoto.photoInfo.height}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '大小' : 'Size'}</span>
                                                    <span className="text-white text-xs font-medium">{selectedPhoto.photoInfo.size} MB</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '縮放' : 'Zoom'}</span>
                                                <span className="text-white text-xs font-medium">{selectedPhoto.zoom?.toFixed(1) || '1.0'}x</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '比例' : 'Ratio'}</span>
                                            <span className="text-white text-xs font-medium">{selectedPhoto.aspectRatio || '4:3'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '格式' : 'Format'}</span>
                                            <span className="text-white text-xs font-medium">{selectedPhoto.photoInfo?.format || 'JPEG'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedPhoto.context && (
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mt-3">
                                    <div className="text-gray-400 text-xs font-medium mb-2">
                                        {currentLanguage === 'zh-TW' ? 'AI 環境分析' : 'AI Analysis'}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '主體' : 'Object'}</span>
                                            <span className="text-purple-400 text-xs font-medium">{getFoodTypeText(selectedPhoto.context.objectType)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '光線' : 'Light'}</span>
                                            <span className="text-purple-400 text-xs font-medium">
                                                {selectedPhoto.context.isLowLight ? (currentLanguage === 'zh-TW' ? '低光源' : 'Low') :
                                                    selectedPhoto.context.isBacklit ? (currentLanguage === 'zh-TW' ? '逆光' : 'Backlit') :
                                                        (currentLanguage === 'zh-TW' ? '正常' : 'Normal')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '亮度' : 'Bright'}</span>
                                            <span className="text-purple-400 text-xs font-medium">{selectedPhoto.context.brightness}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-xs">{currentLanguage === 'zh-TW' ? '色溫' : 'Color'}</span>
                                            <span className="text-purple-400 text-xs font-medium">{selectedPhoto.context.colorTemp}</span>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {selectedPhoto.filters && (
                                <div className="bg-black/30 rounded-xl p-3 mt-3">
                                    <div className="text-gray-400 text-xs font-medium mb-2">
                                        {currentLanguage === 'zh-TW' ? '套用濾鏡' : 'Filters'}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPhoto.filters.brightness && (
                                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-lg">
                                                {currentLanguage === 'zh-TW' ? '亮度' : 'B'}: {Math.round(selectedPhoto.filters.brightness)}%
                                            </span>
                                        )}
                                        {selectedPhoto.filters.contrast && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-medium rounded-lg">
                                                {currentLanguage === 'zh-TW' ? '對比' : 'C'}: {Math.round(selectedPhoto.filters.contrast)}%
                                            </span>
                                        )}
                                        {selectedPhoto.filters.saturate && (
                                            <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-[10px] font-medium rounded-lg">
                                                {currentLanguage === 'zh-TW' ? '飽和' : 'S'}: {Math.round(selectedPhoto.filters.saturate)}%
                                            </span>
                                        )}
                                        {selectedPhoto.filters.warmth !== undefined && (
                                            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-[10px] font-medium rounded-lg">
                                                {currentLanguage === 'zh-TW' ? '色溫' : 'W'}: {selectedPhoto.filters.warmth}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}


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

            {/* Confirm Dialog */}
            {confirmDialog.isOpen && confirmDialog.config && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ isOpen: false, config: null })}
                    onConfirm={confirmDialog.config.onConfirm}
                    title={confirmDialog.config.title}
                    message={confirmDialog.config.message}
                    confirmText={confirmDialog.config.confirmText}
                    cancelText={confirmDialog.config.cancelText}
                    variant={confirmDialog.config.variant}
                />
            )}
        </div>
    );
};

export default UserProfileModal;
