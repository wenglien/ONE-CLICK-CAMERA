import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { X, MapPin, Camera, Navigation, Loader2, ChevronRight, ChevronUp, ChevronDown, RefreshCw, Search, List, Map, Sun, Contrast, Droplets, Heart, Zap, TrendingUp, Clock, Award, Sparkles, Crosshair } from 'lucide-react';
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
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    gestureHandling: 'greedy',
    styles: [
        {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca3af' }]
        },
        {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ visibility: 'off' }]
        },
        {
            featureType: 'landscape',
            stylers: [{ color: '#111827' }]
        },
        {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }]
        },
        {
            featureType: 'poi.business',
            stylers: [{ visibility: 'on' }]
        },
        {
            featureType: 'road',
            stylers: [{ color: '#1f2937' }]
        },
        {
            featureType: 'water',
            stylers: [{ color: '#0f172a' }]
        }
    ]
};

// Restaurant Card Component for List View
const RestaurantCard = ({ restaurant, index, onClick }) => {
    const hasParams = restaurant.photoCount > 0;

    return (
        <div
            onClick={onClick}
            className="liquid-glass p-5 transition-all active:scale-[0.98] cursor-pointer hover:bg-white/10 border-white/10 shadow-2xl group mb-4"
        >
            <div className="flex items-start gap-4">
                {/* Rank/Icon Badge */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl transition-transform group-hover:scale-110 ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/40 ring-2 ring-amber-400/30' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 ring-2 ring-gray-200/30' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 ring-2 ring-orange-400/30' :
                            hasParams ? 'bg-gradient-to-br from-green-500 to-emerald-600 ring-2 ring-green-400/30' : 'bg-white/5'
                    }`}>
                    {index < 3 ? (
                        <span className="text-white font-bold text-2xl">{index + 1}</span>
                    ) : (
                        <Camera className={`w-7 h-7 ${hasParams ? 'text-white' : 'text-gray-400'}`} />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-white text-lg truncate">{restaurant.name}</h3>
                        {restaurant.photoCount > 5 && (
                            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 text-[10px] font-bold rounded-full flex-shrink-0 border border-amber-400/30">
                                🔥 熱門
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mb-3">{restaurant.address}</p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 rounded-xl border border-green-500/20">
                            <Camera className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs text-green-300 font-semibold">{restaurant.photoCount} 組參數</span>
                        </div>
                        {restaurant.distance && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 rounded-xl border border-blue-500/20">
                                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs text-blue-300 font-semibold">{restaurant.distance} km</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center p-2.5 bg-white/10 rounded-xl group-hover:bg-white/15 transition-colors">
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
};

const MapView = ({ isOpen, onClose, onApplyParams, refreshTrigger, isEmbedded = false }) => {
    const { t } = useLanguage();
    const mapRef = useRef(null);
    const autocompleteServiceRef = useRef(null);
    const lastRefreshTriggerRef = useRef(0);
    const prevIsOpenRef = useRef(false);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places']
    });

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
    const [viewMode, setViewMode] = useState('map');
    const [sortBy, setSortBy] = useState('distance');
    const [activeCategory, setActiveCategory] = useState('all');


    const categories = [
        { id: 'all', label: '全部', icon: Map },
        { id: 'restaurant', label: '餐廳', icon: TrendingUp },
        { id: 'cafe', label: '咖啡廳', icon: Sun },
        { id: 'bakery', label: '甜點烘焙', icon: Sparkles },
    ];

    // Pre-generate marker icons keyed by restaurant id to avoid re-creating SVGs each render
    const markerIconMap = useMemo(() => {
        const map = new Map();
        restaurants.forEach((restaurant) => {
            const isHot = restaurant.photoCount > 5;
            const color = isHot ? '#f59e0b' : '#22c55e';
            const colorDark = isHot ? '#d97706' : '#16a34a';
            const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" width="48" height="56">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
                    </filter>
                    <linearGradient id="grad${restaurant.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${colorDark};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 32 24 32s24-14 24-32C48 10.745 37.255 0 24 0z" fill="url(#grad${restaurant.id})" filter="url(#shadow)"/>
                <circle cx="24" cy="22" r="14" fill="white"/>
                <text x="24" y="28" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="${color}">${restaurant.photoCount}</text>
            </svg>`;
            map.set(restaurant.id, 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgStr));
        });
        return map;
    }, [restaurants]);

    const filteredAndSortedRestaurants = useMemo(() => {
        let filtered = [...restaurants];

        if (activeCategory !== 'all') {
            filtered = filtered.filter(r => {
                const name = r.name.toLowerCase();
                const address = r.address?.toLowerCase() || '';
                if (activeCategory === 'cafe') return name.includes('咖啡') || name.includes('cafe') || address.includes('咖啡');
                if (activeCategory === 'bakery') return name.includes('甜點') || name.includes('烘焙') || name.includes('蛋糕') || name.includes('bakery');
                return true;
            });
        }

        switch (sortBy) {
            case 'popular':
                return filtered.sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0));
            case 'recent':
                return filtered.sort((a, b) => {
                    const dateA = a.lastUpdated?.toDate?.() || new Date(0);
                    const dateB = b.lastUpdated?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });
            case 'distance':
            default:
                return filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        }
    }, [restaurants, sortBy, activeCategory]);

    const getUserLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('您的瀏覽器不支援地理位置功能。');
            return;
        }

        setLoading(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(location);
                setMapCenter(location);
                setLoading(false);
                loadNearbyRestaurants(location.lat, location.lng);
            },
            (error) => {
                setLoading(false);
                setLocationError('無法取得您的位置，請確認定位權限已開啟。');
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
        );
    }, []);

    const loadNearbyRestaurants = useCallback(async (lat, lng) => {
        try {
            setLoading(true);
            const nearbyRestaurants = await restaurantService.getNearbyRestaurantsWithPhotos(lat, lng, 10);
            setRestaurants(nearbyRestaurants);
        } catch (error) {
            console.error('Failed to load restaurants:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && isLoaded) {
            const justOpened = !prevIsOpenRef.current && isOpen;
            const hasNewData = refreshTrigger > lastRefreshTriggerRef.current;

            if (userLocation) {
                if (justOpened || hasNewData || restaurants.length === 0) {
                    loadNearbyRestaurants(userLocation.lat, userLocation.lng);
                }
            } else {
                getUserLocation();
            }
            lastRefreshTriggerRef.current = refreshTrigger;
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, isLoaded, refreshTrigger, userLocation, restaurants.length, getUserLocation]);

    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
        // Cache the AutocompleteService instance once the map is ready
        if (window.google?.maps?.places) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
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
            // Reuse cached service instance instead of creating a new one each call
            if (!autocompleteServiceRef.current && window.google?.maps?.places) {
                autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
            }
            const autocompleteService = autocompleteServiceRef.current;
            if (!autocompleteService) { setLoading(false); return; }

            const request = {
                input: query,
                types: ['restaurant', 'food', 'cafe', 'bakery'],
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
                            } catch (e) { }

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

    const wrapperClass = isEmbedded ? "absolute inset-0 bg-gray-950" : "fixed inset-0 z-50 bg-gray-950";

    return (
        <div className={wrapperClass}>
            {/* Top Controls */}
            <div className="absolute top-3 left-3 right-3 z-30 safe-area-top">
                <div className="flex items-center justify-between mb-4 gap-3">
                    {viewMode === 'map' && (
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜尋餐廳..."
                                className="w-full px-5 py-3 pl-12 liquid-glass border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-green-400/50 transition-all text-sm shadow-2xl font-medium"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                    )}

                    {!isEmbedded && (
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl liquid-glass border-white/20">
                            <X className="w-4 h-4 text-white" />
                        </button>
                    )}

                    <div className="flex items-center liquid-glass p-1 border-white/20">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'map' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-300'}`}
                        >
                            <Map className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-300'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {viewMode === 'map' && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeCategory === cat.id ? 'bg-green-500 text-white shadow-lg' : 'liquid-glass text-gray-300 border-white/20'
                                    }`}
                            >
                                <cat.icon className="w-3.5 h-3.5" />
                                {cat.label}
                            </button>
                        ))}
                        <button onClick={handleRefresh} className="w-11 h-11 flex items-center justify-center rounded-2xl liquid-glass border-white/20 ml-auto flex-shrink-0">
                            <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                )}
            </div>

            {/* Search Results */}
            {showSearchResults && viewMode === 'map' && (
                <div className="absolute top-20 left-3 right-3 z-30">
                    <div className="bg-gray-900/98 backdrop-blur-2xl rounded-2xl border border-white/30 max-h-80 overflow-y-auto shadow-2xl">
                        {searchResults.map((result) => (
                            <button
                                key={result.placeId}
                                onClick={() => selectSearchResult(result)}
                                className="w-full p-4 flex items-center gap-4 hover:bg-white/10 text-left border-b border-white/5 last:border-0"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${result.hasParams ? 'bg-green-500/20' : 'bg-gray-800'}`}>
                                    <Camera className={`w-5 h-5 ${result.hasParams ? 'text-green-400' : 'text-gray-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold truncate">{result.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{result.address}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Map / List Content */}
            <div className="w-full h-full">
                {isLoaded && !loadError && viewMode === 'map' && (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={mapCenter}
                        zoom={15}
                        options={mapOptions}
                        onLoad={onMapLoad}
                    >
                        {userLocation && (
                            <Marker
                                position={userLocation}
                                icon={{
                                    path: window.google?.maps?.SymbolPath?.CIRCLE,
                                    scale: 10,
                                    fillColor: '#3b82f6',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 3
                                }}
                            />
                        )}

                        {filteredAndSortedRestaurants.map((restaurant) => (
                            <Marker
                                key={restaurant.id}
                                position={{
                                    lat: restaurant.location.latitude,
                                    lng: restaurant.location.longitude
                                }}
                                onClick={() => handleRestaurantClick(restaurant)}
                                icon={{
                                    url: markerIconMap.get(restaurant.id) || '',
                                    scaledSize: new window.google.maps.Size(40, 48),
                                    anchor: new window.google.maps.Point(20, 48)
                                }}
                            />
                        ))}
                    </GoogleMap>
                )}

                {viewMode === 'list' && (
                    <div className="h-full overflow-y-auto bg-gray-950 pb-32 pt-24 px-4">
                        <div className="mb-6">
                            <h2 className="text-3xl font-bold text-white mb-2">探索附近</h2>
                            <p className="text-gray-400 text-sm">找到最適合拍照的餐廳與參數</p>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-gray-800/40 backdrop-blur-sm rounded-3xl p-5 border border-white/5 shadow-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-500/20 rounded-xl">
                                        <MapPin className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">拍攝點</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{filteredAndSortedRestaurants.length}</div>
                            </div>
                            <div className="bg-gray-800/40 backdrop-blur-sm rounded-3xl p-5 border border-white/5 shadow-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-500/20 rounded-xl">
                                        <Camera className="w-4 h-4 text-green-400" />
                                    </div>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">總參數</span>
                                </div>
                                <div className="text-3xl font-bold text-white">
                                    {filteredAndSortedRestaurants.reduce((sum, r) => sum + (r.photoCount || 0), 0)}
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-green-400 animate-spin mb-4" />
                                <p className="text-gray-400">尋找美食中...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredAndSortedRestaurants.map((restaurant, index) => (
                                    <RestaurantCard
                                        key={restaurant.id}
                                        restaurant={restaurant}
                                        index={index}
                                        onClick={() => handleRestaurantClick(restaurant)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Sheet */}
            {selectedRestaurant && viewMode === 'map' && (
                <div className="absolute bottom-24 left-4 right-4 z-40 animate-slideUp">
                    <div className="bg-gray-900/95 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold text-white truncate">{selectedRestaurant.name}</h3>
                                <p className="text-sm text-gray-400 truncate flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {selectedRestaurant.address}
                                </p>
                            </div>
                            <button onClick={() => setSelectedRestaurant(null)} className="p-2 bg-white/10 rounded-full">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-2xl border border-green-500/20">
                                <Camera className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-bold text-green-400">{selectedRestaurant.photoCount} 組參數</span>
                            </div>
                            {selectedRestaurant.distance && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    <Navigation className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-bold text-blue-400">{selectedRestaurant.distance} km</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={openRestaurantDetail}
                                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                            >
                                <Sparkles className="w-5 h-5" />
                                查看拍攝參數
                            </button>
                            <button
                                onClick={() => {
                                    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedRestaurant.name)}&destination_place_id=${selectedRestaurant.placeId}`;
                                    window.open(url, '_blank');
                                }}
                                className="p-4 bg-gray-800 text-white rounded-2xl border border-white/10"
                            >
                                <Navigation className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showRestaurantDetail && selectedRestaurant && (
                <RestaurantDetail
                    restaurant={selectedRestaurant}
                    isOpen={showRestaurantDetail}
                    onClose={() => setShowRestaurantDetail(false)}
                    onApplyParams={handleApplyParams}
                />
            )}

            {/* Floating Action Buttons */}
            {viewMode === 'map' && isLoaded && (
                <div className="absolute right-4 bottom-56 z-10">
                    <button
                        onClick={() => {
                            if (mapRef.current && userLocation) {
                                mapRef.current.panTo(userLocation);
                                mapRef.current.setZoom(16);
                            } else {
                                getUserLocation();
                            }
                        }}
                        className="w-14 h-14 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl flex items-center justify-center border border-white/20"
                    >
                        <Crosshair className="w-6 h-6 text-blue-500" />
                    </button>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default MapView;
