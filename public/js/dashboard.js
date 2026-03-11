import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const xpCounter = document.getElementById('xp-counter');
const activeUsersDisplay = document.getElementById('active-users-count');
const title = document.getElementById('title');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- REAL-TIME ACTIVE USER COUNT ---
        const usersCollection = collection(db, "users");
        
        onSnapshot(usersCollection, (snapshot) => {
            const totalUsers = snapshot.size; // This gets the count of documents
            if (activeUsersDisplay) {
                activeUsersDisplay.innerText = totalUsers.toLocaleString(); 
            }
        });
        const userRef = doc(db, "users", user.uid);

        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                let userTotalXP = Number(data.stats?.totalXP || 0);
                let userDailyXP = Number(data.stats?.dailyXP || 0);

                if (xpCounter) {
                    xpCounter.innerHTML = `Daily XP: ${userDailyXP}<br>Total XP: ${userTotalXP}`;
                }

                const badgeHtml = data.activeBadge === 'badge_fire' ? '<span class="animated-fire"></span>' : '';
                const titleText = data.activeTitle ? ` (${data.activeTitle.replace('title_', '')})` : '';

                if (title) {
                    title.innerHTML = `Welcome back to Flick Flip, ${badgeHtml}${data.displayName}${titleText}!`;
                }

            } else {
                console.log("No document found for this user yet.");
                if (xpCounter) xpCounter.innerText = `Daily XP: 0`;
            }
        });
    } else {
        window.location.href = "login.html";
    }
});