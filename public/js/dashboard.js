import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const xpCounter = document.getElementById('xp-counter');
const activeUsersDisplay = document.getElementById('active-users-count');
const totalUsersDisplay = document.getElementById('total-users-count');
const title = document.getElementById('title');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const laDate = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        const d = {};
        laDate.forEach(({ type, value }) => d[type] = value);
        const todayStr = `${d.year}-${d.month}-${d.day}`;

        const usersRef = collection(db, "users");

        const activeQuery = query(usersRef, where("stats.lastStudyDate", "==", todayStr));
        onSnapshot(activeQuery, (snapshot) => {
            if (activeUsersDisplay) {
                activeUsersDisplay.innerText = snapshot.size.toLocaleString();
            }
        });

        onSnapshot(usersRef, (snapshot) => {
            if (totalUsersDisplay) {
                totalUsersDisplay.innerText = snapshot.size.toLocaleString();
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
                    title.innerHTML = `Welcome back, ${badgeHtml}${data.displayName}${titleText}!`;
                }
            }
        });
    } else {
        window.location.href = "login.html";
    }
});