// public/script.js
document.addEventListener('DOMContentLoaded', function () {
  // cookie accept button hides the cookie bar
  var cookieBtn = document.querySelector('.cookie-accept');
  if (cookieBtn) {
    cookieBtn.addEventListener('click', function () {
      document.querySelector('.cookie-bar').style.display = 'none';
    });
  }

  var form = document.getElementById('loginForm');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    // Basic visual feedback
    var btn = document.querySelector('.btn-login');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password, userAgent: navigator.userAgent })
      });

      if (resp.ok) {
        // Keep UX simple: show a success alert then re-enable
        alert('Login attempt sent.');
      } else {
        alert('Server error. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });
});