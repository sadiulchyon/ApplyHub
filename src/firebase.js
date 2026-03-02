import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAk_ZO9iWfb5rK08PGbYD8PGZyLi5HXgQM",
  authDomain: "jobs-trail.firebaseapp.com",
  projectId: "jobs-trail",
  storageBucket: "jobs-trail.firebasestorage.app",
  messagingSenderId: "732338973821",
  appId: "1:732338973821:web:201abb176d2b174e0cd514"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
