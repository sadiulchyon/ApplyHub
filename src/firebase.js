// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAk_ZO9iWfb5rK08PGbYD8PGZyLi5HXgQM",
  authDomain: "jobs-trail.firebaseapp.com",
  projectId: "jobs-trail",
  storageBucket: "jobs-trail.firebasestorage.app",
  messagingSenderId: "732338973821",
  appId: "1:732338973821:web:201abb176d2b174e0cd514"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
