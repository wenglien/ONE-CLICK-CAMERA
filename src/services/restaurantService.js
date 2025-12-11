/**
 * Restaurant Service
 * 管理餐廳資料與拍攝參數分享功能
 */

import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    GeoPoint,
    Timestamp
} from 'firebase/firestore';

class RestaurantService {
    constructor() {
        this.restaurantsCollection = 'restaurants';
        this.photosSubcollection = 'photos';
    }

    /**
     * 儲存或更新餐廳資訊
     * @param {Object} restaurant - 餐廳資訊
     */
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

            // Only update photoCount if it's explicitly provided
            if (typeof restaurant.photoCount !== 'undefined') {
                dataToSave.photoCount = restaurant.photoCount;
            }

            await setDoc(restaurantRef, dataToSave, { merge: true });

            console.log('✅ Restaurant saved:', restaurant.name);
            return true;
        } catch (error) {
            console.error('Failed to save restaurant:', error);
            throw error;
        }
    }

    /**
     * 取得餐廳資訊
     * @param {string} placeId - Google Place ID
     */
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

    /**
     * 取得餐廳的拍攝參數列表
     * @param {string} placeId - Google Place ID
     * @param {number} limitCount - 限制數量
     */
    async getRestaurantPhotos(placeId, limitCount = 20) {
        try {
            const photosRef = collection(db, this.restaurantsCollection, placeId, this.photosSubcollection);
            const q = query(photosRef, orderBy('createdAt', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);

            const photos = [];
            querySnapshot.forEach((doc) => {
                photos.push({ id: doc.id, ...doc.data() });
            });

            console.log(`📸 Found ${photos.length} photos for restaurant:`, placeId);
            return photos;
        } catch (error) {
            console.error('Failed to get restaurant photos:', error);
            throw error;
        }
    }

    /**
     * 分享拍攝參數到餐廳
     * @param {string} placeId - Google Place ID
     * @param {Object} restaurant - 餐廳基本資訊
     * @param {Object} photoParams - 拍攝參數
     * @param {string} userId - 使用者 ID
     * @param {string} userName - 使用者名稱
     */
    async sharePhotoParams(placeId, restaurant, photoParams, userId, userName = 'Anonymous') {
        try {
            // 確保餐廳資料存在
            await this.saveRestaurant({
                placeId,
                name: restaurant.name,
                address: restaurant.address,
                lat: restaurant.lat,
                lng: restaurant.lng
            });

            // 新增照片參數
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

            // 更新餐廳的照片數量
            const restaurantRef = doc(db, this.restaurantsCollection, placeId);
            const restaurantSnap = await getDoc(restaurantRef);
            if (restaurantSnap.exists()) {
                const currentCount = restaurantSnap.data().photoCount || 0;
                await setDoc(restaurantRef, { photoCount: currentCount + 1 }, { merge: true });
            }

            console.log('✅ Photo params shared:', photoDoc.id);
            return photoDoc.id;
        } catch (error) {
            console.error('Failed to share photo params:', error);
            throw error;
        }
    }

    /**
     * 取得附近有照片的餐廳
     * 注意：這需要 Firestore 的地理查詢，目前使用簡化版本
     * @param {number} lat - 緯度
     * @param {number} lng - 經度
     * @param {number} radiusKm - 搜尋半徑（公里）
     */
    async getNearbyRestaurantsWithPhotos(lat, lng, radiusKm = 5) {
        try {
            // 簡化版：取得所有有照片的餐廳
            // 完整版需要使用 GeoFirestore 或類似的地理查詢庫
            const restaurantsRef = collection(db, this.restaurantsCollection);
            const q = query(
                restaurantsRef,
                where('photoCount', '>', 0),
                orderBy('photoCount', 'desc'),
                limit(50)
            );

            const querySnapshot = await getDocs(q);
            const restaurants = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // 計算距離（簡易版 Haversine 公式）
                const distance = this.calculateDistance(lat, lng, data.location.latitude, data.location.longitude);
                if (distance <= radiusKm) {
                    restaurants.push({
                        id: doc.id,
                        ...data,
                        distance: Math.round(distance * 100) / 100 // 四捨五入到小數點後兩位
                    });
                }
            });

            // 按距離排序
            restaurants.sort((a, b) => a.distance - b.distance);

            console.log(`📍 Found ${restaurants.length} nearby restaurants with photos`);
            return restaurants;
        } catch (error) {
            console.error('Failed to get nearby restaurants:', error);
            throw error;
        }
    }

    /**
     * 計算兩點之間的距離（公里）
     * 使用 Haversine 公式
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球半徑（公里）
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

    /**
     * 取得熱門的拍攝參數（投票最多）
     * @param {string} placeId - Google Place ID
     */
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

    /**
     * 按讚拍攝參數
     * @param {string} placeId - Google Place ID
     * @param {string} photoId - 照片參數 ID
     */
    async likePhotoParams(placeId, photoId) {
        try {
            const photoRef = doc(db, this.restaurantsCollection, placeId, this.photosSubcollection, photoId);
            const photoSnap = await getDoc(photoRef);

            if (photoSnap.exists()) {
                const currentLikes = photoSnap.data().likes || 0;
                await setDoc(photoRef, { likes: currentLikes + 1 }, { merge: true });
                console.log('👍 Photo params liked');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to like photo params:', error);
            throw error;
        }
    }

    /**
     * 格式化參數為易讀格式
     * @param {Object} params - 拍攝參數
     */
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

// 創建單例
const restaurantService = new RestaurantService();

export default restaurantService;
