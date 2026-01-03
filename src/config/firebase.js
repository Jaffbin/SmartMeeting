import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.FIREBASE_API_KEY,
  authDomain: "meeting-transcription-system.firebaseapp.com",
  databaseURL: "https://meeting-transcription-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "meeting-transcription-system",
  storageBucket: "meeting-transcription-system.firebasestorage.app",
  messagingSenderId: "314774238245",
  appId: "1:314774238245:web:5c87bd6f9600e25aa17bcc",
  measurementId: "G-DEBQP2EWTK"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);