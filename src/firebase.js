import firebase from 'firebase/app' 
import 'firebase/auth' // sub-dependency for authorization
import 'firebase/database' // sub-dependency for realtime data base
import 'firebase/storage' // sub-dependency for stiring mediafiles


var config = {
  apiKey: "AIzaSyDqScCAuerUjAKoDZ3AxiDPtGUqVGNJ23w",
  authDomain: "chat-project-react.firebaseapp.com",
  databaseURL: "https://chat-project-react.firebaseio.com",
  projectId: "chat-project-react",
  storageBucket: "chat-project-react.appspot.com",
  messagingSenderId: "350620743679"
};
firebase.initializeApp(config);

export default firebase; 