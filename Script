const app_id = 93522; // Your Deriv app ID
const affiliate_link = 'https://partners.deriv.com/rx?sidc=8B834F18-9089-4971-995A-5CBB8D7788EB&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU38529';
const whatsapp_number = '254758419976'; // Your WhatsApp number (Kenya)
const markup_percent = 2.5; // hidden markup %
const min_deposit = 0.5;

const usd_to_ksh = 128; 
const gbp_to_ksh = 164; 

// Elements
const loginBtn = document.getElementById('deriv-login-btn');
const balanceContainer = document.getElementById('balance-container');
const balanceUSD = document.getElementById('balance-usd');
const balanceGBP = document.getElementById('balance-gbp');
const balanceKSH = document.getElementById('balance-ksh');
const currencySelect = document.getElementById('currency-select');
const depositBtn = document.getElementById('deposit-btn');
const withdrawBtn = document.getElementById('withdraw-btn');
const whatsappBtn = document.getElementById('whatsapp-btn');
const transactionsList = document.getElementById('transactions-list');
const transactionHistoryDiv = document.getElementById('transaction-history');
const infoModal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');

let userToken = null;
let userBalanceUSD = 0;
let transactions = [];

// Open WhatsApp link
whatsappBtn.addEventListener('click', () => {
  window.open(`https://wa.me/${whatsapp_number}`, '_blank');
});

// Show deposit & withdraw info modal
function showInfoModal() {
  infoModal.style.display = 'flex';
}
modalCloseBtn.addEventListener('click', () => {
  infoModal.style.display = 'none';
});
window.onclick = (e) => {
  if (e.target === infoModal) infoModal.style.display = 'none';
};

// Calculate markup hidden amount
function applyMarkup(amount) {
  return amount * (1 + markup_percent / 100);
}

// Format currency nicely
function formatCurrency(value, currency) {
  let symbol = '';
  switch (currency) {
    case 'usd': symbol = '$'; break;
    case 'gbp': symbol = '£'; break;
    case 'ksh': symbol = 'KSh '; break;
  }
  return symbol + Number(value).toFixed(2);
}

// Deriv login button click
loginBtn.addEventListener('click', () => {
  // Open Deriv OAuth login page with redirect_uri to your deployed page
  const redirect_uri = window.location.href; // Assuming same page handles callback
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${app_id}&l=EN&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=token&scope=read+trade`;
  window.location.href = oauthUrl;
});

// Parse token from URL hash after OAuth redirect
function parseTokenFromUrl() {
  const hash = window.location.hash.substr(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  return token;
}

// Load balance from Deriv API
async function fetchBalance(token) {
  try {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }));
    };
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.msg_type === 'authorize') {
        ws.send(JSON.stringify({ balance: 1 }));
      } else if (data.msg_type === 'balance') {
        userBalanceUSD = Number(data.balance.balance);
        updateBalances();
        ws.close();
      }
    };
  } catch (error) {
    alert('Failed to fetch balance. Try logging in again.');
  }
}

function updateBalances() {
  const usd_with_markup = applyMarkup(userBalanceUSD);
  const gbp = usd_with_markup * 0.78;
  const ksh = usd_with_markup * usd_to_ksh;

  balanceUSD.textContent = formatCurrency(usd_with_markup, 'usd');
  balanceGBP.textContent = formatCurrency(gbp, 'gbp');
  balanceKSH.textContent = formatCurrency(ksh, 'ksh');

  balanceContainer.style.display = 'flex';
  currencySelect.style.display = 'block';
  depositBtn.style.display = 'block';
  withdrawBtn.style.display = 'block';
  transactionHistoryDiv.style.display = 'block';
}

// Currency switch
currencySelect.addEventListener('change', () => {
  updateBalances();
});

// Deposit button action
depositBtn.addEventListener('click', () => {
  const currency = currencySelect.value;
  const amount = prompt(`Enter deposit amount in ${currency.toUpperCase()} (min ${min_deposit})`);
  if (!amount || isNaN(amount) || Number(amount) < min_deposit) {
    alert(`Invalid amount. Minimum is ${min_deposit} ${currency.toUpperCase()}.`);
    return;
  }
  const amount_with_markup = applyMarkup(Number(amount));
  alert(`Deposit amount with 2.5% markup: ${formatCurrency(amount_with_markup, currency)}`);
  // Redirect user to WhatsApp with deposit message and affiliate link
  const depositMsg = `I want to deposit ${amount_with_markup.toFixed(2)} ${currency.toUpperCase()} via Vaultpay. Affiliate link: ${affiliate_link}`;
  window.open(`https://wa.me/${whatsapp_number}?text=${encodeURIComponent(depositMsg)}`, '_blank');
});

// Withdraw button action
withdrawBtn.addEventListener('click', () => {
  const currency = currencySelect.value;
  const amount = prompt(`Enter withdrawal amount in ${currency.toUpperCase()} (min ${min_deposit})`);
  if (!amount || isNaN(amount) || Number(amount) < min_deposit) {
    alert(`Invalid amount. Minimum is ${min_deposit} ${currency.toUpperCase()}.`);
    return;
  }
  const amount_with_markup = applyMarkup(Number(amount));
  alert(`Withdrawal amount with 2.5% markup: ${formatCurrency(amount_with_markup, currency)}`);
  const withdrawMsg = `I want to withdraw ${amount_with_markup.toFixed(2)} ${currency.toUpperCase()} via Vaultpay.`;
  window.open(`https://wa.me/${whatsapp_number}?text=${encodeURIComponent(withdrawMsg)}`, '_blank');
});

// Load transaction history (mock for now)
function loadTransactions() {
  transactionsList.innerHTML = '';
  if (transactions.length === 0) {
    transactionsList.innerHTML = '<li>No transactions yet</li>';
    return;
  }
  transactions.forEach(tx => {
    const li = document.createElement('li');
    li.textContent = `${tx.type} ${formatCurrency(tx.amount, tx.currency)} on ${new Date(tx.date).toLocaleString()}`;
    transactionsList.appendChild(li);
  });
}

// On page load: check if token in URL
window.onload = () => {
  const token = parseTokenFromUrl();
  if (token) {
    userToken = token;
    // Clean URL hash to not show token
    history.replaceState(null, null, ' ');
    fetchBalance(token);
    // Hide login button after login
    loginBtn.style.display = 'none';
  }
  loadTransactions();
};
