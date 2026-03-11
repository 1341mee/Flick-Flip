import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, onSnapshot, updateDoc, deleteField 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ----------
// Firebase Configuration
// ----------

const firebaseConfig = {
  apiKey: "AIzaSyCDkERangG5NQzaoBhudH2hRvJBXiCdaSI",
  authDomain: "flick-flip.firebaseapp.com",
  projectId: "flick-flip",
  storageBucket: "flick-flip.firebasestorage.app",
  messagingSenderId: "745883715766",
  appId: "1:745883715766:web:0ce4c055ea94925917be17"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ----------
// State Management
// ----------
let allSets = {}; 
let currentSetId = null;
let currentUser = null;

let studyQueue = [];
let currentIndex = 0;
let score = 0;
let userCoins = 0;
let missedCards = [];

let lastClickTimestamp = Date.now();
let totalSessionSeconds = 0;
let userStats = { totalXP: 0, dailyXP: 0, lastStudyDate: "" };
const XP_DAILY_CAP = 999999999;

// ----------
// DOM Elements
// ----------
const setSelector = document.getElementById('set-selector');
const newSetNameInput = document.getElementById('new-set-name');
const createSetBtn = document.getElementById('create-set-btn');
const deleteSetBtn = document.getElementById('delete-set-btn');
const setTitle = document.getElementById('current-set-title');
const inputControls = document.getElementById('input-controls');
const displayArea = document.getElementById('card-display-area');

const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const addBtn = document.getElementById('add-btn');
const studyBtn = document.getElementById('study-btn');

const flashcardOverlay = document.getElementById('flashcard-area');
const flashcardBox = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');

// ----------
// Firebase Auth & Data Sync
// ----------

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                allSets = data.flashcardSets || {};

                if (currentSetId && !allSets[currentSetId]) {
                    currentSetId = null;
                }

                updateDropdownUI();
                renderActiveSet();

                if (data.stats) {
                    userStats = data.stats;
                } else {
                    userStats = { 
                        totalXP: 0, 
                        dailyXP: 0, 
                        lastStudyDate: new Date().toISOString().split('T')[0] 
                    };
                }

                if (data.highContrast) {
                    document.body.classList.add('high-contrast');
                } else {
                    document.body.classList.remove('high-contrast');
                }

                userCoins = data.coins || 0;
            } else {
                console.warn("No user document found in Firestore.");
            }
        }, (error) => {
            console.error("Snapshot failed:", error);
        });
    } else {
        window.location.href = "login.html";
    }
});

async function saveToCloud() {
    if (!currentUser) return;
    await setDoc(doc(db, "users", currentUser.uid), {
        flashcardSets: allSets,
        stats: userStats,
        coins: Number(userCoins)
    }, { merge: true });
}

// ----------
// UI Logic (Sets)
// ----------

function updateDropdownUI() {
    const currentVal = setSelector.value;
    setSelector.innerHTML = '<option value="">-- Select a Set --</option>';
    Object.keys(allSets).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = allSets[id].name;
        setSelector.appendChild(option);
    });
    setSelector.value = currentVal;
}

function renderActiveSet() {
    displayArea.innerHTML = "";
    const set = allSets[currentSetId];
    if (!set) {
        currentSetId = null;
        setTitle.textContent = "Please select or create a set";
        inputControls.style.display = "none";
        return;
    }
    
    setTitle.textContent = `Set: ${set.name}`;
    inputControls.style.display = "flex";
    set.cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'flashcard-item';
        cardDiv.dataset.id = card.id;
        cardDiv.innerHTML = `
            <div class="card-section"><span class="card-label">Question</span><p>${card.question}</p></div>
            <div class="card-divider"></div>
            <div class="card-section"><span class="card-label">Answer</span><p>${card.answer}</p></div>
            <button class="delete-card-btn">&times;</button>
        `;
        displayArea.appendChild(cardDiv);
    });
}

// ----------
// Event Listeners (Set Management)
// ----------

createSetBtn.addEventListener('click', async () => {
    const name = newSetNameInput.value.trim();
    if (!name) return;
    const setId = "set_" + Date.now();
    allSets[setId] = { name: name, cards: [] };
    newSetNameInput.value = "";
    await saveToCloud();
    setSelector.value = setId;
    currentSetId = setId;
    renderActiveSet();
});

setSelector.addEventListener('change', (e) => {
    currentSetId = e.target.value;
    renderActiveSet();
});

deleteSetBtn.addEventListener('click', async () => {
    if (!currentSetId || !allSets[currentSetId]) return;

    const nameToDelete = allSets[currentSetId].name;

    if (confirm(`Delete the entire set "${nameToDelete}"?`)) {
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                [`flashcardSets.${currentSetId}`]: deleteField()
            });

            currentSetId = null;
            window.location.reload();
        } catch (error) {
            alert("Failed to delete set: " + error.message);
        }
    }
});

// ----------
// Event Listeners (Card Management)
// ----------

addBtn.addEventListener('click', async () => {
    const qText = questionInput.value.trim();
    const aText = answerInput.value.trim();
    if (!qText || !aText || !currentSetId) return;

    const newCard = { question: qText, answer: aText, id: Date.now() };
    allSets[currentSetId].cards.push(newCard);
    
    questionInput.value = "";
    answerInput.value = "";
    await saveToCloud();
});

displayArea.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-card-btn')) {
        const cardElement = e.target.closest('.flashcard-item');
        const cardId = parseInt(cardElement.dataset.id);
        allSets[currentSetId].cards = allSets[currentSetId].cards.filter(c => c.id !== cardId);
        await saveToCloud();
    }
});

// ----------
// Study Mode Engine
// ----------

studyBtn.addEventListener('click', () => {
    if (!currentSetId || allSets[currentSetId].cards.length === 0) return alert("Add cards first!");
    startStudySession([...allSets[currentSetId].cards]);
});

function startStudySession(cards) {
    studyQueue = cards.sort(() => Math.random() - 0.5); 
    currentIndex = 0;
    score = 0;
    missedCards = [];
    updateStudyCard();
    flashcardOverlay.style.display = "flex";
}

function updateStudyCard() {
    const current = studyQueue[currentIndex];
    flashcardBox.style.transition = 'none';
    flashcardBox.classList.remove('is-flipped');

    cardFront.innerHTML = `
        <div class="card-header">Question<br>Card ${currentIndex + 1} of ${studyQueue.length}</div>
        <div class="card-main-text">${current.question}</div>
    `;
    cardBack.innerHTML = `
        <div class="card-header" style="opacity: 0.5;">Answer</div>
        <div class="card-main-text">${current.answer}</div>
    `;

    setTimeout(() => {
        flashcardBox.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    }, 10); 
}

function handleFeedback(isCorrect) {
    if (isCorrect) score++;
    else missedCards.push(studyQueue[currentIndex]);
    
    if (currentIndex < studyQueue.length - 1) {
        currentIndex++;
        updateStudyCard();
    } else {
        finishRound();
    }
}

function finishRound() {
    if (missedCards.length > 0) {
        const redo = confirm(`Round Over! Score: ${score}/${studyQueue.length}.\nYou missed ${missedCards.length} cards. Redo them now?`);
        if (redo) startStudySession(missedCards);
        else flashcardOverlay.style.display = "none";
    } else {
        alert("Great job! You mastered all cards in this set.");
        flashcardOverlay.style.display = "none";
    }
}

// ----------
// XP Logic
// ----------

function recordActivity() {
    const now = Date.now();
    const secondsSinceLastClick = (now - lastClickTimestamp) / 1000;

    if (secondsSinceLastClick < 60) {
        totalSessionSeconds += secondsSinceLastClick;
    }

    lastClickTimestamp = now;
    const randCheck = Math.round(7 + Math.random() * 5);

    if (totalSessionSeconds >= randCheck) {
        const xpToGain = Math.floor(totalSessionSeconds / randCheck);
        totalSessionSeconds %= randCheck;
        applyXP(xpToGain);
    }
}

async function applyXP(amount) {
    const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'America/Los_Angeles'
    });

    if (userStats.lastStudyDate !== today) {
        userStats.dailyXP = 0;
        userStats.lastStudyDate = today;
    }

    const spaceLeft = XP_DAILY_CAP - userStats.dailyXP;
    const actualGain = Math.min(amount, spaceLeft);

    const oldTotal = userStats.totalXP;
    
    userStats.totalXP += actualGain;
    userStats.dailyXP += actualGain;

    const newTotalCoins = Math.floor(userStats.totalXP / 5);
    const oldTotalCoins = Math.floor(oldTotal / 5);
    
    if (newTotalCoins > oldTotalCoins) {
        const coinsToGain = newTotalCoins - oldTotalCoins;
        userCoins += coinsToGain;
        console.log(`✨ Milestone! You earned ${coinsToGain} Flick Coin(s)!`);
    }

    console.log(`+${actualGain} XP (Current Coins: ${userCoins})`);
    
    await saveStatsToCloud();
}

async function saveStatsToCloud() {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    
    const dataToSave = {
        stats: {
            totalXP: Number(userStats.totalXP),
            dailyXP: Number(userStats.dailyXP),
            lastStudyDate: userStats.lastStudyDate
        },
        coins: Number(userCoins)
    };

    try {
        await setDoc(userRef, dataToSave, { merge: true });
        console.log("✅ Saved to Cloud");
    } catch (error) {
        console.error("❌ Save Error:", error);
    }
}

// ----------
// Study UI Listeners
// ----------

document.getElementById('btn-correct').addEventListener('click', () => {
    recordActivity();
    handleFeedback(true);
});

document.getElementById('btn-wrong').addEventListener('click', () => {
    recordActivity();
    handleFeedback(false);
});

flashcardBox.addEventListener('click', () => {
    flashcardBox.classList.toggle('is-flipped');
});

flashcardOverlay.addEventListener('click', (e) => {
    if (e.target.id === 'darken-bg' || e.target.id === 'flashcard-area') {
        flashcardOverlay.style.display = "none";
    }
});