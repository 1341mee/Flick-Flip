import { db, auth } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const usernameInput = document.getElementById('username-input');
const saveBtn = document.getElementById('save-profile');
const factoryResetBtn = document.getElementById('factory-reset');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            usernameInput.value = data.displayName || "";
        }
    } else {
        window.location.href = "login.html";
    }
});

saveBtn.onclick = async () => {
    const user = auth.currentUser;
    const newName = usernameInput.value.trim();

    if (!user) return;
    
    if (newName.length < 2) return alert("Username too short!");
    if (newName.length > 20) return alert("Username too long!");

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("displayName", "==", newName));
        const querySnapshot = await getDocs(q);

        let isTaken = false;
        querySnapshot.forEach((docSnap) => {
            if (docSnap.id !== user.uid) {
                isTaken = true;
            }
        });

        if (isTaken) {
            alert("That username is already taken!");
            return; 
        }

        const userRef = doc(db, "users", user.uid);
        
        await setDoc(userRef, {
            displayName: newName,
            lastUpdated: new Date()
        }, { merge: true });
        
        alert("Profile Updated!");

    } catch (error) {
        console.error("Firestore Error:", error);
        alert("Error saving: " + error.message);
    }
};

factoryResetBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (confirm("Are you sure? This will reset your username and remove your theme.")) {
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                displayName: "",
                activeTheme: "theme_default"
            });

            usernameInput.value = "";
            document.body.className = "theme_default";
            
            alert("Username and settings reset!");
        } catch (error) {
            console.error(error);
            alert("Error resetting data.");
        }
    }
};