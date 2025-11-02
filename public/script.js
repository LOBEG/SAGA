// public/script.js
document.addEventListener('DOMContentLoaded', function () {
  // cookie accept button hides the cookie bar and shows top header/sidebar
  var cookieBtn = document.querySelector('.cookie-accept');
  var cookieBar = document.querySelector('.cookie-bar');
  var topHeader = document.querySelector('.top-header');

  // Countries list (same as before)
  var countries = [
    "South Africa","Uganda","Cameroon","Zimbabwe","Malta","Kenya","Cote D'Ivore","Benin","Rwanda",
    "Sierra Leone","Malawi","Namibia","Ghana","Zambia","Botswana","Tanzania","Mauritius",
    "Nigeria","Swaziland"
  ];

  var list, selectorBtn;

  // Populate the left full list (sidebar) and keep it visible by default once header shown.
  function populateCountryList() {
    list = document.querySelector('.country-list');
    if (!list) return;
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
      });

      // Make keyboard navigation within the panel work
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectCountry(c);
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          var next = li.nextElementSibling;
          if (next) next.focus();
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          var prev = li.previousElementSibling;
          if (prev) prev.focus();
        }
      });

      list.appendChild(li);
    });
  }

  function selectCountry(name) {
    var btnText = document.querySelector('.country-text');
    if (btnText) btnText.textContent = name;
    var items = document.querySelectorAll('.country-item');
    items.forEach(function(it) {
      it.setAttribute('aria-selected', String(it.textContent === name));
    });
    try { localStorage.setItem('selectedCountry', name); } catch (e) {}
    // After selecting a country, close the country selector panel as requested
    closeCountryPanel();
  }

  // Show/hide helpers for the left country panel
  function openCountryPanel() {
    list = document.querySelector('.country-list');
    if (!list) return;
    list.style.display = 'block';
    // ensure body has padding to compensate for fixed panel
    try {
      var rect = list.getBoundingClientRect();
      document.body.style.paddingLeft = (rect.width + 40) + 'px';
    } catch (e) {}
    // set accessible attr
    var selector = document.querySelector('.country-selector');
    if (selector) selector.setAttribute('aria-expanded', 'true');
  }

  function closeCountryPanel() {
    list = document.querySelector('.country-list');
    if (!list) return;
    list.style.display = 'none';
    // remove left padding so content returns to normal
    try { document.body.style.paddingLeft = ''; } catch (e) {}
    var selector = document.querySelector('.country-selector');
    if (selector) selector.setAttribute('aria-expanded', 'false');
  }

  // Initialize the left-side country panel (no dropdown toggling by default)
  function initCountryPanel() {
    populateCountryList();
    try {
      var saved = localStorage.getItem('selectedCountry');
      if (saved && countries.indexOf(saved) !== -1) {
        selectCountry(saved);
      }
    } catch (e) {}

    // cache selector button for toggling/focusing
    selectorBtn = document.querySelector('.country-button');

    // Clicking the small header button will toggle visibility of the left panel.
    if (selectorBtn) {
      selectorBtn.addEventListener('click', function (e) {
        list = document.querySelector('.country-list');
        if (!list) return;
        // If panel currently visible, hide it; otherwise show and focus selected item.
        var visible = window.getComputedStyle(list).display !== 'none';
        if (visible) {
          closeCountryPanel();
          selectorBtn.focus();
        } else {
          openCountryPanel();
          // move focus to currently selected item if any
          var sel = document.querySelector('.country-item[aria-selected="true"]');
          if (sel) sel.focus();
        }
      });
    }

    // Make ESC key close the panel when focus is inside it
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        // if panel open, close it
        var l = document.querySelector('.country-list');
        if (l && window.getComputedStyle(l).display !== 'none') {
          closeCountryPanel();
          if (selectorBtn) selectorBtn.focus();
        }
      }
    });
  }

  if (cookieBtn) {
    cookieBtn.addEventListener('click', function () {
      if (cookieBar) cookieBar.style.display = 'none';

      // Show header and left country panel once cookie accepted
      if (topHeader) {
        topHeader.style.display = 'block';
        topHeader.setAttribute('aria-hidden', 'false');
      }

      initCountryPanel();

      // Open the panel initially so user sees the full list (matches previous behavior)
      openCountryPanel();

      // persist cookie accepted (so header / panel appear on reload)
      try { localStorage.setItem('cookieAccepted', 'true'); } catch(e) {}
    }, { once: true });
  }

  // If cookie already accepted, show header and panel immediately
  try {
    if (localStorage.getItem('cookieAccepted') === 'true') {
      if (cookieBar) cookieBar.style.display = 'none';
      if (topHeader) {
        topHeader.style.display = 'block';
        topHeader.setAttribute('aria-hidden', 'false');
      }
      initCountryPanel();
      // ensure panel is open on load
      openCountryPanel();
    }
  } catch (e) {}

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
