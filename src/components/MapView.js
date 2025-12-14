import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { X, MapPin, Camera, Navigation, Loader2, Users, ChevronRight, ChevronUp, ChevronDown, Star, RefreshCw, Search, List, Map as MapIcon, Sun, Contrast, Droplets, Heart, Zap, Filter, SlidersHorizontal, Crosshair, TrendingUp, Clock, Award } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import restaurantService from '../services/restaurantService';
import RestaurantDetail from './RestaurantDetail';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 25.0330,  
    lng: 121.5654
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    gestureHandling: 'greedy', 
    styles: [
        {
            featureType: 'poi.business',
            stylers: [{ visibility: 'on' }]
        },
        {
            featureType: 'poi.business',
            elementType: 'labels.icon',
            stylers: [{ visibility: 'on' }]
        }
    ]
};

// Restaurant Card Component for List View
const RestaurantCard = ({ restaurant, index, onClick, onQuickApply }) => {
    const hasParams = restaurant.photoCount > 0;
    
    return (
        <div
            onClick={onClick}
            className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 transition-all active:scale-[0.98] cursor-pointer hover:bg-gray-750 border border-white/5"
        >
            <div className="flex items-start gap-4">
                {/* Rank/Icon Badge */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/30' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600' :
                    hasParams ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gray-700'
                }`}>
                    {index < 3 ? (
                        <span className="text-white font-bold text-xl">{index + 1}</span>
                    ) : (
                        <Camera className={`w-6 h-6 ${hasParams ? 'text-white' : 'text-gray-400'}`} />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate">{restaurant.name}</h3>
                        {restaurant.photoCount > 5 && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full flex-shrink-0">
                                🔥 熱門
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-2">{restaurant.address}</p>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/15 rounded-lg">
                            <Camera className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400 font-medium">{restaurant.photoCount} 組參數</span>
                        </div>
                        {restaurant.distance && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/15 rounded-lg">
                                <Navigation className="w-3 h-3 text-blue-400" />
                                <span className="text-xs text-blue-400">{restaurant.distance} km</span>
                            </div>
                        )}
                        {restaurant.avgLikes > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-pink-500/15 rounded-lg">
                                <Heart className="w-3 h-3 text-pink-400" />
                                <span className="text-xs text-pink-400">{restaurant.avgLikes}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center">
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
            </div>
        </div>
    );
};

const MapView = ({ isOpen, onClose, onApplyParams, refreshTrigger, isEmbedded = false }) => {
    const { t } = useLanguage();
    const mapRef = useRef(null);
    const lastRefreshTriggerRef = useRef(0); 
    const prevIsOpenRef = useRef(false); 

    // Google Maps API loading
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places']
    });

    // State
    const [userLocation, setUserLocation] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [showRestaurantDetail, setShowRestaurantDetail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
    const [sortBy, setSortBy] = useState('distance'); // 'distance', 'popular', 'recent'
    const [showFilterSheet, setShowFilterSheet] = useState(false);

    // Sorted restaurants based on sortBy
    const sortedRestaurants = useMemo(() => {
        const sorted = [...restaurants];
        switch (sortBy) {
            case 'popular':
                return sorted.sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0));
            case 'recent':
                return sorted.sort((a, b) => {
                    const dateA = a.lastUpdated?.toDate?.() || new Date(0);
                    const dateB = b.lastUpdated?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });
            case 'distance':
            default:
                return sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        }
    }, [restaurants, sortBy]);

    const getUserLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('您的瀏覽器不支援地理位置功能');
            return;
        }

        setLoading(true);
        setLocationError(null);

        const requestLocation = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(location);
                    setMapCenter(location);
                    setLocationError(null);
                    setLoading(false);

                    loadNearbyRestaurants(location.lat, location.lng);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setLoading(false);

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            setLocationError('定位權限被拒絕。請在 Safari 設定 > 隱私權 > 定位服務中允許此網站使用定位');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            setLocationError('無法取得位置資訊，請確認裝置已開啟定位功能');
                            break;
                        case error.TIMEOUT:
                            setLocationError('定位逾時，請重試');
                            break;
                        default:
                            setLocationError('無法取得您的位置，請確認已開啟定位權限');
                    }
                },
                {
                    enableHighAccuracy: false, 
                    timeout: 15000,
                    maximumAge: 300000 
                }
            );
        };

        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'denied') {
                    setLoading(false);
                    setLocationError('定位權限已被封鎖。請在瀏覽器設定中允許定位權限');
                } else {
                    requestLocation();
                }
            }).catch(() => {
                requestLocation();
            });
        } else {
            requestLocation();
        }
    }, []);

    const loadNearbyRestaurants = async (lat, lng) => {
        try {
            setLoading(true);
            const nearbyRestaurants = await restaurantService.getNearbyRestaurantsWithPhotos(lat, lng, 10);
            setRestaurants(nearbyRestaurants);
            console.log('Loaded restaurants:', nearbyRestaurants);
        } catch (error) {
            console.error('Failed to load restaurants:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && isLoaded) {
            const justOpened = !prevIsOpenRef.current && isOpen;
            const hasNewData = refreshTrigger > lastRefreshTriggerRef.current;
            
            if (userLocation) {
                if (justOpened || hasNewData || restaurants.length === 0) {
                    console.log('📍 MapView loading restaurants...', { justOpened, hasNewData, refreshTrigger });
                    loadNearbyRestaurants(userLocation.lat, userLocation.lng);
                }
            } else {
                getUserLocation();
            }
            
            lastRefreshTriggerRef.current = refreshTrigger;
        }
        
        prevIsOpenRef.current = isOpen;
    }, [isOpen, isLoaded, refreshTrigger, userLocation, restaurants.length, getUserLocation]);

    useEffect(() => {
        if (isOpen && isLoaded && userLocation && restaurants.length === 0) {
            console.log('📍 Got location, loading restaurants...');
            loadNearbyRestaurants(userLocation.lat, userLocation.lng);
        }
    }, [userLocation, isOpen, isLoaded, restaurants.length]);

    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const handleRestaurantClick = (restaurant) => {
        setSelectedRestaurant(restaurant);
    };

    const openRestaurantDetail = () => {
        if (selectedRestaurant) {
            setShowRestaurantDetail(true);
        }
    };

    const handleApplyParams = (params) => {
        if (onApplyParams) {
            onApplyParams(params);
        }
        setShowRestaurantDetail(false);
        onClose();
    };

    const handleRefresh = () => {
        if (userLocation) {
            loadNearbyRestaurants(userLocation.lat, userLocation.lng);
        } else {
            getUserLocation();
        }
    };

    const handleSearch = async (query) => {
        if (!query.trim() || !isLoaded) return;

        setLoading(true);
        try {
            const autocompleteService = new window.google.maps.places.AutocompleteService();

            const request = {
                input: query,
                types: ['restaurant', 'food', 'cafe', 'bakery'],
                componentRestrictions: userLocation ? undefined : { country: 'tw' },
                locationBias: userLocation ? {
                    center: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
                    radius: 10000
                } : undefined
            };

            autocompleteService.getPlacePredictions(request, async (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const resultsWithParams = await Promise.all(
                        predictions.slice(0, 5).map(async (prediction) => {
                            const existingRestaurant = restaurants.find(r =>
                                r.placeId === prediction.place_id ||
                                r.name.toLowerCase() === prediction.structured_formatting.main_text.toLowerCase()
                            );

                            return {
                                placeId: prediction.place_id,
                                name: prediction.structured_formatting.main_text,
                                address: prediction.structured_formatting.secondary_text || '',
                                description: prediction.description,
                                hasParams: !!existingRestaurant,
                                photoCount: existingRestaurant?.photoCount || 0,
                                existingData: existingRestaurant || null
                            };
                        })
                    );

                    setSearchResults(resultsWithParams);
                    setShowSearchResults(true);
                } else {
                    setSearchResults([]);
                    setShowSearchResults(true);
                }
                setLoading(false);
            });
        } catch (error) {
            console.error('Search error:', error);
            setLoading(false);
        }
    };

    const selectSearchResult = async (result) => {
        setShowSearchResults(false);
        setSearchQuery(result.name);

        if (result.existingData) {
            setSelectedRestaurant(result.existingData);
            const location = {
                lat: result.existingData.location.latitude,
                lng: result.existingData.location.longitude
            };
            setMapCenter(location);
            if (mapRef.current) {
                mapRef.current.panTo(location);
                mapRef.current.setZoom(17);
            }
        } else {
            setLoading(true);
            try {
                const placesService = new window.google.maps.places.PlacesService(mapRef.current);

                placesService.getDetails(
                    {
                        placeId: result.placeId,
                        fields: ['geometry', 'name', 'formatted_address', 'place_id']
                    },
                    async (place, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                            const location = {
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng()
                            };

                            let photoCount = 0;
                            try {
                                const photos = await restaurantService.getRestaurantPhotos(result.placeId);
                                photoCount = photos.length;
                            } catch (e) {
                                console.log('No photos found for this restaurant');
                            }

                            const tempRestaurant = {
                                id: result.placeId,
                                placeId: result.placeId,
                                name: place.name,
                                address: place.formatted_address,
                                location: {
                                    latitude: location.lat,
                                    longitude: location.lng
                                },
                                photoCount: photoCount
                            };

                            setSelectedRestaurant(tempRestaurant);
                            setMapCenter(location);
                            if (mapRef.current) {
                                mapRef.current.panTo(location);
                                mapRef.current.setZoom(17);
                            }
                        }
                        setLoading(false);
                    }
                );
            } catch (error) {
                console.error('Place details error:', error);
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, isLoaded]);

    if (!isOpen) return null;

    const wrapperClass = isEmbedded
        ? "absolute inset-0 bg-gray-950" 
        : "fixed inset-0 z-50 bg-gray-950"; 

    return (
        <div className={wrapperClass}>
            {/* Enhanced Header */}
            <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
                {/* Top Bar */}
                <div className="bg-gray-900/95 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3">
                        {!isEmbedded && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        )}

                        <div className="flex-1 text-center">
                            <h1 className="text-white text-lg font-bold">探索拍攝點</h1>
                            {userLocation && (
                                <p className="text-xs text-gray-500">發現 {restaurants.length} 個附近拍攝點</p>
                            )}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-gray-800 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('map')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                <MapIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 pb-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (!e.target.value) {
                                            setShowSearchResults(false);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    placeholder="搜尋餐廳名稱..."
                                    className="w-full px-4 py-2.5 pl-10 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:bg-white/15 transition-all text-sm"
                                />
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setShowSearchResults(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
                                    >
                                        <X className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Quick Filter Pills */}
                        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                            <button
                                onClick={() => setSortBy('distance')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    sortBy === 'distance' 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                <Navigation className="w-3 h-3" />
                                距離最近
                            </button>
                            <button
                                onClick={() => setSortBy('popular')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    sortBy === 'popular' 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                <TrendingUp className="w-3 h-3" />
                                最多參數
                            </button>
                            <button
                                onClick={() => setSortBy('recent')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    sortBy === 'recent' 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                <Clock className="w-3 h-3" />
                                最近更新
                            </button>
                        </div>

                        {/* Search Results Dropdown */}
                        {showSearchResults && (
                            <div className="absolute left-4 right-4 mt-2 bg-gray-900 rounded-xl border border-white/20 overflow-hidden shadow-2xl max-h-72 overflow-y-auto z-50">
                                {loading ? (
                                    <div className="p-6 text-center">
                                        <Loader2 className="w-6 h-6 text-green-400 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">搜尋中...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400">
                                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>找不到符合的餐廳</p>
                                        <p className="text-xs mt-1">試試其他關鍵字</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                                            <p className="text-xs text-gray-400">搜尋結果 ({searchResults.length})</p>
                                        </div>
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.placeId}
                                                onClick={() => selectSearchResult(result)}
                                                className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                                            >
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${result.hasParams
                                                    ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30'
                                                    : 'bg-gray-700/50'
                                                    }`}>
                                                    <Camera className={`w-5 h-5 ${result.hasParams ? 'text-green-400' : 'text-gray-500'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate">{result.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{result.address}</p>
                                                </div>
                                                {result.hasParams ? (
                                                    <div className="flex flex-col items-end flex-shrink-0">
                                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                                            有參數
                                                        </span>
                                                        <span className="text-xs text-gray-500 mt-0.5">{result.photoCount} 組</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex-shrink-0">
                                                        <span className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded-full">
                                                            無紀錄
                                                        </span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Container or List View */}
            <div className="w-full h-full pt-36">
                {loadError && (
                    <div className="flex items-center justify-center h-full bg-gray-900">
                        <div className="text-center p-8 max-w-sm">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
                                <MapPin className="w-10 h-10 text-red-400" />
                            </div>
                            <p className="text-white text-xl font-bold mb-2">地圖載入失敗</p>
                            <p className="text-gray-400 text-sm mb-6">請確認已設定 Google Maps API Key</p>
                            <button
                                onClick={handleRefresh}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
                            >
                                重新載入
                            </button>
                        </div>
                    </div>
                )}

                {!isLoaded && !loadError && (
                    <div className="flex items-center justify-center h-full bg-gray-900">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
                            </div>
                            <p className="text-white text-xl font-bold mb-2">載入地圖中</p>
                            <p className="text-gray-400 text-sm">請稍候...</p>
                        </div>
                    </div>
                )}

                {isLoaded && !loadError && viewMode === 'map' && (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={mapCenter}
                        zoom={15}
                        options={mapOptions}
                        onLoad={onMapLoad}
                    >
                        {/* 使用者位置標記 */}
                        {userLocation && (
                            <Marker
                                position={userLocation}
                                icon={{
                                    path: window.google?.maps?.SymbolPath?.CIRCLE,
                                    scale: 12,
                                    fillColor: '#3b82f6',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 4
                                }}
                                title="您的位置"
                            />
                        )}

                        {/* 餐廳標記 */}
                        {sortedRestaurants.map((restaurant) => (
                            <Marker
                                key={restaurant.id}
                                position={{
                                    lat: restaurant.location.latitude,
                                    lng: restaurant.location.longitude
                                }}
                                onClick={() => handleRestaurantClick(restaurant)}
                                icon={{
                                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" width="48" height="56">
                      <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
                        </filter>
                      </defs>
                      <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 32 24 32s24-14 24-32C48 10.745 37.255 0 24 0z" fill="${restaurant.photoCount > 5 ? '#f59e0b' : '#22c55e'}" filter="url(#shadow)"/>
                      <circle cx="24" cy="22" r="14" fill="white"/>
                      <text x="24" y="27" text-anchor="middle" font-size="16" font-weight="bold" fill="${restaurant.photoCount > 5 ? '#f59e0b' : '#22c55e'}">${restaurant.photoCount}</text>
                    </svg>
                  `),
                                    scaledSize: new window.google.maps.Size(48, 56),
                                    anchor: new window.google.maps.Point(24, 56)
                                }}
                            />
                        ))}

                        {/* 選中餐廳的信息窗口 */}
                        {selectedRestaurant && (
                            <InfoWindow
                                position={{
                                    lat: selectedRestaurant.location.latitude,
                                    lng: selectedRestaurant.location.longitude
                                }}
                                onCloseClick={() => setSelectedRestaurant(null)}
                            >
                                <div className="p-1 min-w-[240px]">
                                    <h3 className="font-bold text-gray-900 text-base mb-1">{selectedRestaurant.name}</h3>
                                    <p className="text-sm text-gray-500 mb-3">{selectedRestaurant.address}</p>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-lg">
                                            <Camera className="w-4 h-4 text-green-600" />
                                            <span className="font-medium text-green-700">{selectedRestaurant.photoCount} 組</span>
                                        </div>
                                        {selectedRestaurant.distance && (
                                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-lg">
                                                <Navigation className="w-4 h-4 text-blue-600" />
                                                <span className="text-blue-700">{selectedRestaurant.distance} km</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={openRestaurantDetail}
                                        className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/30"
                                    >
                                        查看拍攝參數
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                )}

                {/* List View */}
                {isLoaded && !loadError && viewMode === 'list' && (
                    <div className="h-full overflow-y-auto bg-gray-950 pb-24">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 text-green-400 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400">載入中...</p>
                                </div>
                            </div>
                        ) : sortedRestaurants.length === 0 ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center p-8">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-800 flex items-center justify-center">
                                        <Camera className="w-10 h-10 text-gray-600" />
                                    </div>
                                    <p className="text-white text-lg font-bold mb-2">附近還沒有拍攝點</p>
                                    <p className="text-gray-500 text-sm mb-4">成為第一個分享的攝影師！</p>
                                    <button
                                        onClick={handleRefresh}
                                        className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-medium transition-all"
                                    >
                                        重新搜尋
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-bold text-white">{sortedRestaurants.length}</div>
                                        <div className="text-xs text-gray-500">拍攝點</div>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-bold text-green-400">
                                            {sortedRestaurants.reduce((sum, r) => sum + (r.photoCount || 0), 0)}
                                        </div>
                                        <div className="text-xs text-gray-500">總參數</div>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-bold text-amber-400">
                                            {sortedRestaurants.filter(r => r.photoCount > 5).length}
                                        </div>
                                        <div className="text-xs text-gray-500">熱門點</div>
                                    </div>
                                </div>

                                {/* Restaurant List */}
                                {sortedRestaurants.map((restaurant, index) => (
                                    <RestaurantCard
                                        key={restaurant.id}
                                        restaurant={restaurant}
                                        index={index}
                                        onClick={() => {
                                            setSelectedRestaurant(restaurant);
                                            setShowRestaurantDetail(true);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Action Buttons (Map View Only) */}
            {viewMode === 'map' && isLoaded && !loadError && (
                <div className="absolute right-4 z-10" style={{ bottom: bottomSheetExpanded ? '65vh' : restaurants.length > 0 ? '180px' : '120px' }}>
                    <div className="flex flex-col gap-2">
                        {/* Center on User Location */}
                        <button
                            onClick={() => {
                                if (mapRef.current && userLocation) {
                                    mapRef.current.panTo(userLocation);
                                    mapRef.current.setZoom(16);
                                } else {
                                    getUserLocation();
                                }
                            }}
                            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95"
                        >
                            <Crosshair className="w-5 h-5 text-blue-500" />
                        </button>
                    </div>
                </div>
            )}

            {/* Location Error Banner */}
            {locationError && (
                <div className="absolute bottom-24 left-4 right-4 z-30 animate-slideUp">
                    <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-4 rounded-2xl shadow-xl shadow-red-500/30">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
                                <Navigation className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold mb-1">定位失敗</p>
                                <p className="text-sm text-white/80">{locationError}</p>
                            </div>
                        </div>
                        <button
                            onClick={getUserLocation}
                            className="mt-3 w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all"
                        >
                            重新嘗試定位
                        </button>
                    </div>
                </div>
            )}

            {/* Enhanced Bottom Sheet with Expandable List (Map View Only) */}
            {viewMode === 'map' && sortedRestaurants.length > 0 && !locationError && !selectedRestaurant && (
                <div className={`absolute left-0 right-0 z-20 safe-area-bottom transition-all duration-300 ease-out ${bottomSheetExpanded ? 'bottom-0 h-[60vh]' : 'bottom-0'}`}>
                    <div className={`bg-gray-900/98 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl h-full flex flex-col ${bottomSheetExpanded ? '' : 'pb-5'}`}>
                        {/* Drag Handle */}
                        <div
                            className="flex justify-center py-3 cursor-pointer"
                            onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
                        >
                            <div className="w-12 h-1.5 rounded-full bg-gray-600" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-4 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                                    <Camera className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-lg">發現 {sortedRestaurants.length} 個拍攝點</p>
                                    <p className="text-gray-400 text-sm">
                                        共 {sortedRestaurants.reduce((sum, r) => sum + (r.photoCount || 0), 0)} 組拍攝參數
                                    </p>
                                </div>
                                <button
                                    onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
                                    className={`p-3 rounded-xl transition-all ${bottomSheetExpanded ? 'bg-green-500/20' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    {bottomSheetExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <ChevronUp className="w-5 h-5 text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Quick Preview - Top 3 restaurants (collapsed state) */}
                            {!bottomSheetExpanded && (
                                <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                                    {sortedRestaurants.slice(0, 5).map((restaurant, index) => (
                                        <button
                                            key={restaurant.id}
                                            onClick={() => {
                                                setSelectedRestaurant(restaurant);
                                                if (mapRef.current) {
                                                    mapRef.current.panTo({
                                                        lat: restaurant.location.latitude,
                                                        lng: restaurant.location.longitude
                                                    });
                                                    mapRef.current.setZoom(17);
                                                }
                                            }}
                                            className="flex-shrink-0 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                                                'bg-gradient-to-br from-green-500 to-emerald-600'
                                            }`}>
                                                <span className="text-white text-xs font-bold">{restaurant.photoCount}</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-white text-sm font-medium truncate max-w-24">{restaurant.name}</p>
                                                {restaurant.distance && (
                                                    <p className="text-gray-500 text-[10px]">{restaurant.distance} km</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Restaurant List (shown when expanded) */}
                        {bottomSheetExpanded && (
                            <div className="flex-1 overflow-y-auto px-4 pb-4">
                                <div className="space-y-3">
                                    {sortedRestaurants.map((restaurant, index) => (
                                        <button
                                            key={restaurant.id}
                                            onClick={() => {
                                                setSelectedRestaurant(restaurant);
                                                setShowRestaurantDetail(true);
                                                setBottomSheetExpanded(false);
                                            }}
                                            className="w-full bg-gray-800 hover:bg-gray-750 rounded-2xl p-4 transition-all active:scale-[0.98] text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Rank Badge */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${index === 0 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                                                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                                                            index === 2 ? 'bg-gradient-to-br from-orange-600 to-amber-700' :
                                                                'bg-gradient-to-br from-green-500 to-emerald-600'
                                                    }`}>
                                                    {index < 3 ? (
                                                        <Award className="w-6 h-6 text-white" />
                                                    ) : (
                                                        <Camera className="w-6 h-6 text-white" />
                                                    )}
                                                </div>

                                                {/* Restaurant Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-white truncate">{restaurant.name}</p>
                                                        {restaurant.photoCount > 5 && (
                                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full flex-shrink-0">
                                                                🔥 熱門
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">{restaurant.address}</p>

                                                    {/* Quick Stats */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-lg">
                                                            <Camera className="w-3 h-3 text-green-400" />
                                                            <span className="text-xs text-green-400 font-medium">{restaurant.photoCount} 組</span>
                                                        </div>
                                                        {restaurant.distance && (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-lg">
                                                                <Navigation className="w-3 h-3 text-blue-400" />
                                                                <span className="text-xs text-blue-400">{restaurant.distance} km</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Arrow */}
                                                <div className="flex-shrink-0 p-2 bg-white/5 rounded-lg">
                                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State (Map View Only) */}
            {viewMode === 'map' && sortedRestaurants.length === 0 && !loading && userLocation && !locationError && (
                <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom">
                    <div className="bg-gray-900/98 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-6">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl flex items-center justify-center">
                                <Camera className="w-10 h-10 text-gray-500" />
                            </div>
                            <p className="text-white font-bold text-lg mb-2">附近還沒有拍攝點</p>
                            <p className="text-gray-400 text-sm mb-4">成為第一個在此分享拍攝參數的攝影師！</p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleRefresh}
                                    className="w-full py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    重新搜尋
                                </button>
                                <p className="text-xs text-gray-500">
                                    💡 提示：拍照後可以分享到餐廳位置
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Restaurant Detail Modal */}
            {showRestaurantDetail && selectedRestaurant && (
                <RestaurantDetail
                    restaurant={selectedRestaurant}
                    isOpen={showRestaurantDetail}
                    onClose={() => setShowRestaurantDetail(false)}
                    onApplyParams={handleApplyParams}
                />
            )}
        </div>
    );
};

export default MapView;
