import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, googleAuthProvider } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Create or update user profile in Firestore
    const createUserProfile = async (user, additionalData = {}) => {
        if (!user) return null;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // Create new user profile
                const newProfile = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || additionalData.displayName || '使用者',
                    photoURL: user.photoURL || null,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                    // Photography preferences
                    preferences: {
                        favoriteMode: 'normal',
                        enableSuggestions: true,
                        autoApplyPreference: false,
                        rememberLastMode: true,
                    },
                    // Statistics
                    stats: {
                        totalPhotos: 0,
                        likedPhotos: 0,
                        photosThisMonth: 0,
                    },
                    // Learned adjustments
                    learnedAdjustments: {
                        brightness: 0,
                        contrast: 0,
                        saturation: 0,
                        warmth: 0,
                    },
                    // Food type preferences
                    foodTypePreferences: {},
                    // Lighting preferences
                    lightingPreferences: {},
                    // AI learned patterns
                    aiPatterns: {
                        colorTendency: 'neutral',
                        saturationPreference: 'normal',
                        brightnessPreference: 'normal',
                        contrastPreference: 'normal',
                    },
                    ...additionalData,
                };

                try {
                    await setDoc(userRef, newProfile);
                    return newProfile;
                } catch (firestoreError) {
                    console.warn('Firestore not available, using local profile:', firestoreError);
                    // Return profile without saving to Firestore
                    return { ...newProfile, createdAt: new Date(), lastLoginAt: new Date() };
                }
            } else {
                // Update last login time
                try {
                    await updateDoc(userRef, {
                        lastLoginAt: serverTimestamp(),
                    });
                } catch (updateError) {
                    console.warn('Could not update last login:', updateError);
                }
                return userSnap.data();
            }
        } catch (error) {
            console.warn('Firestore error, using fallback profile:', error);
            // Return a basic profile if Firestore is not available
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || additionalData.displayName || '使用者',
                photoURL: user.photoURL || null,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                preferences: {
                    favoriteMode: 'normal',
                    enableSuggestions: true,
                    autoApplyPreference: false,
                    rememberLastMode: true,
                },
                stats: {
                    totalPhotos: 0,
                    likedPhotos: 0,
                    photosThisMonth: 0,
                },
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
            };
        }
    };

    // Fetch user profile from Firestore
    const fetchUserProfile = async (user) => {
        if (!user) {
            setUserProfile(null);
            return null;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const profile = userSnap.data();
                setUserProfile(profile);
                return profile;
            } else {
                // Create profile if not exists
                const newProfile = await createUserProfile(user);
                setUserProfile(newProfile);
                return newProfile;
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setError(error.message);
            return null;
        }
    };

    // Update user profile
    const updateUserProfile = async (updates) => {
        if (!currentUser) return false;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });

            // Refresh local profile
            await fetchUserProfile(currentUser);
            return true;
        } catch (error) {
            console.error('Error updating user profile:', error);
            setError(error.message);
            return false;
        }
    };

    // Update photography preferences
    const updatePreferences = async (preferences) => {
        return updateUserProfile({ preferences });
    };

    // Update learned adjustments
    const updateLearnedAdjustments = async (adjustments) => {
        return updateUserProfile({ learnedAdjustments: adjustments });
    };

    // Update statistics
    const updateStats = async (stats) => {
        return updateUserProfile({ stats });
    };

    // Increment photo count
    const incrementPhotoCount = async (isLiked = false) => {
        if (!userProfile) return;

        const newStats = {
            ...userProfile.stats,
            totalPhotos: (userProfile.stats?.totalPhotos || 0) + 1,
            likedPhotos: isLiked ? (userProfile.stats?.likedPhotos || 0) + 1 : (userProfile.stats?.likedPhotos || 0),
            photosThisMonth: (userProfile.stats?.photosThisMonth || 0) + 1,
        };

        return updateStats(newStats);
    };

    /**
     * 記錄拍照學習數據到 Firebase
     * 每次按下快門時呼叫，記錄完整的拍照參數供 AI 學習
     * @param {Object} photoData - 拍照參數
     */
    const recordPhotoLearning = async (photoData) => {
        if (!currentUser || !userProfile) {
            console.log('⚠️ No user logged in, skipping cloud learning record');
            return false;
        }

        const {
            mode,
            filters,
            manualAdjustments,
            context,
            zoom = 1,
            isLiked = false,
        } = photoData;

        console.log('📤 Recording photo learning data to Firebase:', photoData);

        try {
            // 1. 取得當前的學習數據
            const currentLearned = userProfile.learnedAdjustments || {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                warmth: 0
            };

            const photoCount = (userProfile.stats?.totalPhotos || 0) + 1;

            // 2. 計算新的加權平均調整值（喜歡的照片權重更高）
            const weight = isLiked ? 3 : 1;
            const totalWeight = photoCount + (weight - 1);

            const newLearnedAdjustments = {
                brightness: Number((
                    (currentLearned.brightness * (photoCount - 1) + (manualAdjustments?.brightness || 0) * weight) / totalWeight
                ).toFixed(2)),
                contrast: Number((
                    (currentLearned.contrast * (photoCount - 1) + (manualAdjustments?.contrast || 0) * weight) / totalWeight
                ).toFixed(2)),
                saturation: Number((
                    (currentLearned.saturation * (photoCount - 1) + (manualAdjustments?.saturation || 0) * weight) / totalWeight
                ).toFixed(2)),
                warmth: Number((
                    (currentLearned.warmth * (photoCount - 1) + (manualAdjustments?.warmth || 0) * weight) / totalWeight
                ).toFixed(2)),
            };

            // 3. 更新模式使用統計
            const modeUsage = { ...(userProfile.modeUsageCount || {}) };
            modeUsage[mode] = (modeUsage[mode] || 0) + 1;

            // 4. 確定最常用的模式
            let favoriteMode = 'normal';
            let maxCount = 0;
            Object.entries(modeUsage).forEach(([m, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    favoriteMode = m;
                }
            });

            // 5. 更新食物類型偏好（如果有偵測到）
            const foodTypePreferences = { ...(userProfile.foodTypePreferences || {}) };
            if (context?.objectType && context.objectType !== 'unknown') {
                const foodType = context.objectType;
                if (!foodTypePreferences[foodType]) {
                    foodTypePreferences[foodType] = {
                        count: 0,
                        avgAdjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
                    };
                }
                const pref = foodTypePreferences[foodType];
                pref.count++;

                // 計算針對該食物類型的平均調整
                for (const key of ['brightness', 'contrast', 'saturation', 'warmth']) {
                    pref.avgAdjustments[key] = Number((
                        ((pref.avgAdjustments[key] || 0) * (pref.count - 1) + (manualAdjustments?.[key] || 0)) / pref.count
                    ).toFixed(2));
                }
            }

            // 6. 更新光線條件偏好
            const lightingPreferences = { ...(userProfile.lightingPreferences || {}) };
            let lightingCondition = 'normal';
            if (context?.isBacklit) lightingCondition = 'backlit';
            else if (context?.isLowLight) lightingCondition = 'lowLight';
            else if (context?.brightness < 80) lightingCondition = 'dark';
            else if (context?.brightness > 180) lightingCondition = 'bright';

            if (!lightingPreferences[lightingCondition]) {
                lightingPreferences[lightingCondition] = {
                    count: 0,
                    avgAdjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
                };
            }
            const lightPref = lightingPreferences[lightingCondition];
            lightPref.count++;
            for (const key of ['brightness', 'contrast', 'saturation', 'warmth']) {
                lightPref.avgAdjustments[key] = Number((
                    ((lightPref.avgAdjustments[key] || 0) * (lightPref.count - 1) + (manualAdjustments?.[key] || 0)) / lightPref.count
                ).toFixed(2));
            }

            // 7. 更新 AI 學習模式
            const aiPatterns = {
                ...(userProfile.aiPatterns || {
                    colorTendency: 'neutral',
                    saturationPreference: 'normal',
                    brightnessPreference: 'normal',
                    contrastPreference: 'normal',
                })
            };

            // 根據累積的調整值判斷偏好
            if (newLearnedAdjustments.warmth > 8) {
                aiPatterns.colorTendency = 'warm';
            } else if (newLearnedAdjustments.warmth < -8) {
                aiPatterns.colorTendency = 'cool';
            } else {
                aiPatterns.colorTendency = 'neutral';
            }

            if (newLearnedAdjustments.saturation > 10) {
                aiPatterns.saturationPreference = 'high';
            } else if (newLearnedAdjustments.saturation < -10) {
                aiPatterns.saturationPreference = 'low';
            } else {
                aiPatterns.saturationPreference = 'normal';
            }

            if (newLearnedAdjustments.brightness > 8) {
                aiPatterns.brightnessPreference = 'high';
            } else if (newLearnedAdjustments.brightness < -8) {
                aiPatterns.brightnessPreference = 'low';
            } else {
                aiPatterns.brightnessPreference = 'normal';
            }

            if (newLearnedAdjustments.contrast > 8) {
                aiPatterns.contrastPreference = 'high';
            } else if (newLearnedAdjustments.contrast < -8) {
                aiPatterns.contrastPreference = 'low';
            } else {
                aiPatterns.contrastPreference = 'normal';
            }

            // 8. 更新統計數據
            const newStats = {
                totalPhotos: photoCount,
                likedPhotos: isLiked
                    ? (userProfile.stats?.likedPhotos || 0) + 1
                    : (userProfile.stats?.likedPhotos || 0),
                photosThisMonth: (userProfile.stats?.photosThisMonth || 0) + 1,
            };

            // 9. 記錄最近一次拍照的完整參數（供日後分析）
            const lastPhotoRecord = {
                timestamp: new Date().toISOString(),
                mode,
                filters: { ...filters },
                manualAdjustments: { ...manualAdjustments },
                context: context ? {
                    brightness: context.brightness,
                    colorTemp: context.colorTemp,
                    isBacklit: context.isBacklit,
                    isLowLight: context.isLowLight,
                    objectType: context.objectType,
                    saturation: context.saturation,
                    isWarmTone: context.isWarmTone,
                    isCoolTone: context.isCoolTone,
                } : null,
                zoom,
                isLiked,
            };

            // 10. 將所有更新發送到 Firebase
            await updateUserProfile({
                learnedAdjustments: newLearnedAdjustments,
                modeUsageCount: modeUsage,
                'preferences.favoriteMode': favoriteMode,
                foodTypePreferences,
                lightingPreferences,
                aiPatterns,
                stats: newStats,
                lastPhotoRecord,
                lastPhotoAt: serverTimestamp(),
            });

            console.log('✅ Photo learning data saved to Firebase:', {
                learnedAdjustments: newLearnedAdjustments,
                favoriteMode,
                aiPatterns,
                photoCount,
            });

            return true;
        } catch (error) {
            console.error('❌ Failed to record photo learning:', error);
            return false;
        }
    };

    /**
     * 儲存照片到 Firebase Storage 和 Firestore
     * @param {Object} photoData - 照片資訊
     * @returns {Promise<Object|null>} 儲存的照片記錄或 null
     */
    const savePhotoToProfile = async (photoData) => {
        if (!currentUser) {
            console.log('⚠️ No user logged in, cannot save photo');
            return null;
        }

        const {
            imageData,       // Base64 格式的圖片
            mode,
            filters,
            manualAdjustments,
            context,
            zoom = 1,
            isLiked = false,
            photoInfo = {},
        } = photoData;

        console.log('📸 Saving photo to Firebase...');

        try {
            // 1. 上傳圖片到 Firebase Storage
            const timestamp = Date.now();
            const fileName = `photos/${currentUser.uid}/${timestamp}.jpg`;
            const storageRef = ref(storage, fileName);

            // 上傳 base64 圖片
            await uploadString(storageRef, imageData, 'data_url');

            // 獲取下載 URL
            const downloadURL = await getDownloadURL(storageRef);

            // 2. 儲存照片記錄到 Firestore
            const photoRecord = {
                userId: currentUser.uid,
                imageURL: downloadURL,
                storagePath: fileName,
                createdAt: serverTimestamp(),
                mode,
                filters: filters ? { ...filters } : null,
                manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
                context: context ? {
                    brightness: context.brightness,
                    colorTemp: context.colorTemp,
                    isBacklit: context.isBacklit,
                    isLowLight: context.isLowLight,
                    objectType: context.objectType,
                    saturation: context.saturation,
                    isWarmTone: context.isWarmTone,
                    isCoolTone: context.isCoolTone,
                } : null,
                zoom,
                isLiked,
                photoInfo: {
                    width: photoInfo.width || null,
                    height: photoInfo.height || null,
                    size: photoInfo.size || null,
                    format: photoInfo.format || 'JPEG',
                },
            };

            const photosCollectionRef = collection(db, 'users', currentUser.uid, 'photos');
            const docRef = await addDoc(photosCollectionRef, photoRecord);

            console.log('✅ Photo saved to Firebase:', {
                id: docRef.id,
                imageURL: downloadURL,
            });

            // 3. 更新用戶統計
            await updateUserProfile({
                'stats.totalPhotos': (userProfile?.stats?.totalPhotos || 0) + 1,
                lastPhotoAt: serverTimestamp(),
            });

            return {
                id: docRef.id,
                ...photoRecord,
                createdAt: new Date().toISOString(),
            };
        } catch (error) {
            console.error('❌ Failed to save photo:', error);
            return null;
        }
    };

    /**
     * 獲取使用者儲存的照片列表
     * @param {number} limitCount - 最多獲取多少張照片
     * @returns {Promise<Array>} 照片列表
     */
    const getUserPhotos = async (limitCount = 50) => {
        if (!currentUser) {
            console.log('⚠️ No user logged in');
            return [];
        }

        try {
            console.log('📷 Fetching photos for user:', currentUser.uid);
            const photosCollectionRef = collection(db, 'users', currentUser.uid, 'photos');

            // 不使用 orderBy 避免需要索引，在客戶端排序
            const q = query(photosCollectionRef, limit(limitCount));
            const querySnapshot = await getDocs(q);

            console.log('📷 Query result size:', querySnapshot.size);

            const photos = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                console.log('📷 Photo document:', docSnap.id, data);

                // 處理時間戳
                let createdAtStr = null;
                if (data.createdAt) {
                    if (data.createdAt.toDate) {
                        createdAtStr = data.createdAt.toDate().toISOString();
                    } else if (data.createdAt.seconds) {
                        createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
                    } else {
                        createdAtStr = data.createdAt;
                    }
                }

                photos.push({
                    id: docSnap.id,
                    ...data,
                    createdAt: createdAtStr,
                });
            });

            // 在客戶端按 createdAt 降序排序
            photos.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });

            console.log(`📷 Fetched ${photos.length} photos from Firebase`);
            return photos;
        } catch (error) {
            console.error('❌ Failed to fetch photos:', error);
            return [];
        }
    };

    /**
     * 刪除照片
     * @param {Object} photo - 照片記錄
     * @returns {Promise<boolean>} 是否刪除成功
     */
    const deletePhoto = async (photo) => {
        if (!currentUser || !photo) {
            return false;
        }

        try {
            // 1. 從 Storage 刪除圖片
            if (photo.storagePath) {
                const storageRef = ref(storage, photo.storagePath);
                await deleteObject(storageRef);
            }

            // 2. 從 Firestore 刪除記錄
            const photoDocRef = doc(db, 'users', currentUser.uid, 'photos', photo.id);
            await deleteDoc(photoDocRef);

            // 3. 更新統計
            await updateUserProfile({
                'stats.totalPhotos': Math.max(0, (userProfile?.stats?.totalPhotos || 1) - 1),
            });

            console.log('🗑️ Photo deleted:', photo.id);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete photo:', error);
            return false;
        }
    };

    /**
     * 更新照片的喜歡狀態
     * @param {string} photoId - 照片 ID
     * @param {boolean} isLiked - 是否喜歡
     * @returns {Promise<boolean>} 是否更新成功
     */
    const updatePhotoLikeStatus = async (photoId, isLiked) => {
        if (!currentUser || !photoId) {
            return false;
        }

        try {
            const photoDocRef = doc(db, 'users', currentUser.uid, 'photos', photoId);
            await updateDoc(photoDocRef, { isLiked });

            // 更新喜歡的照片數量
            const currentLiked = userProfile?.stats?.likedPhotos || 0;
            const newLikedCount = isLiked ? currentLiked + 1 : Math.max(0, currentLiked - 1);

            await updateUserProfile({
                'stats.likedPhotos': newLikedCount,
            });

            console.log(`💖 Photo ${photoId} like status updated:`, isLiked);
            return true;
        } catch (error) {
            console.error('❌ Failed to update photo like status:', error);
            return false;
        }
    };

    // Sign up with email and password
    const signUp = async (email, password, displayName) => {
        setError(null);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update display name
            if (displayName) {
                await updateProfile(result.user, { displayName });
            }

            // Create user profile
            await createUserProfile(result.user, { displayName });

            return result.user;
        } catch (error) {
            console.error('Sign up error:', error);
            setError(getAuthErrorMessage(error.code));
            throw error;
        }
    };

    // Sign in with email and password
    const signIn = async (email, password) => {
        setError(null);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await createUserProfile(result.user);
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            setError(getAuthErrorMessage(error.code));
            throw error;
        }
    };

    // Sign in with Google
    const signInWithGoogle = async () => {
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleAuthProvider);
            await createUserProfile(result.user);
            return result.user;
        } catch (error) {
            console.error('Google sign in error:', error);
            setError(getAuthErrorMessage(error.code));
            throw error;
        }
    };

    // Sign out
    const logout = async () => {
        setError(null);
        try {
            await signOut(auth);
            setUserProfile(null);
        } catch (error) {
            console.error('Sign out error:', error);
            setError(error.message);
            throw error;
        }
    };

    // Get auth error message
    const getAuthErrorMessage = (code) => {
        const messages = {
            'auth/email-already-in-use': '此電子郵件已被使用',
            'auth/invalid-email': '電子郵件格式不正確',
            'auth/operation-not-allowed': '此登入方式未啟用',
            'auth/weak-password': '密碼強度不足（至少6個字元）',
            'auth/user-disabled': '此帳號已被停用',
            'auth/user-not-found': '找不到此帳號',
            'auth/wrong-password': '密碼錯誤',
            'auth/popup-closed-by-user': '登入視窗被關閉',
            'auth/cancelled-popup-request': '登入請求已取消',
            'auth/network-request-failed': '網路連線失敗',
            'auth/too-many-requests': '嘗試次數過多，請稍後再試',
            'auth/invalid-credential': '登入資訊無效',
        };
        return messages[code] || '登入失敗，請稍後再試';
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                await fetchUserProfile(user);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        loading,
        error,
        signUp,
        signIn,
        signInWithGoogle,
        logout,
        updateUserProfile,
        updatePreferences,
        updateLearnedAdjustments,
        updateStats,
        incrementPhotoCount,
        recordPhotoLearning,
        savePhotoToProfile,     // 儲存照片到個人檔案
        getUserPhotos,          // 獲取照片列表
        deletePhoto,            // 刪除照片
        updatePhotoLikeStatus,  // 更新照片喜歡狀態
        fetchUserProfile,
        setError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
