// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCpVyQGafkxgWGP5B_hNqBoFh3XfkbJ8dg",
    authDomain: "aicamera-bfa5b.firebaseapp.com",
    projectId: "aicamera-bfa5b",
    storageBucket: "aicamera-bfa5b.firebasestorage.app",
    messagingSenderId: "687209951112",
    appId: "1:687209951112:web:82e3e30a7af22b0df4943d",
    measurementId: "G-5F7E9YBNZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (optional, only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
    prompt: 'select_account'
});

export { analytics };
export default app;

