// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Configurar Firestore com opções de persistência e reconexão
const db = getFirestore(app);

// Configurar persistência e cache para melhorar a estabilidade da conexão
if (typeof window !== 'undefined') {
  try {
    // Habilitar persistência multi-guia para melhor experiência offline
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Múltiplas guias abertas, usar persistência simples
        enableIndexedDbPersistence(db).catch((err) => {
          console.error("Erro ao habilitar persistência:", err);
        });
      } else if (err.code === 'unimplemented') {
        console.warn("Seu navegador não suporta persistência offline.");
      }
    });
    
    // Nota: A configuração de cache ilimitado foi removida pois não é suportada na versão atual do Firebase
    // Firestore já usa um cache eficiente por padrão
  } catch (err) {
    console.error("Erro ao configurar Firestore:", err);
  }
}

export { app, auth, db };