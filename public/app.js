// Initialize Socket.IO
const socket = io();

// DOM Elements
const tipAlert = document.getElementById('tip-alert');
const topTippers = document.getElementById('top-tippers');

// Animation configurations based on tip amount
const tipAnimations = {
    small: {
        className: 'animate-bounce-custom bg-green-500',
        duration: 3000,
        threshold: 10
    },
    medium: {
        className: 'animate-bounce-custom bg-blue-500',
        duration: 4000,
        threshold: 20
    },
    large: {
        className: 'animate-bounce-custom bg-purple-500',
        duration: 5000,
        threshold: 50
    },
    mega: {
        className: 'animate-bounce-custom bg-ev-yellow',
        duration: 6000,
        threshold: 100
    }
};

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('init-leaderboard', (data) => {
    updateLeaderboard(data);
});

socket.on('new-tip', (tip) => {
    showTipNotification(tip);
});

socket.on('leaderboard-update', (data) => {
    updateLeaderboard(data);
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
        <div class="max-w-md w-full ${animation.className} p-6 rounded-lg shadow-2xl">
            <div class="text-center">
                <h3 class="text-2xl font-bold mb-2">New Tip!</h3>
                <p class="text-xl mb-2">${tip.name} tipped $${amount.toFixed(2)}</p>
                ${tip.message ? `
                    <p class="text-lg italic text-ev-yellow mt-2">
                        "${tip.message}"
                    </p>
                ` : ''}
                ${amount >= 100 ? '<div class="text-4xl mt-2">🌟</div>' : ''}
                ${amount >= 50 ? '<div class="text-3xl mt-2">✨</div>' : ''}
            </div>
        </div>
    `;
    
    tipAlert.classList.remove('hidden');
    
    setTimeout(() => {
        tipAlert.classList.add('hidden');
    }, animation.duration);
}

// Update leaderboard
function updateLeaderboard(tippers) {
    topTippers.innerHTML = tippers.map((tipper, index) => `
        <div class="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between transform transition-all hover:scale-102 border-l-4 border-ev-yellow">
            <div class="flex items-center space-x-4">
                ${index === 0 ? '<span class="text-2xl">👑</span>' : ''}
                <div>
                    <span class="font-bold text-lg">${tipper.name}</span>
                    ${tipper.lastMessage ? `
                        <p class="text-sm text-ev-yellow italic mt-1">
                            "${tipper.lastMessage}"
                        </p>
                    ` : ''}
                    <p class="text-xs text-gray-400">
                        ${formatTime(new Date(tipper.lastTipTime))}
                    </p>
                </div>
            </div>
            <span class="text-xl font-bold text-ev-yellow">
                $${tipper.total.toFixed(2)}
            </span>
        </div>
    `).join('');
}

// Format timestamp
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Add some visual feedback when the connection is lost/restored
socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.body.classList.add('opacity-75');
});

socket.on('reconnect', () => {
    console.log('Reconnected to server');
    document.body.classList.remove('opacity-75');
});