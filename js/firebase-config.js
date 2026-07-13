import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth
} from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore
} from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDh5dmRtlAbE0XIBweDRniP8NGhuY14Bts",
    authDomain: "dasuxigame.firebaseapp.com",
    projectId: "dasuxigame",
    storageBucket: "dasuxigame.firebasestorage.app",
    messagingSenderId: "431588346052",
    appId: "1:431588346052:web:d5283ba634c836aae2a191",
    measurementId: "G-QH5FQ24PHJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);