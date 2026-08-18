// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyAQFHRVtMeRMpxo9EWSkhAuHXIg0DbZc9k",
    authDomain: "mapadesala-4af4f.firebaseapp.com",
    projectId: "mapadesala-4af4f",
    storageBucket: "mapadesala-4af4f.firebasestorage.app",
    messagingSenderId: "427594682314",
    appId: "1:427594682314:web:b2f4cab3a2f1beb104c933"
};

// Inicializa o Firebase usando a API global fornecida pelos scripts Compat no HTML
firebase.initializeApp(firebaseConfig);

// Pendura as instâncias do Firebase no objeto global 'window' para que os próximos scripts possam acessar
window.auth = firebase.auth();
window.db = firebase.firestore();
window.googleProvider = new firebase.auth.GoogleAuthProvider();

console.log("🔥 Firebase inicializado via CDN Compat!");