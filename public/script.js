// public/script.js
document.addEventListener('DOMContentLoaded', function () {
  // cookie accept button hides the cookie bar and shows top header
  var cookieBtn = document.querySelector('.cookie-accept');
  var cookieBar = document.querySelector('.cookie-bar');
  var topHeader = document.querySelector('.top-header');
  var body = document.body;

  // Countries to show in the dropdown (uses screenshot list as default)
  var countries = [
    "South Africa","Uganda","Cameroon","Zimbabwe","Malta","Kenya","Cote D'Ivore","Benin","Rwanda",
    "Sierra Leone","Malawi","Namibia","Ghana","Zambia","Botswana","Tanzania","Mauritius",
    "Nigeria","Swaziland"
  ];

  // Small utility to open the custom dropdown
  function openCountryList() {
    var selector = document.querySelector('.country-selector');
    var list = document.querySelector('.country-list');
    selector.setAttribute('aria-expanded', 'true');
    list.setAttribute('aria-hidden', 'false');
    list.focus();
  }

  function closeCountryList() {
    var selector = document.querySelector('.country-selector');
    var list = document.querySelector('.country-list');
    selector.setAttribute('aria-expanded', 'false');
    list.setAttribute('aria-hidden', 'true');
  }

  // Build country list items
  function populateCountryList() {
    var list = document.querySelector('.country-list');
    list.innerHTML = '';
    countries.forEach(function(c) {
      var li = document.createElement('li');
      li.className = 'country-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(c === 'South Africa')); // default selection
      li.tabIndex = 0;
      li.textContent = c;
      li.addEventListener('click', function () {
        selectCountry(c);
        closeCountryList();
      });
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectCountry(c);
          closeCountryList();
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          var next = li.nextElementSibling;
          if (next) next.focus();
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          var prev = li.previousElementSibling;
          if (prev) prev.focus();
        } else if (ev.key === 'Escape') {
          closeCountryList();
          document.querySelector('.country-button').focus();
        }
      });
      list.appendChild(li);
    });
  }

  function selectCountry(name) {
    var btnText = document.querySelector('.country-text');
    btnText.textContent = name;
    // update aria-selected
    var items = document.querySelectorAll('.country-item');
    items.forEach(function(it) {
      it.setAttribute('aria-selected', String(it.textContent === name));
    });
    // Optionally persist to localStorage for later (non-intrusive)
    try {
      localStorage.setItem('selectedCountry', name);
    } catch (e) {
      // ignore storage errors
    }
  }

  // initialize custom country selector behavior
  function initCountrySelector() {
    populateCountryList();

    // restore selection from localStorage if present
    try {
      var saved = localStorage.getItem('selectedCountry');
      if (saved && countries.indexOf(saved) !== -1) {
        selectCountry(saved);
      }
    } catch (e) {}

    var selector = document.querySelector('.country-selector');
    var btn = document.querySelector('.country-button');
    var list = document.querySelector('.country-list');

    // Toggle on button click
    btn.addEventListener('click', function (e) {
      var expanded = selector.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeCountryList();
      } else {
        openCountryList();
      }
    });

    // Keyboard: open/close with Enter/Space, navigate with arrows
    selector.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var expanded = selector.getAttribute('aria-expanded') === 'true';
        if (expanded) closeCountryList(); else openCountryList();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        openCountryList();
        // focus first item
        var first = document.querySelector('.country-list .country-item');
        if (first) first.focus();
      } else if (e.key === 'Escape') {
        closeCountryList();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', function (ev) {
      var within = ev.target.closest('.country-selector');
      if (!within) closeCountryList();
    });

    // Close on window blur (safety)
    window.addEventListener('blur', function () {
      closeCountryList();
    });
  }

  if (cookieBtn) {
    cookieBtn.addEventListener('click', function () {
      if (cookieBar) cookieBar.style.display = 'none';

      // Show top header once cookie accepted
      if (topHeader) {
        topHeader.style.display = 'block';
        topHeader.setAttribute('aria-hidden', 'false');

        // Give body a top padding so main content isn't hidden behind header
        var headerHeight = topHeader.getBoundingClientRect().height;
        // Add a little extra so header and cookie bar spacing is comfortable
        document.body.style.paddingTop = (headerHeight + 8) + 'px';
      }

      // Initialize country selector after header is visible
      initCountrySelector();
    }, { once: true });
  }

  // If cookie already accepted (persisted), show header on load - non-intrusive check
  try {
    if (localStorage.getItem('cookieAccepted') === 'true') {
      if (cookieBar) cookieBar.style.display = 'none';
      if (topHeader) {
        topHeader.style.display = 'block';
        topHeader.setAttribute('aria-hidden', 'false');
        var headerHeight = topHeader.getBoundingClientRect().height;
        document.body.style.paddingTop = (headerHeight + 8) + 'px';
        initCountrySelector();
      }
    }
  } catch (e) {}

  // store that cookies were accepted (so header persists across refresh)
  // We mark cookie accepted when user clicks the accept button
  if (cookieBtn) {
    cookieBtn.addEventListener('click', function () {
      try {
        localStorage.setItem('cookieAccepted', 'true');
      } catch (e) {}
    }, { once: true });
  }

  // --- Existing form handling (preserved structure and function) ---
  var form = document.getElementById('loginForm');
  if (form) {
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
  }
});
