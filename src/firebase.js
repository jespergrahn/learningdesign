// src/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJ3W7G5Zr6TwBOQ1v6v11x2YsFCpNVFJI",
  authDomain: "learningdesign-bced2.firebaseapp.com",
  projectId: "learningdesign-bced2",
  storageBucket: "learningdesign-bced2.appspot.com",
  messagingSenderId: "212385271254",
  appId: "1:212385271254:web:bf2798c6fea9563c956877"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportera app-objektet så att vi kan använda det i resten av projektet
export default app;
