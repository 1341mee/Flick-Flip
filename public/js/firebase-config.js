import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyCDkERangG5NQzaoBhudH2hRvJBXiCdaSI",
  authDomain: "flick-flip.firebaseapp.com",
  projectId: "flick-flip",
  storageBucket: "flick-flip.firebasestorage.app",
  messagingSenderId: "745883715766",
  appId: "1:745883715766:web:0ce4c055ea94925917be17"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// const firebaseConfig = {
//   apiKey: "AIzaSyCDkERangG5NQzaoBhudH2hRvJBXiCdaSI",
//   authDomain: "flick-flip.firebaseapp.com",
//   projectId: "flick-flip",
//   storageBucket: "flick-flip.firebasestorage.app",
//   messagingSenderId: "745883715766",
//   appId: "1:745883715766:web:0ce4c055ea94925917be17"
// };