// Main JavaScript for Maryam Irekeola Portfolio Website

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeroBadgeCycle();
  initMobileNav();
  initSearchModal();
  initBookingModal();
  initContactForm();
  initAccessibilityFontScaler();
});

/* ==========================================================================
   1. Theme Management (Light / Dark Mode with Persistence)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');

  function getPreferredTheme() {
    const saved = localStorage.getItem('theme-preference');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme-preference', theme);
  }

  // Initial theme setup
  applyTheme(getPreferredTheme());

  function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  if (themeToggleMobile) {
    themeToggleMobile.addEventListener('click', toggleTheme);
  }

  // Listen to system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme-preference')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/* ==========================================================================
   2. Rotating Hero Status Badge
   ========================================================================== */
function initHeroBadgeCycle() {
  const badgeText = document.getElementById('hero-status-text');
  const badgeContainer = document.getElementById('hero-status-pill');
  if (!badgeText || !badgeContainer) return;

  const roles = [
    "PhD Researcher",
    "founder of insightSpace.co",
    "EU Horizon project Research Associate",
    "Speaker & Research Communication Advocate"
  ];

  let currentIndex = 0;

  setInterval(() => {
    badgeContainer.classList.add('opacity-0', '-translate-y-1');

    setTimeout(() => {
      currentIndex = (currentIndex + 1) % roles.length;
      badgeText.textContent = roles[currentIndex];
      badgeContainer.classList.remove('opacity-0', '-translate-y-1');
      badgeContainer.classList.add('opacity-100', 'translate-y-0');
    }, 300);
  }, 3200);
}

/* ==========================================================================
   3. Mobile Navigation Drawer
   ========================================================================= */
function initMobileNav() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-menu-close');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileBackdrop = document.getElementById('mobile-backdrop');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  function openMenu() {
    if (!mobileDrawer || !mobileBackdrop) return;
    mobileBackdrop.classList.remove('hidden', 'opacity-0');
    mobileBackdrop.classList.add('opacity-100');
    mobileDrawer.classList.remove('translate-x-full');
    mobileDrawer.classList.add('translate-x-0');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!mobileDrawer || !mobileBackdrop) return;
    mobileDrawer.classList.remove('translate-x-0');
    mobileDrawer.classList.add('translate-x-full');
    mobileBackdrop.classList.remove('opacity-100');
    mobileBackdrop.classList.add('opacity-0');
    setTimeout(() => {
      mobileBackdrop.classList.add('hidden');
    }, 250);
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

/* ==========================================================================
   4. Global Search Modal (Ctrl/Cmd + K)
   ========================================================================== */
function initSearchModal() {
  const searchModal = document.getElementById('search-modal');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchTriggers = document.querySelectorAll('.open-search-trigger');
  const searchCloseBtn = document.getElementById('search-close-btn');

  const searchableIndex = [
    { title: "InsightSpace.Co Community", category: "Community", desc: "Digital platform & community on TikTok and Instagram helping PhD researchers communicate their work clearly beyond academia.", href: "#insightspace" },
    { title: "TikTok Channel — @Insightspace.co", category: "Social", desc: "Short-form actionable research communication and PhD insights.", href: "https://www.tiktok.com/@Insightspace.co" },
    { title: "Instagram Community — @insightspace.co", category: "Social", desc: "Visual carousels, academic career design, and researcher mindset content.", href: "https://www.instagram.com/insightspace.co" },
    { title: "BAM 2026 Conference Paper", category: "Publication", desc: "Impact Evaluation in 6G Trials: Integrating Key Value Indicators for Sustainability Assessment.", href: "#research" },
    { title: "AMCIS 2026 Conference Paper", category: "Publication", desc: "Civic-Integrated Sustainability Assessment of Sixth Generation Technology Innovations: Case of the 6G-VERSUS.", href: "#research" },
    { title: "EU 6G-VERSUS Project Deliverable", category: "Deliverable", desc: "Horizon Europe sustainability assessment frameworks and multidimensional impact indicators for emerging 6G infrastructure.", href: "#research" },
    { title: "Toolkit for Lecturers: Run Your Own Hackathon!", category: "Pedagogy", desc: "Kingston University practical guide for higher education staff engaging students with sustainability.", href: "#research" },
    { title: "EmpowerWIT London Speaking", category: "Speaking", desc: "“You Do Not Have To Have Arrived” (Leadership Beyond Authority) on Community and Keynote stages.", href: "#speaking" },
    { title: "Black Women in Tech Masterclass", category: "Speaking", desc: "Pivot with Purpose: Cognitive biases and structured decision making in career transitions.", href: "#speaking" },
    { title: "British Academy of Management (BAM ECAN)", category: "Appointment", desc: "Early Career Academic Network Committee Associate representing ECR community.", href: "#about" },
    { title: "About Maryam Irekeola", category: "About", desc: "PhD Researcher, 6G-VERSUS Research Associate, and Founder of InsightSpace.Co.", href: "#about" },
    { title: "Request Collaboration & Contact", category: "Contact", desc: "Get in touch for speaking engagements, research collaboration, or workshops at irekemaryam@gmail.com.", href: "#contact" }
  ];

  function openSearch() {
    if (!searchModal || !searchInput) return;
    searchModal.classList.remove('hidden', 'opacity-0');
    searchModal.classList.add('flex', 'opacity-100');
    searchInput.value = '';
    searchInput.focus();
    renderResults('');
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    if (!searchModal) return;
    searchModal.classList.add('opacity-0');
    setTimeout(() => {
      searchModal.classList.add('hidden');
      searchModal.classList.remove('flex');
    }, 200);
    document.body.style.overflow = '';
  }

  function renderResults(query) {
    if (!searchResults) return;
    const cleanQuery = query.toLowerCase().trim();

    const matches = cleanQuery
      ? searchableIndex.filter(item =>
          item.title.toLowerCase().includes(cleanQuery) ||
          item.desc.toLowerCase().includes(cleanQuery) ||
          item.category.toLowerCase().includes(cleanQuery)
        )
      : searchableIndex.slice(0, 5); // default popular items

    if (matches.length === 0) {
      searchResults.innerHTML = `
        <div class="py-8 text-center text-slate-500 dark:text-slate-400">
          <p class="text-base font-medium">No results found for "${query}"</p>
          <p class="text-xs text-slate-400 mt-1">Try keywords like 'InsightSpace', 'BAM2026', '6G', or 'Workshop'.</p>
        </div>
      `;
      return;
    }

    searchResults.innerHTML = matches.map(item => `
      <a href="${item.href}" class="search-result-item block p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-100 dark:border-slate-700/60 transition group">
        <div class="flex items-center justify-between mb-1">
          <span class="font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 text-sm">${item.title}</span>
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${item.category}</span>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">${item.desc}</p>
      </a>
    `).join('');

    searchResults.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        closeSearch();
      });
    });
  }

  searchTriggers.forEach(btn => btn.addEventListener('click', openSearch));
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);

  if (searchModal) {
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) closeSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderResults(e.target.value);
    });
  }

  // Keyboard shortcut Ctrl/Cmd + K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchModal.classList.contains('hidden')) {
        openSearch();
      } else {
        closeSearch();
      }
    }
    if (e.key === 'Escape' && !searchModal.classList.contains('hidden')) {
      closeSearch();
    }
  });
}

/* ==========================================================================
   5. Interactive Booking Modal
   ========================================================================== */
function initBookingModal() {
  const bookingModal = document.getElementById('booking-modal');
  const bookingTriggers = document.querySelectorAll('.open-booking-trigger');
  const bookingCloseBtn = document.getElementById('booking-close-btn');

  function openBooking() {
    if (!bookingModal) return;
    bookingModal.classList.remove('hidden', 'opacity-0');
    bookingModal.classList.add('flex', 'opacity-100');
    document.body.style.overflow = 'hidden';
  }

  function closeBooking() {
    if (!bookingModal) return;
    bookingModal.classList.add('opacity-0');
    setTimeout(() => {
      bookingModal.classList.add('hidden');
      bookingModal.classList.remove('flex');
    }, 200);
    document.body.style.overflow = '';
  }

  bookingTriggers.forEach(btn => btn.addEventListener('click', openBooking));
  if (bookingCloseBtn) bookingCloseBtn.addEventListener('click', closeBooking);

  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) closeBooking();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal && !bookingModal.classList.contains('hidden')) {
      closeBooking();
    }
  });
}

/* ==========================================================================
   6. Collaboration & Contact Form (Real Email Dispatch via FormSubmit.co)
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const successBox = document.getElementById('contact-success-box');
  const submitBtn = document.getElementById('contact-submit-btn');
  const resetBtn = document.getElementById('contact-reset-btn');

  if (!form || !successBox) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        Sending to Maryam...
      `;
    }

    try {
      const formData = new FormData(form);
      const response = await fetch("https://formsubmit.co/ajax/irekemaryam@gmail.com", {
        method: "POST",
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok || data.success === "true" || data.success === true) {
        form.classList.add('hidden');
        successBox.classList.remove('hidden');
      } else {
        form.classList.add('hidden');
        successBox.classList.remove('hidden');
      }
    } catch (error) {
      console.warn("Direct AJAX error, using standard POST fallback:", error);
      form.submit();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Send Message <i class="uil uil-arrow-right ml-1"></i>`;
      }
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      form.classList.remove('hidden');
      successBox.classList.add('hidden');
    });
  }
}

/* ==========================================================================
   7. Accessibility Font Scaler Widget
   ========================================================================== */
function initAccessibilityFontScaler() {
  const minSize = 14;
  const maxSize = 20;
  const defaultSize = 16;
  let currentSize = parseInt(localStorage.getItem('user-font-size')) || defaultSize;

  function applySize(size) {
    document.documentElement.style.fontSize = `${size}px`;
    localStorage.setItem('user-font-size', size);
  }

  // Apply saved setting if present
  if (currentSize !== defaultSize) {
    applySize(currentSize);
  }

  const btnPlus = document.getElementById('font-scale-plus');
  const btnReset = document.getElementById('font-scale-reset');
  const btnMinus = document.getElementById('font-scale-minus');

  if (btnPlus) {
    btnPlus.addEventListener('click', () => {
      if (currentSize < maxSize) {
        currentSize += 1;
        applySize(currentSize);
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      currentSize = defaultSize;
      applySize(currentSize);
    });
  }

  if (btnMinus) {
    btnMinus.addEventListener('click', () => {
      if (currentSize > minSize) {
        currentSize -= 1;
        applySize(currentSize);
      }
    });
  }
}

