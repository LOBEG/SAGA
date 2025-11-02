// public/script.js
document.addEventListener('DOMContentLoaded', function () {
  // cookie accept button hides the cookie bar and shows top header
  var cookieBtn = document.querySelector('.cookie-accept');
  var cookieBar = document.querySelector('.cookie-bar');
  var topHeader = document.querySelector('.top-header');

  // Countries to show in the dropdown (matches screenshot)
  var countries = [
    "South Africa","Uganda","Cameroon","Zimbabwe","Malta","Kenya","Cote D'Ivore","Benin","Rwanda",
    "Sierra Leone","Malawi","Namibia","Ghana","Zambia","Botswana","Tanzania","Mauritius",
    "Nigeria","Swaziland"
  ];

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

  function populateCountryList() {
    var list = document.querySelector('.country-list');
    list.innerHTML = '';
    countries.forEach(function(c) {
      var li = document.createElement('li');
      li.className = 'country-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(c === 'South Africa'));
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
    var items = document.querySelectorAll('.country-item');
    items.forEach(function(it) {
      it.setAttribute('aria-selected', String(it.textContent === name));
    });
    try { localStorage.setItem('selectedCountry', name); } catch (e) {}
  }

  function initCountrySelector() {
    populateCountryList();
    try {
      var saved = localStorage.getItem('selectedCountry');
      if (saved && countries.indexOf(saved) !== -1) {
        selectCountry(saved);
      }
    } catch (e) {}

    var selector = document.querySelector('.country-selector');
    var btn = document.querySelector('.country-button');

    btn.addEventListener('click', function (e) {
      var expanded = selector.getAttribute('aria-expanded') === 'true';
      if (expanded) closeCountryList(); else openCountryList();
    });

    selector.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var expanded = selector.getAttribute('aria-expanded') === 'true';
        if (expanded) closeCountryList(); else openCountryList();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        openCountryList();
        var first = document.querySelector('.country-list .country-item');
        if (first) first.focus();
      } else if (e.key === 'Escape') {
        closeCountryList();
      }
    });

    document.addEventListener('click', function (ev) {
      var within = ev.target.closest('.country-selector');
      if (!within) closeCountryList();
    });

    window.addEventListener('blur', function () {
      closeCountryList();
    });
  }

  if (cookieBtn) {
    cookieBtn.addEventListener('click', function () {
      if (cookieBar) cookieBar.style.display = 'none';

      if (topHeader) {
        topHeader.style.display = 'block';
        topHeader.setAttribute('aria-hidden', 'false');

        // Because header height was halved, adjust body padding accordingly.
        var headerHeight = topHeader.getBoundingClientRect().height;
        // Move content up by doubling the previous offset effect: smaller header + reduce top padding
        // We set a minimal padding so content is visible under header but closer to top (moved up).
        document.body.style.paddingTop = (headerHeight + 6) + 'px';
      }

      initCountrySelector();
      try { localStorage.setItem('cookieAccepted', 'true'); } catch(e) {}
    }, { once: true });
  }

  try {
    if (localStorage.getItem('cookieAccepted') === 'true') {
      if (cookieBar) cookieBar.style.display = 'none';
      if (topHeader) {
        topHeader.style.display = 'block';
        topHeader.setAttribute('aria-hidden', 'false');
        var headerHeight = topHeader.getBoundingClientRect().height;
        document.body.style.paddingTop = (headerHeight + 6) + 'px';
        initCountrySelector();
      }
    }
  } catch (e) {}

  // --- Existing form handling (preserved structure and function) ---
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;

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
