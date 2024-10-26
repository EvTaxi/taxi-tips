let payments;
let card;
let selectedAmount = 0;

// Function to handle amount selection
function selectAmount(amount) {
    selectedAmount = amount;
    document.getElementById('custom-amount').value = amount;
    highlightSelectedAmount(amount);
}

// Highlight selected amount button
function highlightSelectedAmount(amount) {
    document.querySelectorAll('.tip-btn').forEach(btn => {
        const btnAmount = parseInt(btn.querySelector('.text-xl').textContent.replace('$', ''));
        if (btnAmount === amount) {
            btn.classList.add('ring-2', 'ring-blue-500');
        } else {
            btn.classList.remove('ring-2', 'ring-blue-500');
        }
    });
}

// Initialize Square
async function initializeSquare() {
    // Get Square application credentials
    const response = await fetch('/config');
    const config = await response.json();
    
    payments = Square.payments(config.appId, config.locationId);
    card = await payments.card();
    await card.attach('#card-container');

    const cardButton = document.getElementById('card-button');
    cardButton.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('custom-amount').value || '0');
        if (!amount || amount < 1) {
            alert('Please enter a valid tip amount');
            return;
        }

        try {
            const result = await card.tokenize();
            if (result.status === 'OK') {
                await processPayment(result.token);
            }
        } catch (e) {
            console.error(e);
            alert('Payment failed. Please try again.');
        }
    });
}

// Process the payment
async function processPayment(token) {
    const amount = parseFloat(document.getElementById('custom-amount').value);
    const message = document.getElementById('message').value;

    try {
        const response = await fetch('/process-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sourceId: token,
                amount: amount,
                message: message
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('Thank you for your tip!');
            // Reset form
            document.getElementById('custom-amount').value = '';
            document.getElementById('message').value = '';
            selectedAmount = 0;
        } else {
            alert('Payment failed. Please try again.');
        }
    } catch (e) {
        console.error(e);
        alert('Payment failed. Please try again.');
    }
}

// Handle custom amount input
document.getElementById('custom-amount').addEventListener('input', (e) => {
    selectedAmount = parseFloat(e.target.value) || 0;
    document.querySelectorAll('.tip-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-blue-500');
    });
});

// Initialize on page load
window.addEventListener('load', initializeSquare);