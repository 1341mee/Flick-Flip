import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const xpCounterUI = document.getElementById('xp-counter');
const timerDisplay = document.getElementById('timer-countdown');

function getTodayStr() {
    const laDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const d = {};
    laDate.forEach(({ type, value }) => d[type] = value);
    return `${d.year}-${d.month}-${d.day}`;
}

async function performResetCheck(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
        const stats = docSnap.data().stats || {};
        const today = getTodayStr();

        if (stats.lastStudyDate !== today) {
            console.log("New day! Resetting Daily XP...");
            await updateDoc(userRef, {
                "stats.dailyXP": 0,
                "stats.lastStudyDate": today
            });
        }
    }
}

function startTimer() {
    setInterval(() => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0); 
        
        const diff = midnight - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        if (timerDisplay) {
            timerDisplay.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        if (h === 0 && m === 0 && s === 0) {
            const user = auth.currentUser;
            if (user) performResetCheck(user);
        }
    }, 1000);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);

        performResetCheck(user);
        startTimer();

        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const daily = data.stats?.dailyXP || 0;
                const total = data.stats?.totalXP || 0;
                const coins = data.coins || 0;

                if (xpCounterUI) {
                    xpCounterUI.innerHTML = `
                        ✨ Daily XP: ${daily}<br>
                        ✨ Total XP: ${total}<br>
                         <span id="coin-count">💰 ${coins}</span> Flick Coins
                    `;
                }
            }
        });

    } else {
        if (!window.location.pathname.includes("login.html")) {
            window.location.href = "login.html";
        }
    }
});