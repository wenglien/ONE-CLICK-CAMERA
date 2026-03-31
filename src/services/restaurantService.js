import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    increment,
    GeoPoint,
    Timestamp
} from 'firebase/firestore';

class RestaurantService {
    constructor() {
        this.restaurantsCollection = 'restaurants';
        this.photosSubcollection = 'photos';
        // Simple in-memory cache for nearby restaurants
        this._cache = { data: null, timestamp: 0, lat: null, lng: null };
        this._CACHE_TTL_MS = 60000; // 1 minute
    }

    async saveRestaurant(restaurant) {
        try {
            const restaurantRef = doc(db, this.restaurantsCollection, restaurant.placeId);
            const dataToSave = {
                placeId: restaurant.placeId,
                name: restaurant.name,
                address: restaurant.address || '',
                location: new GeoPoint(restaurant.lat, restaurant.lng),
                updatedAt: Timestamp.now()
            };

            if (typeof restaurant.photoCount !== 'undefined') {
                dataToSave.photoCount = restaurant.photoCount;
            }

            await setDoc(restaurantRef, dataToSave, { merge: true });
            return true;
        } catch (error) {
            console.error('Failed to save restaurant:', error);
            throw error;
        }
    }

    async getRestaurant(placeId) {
        try {
            const restaurantRef = doc(db, this.restaurantsCollection, placeId);
            const restaurantSnap = await getDoc(restaurantRef);

            if (restaurantSnap.exists()) {
                return { id: restaurantSnap.id, ...restaurantSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Failed to get restaurant:', error);
            throw error;
        }
    }

    async getRestaurantPhotos(placeId, limitCount = 20) {
        try {
            const photosRef = collection(db, this.restaurantsCollection, placeId, this.photosSubcollection);
            const q = query(photosRef, orderBy('createdAt', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);

            const photos = [];
            querySnapshot.forEach((doc) => {
                photos.push({ id: doc.id, ...doc.data() });
            });

            return photos;
        } catch (error) {
            console.error('Failed to get restaurant photos:', error);
            throw error;
        }
    }

    async sharePhotoParams(placeId, restaurant, photoParams, userId, userName = 'Anonymous') {
        try {
            await this.saveRestaurant({
                placeId,
                name: restaurant.name,
                address: restaurant.address,
                lat: restaurant.lat,
                lng: restaurant.lng
            });

            const photosRef = collection(db, this.restaurantsCollection, placeId, this.photosSubcollection);
            const photoDoc = await addDoc(photosRef, {
                userId,
                userName,
                mode: photoParams.mode || 'normal',
                filters: {
                    brightness: photoParams.filters?.brightness || 100,
                    contrast: photoParams.filters?.contrast || 100,
                    saturate: photoParams.filters?.saturate || 100,
                    warmth: photoParams.filters?.warmth || 0
                },
                manualAdjustments: {
                    brightness: photoParams.manualAdjustments?.brightness || 0,
                    contrast: photoParams.manualAdjustments?.contrast || 0,
                    saturation: photoParams.manualAdjustments?.saturation || 0,
                    warmth: photoParams.manualAdjustments?.warmth || 0
                },
                foodType: photoParams.foodType || 'unknown',
                lightingCondition: photoParams.lightingCondition || 'normal',
                zoom: photoParams.zoom || 1,
                likes: 0,
                createdAt: Timestamp.now()
            });

            // Atomically increment photoCount to avoid race conditions
            const restaurantRef = doc(db, this.restaurantsCollection, placeId);
            await updateDoc(restaurantRef, { photoCount: increment(1) });

            // Invalidate cache so next fetch reflects new data
            this.invalidateCache();

            return photoDoc.id;
        } catch (error) {
            console.error('Failed to share photo params:', error);
            throw error;
        }
    }

    async getNearbyRestaurantsWithPhotos(lat, lng, radiusKm = 5) {
        try {
            // Return cached result if still fresh and location hasn't moved significantly
            const now = Date.now();
            const cache = this._cache;
            if (
                cache.data &&
                now - cache.timestamp < this._CACHE_TTL_MS &&
                cache.lat !== null &&
                Math.abs(cache.lat - lat) < 0.01 &&
                Math.abs(cache.lng - lng) < 0.01
            ) {
                return cache.data;
            }

            // Rough bounding box to reduce client-side filtering (1 degree ≈ 111 km)
            const latDelta = radiusKm / 111;
            const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
            const minLat = lat - latDelta;
            const maxLat = lat + latDelta;

            const restaurantsRef = collection(db, this.restaurantsCollection);
            const q = query(
                restaurantsRef,
                where('photoCount', '>', 0),
                orderBy('photoCount', 'desc'),
                limit(100)
            );

            const querySnapshot = await getDocs(q);
            const restaurants = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const rLat = data.location.latitude;
                const rLng = data.location.longitude;

                // Quick bounding box pre-filter before expensive Haversine
                if (rLat < minLat || rLat > maxLat) return;
                if (Math.abs(rLng - lng) > lngDelta * 1.1) return;

                const distance = this.calculateDistance(lat, lng, rLat, rLng);
                if (distance <= radiusKm) {
                    restaurants.push({
                        id: docSnap.id,
                        ...data,
                        distance: Math.round(distance * 100) / 100
                    });
                }
            });

            restaurants.sort((a, b) => a.distance - b.distance);

            // Update cache
            this._cache = { data: restaurants, timestamp: now, lat, lng };

            return restaurants;
        } catch (error) {
            console.error('Failed to get nearby restaurants:', error);
            throw error;
        }
    }

    invalidateCache() {
        this._cache = { data: null, timestamp: 0, lat: null, lng: null };
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    async getTopPhotoParams(placeId, limitCount = 5) {
        try {
            const photosRef = collection(db, this.restaurantsCollection, placeId, this.photosSubcollection);
            const q = query(photosRef, orderBy('likes', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);

            const photos = [];
            querySnapshot.forEach((doc) => {
                photos.push({ id: doc.id, ...doc.data() });
            });

            return photos;
        } catch (error) {
            console.error('Failed to get top photo params:', error);
            throw error;
        }
    }

    async likePhotoParams(placeId, photoId) {
        try {
            const photoRef = doc(db, this.restaurantsCollection, placeId, this.photosSubcollection, photoId);
            // Atomic increment — no need to read before write
            await updateDoc(photoRef, { likes: increment(1) });
            return true;
        } catch (error) {
            console.error('Failed to like photo params:', error);
            throw error;
        }
    }

    formatParamsForDisplay(params) {
        return {
            mode: params.mode || 'normal',
            brightness: `${(params.filters?.brightness || 100)}%`,
            contrast: `${(params.filters?.contrast || 100)}%`,
            saturation: `${(params.filters?.saturate || 100)}%`,
            warmth: params.filters?.warmth > 0 ? `+${params.filters?.warmth}` : `${params.filters?.warmth || 0}`,
            adjustments: params.manualAdjustments || {}
        };
    }
}

const restaurantService = new RestaurantService();

export default restaurantService;
