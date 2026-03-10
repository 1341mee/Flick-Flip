// ----------
// Imports
// ----------

import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ----------
// Variables
// ----------

let currentView = 'daily';
let allUserData = [];

// ----------
// Init
// ----------

function initLeaderboard() {
    const usersRef = collection(db, "users");

    onSnapshot(usersRef, (querySnapshot) => {
        allUserData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const playerName = data.displayName || (data.email ? data.email.split('@')[0] : "Anonymous");
            
            allUserData.push({
                name: playerName,
                dailyXP: Number(data.stats?.dailyXP || 0),
                totalXP: Number(data.stats?.totalXP || 0),
                activeBadge: data.activeBadge || "",
                activeTitle: data.activeTitle || ""
            });
        });

        updateDisplay();
    });
}

function updateDisplay() {
    const sortedPlayers = [...allUserData].sort((a, b) => {
        return currentView === 'daily' ? b.dailyXP - a.dailyXP : b.totalXP - a.totalXP;
    });

    const displayPlayers = sortedPlayers.map(p => ({
        name: p.name,
        score: currentView === 'daily' ? p.dailyXP : p.totalXP,
        badge: p.activeBadge,
        title: p.activeTitle
    }));

    renderPodium(displayPlayers.slice(0, 3));
    renderRankList(displayPlayers.slice(3));
}

// ----------
// Toggle
// ----------

document.getElementById('toggle-daily').addEventListener('click', () => {
    currentView = 'daily';
    document.getElementById('toggle-daily').classList.add('active');
    document.getElementById('toggle-total').classList.remove('active');
    updateDisplay();
});

document.getElementById('toggle-total').addEventListener('click', () => {
    currentView = 'total';
    document.getElementById('toggle-total').classList.add('active');
    document.getElementById('toggle-daily').classList.remove('active');
    updateDisplay();
});

// ----------
// UI Rendering Functions
// ----------

function renderPodium(topThree) {
    const podiumElements = {
        first: document.querySelector('.rank.first'),
        second: document.querySelector('.rank.second'),
        third: document.querySelector('.rank.third')
    };

    const setPodiumData = (element, player) => {
        if (!element) return;

        const badgeHtml = player?.badge === 'badge_fire' ? '<span class="animated-fire"></span>' : '';
        const titleText = player?.title ? `[${player.title.replace('title_', '')}]` : '';

        const nameEl = element.querySelector('.name');
        const xpEl = element.querySelector('.xp');

        if (nameEl) nameEl.innerHTML = player ? `${badgeHtml}${player.name}` : "---";
        if (xpEl) xpEl.innerText = player ? `${player.score} XP` : "0 XP";
        
        let titleEl = element.querySelector('.podium-title');
        if (player?.title) {
            if (!titleEl) {
                titleEl = document.createElement('div');
                titleEl.className = 'podium-title';
                element.querySelector('.player-info').appendChild(titleEl);
            }
            titleEl.innerText = titleText;
        } else if (titleEl) {
            titleEl.remove();
        }
    };

    setPodiumData(podiumElements.first, topThree[0]);
    setPodiumData(podiumElements.second, topThree[1]);
    setPodiumData(podiumElements.third, topThree[2]);
}

function renderRankList(others) {
    const listContainer = document.querySelector('.rank-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = "";

    others.forEach((player, index) => {
        const badgeHtml = player.badge === 'badge_fire' ? '<span class="animated-fire"></span>' : '';

        const titleText = player.title 
            ? `<span class="player-title fix-color">[${player.title.replace('title_', '')}]</span>` 
            : '';

        const item = document.createElement('div');
        item.className = 'rank-item';
        item.innerHTML = `
            <span class="number fix-color">${index + 4}</span>
            <span class="player-name fix-color">
                ${badgeHtml}${player.name} 
                ${titleText}
            </span>
            <span class="player-xp">${player.score} XP</span>
        `;
        listContainer.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', initLeaderboard);