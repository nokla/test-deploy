// Import the functions you need from the SDKs you need
const  { initializeApp } =require("firebase/app") ;
const  { getFirestore, serverTimestamp } =require('firebase/firestore') ;
const  { getAuth } =require("firebase/auth");

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_PUBLIC_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
 const dbfirebase = getFirestore(app);
 const auth = getAuth(app);

 module.exports= { dbfirebase, auth,serverTimestamp };