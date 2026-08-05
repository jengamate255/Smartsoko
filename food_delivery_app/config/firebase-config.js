// Firebase web configuration for SmartSoko.
// Source: Firebase console project fooddelievry-dce15 (Web API Key provided by project owner).
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE",
  authDomain: "fooddelievry-dce15.firebaseapp.com",
  projectId: "fooddelievry-dce15",
  storageBucket: "fooddelievry-dce15.firebasestorage.app",
  messagingSenderId: "727819507148",
  appId: "1:727819507148:web:0ccbfa749c29f4c1587969"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof getAnalytics === 'function' ? getAnalytics(app) : null;

window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
