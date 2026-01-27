let csrfToken = '';

const loginForm = document.getElementById('login-form');
const loginResult = document.getElementById('login-result');
const meButton = document.getElementById('me-button');
const meResult = document.getElementById('me-result');
const logoutButton = document.getElementById('logout-button');
const logoutResult = document.getElementById('logout-result');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginResult.textContent = 'Enviando...';

  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (data.ok && data.data) {
    csrfToken = data.data.csrf_token || '';
  }
  loginResult.textContent = JSON.stringify(data, null, 2);
});

meButton.addEventListener('click', async () => {
  meResult.textContent = 'Consultando...';
  const response = await fetch('/api/auth/me');
  const data = await response.json();
  meResult.textContent = JSON.stringify(data, null, 2);
});

logoutButton.addEventListener('click', async () => {
  logoutResult.textContent = 'Cerrando sesión...';
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  });
  const data = await response.json();
  csrfToken = '';
  logoutResult.textContent = JSON.stringify(data, null, 2);
});
