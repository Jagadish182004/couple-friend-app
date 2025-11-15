// src/firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyD5Kz3a01o1F2tN4cQcix_7ZYHqNjlWzck",
  authDomain: "couple-friend-app.firebaseapp.com",
  projectId: "couple-friend-app",
  storageBucket: "couple-friend-app.firebasestorage.app",
  messagingSenderId: "579326110500",
  appId: "1:579326110500:web:1ba7788cc50103feb2a1b1",
  measurementId: "G-1KRLFHT8X7"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
