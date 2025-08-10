/* Vaultpay script.js
   - App ID 93522
   - Callback must be: https://madee391.github.io/vaultpay/oauth-callback.html
*/
const APP_ID = '93522';
const CALLBACK = 'https://madee391.github.io/vaultpay/oauth-callback.html';
const API_BASE = 'https://api-core.deriv.com/v1';
const EXCHANGE_API = 'https://api.exchangerate.host/convert';
const MARKUP = 2.5; // percent hidden
// UI refs
const loginBtn = document.getElementById('loginBtn');
const depositBtn = document.getElementById('depositBtn');
const withdrawBtn = document.getElementById('withdrawBtn');
const amountInput = document.getElementById('amount');
const currencySelect = document.getElementById('currency');
const acctIdEl = document.getElementById('acctId');
const balanceDisplay = document.getElementById('balanceDisplay');
const balanceSub = document.getElementById('balanceSub');
const accountCard = document.getElementById('accountCard');
const txCard = document.getElementById('txCard');
const txTableBody = document.querySelector('#txTable tbody');
const txCurrency = document.getElementById('txCurrency');
const refreshTxBtn = document.getElementById('refreshTx');
const graphBtn = document.getElementById('graphBtn') || document.getElementById('graphBtn'); // optional
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const chartCanvas = document.getElementById('chartCanvas');
const modalCurrencyLabel = document.getElementById('modalCurrency');
const infoPageBtn = document.getElementById('infoPageBtn') || document.getElementById('infoPageBtn');
const infoPanel = document.getElementById('infoPanel');
const closeInfo = document.getElementById('closeInfo');
// token storage
function saveToken(t){ localStorage.setItem('deriv_token', t); }
function loadToken(){ return localStorage.getItem('deriv_token'); }
function clearToken(){ localStorage.removeItem('deriv_token'); }
// OAuth URL opener
loginBtn.addEventListener('click', ()=> {
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=EN&redirect_uri=${encodeURIComponent(CALLBACK)}&response_type=token&scope=read+payments`;
  window.open(oauthUrl, '_blank', 'width=500,height=700');
  alert('Login window opened — complete login in the new tab.');
});
// receive token from oauth-callback (postMessage)
window.addEventListener('message', (ev)=>{
  if(!ev.data) return;
  if(ev.data.source === 'deriv_oauth_callback' && ev.data.access_token){
    saveToken(ev.data.access_token);
    onLoggedIn();
    alert('Login successful');
  }
  if(ev.data.source === 'deriv_oauth_callback' && ev.data.code){
    alert('Deriv returned code-only. Reply "help server" for a free server function to exchange it for a token.');
  }
});
// auto-load token
document.addEventListener('DOMContentLoaded', ()=> { if(loadToken()) onLoggedIn(); });
// After login: fetch account & tx
async function onLoggedIn(){
  const token = loadToken(); if(!token) return;
  accountCard.style.display='block'; txCard.style.display='block';
  await fetchAccountAndBalance(token);
  await loadTransactionsAndRender(token);
}
async function fetchAccountAndBalance(token){
  try{
    const r = await fetch(API_BASE + '/get_account', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({}) }).catch(()=>null);
    const j = r ? await r.json().catch(()=>null) : null;
    if(j && j.account){
      acctIdEl.textContent = j.account.account_id || '—';
      showBalances(Number(j.account.balance||0), j.account.currency || 'USD');
    } else {
      acctIdEl.textContent = '(logged in)';
    }
  }catch(e){ console.warn('fetchAccountAndBalance', e); }
}
async function showBalances(amount, currency){
  balanceDisplay.textContent = `${amount.toFixed(2)} ${currency}`;
  const toKES = await convert(amount, currency, 'KES');
  const toGBP = await convert(amount, currency, 'GBP');
  balanceSub.textContent = `≈ KSh ${Math.round(toKES)} • ${toGBP.toFixed(2)} GBP`;
}
// convert helper
async function convert(amount, from, to){
  try{
    const res = await fetch(`${EXCHANGE_API}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`);
    const j = await res.json();
    if(j && j.result) return Number(j.result) * (1 + MARKUP/100); // apply hidden markup in conversions shown to user when initiating payments
    // fallback
    const fallback = { 'USD':140, 'GBP':170 };
    if(to==='KES') return amount * (fallback[from]||140) * (1 + MARKUP/100);
    return amount;
  }catch(e){
    console.warn('convert err', e);
    return amount;
  }
}
// load tx
async function loadTransactionsAndRender(token){
  try{
    const resp = await fetch(API_BASE + '/payment/transactions', { headers:{ 'Authorization': `Bearer ${token}` }});
    const j = await resp.json();
    let tx = [];
    if(j && j.transactions) tx = j.transactions;
    else if(j && j.data) tx = j.data;
    tx = (tx.filter(t => t.type && (t.type.toLowerCase().includes('deposit') || t.type.toLowerCase().includes('withdraw')))).slice(0,20);
    renderTxTable(tx);
  }catch(e){ console.warn('loadTransactions', e); }
}
async function renderTxTable(tx){
  txTableBody.innerHTML = '';
  if(!tx.length){ txTableBody.innerHTML = '<tr><td colspan="4">No transactions found.</td></tr>'; return; }
  for(const t of tx){
    const date = t.created_time || t.date || t.transaction_time || '';
    const type = t.type || t.action || 'tx';
    const amt = Number(t.amount || t.value || 0);
    const cur = t.currency || t.ccy || 'USD';
    const displayCurrency = txCurrency.value || 'KES';
    const displayAmt = await convert(amt, cur, displayCurrency);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${date? new Date(date).toLocaleString() : '-'}</td><td>${type}</td><td>${displayAmt.toFixed(2)}</td><td>${displayCurrency}</td>`;
    txTableBody.appendChild(tr);
  }
}
// helper charged amount (user pays)
function chargedAmount(amount){ return (Number(amount) * (1 + MARKUP/100)).toFixed(2); }
// Deposit handler
depositBtn.addEventListener('click', async ()=>{
  const token = loadToken(); if(!token){ alert('Login first'); return; }
  const userAmount = parseFloat(amountInput.value); if(isNaN(userAmount) || userAmount < 0.5){ alert('Enter amount >= 0.50'); return; }
  const currency = currencySelect.value === 'KES' ? 'USD' : currencySelect.value;
  const sendAmount = chargedAmount(userAmount);
  try{
    const q = new URL(API_BASE + '/payment/fiat/payment-url');
    q.searchParams.set('action','deposit'); q.searchParams.set('currency',currency); q.searchParams.set('amount',sendAmount);
    const resp = await fetch(q.toString(), { headers:{ 'Authorization': `Bearer ${token}` }});
    const j = await resp.json();
    if(j?.data?.[0]?.redirect_url){ window.location.href = j.data[0].redirect_url; return; }
    else if(j?.redirect_url){ window.location.href = j.redirect_url; return; }
    else { window.open(`https://cashier.deriv.com/deposit?currency=${currency}`,'_blank'); return; }
  }catch(e){ console.warn('deposit', e); window.open(`https://cashier.deriv.com/deposit?currency=${currency}`,'_blank'); }
});
// Withdraw handler
withdrawBtn.addEventListener('click', async ()=>{
  const token = loadToken(); if(!token){ alert('Login first'); return; }
  const userAmount = parseFloat(amountInput.value); if(isNaN(userAmount) || userAmount < 0.5){ alert('Enter amount >= 0.50'); return; }
  const currency = currencySelect.value === 'KES' ? 'USD' : currencySelect.value;
  const sendAmount = chargedAmount(userAmount);
  try{
    const q = new URL(API_BASE + '/payment/fiat/payment-url');
    q.searchParams.set('action','withdraw'); q.searchParams.set('currency',currency); q.searchParams.set('amount',sendAmount);
    const resp = await fetch(q.toString(), { headers:{ 'Authorization': `Bearer ${token}` }});
    const j = await resp.json();
    if(j?.data?.[0]?.redirect_url){ window.location.href = j.data[0].redirect_url; return; }
    else { window.open('https://cashier.deriv.com/withdrawal','_blank'); return; }
  }catch(e){ console.warn('withdraw', e); window.open('https://cashier.deriv.com/withdrawal','_blank'); }
});
// graph modal
let chartInstance=null; document.getElementById('graphBtn')?.addEventListener('click', async ()=>{
  const token=loadToken(); if(!token){ alert('Login first'); return; } modal.style.display='flex'; modalCurrencyLabel.textContent = txCurrency.value||'KES';
  try{
    const resp = await fetch(API_BASE + '/payment/transactions',{ headers:{ 'Authorization': `Bearer ${token}` }});
    const j = await resp.json();
    let tx = j && (j.transactions||j.data||j.items) ? (j.transactions||j.data||j.items) : [];
    tx = tx.filter(t => t.type && (t.type.toLowerCase().includes('deposit')||t.type.toLowerCase().includes('withdraw'))).slice(0,10);
    const labels=[], data=[], bg=[];
    for(const t of tx){
      const date=t.created_time||t.date||t.transaction_time||''; const type=t.type||t.action||'tx';
      const amt=Number(t.amount||t.value||0); const cur=t.currency||t.ccy||'USD';
      const converted = await convert(amt,cur,txCurrency.value||'KES');
      labels.push(date?new Date(date).toLocaleString():type); data.push(Math.round(converted)); bg.push(type.toLowerCase().includes('deposit')?'#12a26a':'#ff7b7b');
    }
    drawChart(labels,data,bg,txCurrency.value||'KES');
  }catch(e){ console.warn(e); alert('Could not load transactions for chart.'); }
}); function drawChart(labels,data,bg,currencyLabel){ if(chartInstance) chartInstance.destroy(); const ctx = chartCanvas.getContext('2d'); chartInstance = new Chart(ctx,{ type:'bar', data:{ labels, datasets:[{ label: currencyLabel, data, backgroundColor:bg }] }, options:{ responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } } }); }
closeModal?.addEventListener('click', ()=> modal.style.display='none'); infoPageBtn?.addEventListener('click', ()=> infoPanel.style.display='flex'); closeInfo?.addEventListener('click', ()=> infoPanel.style.display='none');
// try auto token from callback
(function(){ const t = localStorage.getItem('deriv_token'); if(t){ saveToken(t); onLoggedIn(); } })();
