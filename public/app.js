// Initialize Socket.IO
const socket = io();

// DOM Elements
const tipAlert = document.getElementById('tip-alert');
const recentTips = document.getElementById('recent-tips');
const topTippers = document.getElementById('top-tippers');
const todayTotal = document.getElementById('today-total');
const highestTip = document.getElementById('highest-tip');
const totalTips = document.getElementById('total-tips');

// Track stats
let dailyTotal = 0;
let highestTipAmount = 0;
let totalAmount = 0;

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    fetchInitialData();
});

socket.on('new-tip', (tip) => {
    showTipNotification(tip);
    updateRecentTips(tip);
    updateStats(tip);
    playTipSound();
});

// Show tip notification
function showTipNotification(tip) {
    const tipAmount = parseFloat(tip.amount);
    let animationClass = 'animate-bounce';
    let bgColor = 'bg-green-500';
    
    if (tipAmount >= 20) {
        animationClass = 'animate-bounce-gold';
        bgColor = 'bg-yellow-500';
    } else if (tipAmount >= 10) {
        animationClass = 'animate-bounce-silver';
        bgColor = 'bg-blue-500';
    }

    tipAlert.innerHTML = `
        <div class="${bgColor} p-4 rounded-lg shadow-lg ${animationClass}">
            <h3 class="text-lg font-bold">New Tip!</h3>
            <p>${tip.name} tipped $${tipAmount.toFixed(2)}</p>
            ${tip.message ? `<p class="text-sm">"${tip.message}"</p>` : ''}
        </div>
    `;
    
    tipAlert.classList.remove('hidden');
    
    setTimeout(() => {
        tipAlert.classList.add('hidden');
    }, 3000);
}

// Update recent tips list
function updateRecentTips(tip) {
    const tipElement = document.createElement('div');
    tipElement.className = 'bg-gray-700 p-3 rounded-lg flex justify-between items-center animate-fade-in';
    tipElement.innerHTML = `
        <div>
            <span class="font-semibold">${tip.name}</span>
            <span class="text-sm text-gray-400">${formatTime(new Date(tip.timestamp))}</span>
        </div>
        <span class="text-green-400 font-bold">$${parseFloat(tip.amount).toFixed(2)}</span>
    `;
    
    recentTips.insertBefore(tipElement, recentTips.firstChild);
    
    while (recentTips.children.length > 10) {
        recentTips.removeChild(recentTips.lastChild);
    }
}

// Update dashboard statistics
function updateStats(tip) {
    const amount = parseFloat(tip.amount);
    dailyTotal += amount;
    totalAmount += amount;
    highestTipAmount = Math.max(highestTipAmount, amount);
    
    todayTotal.textContent = `$${dailyTotal.toFixed(2)}`;
    highestTip.textContent = `$${highestTipAmount.toFixed(2)}`;
    totalTips.textContent = `$${totalAmount.toFixed(2)}`;
}

// Format timestamp
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Fetch initial data
async function fetchInitialData() {
    try {
        // Fetch recent tips
        const recentResponse = await fetch('/api/recent-tips');
        const recentTipsList = await recentResponse.json();
        recentTipsList.forEach(tip => updateRecentTips(tip));

        // Fetch top tippers
        const topResponse = await fetch('/api/top-tippers');
        const topTippersList = await topResponse.json();
        
        topTippers.innerHTML = topTippersList
            .map((tipper, index) => `
                <div class="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                    <div class="flex items-center">
                        ${index === 0 ? '👑 ' : ''}
                        <span class="font-semibold">${tipper.name}</span>
                    </div>
                    <span class="text-green-400 font-bold">$${tipper.total.toFixed(2)}</span>
                </div>
            `)
            .join('');

        // Calculate totals
        dailyTotal = recentTipsList
            .filter(tip => isToday(new Date(tip.timestamp)))
            .reduce((sum, tip) => sum + parseFloat(tip.amount), 0);
        
        highestTipAmount = Math.max(...recentTipsList.map(tip => parseFloat(tip.amount)));
        totalAmount = topTippersList.reduce((sum, tipper) => sum + tipper.total, 0);

        // Update displays
        todayTotal.textContent = `$${dailyTotal.toFixed(2)}`;
        highestTip.textContent = `$${highestTipAmount.toFixed(2)}`;
        totalTips.textContent = `$${totalAmount.toFixed(2)}`;
    } catch (error) {
        console.error('Failed to fetch initial data:', error);
    }
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Reset daily total at midnight
function resetDailyTotal() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight - now;
    
    setTimeout(() => {
        dailyTotal = 0;
        todayTotal.textContent = '$0';
        resetDailyTotal();
    }, timeUntilMidnight);
}

// Initialize
resetDailyTotal();