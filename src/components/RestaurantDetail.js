import React, { useState, useEffect, useMemo } from 'react';
import { X, Camera, Heart, User, Clock, Sliders, Copy, CheckCircle, Loader2, ChevronDown, ChevronUp, Sparkles, Sun, Contrast, Droplets, Thermometer, Eye, TrendingUp, Award, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import restaurantService from '../services/restaurantService';

// Parameter Progress Bar Component
const ParamBar = ({ label, value, min = 0, max = 200, unit = '%', icon: Icon, color = 'green' }) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const isNeutral = value === 100 || value === 0;

    const colorClasses = {
        green: { bg: 'from-green-500 to-emerald-500', text: 'text-green-400', light: 'bg-green-500/20' },
        blue: { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-400', light: 'bg-blue-500/20' },
        amber: { bg: 'from-amber-500 to-orange-500', text: 'text-amber-400', light: 'bg-amber-500/20' },
        purple: { bg: 'from-purple-500 to-pink-500', text: 'text-purple-400', light: 'bg-purple-500/20' },
    };

    const colors = colorClasses[color] || colorClasses.green;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={`w-3.5 h-3.5 ${colors.text}`} />}
                    <span className="text-xs text-gray-400">{label}</span>
                </div>
                <span className={`text-sm font-bold ${isNeutral ? 'text-gray-400' : colors.text}`}>
                    {value}{unit}
                </span>
            </div>
            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${colors.bg} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// Adjustment Indicator Component
const AdjustmentIndicator = ({ label, value, icon: Icon }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const isNeutral = value === 0;

    return (
        <div className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isNeutral ? 'bg-gray-700/30' : isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
            <div className="flex items-center gap-2">
                {Icon && <Icon className={`w-4 h-4 ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-400' : 'text-red-400'}`} />}
                <span className="text-xs text-gray-400">{label}</span>
            </div>
            <span className={`text-sm font-bold ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                {isPositive ? '+' : ''}{value}
            </span>
        </div>
    );
};

// Visual Preview Simulation
const FilterPreview = ({ filters, manualAdjustments }) => {
    const filterStyle = useMemo(() => {
        const brightness = (filters?.brightness || 100) / 100;
        const contrast = (filters?.contrast || 100) / 100;
        const saturate = (filters?.saturate || 100) / 100;
        const warmth = filters?.warmth || 0;

        // Manual adjustments add to base
        const totalBrightness = brightness + (manualAdjustments?.brightness || 0) / 100;
        const totalContrast = contrast + (manualAdjustments?.contrast || 0) / 100;
        const totalSaturate = saturate + (manualAdjustments?.saturation || 0) / 100;

        return {
            filter: `brightness(${totalBrightness}) contrast(${totalContrast}) saturate(${totalSaturate}) sepia(${Math.max(0, warmth / 100)}) hue-rotate(${warmth < 0 ? warmth * 0.5 : 0}deg)`
        };
    }, [filters, manualAdjustments]);

    return (
        <div className="relative overflow-hidden rounded-xl">
            <div
                className="w-full h-24 bg-gradient-to-br from-orange-400 via-red-400 to-pink-500"
                style={filterStyle}
            >
                {/* Simulated food image placeholder with gradient */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white/80" />
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white/80 text-center">效果預覽</p>
            </div>
        </div>
    );
};

const RestaurantDetail = ({ restaurant, isOpen, onClose, onApplyParams }) => {
    const { t } = useLanguage();

    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'compact'

    // 載入餐廳照片參數
    useEffect(() => {
        if (isOpen && restaurant) {
            loadPhotos();
        }
    }, [isOpen, restaurant]);

    const loadPhotos = async () => {
        try {
            setLoading(true);
            const photoList = await restaurantService.getRestaurantPhotos(restaurant.placeId || restaurant.id);
            setPhotos(photoList);
            // Auto-expand first photo if only one exists
            if (photoList.length === 1) {
                setExpandedId(photoList[0].id);
            }
        } catch (error) {
            console.error('Failed to load photos:', error);
        } finally {
            setLoading(false);
        }
    };

    // 套用參數
    const handleApplyParams = (photo) => {
        const params = {
            mode: photo.mode,
            filters: photo.filters,
            manualAdjustments: photo.manualAdjustments
        };
        onApplyParams(params);
    };

    // 複製參數
    const handleCopyParams = (photo) => {
        const paramText = `🍽️ ${restaurant.name} 拍攝參數
━━━━━━━━━━━━━━━━━
📸 模式: ${getModeLabel(photo.mode)}

🎨 濾鏡設定:
  ☀️ 亮度: ${photo.filters?.brightness || 100}%
  🔲 對比: ${photo.filters?.contrast || 100}%
  💧 飽和度: ${photo.filters?.saturate || 100}%
  🌡️ 色溫: ${photo.filters?.warmth > 0 ? '+' : ''}${photo.filters?.warmth || 0}

✨ 手動調整:
  亮度: ${photo.manualAdjustments?.brightness > 0 ? '+' : ''}${photo.manualAdjustments?.brightness || 0}
  對比: ${photo.manualAdjustments?.contrast > 0 ? '+' : ''}${photo.manualAdjustments?.contrast || 0}
  飽和度: ${photo.manualAdjustments?.saturation > 0 ? '+' : ''}${photo.manualAdjustments?.saturation || 0}
  色溫: ${photo.manualAdjustments?.warmth > 0 ? '+' : ''}${photo.manualAdjustments?.warmth || 0}`;

        navigator.clipboard.writeText(paramText);
        setCopiedId(photo.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // 按讚
    const handleLike = async (photo) => {
        try {
            await restaurantService.likePhotoParams(restaurant.placeId || restaurant.id, photo.id);
            setPhotos(photos.map(p =>
                p.id === photo.id ? { ...p, likes: (p.likes || 0) + 1 } : p
            ));
        } catch (error) {
            console.error('Failed to like:', error);
        }
    };

    // 取得模式標籤與圖示
    const getModeLabel = (mode) => {
        const modeLabels = {
            normal: '自然',
            vivid: '鮮豔',
            warm: '暖色',
            cool: '冷色',
            soft: '柔和',
            dramatic: '戲劇'
        };
        return modeLabels[mode] || mode;
    };

    const getModeColor = (mode) => {
        const modeColors = {
            normal: 'from-gray-400 to-gray-500',
            vivid: 'from-pink-500 to-rose-500',
            warm: 'from-orange-500 to-amber-500',
            cool: 'from-blue-500 to-cyan-500',
            soft: 'from-purple-400 to-pink-400',
            dramatic: 'from-red-600 to-orange-600'
        };
        return modeColors[mode] || modeColors.normal;
    };

    // 格式化時間
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '剛剛';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
        return date.toLocaleDateString('zh-TW');
    };

    // Get best params (most liked)
    const bestParams = useMemo(() => {
        if (photos.length === 0) return null;
        return photos.reduce((best, current) =>
            (current.likes || 0) > (best.likes || 0) ? current : best
            , photos[0]);
    }, [photos]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end justify-center">
            <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex-shrink-0 bg-gradient-to-b from-gray-800/50 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-white truncate">{restaurant.name}</h2>
                            <p className="text-sm text-gray-400 truncate mt-1">{restaurant.address}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-xl">
                            <Camera className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-400 font-bold">{photos.length}</span>
                            <span className="text-xs text-green-400/70">組參數</span>
                        </div>
                        {bestParams && bestParams.likes > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 rounded-xl">
                                <Award className="w-4 h-4 text-amber-400" />
                                <span className="text-xs text-amber-400">最高 {bestParams.likes} 讚</span>
                            </div>
                        )}
                        {/* View Mode Toggle */}
                        <div className="ml-auto flex items-center bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'cards' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                詳細
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'compact' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                精簡
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4">
                                <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                            </div>
                            <p className="text-gray-400">載入拍攝參數中...</p>
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gray-800 flex items-center justify-center">
                                <Camera className="w-10 h-10 text-gray-600" />
                            </div>
                            <p className="text-white font-bold text-lg mb-2">還沒有人分享參數</p>
                            <p className="text-gray-500 text-sm">成為第一個分享的攝影師吧！</p>
                        </div>
                    ) : viewMode === 'compact' ? (
                        /* Compact View */
                        <div className="space-y-2">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 hover:bg-gray-750 transition-all cursor-pointer active:scale-[0.98]"
                                    onClick={() => handleApplyParams(photo)}
                                >
                                    {/* Mode Badge */}
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getModeColor(photo.mode)} flex items-center justify-center flex-shrink-0`}>
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">{getModeLabel(photo.mode)}</span>
                                            {photo.likes > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-pink-400">
                                                    <Heart className="w-3 h-3" /> {photo.likes}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            <span>亮度 {photo.filters?.brightness || 100}%</span>
                                            <span>對比 {photo.filters?.contrast || 100}%</span>
                                            <span>飽和 {photo.filters?.saturate || 100}%</span>
                                        </div>
                                    </div>

                                    {/* Apply Button */}
                                    <div className="flex-shrink-0">
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <Camera className="w-4 h-4 text-green-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Detailed Cards View */
                        <div className="space-y-4">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className={`bg-gray-800 rounded-2xl overflow-hidden transition-all duration-300 ${expandedId === photo.id ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/10' : 'hover:bg-gray-750'
                                        }`}
                                >
                                    {/* Card Header */}
                                    <div
                                        className="p-4 cursor-pointer active:bg-gray-700/50 transition-colors"
                                        onClick={() => setExpandedId(expandedId === photo.id ? null : photo.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* User Avatar with Mode Gradient */}
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getModeColor(photo.mode)} flex items-center justify-center shadow-lg`}>
                                                    <User className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-white">{photo.userName || '匿名使用者'}</p>
                                                        {photo.likes > 0 && (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-pink-500/20 rounded-full">
                                                                <Heart className="w-3 h-3 text-pink-400" />
                                                                <span className="text-xs text-pink-400 font-medium">{photo.likes}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{formatTime(photo.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1.5 bg-gradient-to-r ${getModeColor(photo.mode)} text-white text-sm font-medium rounded-lg shadow-sm`}>
                                                    {getModeLabel(photo.mode)}
                                                </span>
                                                <div className={`p-1.5 rounded-lg transition-transform ${expandedId === photo.id ? 'rotate-180 bg-green-500/20' : 'bg-gray-700/50'}`}>
                                                    <ChevronDown className={`w-4 h-4 ${expandedId === photo.id ? 'text-green-400' : 'text-gray-400'}`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Preview Stats */}
                                        {expandedId !== photo.id && (
                                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
                                                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                                                    <span className="text-xs text-gray-300">{photo.filters?.brightness || 100}%</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
                                                    <Contrast className="w-3.5 h-3.5 text-blue-400" />
                                                    <span className="text-xs text-gray-300">{photo.filters?.contrast || 100}%</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
                                                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                                                    <span className="text-xs text-gray-300">{photo.filters?.saturate || 100}%</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
                                                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                                                    <span className="text-xs text-gray-300">{photo.filters?.warmth > 0 ? '+' : ''}{photo.filters?.warmth || 0}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedId === photo.id && (
                                        <div className="px-4 pb-4 space-y-4 border-t border-gray-700/50 animate-fadeIn">
                                            {/* Filter Preview */}
                                            <div className="pt-4">
                                                <FilterPreview
                                                    filters={photo.filters}
                                                    manualAdjustments={photo.manualAdjustments}
                                                />
                                            </div>

                                            {/* Filter Settings with Progress Bars */}
                                            <div className="bg-gray-700/30 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sliders className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm font-medium text-white">濾鏡設定</span>
                                                </div>
                                                <ParamBar
                                                    label="亮度"
                                                    value={photo.filters?.brightness || 100}
                                                    icon={Sun}
                                                    color="amber"
                                                />
                                                <ParamBar
                                                    label="對比度"
                                                    value={photo.filters?.contrast || 100}
                                                    icon={Contrast}
                                                    color="blue"
                                                />
                                                <ParamBar
                                                    label="飽和度"
                                                    value={photo.filters?.saturate || 100}
                                                    icon={Droplets}
                                                    color="purple"
                                                />
                                                <ParamBar
                                                    label="色溫"
                                                    value={(photo.filters?.warmth || 0) + 100}
                                                    min={0}
                                                    max={200}
                                                    unit=""
                                                    icon={Thermometer}
                                                    color="green"
                                                />
                                            </div>

                                            {/* Manual Adjustments */}
                                            <div className="bg-gray-700/30 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                                    <span className="text-sm font-medium text-white">手動調整</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <AdjustmentIndicator
                                                        label="亮度"
                                                        value={photo.manualAdjustments?.brightness || 0}
                                                        icon={Sun}
                                                    />
                                                    <AdjustmentIndicator
                                                        label="對比"
                                                        value={photo.manualAdjustments?.contrast || 0}
                                                        icon={Contrast}
                                                    />
                                                    <AdjustmentIndicator
                                                        label="飽和度"
                                                        value={photo.manualAdjustments?.saturation || 0}
                                                        icon={Droplets}
                                                    />
                                                    <AdjustmentIndicator
                                                        label="色溫"
                                                        value={photo.manualAdjustments?.warmth || 0}
                                                        icon={Thermometer}
                                                    />
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            {(photo.foodType || photo.lightingCondition) && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {photo.foodType && photo.foodType !== 'unknown' && (
                                                        <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full flex items-center gap-1.5">
                                                            🍽️ {photo.foodType}
                                                        </span>
                                                    )}
                                                    {photo.lightingCondition && photo.lightingCondition !== 'normal' && (
                                                        <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full flex items-center gap-1.5">
                                                            💡 {photo.lightingCondition}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApplyParams(photo);
                                                    }}
                                                    className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all active:scale-[0.98] shadow-lg shadow-green-500/25"
                                                >
                                                    <Camera className="w-5 h-5" />
                                                    立即套用
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyParams(photo);
                                                    }}
                                                    className={`p-3.5 rounded-xl transition-all active:scale-95 ${copiedId === photo.id
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                                        }`}
                                                >
                                                    {copiedId === photo.id ? (
                                                        <CheckCircle className="w-5 h-5" />
                                                    ) : (
                                                        <Copy className="w-5 h-5" />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleLike(photo);
                                                    }}
                                                    className="p-3.5 bg-gray-700 hover:bg-pink-500/20 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                                                >
                                                    <Heart className="w-5 h-5 text-pink-400" />
                                                    <span className="text-sm font-medium text-gray-300">{photo.likes || 0}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slideUp {
                    animation: slide-up 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .bg-gray-750 {
                    background-color: rgb(42, 45, 55);
                }
            `}</style>
        </div>
    );
};

export default RestaurantDetail;
