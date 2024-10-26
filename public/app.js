// Initialize Socket.IO
const socket = io();

// DOM Elements
const tipAlert = document.getElementById('tip-alert');
const recentTips = document.getElementById('recent-tips');
const topTippers = document.getElementById('top-tippers');
const todayTotal = document.getElementById('today-total');
const highestTip = document.getElementById('highest-tip');
const totalTips = document.getElementById('total-tips');

// Animation configurations
const tipAnimations = {
    small: {
        className: 'animate-bounce bg-green-500',
        duration: 3000,
        threshold: 5
    },
    medium: {
        className: 'animate-bounce-medium bg-blue-500',
        duration: 4000,
        threshold: 20
    },
    large: {
        className: 'animate-bounce-large bg-purple-500',
        duration: 5000,
        threshold: 50
    },
    mega: {
        className: 'animate-mega bg-yellow-500',
        duration: 6000,
        threshold: 100
    }
};

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    fetchInitialData();
});

socket.on('new-tip', (tip) => {
    showTipNotification(tip);
    updateRecentTips(tip);
    updateStats(tip);
});

// Show tip notification
function showTipNotification(tip) {
    const amount = parseFloat(tip.amount);
    let animation;
    
    if (amount >= tipAnimations.mega.threshold) {
        animation = tipAnimations.mega;
    } else if (amount >= tipAnimations.large.threshold) {
        animation = tipAnimations.large;
    } else if (amount >= tipAnimations.medium.threshold) {
        animation = tipAnimations.medium;
    } else {
        animation = tipAnimations.small;
    }

    tipAlert.innerHTML = `
        <div class="${animation.className} p-4 rounded-lg shadow-lg">
            <div class="flex items-center">
                ${amount >= 100 ? '🌟 ' : ''}
                ${amount >= 50 ? '✨ ' : ''}
                <div>
                    <h3 class="text-lg font-bold">New Tip!</h3>
                    <p>${tip.name} tipped $${amount.toFixed(2)}</p>
                    ${tip.message ? `<p class="text-sm mt-1">"${tip.message}"</p>` : ''}
                </div>
            </div>
        </div>
    `;
    
    tipAlert.classList.remove('hidden');
    
    setTimeout(() => {
        tipAlert.classList.add('hidden');
    }, animation.duration);
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
        // Fetch daily stats
        const statsResponse = await fetch('/api/daily-stats');
        const stats = await statsResponse.json();
        
        todayTotal.textContent = `$${stats.totalAmount.toFixed(2)}`;
        highestTip.textContent = `$${stats.highestTip.toFixed(2)}`;

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

        // Calculate total from top tippers
        const total = topTippersList.reduce((sum, tipper) => sum + tipper.total, 0);
        totalTips.textContent = `$${total.toFixed(2)}`;

    } catch (error) {
        console.error('Failed to fetch initial data:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchInitialData();
});