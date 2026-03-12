import { auth, db } from "./firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const timerDisplay = document.getElementById('timer-countdown');

function getLAToday() {
    const laDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const d = {};
    laDate.forEach(({ type, value }) => d[type] = value);
    return `${d.year}-${d.month}-${d.day}`;
}

async function checkDailyReset(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
        const stats = docSnap.data().stats || {};
        const today = getLAToday();

        if (stats.lastStudyDate !== today) {
            console.log("New day detected! Resetting Daily XP...");
            await updateDoc(userRef, {
                "stats.dailyXP": 0,
                "stats.lastStudyDate": today
            });
        }
    }
}

function updateCountdown() {
    if (!timerDisplay) return;

    const now = new Date();
    const laNow = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
    }).formatToParts(now);

    const d = {};
    laNow.forEach(({ type, value }) => d[type] = value);

    const midnight = new Date(now); 
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight - now;

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    timerDisplay.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    if (h === 0 && m === 0 && s === 0) {
        const user = auth.currentUser;
        if (user) checkDailyReset(user);
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkDailyReset(user);
        setInterval(updateCountdown, 1000);
    }
});