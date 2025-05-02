const emailInput = document.getElementById('email');
const codeInput = document.getElementById('code');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const verifyCodeBtn = document.getElementById('verifyCodeBtn');
const profileStep = document.getElementById('profileStep');
const profileEmail = document.getElementById('profileEmail');
const profileName = document.getElementById('profileName');
const logoutBtn = document.getElementById('logoutBtn');
const status = document.getElementById('status');
const error = document.getElementById('error');
const headline = document.getElementById('headline');

async function apiPost(endpoint, data) {
  const res = await fetch(`https://clever-86au.onrender.com${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

function showError(msg) {
  error.textContent = msg;
  status.textContent = '';
}

function showStatus(msg) {
  status.textContent = msg;
  error.textContent = '';
}

sendCodeBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  if (!email) return showError('Enter email');
  showStatus('Sending code...');
  const res = await apiPost('/accounts/login', { email });
  if (res && !res.error) {
    showStatus(res.message);
    codeInput.classList.remove('hidden');
    verifyCodeBtn.classList.remove('hidden');
  } else {
    showError('Failed to send code.');
  }
});

verifyCodeBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const code = codeInput.value;
  if (!code) return showError('Enter code');
  showStatus('Verifying...');
  const res = await apiPost('/accounts/verify', { email, code });
  if (res.data.access && res.data.refresh) {
    await chrome.storage.local.set({
      clevercraftAccessToken: res.data.access,
      clevercraftRefreshToken: res.data.refresh
    });
    loadProfile();
  } else {
    showError('Invalid code.');
  }
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['clevercraftAccessToken', 'clevercraftRefreshToken']);
  location.reload();
});

async function loadProfile() {
  const { clevercraftAccessToken } = await chrome.storage.local.get(['clevercraftAccessToken']);
  if (!clevercraftAccessToken) return;
  const res = await fetch('https://clever-86au.onrender.com/accounts/profile', {
    headers: { Authorization: 'Bearer ' + clevercraftAccessToken }
  });
  if (res.ok) {
    const profile = await res.json();
    headline.textContent = 'Profile';
    profileEmail.textContent = profile.data.email || '';
    profileName.textContent = `${profile.data.first_name || ''} ${profile.data.last_name || ''}`;
    document.getElementById('loginStep').classList.add('hidden');
    profileStep.classList.remove('hidden');
  } else {
    showError('Session expired. Please log in again.');
    await chrome.storage.local.remove(['clevercraftAccessToken', 'clevercraftRefreshToken']);
  }
}

loadProfile();
