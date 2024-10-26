let payments;
let card;
let selectedAmount = 0;

// Initialize Square
async function initializeSquare() {
    try {
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
                showError('Please enter a valid tip amount');
                return;
            }

            try {
                cardButton.disabled = true;
                cardButton.textContent = 'Processing...';
                
                const result = await card.tokenize();
                if (result.status === 'OK') {
                    await processPayment(result.token);
                }
            } catch (e) {
                console.error(e);
                showError('Payment failed. Please try again.');
            } finally {
                cardButton.disabled = false;
                cardButton.textContent = 'Pay Tip';
            }
        });
    } catch (e) {
        console.error('Square initialization error:', e);
        showError('Could not load payment form. Please try again.');
    }
}

// Process payment
async function processPayment(token) {
    const amount = parseFloat(document.getElementById('custom-amount').value);
    const name = document.getElementById('tipper-name').value || 'Anonymous';
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
                name: name,
                message: message
            })
        });

        const result = await response.json();
        if (result.success) {
            showSuccess();
            resetForm();
        } else {
            throw new Error('Payment failed');
        }
    } catch (e) {
        console.error(e);
        showError('Payment failed. Please try again.');
    }
}

// Show success message
function showSuccess() {
    const amount = document.getElementById('custom-amount').value;
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-500 p-4 rounded-lg shadow-lg animate-bounce';
    successDiv.innerHTML = `
        <h3 class="text-lg font-bold">Thank You!</h3>
        <p>Your $${parseFloat(amount).toFixed(2)} tip has been processed.</p>
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 p-4 rounded-lg shadow-lg';
    errorDiv.innerHTML = `
        <p class="font-bold">Error</p>
        <p>${message}</p>
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Handle tip button selection
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
            btn.classList.add('ring-2', 'ring-ev-yellow');
        } else {
            btn.classList.remove('ring-2', 'ring-ev-yellow');
        }
    });
}

// Reset form
function resetForm() {
    document.getElementById('custom-amount').value = '';
    document.getElementById('tipper-name').value = '';
    document.getElementById('message').value = '';
    selectedAmount = 0;
    document.querySelectorAll('.tip-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-ev-yellow');
    });
    card.clear();
}

// Initialize on page load
window.addEventListener('load', initializeSquare);