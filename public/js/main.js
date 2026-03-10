// ----------
// Imports
// ----------

import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, onSnapshot, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ----------
// Variables
// ----------

const xpCounter = document.getElementById('xp-count') || document.getElementById('xp-counter');
const logoutBtn = document.getElementById('logout-btn');
const timerDisplay = document.getElementById('timer-countdown');

// ----------
// Updates
// ----------

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (!data.displayName) {
                const fallbackName = user.email.split('@')[0];
                await updateDoc(userRef, {
                    displayName: fallbackName
                });
            }
        }

        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                let userTotalXP = Number(data.stats?.totalXP || 0);
                let userDailyXP = Number(data.stats?.dailyXP || 0);
                let userCoins = Number(data.coins || 0);

                if (xpCounter) {
                    xpCounter.innerHTML = `
                        ✨ Daily XP: ${userDailyXP}<br>
                        ✨ Total XP: ${userTotalXP}<br>
                        💰 Flick Coins: ${userCoins}
                    `;
                }

                const classesToRemove = Array.from(document.body.classList).filter(c => c.startsWith('theme_'));
                document.body.classList.remove(...classesToRemove);

                if (data.activeTheme) {
                    document.body.classList.add(data.activeTheme);
                    console.log("Applied Theme:", data.activeTheme);
                }
            }
        });
    } else {
        if (!window.location.pathname.includes("login.html")) {
            window.location.href = "login.html";
        }
    }
});

// ----------
// Reset Daily
// ----------

function getTimeToReset() {
    const now = new Date();
    const laFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });

    const parts = laFormatter.formatToParts(now);
    const la = {};
    parts.forEach(p => la[p.type] = parseInt(p.value));

    const secondsPassedToday = (la.hour * 3600) + (la.minute * 60) + la.second;
    const totalSecondsInDay = 86400;
    let secondsLeft = totalSecondsInDay - secondsPassedToday;

    const h = Math.floor(secondsLeft / 3600).toString().padStart(2, '0');
    const m = Math.floor((secondsLeft % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secondsLeft % 60).toString().padStart(2, '0');

    if (secondsLeft <= 0) {
        window.location.reload(); 
    }

    return `${h}h ${m}m ${s}s`;
}

if (timerDisplay) {
    setInterval(() => {
        timerDisplay.innerText = getTimeToReset();
    }, 1000);
}

// ----------
// Logout and Kick
// ----------

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}