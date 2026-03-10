import { db, auth } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const MARKET_PRICES = {
    "theme_forest": 100,
    "theme_neon": 400,
    "theme_midnight": 900,
    "title_scholar": 200,
    "title_wizard": 1000,
    "badge_fire": 1100
};

let userCoins = 0;
let userInventory = {};
let activeTheme = "";
let activeTitle = "";
let activeBadge = "";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            userCoins = data.coins || 0;
            userInventory = data.inventory || {};
            
            activeTheme = data.activeTheme || "";
            activeTitle = data.activeTitle || "";
            activeBadge = data.activeBadge || "";
            
            updateBalanceDisplay();
            syncMarketUI();
            checkAffordability();
        }
    } else {
        window.location.href = "login.html";
    }
});

async function buyItem(itemId) {
    const user = auth.currentUser;
    if (!user) return;

    const price = MARKET_PRICES[itemId];
    if (price === undefined) return;

    if (userCoins >= price) {
        const userRef = doc(db, "users", user.uid);

        try {
            await updateDoc(userRef, {
                coins: increment(-price),
                [`inventory.${itemId}`]: true
            });

            userCoins -= price;
            userInventory[itemId] = true;
            
            alert(`✨ Success! You unlocked: ${itemId.replace('_', ' ')}`);
            
            updateBalanceDisplay();
            syncMarketUI();
            checkAffordability();

        } catch (error) {
            console.error("Purchase failed:", error);
            alert("❌ Transaction failed. Please try again.");
        }
    } else {
        alert(`You need ${price - userCoins} more coins!`);
    }
}


function updateBalanceDisplay() {
    const balanceEl = document.getElementById('user-balance');
    if (balanceEl) balanceEl.innerText = userCoins;
}

function checkAffordability() {
    document.querySelectorAll('.item-card').forEach(card => {
        const itemId = card.dataset.itemId;
        const price = MARKET_PRICES[itemId];
        const btn = card.querySelector('.buy-btn');

        if (btn && !userInventory[itemId]) {
            if (userCoins < price) {
                btn.classList.add('too-expensive');
                btn.style.opacity = "0.5";
            } else {
                btn.classList.remove('too-expensive');
                btn.style.opacity = "1";
            }
        }
    });
}

function syncMarketUI() {
    document.querySelectorAll('.item-card').forEach(card => {
        const itemId = card.dataset.itemId;
        const price = MARKET_PRICES[itemId];
        const btn = card.querySelector('.buy-btn');

        if (!btn) return;

        if (userInventory[itemId]) {
            if (activeTheme === itemId || activeTitle === itemId || activeBadge === itemId) {
                card.classList.add('active-equipped');
                btn.innerText = "✨ Equipped";
                btn.className = "buy-btn equipped-btn";
                btn.disabled = true;
            } else {
                btn.innerText = "🔄 Equip";
                btn.className = "buy-btn equip-btn";
                btn.disabled = false;
                btn.onclick = () => equipItem(itemId);
            }
        } else {
            btn.innerText = `🛒 Buy for ${price}`;
            btn.onclick = () => buyItem(itemId);
        }
    });
}

async function equipItem(itemId) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const updateData = {};

    if (itemId.startsWith('theme_')) {
        updateData.activeTheme = itemId;
    } else if (itemId.startsWith('title_')) {
        updateData.activeTitle = itemId;
    } else if (itemId.startsWith('badge_')) {
        updateData.activeBadge = itemId;
    }

    try {
        await updateDoc(userRef, updateData);
        window.location.reload(); 
    } catch (error) {
        console.error("Equip error:", error);
    }
}