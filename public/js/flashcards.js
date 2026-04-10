import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, onSnapshot, updateDoc, deleteField, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const displayArea = document.getElementById('card-display-area');
const floatingAddBtn = document.getElementById('floating-add-btn');

const flashcardOverlay = document.getElementById('flashcard-area');
const flashcardBox = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const endStudyBtn = document.getElementById('end-study-btn');

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
                userCoins = data.coins || 0;
                userStats = data.stats || userStats;

                // Sync Theme
                if (data.highContrast) {
                    document.body.classList.add('high-contrast');
                } else {
                    document.body.classList.remove('high-contrast');
                }

                updateDropdownUI();
                renderActiveSet();
            }
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
// UI Logic (Inline Editing)
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
        setTitle.textContent = "Please select or create a set";
        return;
    }
    
    setTitle.textContent = `Set: ${set.name}`;
    set.cards.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'flashcard-item';
        cardDiv.innerHTML = `
            <div class="card-section">
                <span class="card-label">Question</span>
                <textarea class="editable-text q-input" data-index="${index}">${card.question}</textarea>
            </div>
            <div class="card-divider"></div>
            <div class="card-section">
                <span class="card-label">Answer</span>
                <textarea class="editable-text a-input" data-index="${index}">${card.answer}</textarea>
            </div>
            <button class="delete-card-btn" data-index="${index}">&times;</button>
        `;
        displayArea.appendChild(cardDiv);
    });

    // Auto-resize textareas
    document.querySelectorAll('.editable-text').forEach(el => {
        el.style.height = el.scrollHeight + "px";
        el.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
}

// ----------
// Event Listeners
// ----------

floatingAddBtn.addEventListener('click', async () => {
    if (!currentSetId) return alert("Select a set first!");
    const newCard = { question: "New Question", answer: "New Answer", id: Date.now() };
    allSets[currentSetId].cards.unshift(newCard); 
    await saveToCloud();
    renderActiveSet();
});

displayArea.addEventListener('focusout', async (e) => {
    if (e.target.classList.contains('editable-text')) {
        const index = e.target.dataset.index;
        const set = allSets[currentSetId];
        if (e.target.classList.contains('q-input')) set.cards[index].question = e.target.value;
        else set.cards[index].answer = e.target.value;
        await saveToCloud();
    }
});

displayArea.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-card-btn')) {
        const index = e.target.dataset.index;
        allSets[currentSetId].cards.splice(index, 1);
        await saveToCloud();
        renderActiveSet();
    }
});

createSetBtn.addEventListener('click', async () => {
    const name = newSetNameInput.value.trim();
    if (!name) return;
    const setId = "set_" + Date.now();
    allSets[setId] = { name: name, cards: [] };
    newSetNameInput.value = "";
    await saveToCloud();
    currentSetId = setId;
    renderActiveSet();
});

setSelector.addEventListener('change', (e) => {
    currentSetId = e.target.value;
    renderActiveSet();
});

// ----------
// Study Mode Engine
// ----------

document.getElementById('study-btn').addEventListener('click', () => {
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
    flashcardBox.classList.remove('is-flipped');
    cardFront.innerHTML = `<div class="card-header">Card ${currentIndex + 1}/${studyQueue.length}</div><div class="card-main-text">${current.question}</div>`;
    cardBack.innerHTML = `<div class="card-header">Answer</div><div class="card-main-text">${current.answer}</div>`;
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
        if (confirm(`Finished! Score: ${score}/${studyQueue.length}. Redo ${missedCards.length} missed cards?`)) {
            startStudySession(missedCards);
        } else {
            flashcardOverlay.style.display = "none";
        }
    } else {
        alert("Perfect round!");
        flashcardOverlay.style.display = "none";
    }
}

// Safe End Button Logic
let endClickCount = 0;
endStudyBtn.addEventListener('click', () => {
    endClickCount++;
    if (endClickCount === 1) {
        endStudyBtn.innerText = "Confirm End?";
        setTimeout(() => { 
            endStudyBtn.innerText = "🛑 End Study"; 
            endClickCount = 0; 
        }, 3000);
    } else {
        flashcardOverlay.style.display = "none";
        endStudyBtn.innerText = "🛑 End Study";
        endClickCount = 0;
    }
});

// ----------
// XP Logic
// ----------

function recordActivity() {
    const now = Date.now();
    const secondsSinceLastClick = (now - lastClickTimestamp) / 1000;
    if (secondsSinceLastClick < 60) totalSessionSeconds += secondsSinceLastClick;
    lastClickTimestamp = now;

    const randCheck = Math.round(7 + Math.random() * 5);
    if (totalSessionSeconds >= randCheck) {
        const xpToGain = Math.floor(totalSessionSeconds / randCheck);
        totalSessionSeconds %= randCheck;
        applyXP(xpToGain);
    }
}

async function applyXP(amount) {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    userStats.totalXP += amount;
    userStats.dailyXP += amount;
    userCoins = Math.floor(userStats.totalXP / 5);
    await updateDoc(userRef, { stats: userStats, coins: userCoins });
}

document.getElementById('btn-correct').addEventListener('click', () => { recordActivity(); handleFeedback(true); });
document.getElementById('btn-wrong').addEventListener('click', () => { recordActivity(); handleFeedback(false); });
flashcardBox.addEventListener('click', () => flashcardBox.classList.toggle('is-flipped'));