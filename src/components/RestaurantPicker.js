import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { X, MapPin, Search, Navigation, Loader2, Camera, Clock, CheckCircle, Building, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

const RestaurantPicker = ({ isOpen, onClose, onSelect, onSelectAndShare, userLocation, showShareOption = false }) => {
    const { t } = useLanguage();
    const mapRef = useRef(null);
    const placesServiceRef = useRef(null);

    // 使用 useJsApiLoader 載入 Google Maps API
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places']
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(userLocation);
    const [apiReady, setApiReady] = useState(false);
    const [error, setError] = useState(null);
    const [isSharing, setIsSharing] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);

    // 當 Google Maps API 載入完成後初始化 PlacesService
    useEffect(() => {
        if (isOpen && isLoaded && !loadError) {
            try {
                if (!mapRef.current) {
                    mapRef.current = document.createElement('div');
                }
                
                placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
                setApiReady(true);
                setError(null);
                console.log('✅ Google Places API 初始化成功');
            } catch (err) {
                console.error('❌ Google Places API 初始化失敗:', err);
                setError('無法初始化地點服務');
            }
        }
        
        if (loadError) {
            setError('無法載入地圖服務，請檢查網路連線');
        }
    }, [isOpen, isLoaded, loadError]);

    // 取得使用者位置
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('您的瀏覽器不支援定位功能');
            return;
        }

        setLocationLoading(true);
        setError(null);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setCurrentLocation(location);
                setLocationLoading(false);
                console.log('📍 取得位置成功:', location);
            },
            (err) => {
                console.error('Location error:', err);
                setLocationLoading(false);
                setError('無法取得位置，請手動搜尋餐廳');
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        );
    }, []);

    // 搜尋附近餐廳
    const searchNearbyRestaurants = useCallback((location) => {
        if (!location) {
            console.log('⚠️ 無位置資訊');
            return;
        }

        if (!isLoaded || !placesServiceRef.current) {
            console.log('⏳ API 尚未就緒');
            return;
        }

        setLoading(true);
        setError(null);
        
        const request = {
            location: new window.google.maps.LatLng(location.lat, location.lng),
            radius: 1000,
            type: 'restaurant'
        };

        console.log('🔍 搜尋附近餐廳...', location);

        placesServiceRef.current.nearbySearch(request, (results, status) => {
            setLoading(false);
            console.log('📍 附近搜尋結果:', status, results?.length);
            
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                setNearbyPlaces(results.slice(0, 15));
                setError(null);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setNearbyPlaces([]);
                setError('附近沒有找到餐廳，請使用搜尋');
            } else {
                console.error('❌ 搜尋失敗:', status);
            }
        });
    }, [isLoaded]);

    // 初始化時取得位置和附近餐廳
    useEffect(() => {
        if (isOpen && apiReady) {
            if (currentLocation) {
                searchNearbyRestaurants(currentLocation);
            } else {
                getCurrentLocation();
            }
        }
    }, [isOpen, apiReady, currentLocation, getCurrentLocation, searchNearbyRestaurants]);

    // 當取得位置後搜尋附近餐廳
    useEffect(() => {
        if (currentLocation && apiReady && nearbyPlaces.length === 0) {
            searchNearbyRestaurants(currentLocation);
        }
    }, [currentLocation, apiReady, nearbyPlaces.length, searchNearbyRestaurants]);

    // 文字搜尋 - 使用 TextSearch
    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) return;
        
        // 檢查 API 是否已載入
        if (!isLoaded || !apiReady || !placesServiceRef.current) {
            setError('地圖服務準備中，請稍候...');
            // 嘗試重新初始化
            if (isLoaded && !placesServiceRef.current) {
                try {
                    if (!mapRef.current) {
                        mapRef.current = document.createElement('div');
                    }
                    placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
                    setApiReady(true);
                } catch (err) {
                    console.error('❌ 初始化失敗:', err);
                }
            }
            return;
        }

        setLoading(true);
        setError(null);
        
        console.log('🔍 搜尋餐廳:', searchQuery);

        // 使用 TextSearch
        const textRequest = {
            query: searchQuery,
        };
        
        if (currentLocation) {
            textRequest.location = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
            textRequest.radius = 10000;
        }

        placesServiceRef.current.textSearch(textRequest, (results, status) => {
            setLoading(false);
            console.log('📝 TextSearch 結果:', status, results?.length);
            
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                setSearchResults(results.slice(0, 15));
                setError(null);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setSearchResults([]);
                setError('找不到符合「' + searchQuery + '」的餐廳');
            } else {
                setSearchResults([]);
                console.error('❌ 搜尋失敗:', status);
                setError('搜尋失敗，請重試');
            }
        });
    }, [searchQuery, currentLocation, isLoaded, apiReady]);

    // 選擇餐廳
    const handleSelectPlace = (place) => {
        if (place.needsDetails && placesServiceRef.current) {
            // 需要額外請求詳細資訊
            setLoading(true);
            placesServiceRef.current.getDetails(
                { placeId: place.place_id, fields: ['geometry', 'name', 'formatted_address', 'vicinity'] },
                (result, status) => {
                    setLoading(false);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
                        setSelectedPlace({
                            ...place,
                            ...result,
                            geometry: result.geometry
                        });
                    } else {
                        // 即使沒有 geometry 也允許選擇
                        setSelectedPlace(place);
                    }
                }
            );
        } else {
            setSelectedPlace(place);
        }
    };

    // 確認選擇
    const handleConfirm = () => {
        if (selectedPlace) {
            const result = {
                placeId: selectedPlace.place_id,
                name: selectedPlace.name,
                address: selectedPlace.vicinity || selectedPlace.formatted_address || ''
            };
            
            // 如果有 geometry 才加入位置資訊
            if (selectedPlace.geometry?.location) {
                result.lat = typeof selectedPlace.geometry.location.lat === 'function' 
                    ? selectedPlace.geometry.location.lat() 
                    : selectedPlace.geometry.location.lat;
                result.lng = typeof selectedPlace.geometry.location.lng === 'function'
                    ? selectedPlace.geometry.location.lng()
                    : selectedPlace.geometry.location.lng;
            }
            
            console.log('✅ 選擇餐廳:', result);
            onSelect(result);
            onClose();
        }
    };

    // 顯示的列表
    const displayList = searchResults.length > 0 ? searchResults : nearbyPlaces;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header - Fixed at top */}
            <div className="p-4 border-b border-gray-800 flex-shrink-0 pt-12 bg-gray-900">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-400" />
                            選擇拍攝地點
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={isLoaded ? "搜尋餐廳名稱..." : "載入中..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && isLoaded && handleSearch()}
                                disabled={!isLoaded}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none disabled:opacity-50"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading || !searchQuery.trim()}
                            className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 rounded-xl transition-colors"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : (
                                <Search className="w-5 h-5 text-white" />
                            )}
                        </button>
                    </div>

                    {/* Location Status */}
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Navigation className="w-4 h-4" />
                            {locationLoading ? (
                                <span>正在取得位置...</span>
                            ) : currentLocation ? (
                                <span className="text-green-400">✓ 已定位</span>
                            ) : (
                                <button onClick={getCurrentLocation} className="text-green-400 hover:underline">
                                    點擊取得位置
                                </button>
                            )}
                        </div>
                        {currentLocation && (
                            <button 
                                onClick={() => searchNearbyRestaurants(currentLocation)}
                                disabled={loading}
                                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                重新搜尋
                            </button>
                        )}
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Restaurant List - Scrollable area with bottom padding for footer */}
                <div className="flex-1 overflow-y-auto p-4 pb-60">
                    {!isLoaded ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-green-400 animate-spin mb-4" />
                            <p className="text-white font-medium">載入地圖服務中...</p>
                            <p className="text-gray-500 text-sm mt-1">請稍候</p>
                        </div>
                    ) : loadError ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                <X className="w-8 h-8 text-red-400" />
                            </div>
                            <p className="text-white font-medium">無法載入地圖服務</p>
                            <p className="text-gray-500 text-sm mt-1">請檢查網路連線後重試</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                        </div>
                    ) : displayList.length === 0 ? (
                        <div className="text-center py-12">
                            <Building className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">
                                {searchQuery ? '找不到符合的餐廳' : '請搜尋或等待載入附近餐廳'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {searchResults.length > 0 && (
                                <p className="text-sm text-gray-400 mb-3">搜尋結果</p>
                            )}
                            {searchResults.length === 0 && nearbyPlaces.length > 0 && (
                                <p className="text-sm text-gray-400 mb-3">附近的餐廳</p>
                            )}

                            {displayList.map((place) => (
                                <button
                                    key={place.place_id}
                                    onClick={() => handleSelectPlace(place)}
                                    className={`w-full p-4 rounded-xl text-left transition-all ${selectedPlace?.place_id === place.place_id
                                            ? 'bg-green-500/20 border-2 border-green-500'
                                            : 'bg-gray-800 border-2 border-transparent hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPlace?.place_id === place.place_id
                                                ? 'bg-green-500'
                                                : 'bg-gray-700'
                                            }`}>
                                            {selectedPlace?.place_id === place.place_id ? (
                                                <CheckCircle className="w-5 h-5 text-white" />
                                            ) : (
                                                <Building className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${selectedPlace?.place_id === place.place_id ? 'text-green-400' : 'text-white'
                                                }`}>
                                                {place.name}
                                            </p>
                                            <p className="text-sm text-gray-400 truncate">
                                                {place.vicinity || place.formatted_address}
                                            </p>
                                            {place.rating && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-yellow-400 text-sm">★</span>
                                                    <span className="text-sm text-gray-400">{place.rating}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Fixed at bottom with prominent buttons */}
                <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 pb-8">
                    {/* Selected Restaurant Info */}
                    {selectedPlace && (
                        <div className="px-4 pt-4">
                            <div className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-green-400 font-bold truncate">{selectedPlace.name}</p>
                                    <p className="text-gray-400 text-sm truncate">{selectedPlace.vicinity || selectedPlace.formatted_address}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Buttons - Large and prominent */}
                    <div className="p-4 pb-6">
                        {showShareOption && onSelectAndShare ? (
                            <div className="space-y-3">
                                {/* Primary: 確認並儲存 - Most prominent */}
                                <button
                                    onClick={async () => {
                                        if (selectedPlace && !isSharing) {
                                            const result = {
                                                placeId: selectedPlace.place_id,
                                                name: selectedPlace.name,
                                                address: selectedPlace.vicinity || selectedPlace.formatted_address || ''
                                            };
                                            
                                            if (selectedPlace.geometry?.location) {
                                                result.lat = typeof selectedPlace.geometry.location.lat === 'function' 
                                                    ? selectedPlace.geometry.location.lat() 
                                                    : selectedPlace.geometry.location.lat;
                                                result.lng = typeof selectedPlace.geometry.location.lng === 'function'
                                                    ? selectedPlace.geometry.location.lng()
                                                    : selectedPlace.geometry.location.lng;
                                            }
                                            
                                            console.log('✅ 選擇並分享:', result);
                                            setIsSharing(true);
                                            setError(null);
                                            
                                            try {
                                                await onSelectAndShare(result);
                                                setShareSuccess(true);
                                                setTimeout(() => {
                                                    setShareSuccess(false);
                                                    setIsSharing(false);
                                                    onClose();
                                                }, 1000);
                                            } catch (err) {
                                                console.error('❌ 分享失敗:', err);
                                                setError('分享失敗，請重試');
                                                setIsSharing(false);
                                            }
                                        }
                                    }}
                                    disabled={!selectedPlace || isSharing}
                                    className={`w-full py-5 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                                        shareSuccess 
                                            ? 'bg-green-600' 
                                            : selectedPlace 
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                                                : 'bg-gray-700'
                                    }`}
                                >
                                    {isSharing ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span>儲存中...</span>
                                        </>
                                    ) : shareSuccess ? (
                                        <>
                                            <CheckCircle className="w-6 h-6" />
                                            <span>已儲存！</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-6 h-6" />
                                            <span>✨ 確認並儲存到地圖</span>
                                        </>
                                    )}
                                </button>

                                {/* Secondary: 僅選擇 */}
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedPlace || isSharing}
                                    className="w-full py-3 bg-transparent border border-gray-600 disabled:opacity-50 text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                                >
                                    <MapPin className="w-5 h-5" />
                                    <span>僅選擇（稍後儲存）</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedPlace}
                                className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg"
                            >
                                <Camera className="w-6 h-6" />
                                {selectedPlace ? `確認選擇` : '請選擇一間餐廳'}
                            </button>
                        )}
                    </div>
                </div>

            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
        </div>
    );
};

export default RestaurantPicker;
