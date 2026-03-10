import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth } from "./firebase-config.js";

const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-auth');
const authTitle = document.getElementById('auth-title');

let isLoggingIn = true;

toggleBtn.addEventListener('click', () => {
    isLoggingIn = !isLoggingIn;
    
    if (isLoggingIn) {
        authTitle.innerText = "Login: Welcome Back";
        submitBtn.innerText = "Login";
        toggleBtn.innerText = "Sign Up";
    } else {
        authTitle.innerText = "Sign Up: Create Account";
        submitBtn.innerText = "Sign Up";
        toggleBtn.innerText = "Login";
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const fakeEmail = `${username}@flickflip.com`;

    try {
        if (isLoggingIn) {
            await signInWithEmailAndPassword(auth, fakeEmail, password);
            console.log("Logged in successfully as:", username);
        } else {
            await createUserWithEmailAndPassword(auth, fakeEmail, password);
            alert(`Welcome to Flick Flip, ${username}!`);
        }
        
        window.location.href = "dashboard.html";

    } catch (error) {
        handleAuthError(error);
    }
});

function handleAuthError(error) {
    console.error("Firebase Error:", error.code);

    switch (error.code) {
        case "auth/email-already-in-use":
            alert("Username already taken! Try adding a number or changing it.");
            break;
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            alert("Incorrect username or password.");
            break;
        case "auth/weak-password":
            alert("Password is too short. Try at least 6 characters!");
            break;
        case "auth/invalid-email":
            alert("Username contains invalid characters.");
            break;
        default:
            alert("Something went wrong. Please try again!");
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            await setDoc(userRef, {
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                stats: { dailyXP: 0, totalXP: 0 },
                coins: 0,
                activeBadge: "",
                activeTheme: "theme_default"
            }, { merge: true });
        }
    }
});