document.addEventListener("DOMContentLoaded", function() {
  // --- GLOBAL ELEMENTS & STATE ---
  const body = document.body;
  const currentYear = new Date().getFullYear();
  let currentLang = "es";
  let translations = {};
  let focusableElementsInModal = [];
  let firstFocusableElementInModal = null;
  let lastFocusableElementInModal = null;

  // --- HELPER FUNCTIONS ---
  function hexToRgbString(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  }

  function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100); G = parseInt(G * (100 + percent) / 100); B = parseInt(B * (100 + percent) / 100);
    R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
    R = (R > 0) ? R : 0; G = (G > 0) ? G : 0; B = (B > 0) ? B : 0;
    const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));
    return "#" + RR + GG + BB;
  }

  // --- INTERNATIONALIZATION (i18n) ---
  const langSelect = document.getElementById("lang-select");

  async function fetchTranslations(lang) {
    try {
      const response = await fetch(`locales/${lang}.json`);
      if (!response.ok) {
        console.error(`Could not load ${lang}.json: ${response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${lang}.json:`, error);
      return null;
    }
  }

  function translateElement(element, key, params) {
    let text = translations[key] || key; // Fallback to key if not found
    if (params) {
      for (const paramKey in params) {
        text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), params[paramKey]);
      }
    }
    return text;
  }

  function applyTranslations() {
    if (!translations) return;
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-translate-key]").forEach(element => {
      const key = element.dataset.translateKey;
      let params = null;
      if (element.dataset.translateParams) {
        try {
          params = JSON.parse(element.dataset.translateParams.replace(/'/g, "\""));
        } catch (e) {
          console.warn("Could not parse translate-params for key:", key, element.dataset.translateParams, e);
          // Attempt to parse simple key-value like points={{val}}
          const match = element.dataset.translateParams.match(/(\w+)=([^{}]+)/);
          if(match) params = {[match[1]]: match[2]};
        }
      }
      if (element.dataset.translateParamsYear === "current") {
        if(!params) params = {};
        params.year = currentYear;
      }
      element.textContent = translateElement(element, key, params);
    });
    document.querySelectorAll("[data-translate-key-title]").forEach(element => {
      const key = element.dataset.translateKeyTitle;
      element.title = translateElement(element, key);
    });
    document.querySelectorAll("[data-translate-key-aria-label]").forEach(element => {
      const key = element.dataset.translateKeyAriaLabel;
      element.setAttribute("aria-label", translateElement(element, key));
    });
    document.querySelectorAll("[data-translate-key-alt]").forEach(element => {
      const key = element.dataset.translateKeyAlt;
      element.alt = translateElement(element, key);
    });
    document.querySelectorAll("[data-translate-key-content]").forEach(element => {
      const key = element.dataset.translateKeyContent;
      element.content = translateElement(element, key);
    });
    // Update dynamic texts like achievements, profile defaults
    if (typeof initGamification === "function") initGamification(true); // Force re-render with new lang
    if (typeof initUserProfile === "function") initUserProfile(true); // Force re-render with new lang
  }

  async function setLanguage(lang) {
    const newTranslations = await fetchTranslations(lang);
    if (newTranslations) {
      currentLang = lang;
      translations = newTranslations;
      localStorage.setItem("neondev_user_language", lang);
      if (langSelect) langSelect.value = lang;
      applyTranslations();
    } else if (lang !== "es") { // Fallback to Spanish if selected lang fails and it's not already Spanish
      console.warn(`Failed to load ${lang}, falling back to Spanish.`);
      await setLanguage("es");
    }
  }

  function getString(key, params) {
    if (!translations || !translations[key]) {
      console.warn(`Translation key "${key}" not found for language "${currentLang}".`);
      return key; // Fallback to the key itself
    }
    let text = translations[key];
    if (params) {
      for (const paramKey in params) {
        text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), params[paramKey]);
      }
    }
    return text;
  }

  // --- INITIALIZATION ---
  document.getElementById("year").textContent = currentYear;



  // Scroll Progress
  window.addEventListener("scroll", () => {
    const scrollTop = document.documentElement.scrollTop || body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollProgress = (scrollTop / scrollHeight) * 100;
    document.querySelector(".scroll-progress").style.width = scrollProgress + "%";
  });

  // Smooth Scrolling
  document.querySelectorAll("a[href^=\"#\"]").forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault(); const targetId = this.getAttribute("href"); if (targetId === "#") return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) window.scrollTo({ top: targetElement.offsetTop - 80, behavior: "smooth" });
    });
  });

  // --- DARK MODE ---
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  function applyBaseTheme(theme) {
    const lightModeIcon = "🌙"; const darkModeIcon = "☀️";
    if (theme === "dark") {
      body.classList.add("dark-mode");
      if (darkModeToggle) darkModeToggle.innerHTML = `<i class="fas fa-sun"></i>`; // Use icon
      localStorage.setItem("theme", "dark");
    } else {
      body.classList.remove("dark-mode");
      if (darkModeToggle) darkModeToggle.innerHTML = `<i class="fas fa-moon"></i>`; // Use icon
      localStorage.setItem("theme", "light");
    }
  }
  function initBaseTheme() {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme) applyBaseTheme(savedTheme);
    else if (prefersDark) applyBaseTheme("dark");
    else applyBaseTheme("light");
  }
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => applyBaseTheme(body.classList.contains("dark-mode") ? "light" : "dark"));
  }
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!localStorage.getItem("theme")) applyBaseTheme(e.matches ? "dark" : "light");
  });

  // --- CUSTOM THEME ---
  const themePrimaryColorInput = document.getElementById("theme-primary-color");
  const themeColorPresets = document.querySelectorAll(".color-preset");
  let currentCustomTheme = { primaryColor: "#4db6ac" };
  function applyCustomThemeStyles(hexColor) {
    const rgbString = hexToRgbString(hexColor); if (!rgbString) return;
    document.documentElement.style.setProperty("--custom-primary", hexColor);
    document.documentElement.style.setProperty("--custom-primary-rgb", rgbString);
    document.documentElement.style.setProperty("--custom-primary-dark", shadeColor(hexColor, -20));
    document.documentElement.style.setProperty("--custom-primary-light", shadeColor(hexColor, 20));
    if (themePrimaryColorInput) themePrimaryColorInput.value = hexColor;
    themeColorPresets.forEach(preset => {
      preset.classList.remove("selected");
      preset.setAttribute("aria-checked", "false");
      if (preset.dataset.color === hexColor) {
        preset.classList.add("selected");
        preset.setAttribute("aria-checked", "true");
      }
    });
  }
  function loadCustomTheme() {
    const storedTheme = localStorage.getItem("neondev_custom_theme");
    if (storedTheme) currentCustomTheme = JSON.parse(storedTheme);
    else {
      const rootStyle = getComputedStyle(document.documentElement);
      const defaultPrimary = rootStyle.getPropertyValue("--primary").trim();
      if (defaultPrimary) currentCustomTheme.primaryColor = defaultPrimary;
    }
    applyCustomThemeStyles(currentCustomTheme.primaryColor);
  }
  if (themePrimaryColorInput) {
    themePrimaryColorInput.addEventListener("input", function() { applyCustomThemeStyles(this.value); });
  }
  themeColorPresets.forEach(preset => {
    preset.addEventListener("click", function() {
      const color = this.dataset.color;
      applyCustomThemeStyles(color);
      if (themePrimaryColorInput) themePrimaryColorInput.value = color;
    });
    preset.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
      }
    });
  });

  // --- HIGH CONTRAST MODE ---
  const highContrastToggle = document.getElementById("high-contrast-toggle");
  function applyHighContrast(isHighContrast) {
    if (isHighContrast) {
      body.classList.add("high-contrast-enabled");
      if (highContrastToggle) highContrastToggle.classList.add("active");
      localStorage.setItem("neondev_high_contrast_mode", "true");
    } else {
      body.classList.remove("high-contrast-enabled");
      if (highContrastToggle) highContrastToggle.classList.remove("active");
      localStorage.setItem("neondev_high_contrast_mode", "false");
    }
  }
  function loadHighContrastMode() {
    const savedHighContrast = localStorage.getItem("neondev_high_contrast_mode") === "true";
    applyHighContrast(savedHighContrast);
  }
  if (highContrastToggle) {
    highContrastToggle.addEventListener("click", () => applyHighContrast(!body.classList.contains("high-contrast-enabled")));
  }

  // --- GAMIFICATION ---
  let userPoints = 0;
  let userAchievements = {};
  let visitedGamePages = [];
  const achievementsList = {
    "first_feedback": { id: "first_feedback", name_key: "ach_first_feedback_name", desc_key: "ach_first_feedback_desc", icon: "fas fa-comment-dots", points: 20 },
    "alpha_explorer": { id: "alpha_explorer", name_key: "ach_alpha_explorer_name", desc_key: "ach_alpha_explorer_desc", icon: "fas fa-flask-vial", points: 15 },
    "game_page_visitor": { id: "game_page_visitor", name_key: "ach_game_visitor_name", desc_key: "ach_game_visitor_desc", icon: "fas fa-map-signs", points: 10 },
    "konami_master": { id: "konami_master", name_key: "ach_konami_master_name", desc_key: "ach_konami_master_desc", icon: "fas fa-terminal", points: 50 }
  };
  const pointsDisplay = document.getElementById("user-points-display");
  const achievementsGrid = document.getElementById("achievements-grid");
  const toastContainer = document.getElementById("toast-notifications-container");

  function initGamification(forceRerender = false) {
    if (!forceRerender) {
      const storedPoints = localStorage.getItem("neondev_user_points");
      userPoints = storedPoints ? parseInt(storedPoints, 10) : 0;
      const storedAchievements = localStorage.getItem("neondev_user_achievements");
      userAchievements = storedAchievements ? JSON.parse(storedAchievements) : {};
      const storedVisitedPages = localStorage.getItem("neondev_visited_game_pages");
      visitedGamePages = storedVisitedPages ? JSON.parse(storedVisitedPages) : [];
    }
    updatePointsDisplay();
    for (const id in achievementsList) {
      if (!userAchievements[id]) userAchievements[id] = { unlocked: false, unlock_date: null };
    }
    renderAchievements();
  }
  function updatePointsDisplay() {
    if (pointsDisplay) {
      const text = getString("user_points", {points: userPoints});
      pointsDisplay.textContent = text;
      // Update the data-translate-params for future translations if needed
      pointsDisplay.dataset.translateParamsPoints = userPoints;
    }
  }
  function addPoints(pointsValue) { userPoints += pointsValue; localStorage.setItem("neondev_user_points", userPoints.toString()); updatePointsDisplay(); }
  function unlockAchievement(achievementId) {
    if (achievementsList[achievementId] && !userAchievements[achievementId].unlocked) {
      userAchievements[achievementId].unlocked = true;
      userAchievements[achievementId].unlock_date = new Date().toLocaleDateString(currentLang.startsWith("es") ? "es-ES" : "en-US");
      localStorage.setItem("neondev_user_achievements", JSON.stringify(userAchievements));
      addPoints(achievementsList[achievementId].points);
      renderAchievements();
      showToastNotification(
        getString("toast_achievement_unlocked_title"),
        getString("toast_achievement_unlocked_message", { achievementName: getString(achievementsList[achievementId].name_key), points: achievementsList[achievementId].points }),
        achievementsList[achievementId].icon
      );
    }
  }
  function renderAchievements() {
    if (!achievementsGrid) return; achievementsGrid.innerHTML = "";
    for (const id in achievementsList) {
      const ach = achievementsList[id]; const userData = userAchievements[id];
      const item = document.createElement("div"); item.className = `achievement-item ${userData.unlocked ? "unlocked" : ""}`; item.dataset.achievementId = id; item.tabIndex = 0;
      item.innerHTML =
        `<i class="achievement-icon ${ach.icon}" aria-hidden="true"></i>
         <div class="achievement-details">
           <h4 class="achievement-name">${getString(ach.name_key)}</h4>
           <p class="achievement-description">${getString(ach.desc_key)}</p>
           <span class="achievement-status">${userData.unlocked ? getString("achievement_status_unlocked") : getString("achievement_status_locked")}</span>
           ${userData.unlocked && userData.unlock_date ? `<p class="achievement-date">${getString("achievement_date_prefix")}${userData.unlock_date}</p>` : ""}
         </div>`;
      achievementsGrid.appendChild(item);
    }
  }
  function trackGamePageVisit(gameId) { if (!visitedGamePages.includes(gameId)) { visitedGamePages.push(gameId); localStorage.setItem("neondev_visited_game_pages", JSON.stringify(visitedGamePages)); } if (visitedGamePages.length >= 1) unlockAchievement("game_page_visitor"); }
  function showToastNotification(title, message, iconClass) {
    if (!toastContainer) return;
    const toast = document.createElement("div"); toast.className = "toast-notification"; toast.setAttribute("role", "alert");
    toast.innerHTML = `<i class="toast-icon ${iconClass || "fas fa-info-circle"}" aria-hidden="true"></i><div class="toast-message"><strong>${title}</strong><span>${message}</span></div>`;
    toastContainer.appendChild(toast); setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => { toast.classList.remove("show"); toast.classList.add("hide"); setTimeout(() => toast.remove(), 500); }, 5000);
  }
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function(e) {
      e.preventDefault(); const submitBtn = contactForm.querySelector("button[type=\"submit\"]"); const originalBtnText = getString("form_send_btn");
      submitBtn.classList.add("processing"); submitBtn.disabled = true; submitBtn.textContent = getString("form_sending_btn");
      setTimeout(() => {
        submitBtn.classList.remove("processing"); submitBtn.textContent = getString("form_sent_btn"); submitBtn.classList.add("btn-success", "success-animation");
        addPoints(15); unlockAchievement("first_feedback");
        setTimeout(() => { submitBtn.textContent = originalBtnText; submitBtn.classList.remove("btn-success", "success-animation"); submitBtn.disabled = false; contactForm.reset(); }, 3000);
      }, 1000);
    });
  }
  const tryAlphaButtons = document.querySelectorAll(".game-try-alpha");
  tryAlphaButtons.forEach(button => {
    button.addEventListener("click", function(e) {
      e.preventDefault(); const gameId = this.dataset.gameId;
      if (gameId && !this.disabled) { addPoints(10); trackGamePageVisit(gameId); if (gameId === "theater_of_mind") unlockAchievement("alpha_explorer");
        showToastNotification(getString("toast_alpha_interest_title"), getString("toast_alpha_interest_message", {gameId: gameId}), "fas fa-gamepad");
      }
    });
  });



  // --- EASTER EGG LOGIC ---
  const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiIndex = 0; let konamiActivated = localStorage.getItem("neondev_konami_activated") === "true";
  document.addEventListener("keydown", function(e) {
    if (profileEditModal && profileEditModal.classList.contains("show")) return; // Don't trigger while modal is open
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; // Don't trigger if typing in form
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        const alreadyHad = userAchievements["konami_master"] && userAchievements["konami_master"].unlocked;
        if (!alreadyHad) { unlockAchievement("konami_master"); localStorage.setItem("neondev_konami_activated", "true"); konamiActivated = true; }
        showToastNotification(getString("toast_konami_title"), getString("toast_konami_message", {messageExtra: alreadyHad ? getString("toast_konami_extra_had") : getString("toast_konami_extra_new") }), "fas fa-ghost");
        konamiIndex = 0;
      }
    } else { konamiIndex = 0; }
  });
  const logoContainer = document.querySelector(".logo-container"); let logoClickCount = 0; let lastLogoClickTime = 0;
  if (logoContainer) {
    const logoActivation = () => {
      const currentTime = Date.now();
      if (currentTime - lastLogoClickTime < 1000) logoClickCount++; else logoClickCount = 1;
      lastLogoClickTime = currentTime;
      if (logoClickCount === 7) {
        showToastNotification(getString("toast_neon_secret_title"), getString("toast_neon_secret_message"), "fas fa-lightbulb");
        const neonSpan = document.querySelector(".logo .neon"); if(neonSpan) { neonSpan.style.transition = "text-shadow 0.5s ease-in-out"; neonSpan.style.textShadow = "0 0 10px #fff, 0 0 20px #fff, 0 0 30px var(--current-primary-light), 0 0 40px var(--current-primary-light)"; setTimeout(() => { neonSpan.style.textShadow = ""; }, 2000);}
        logoClickCount = 0;
      }
    };
    logoContainer.addEventListener("click", logoActivation);
    logoContainer.addEventListener("keydown", (e) => { if(e.key === "Enter" || e.key === " ") logoActivation(); });
  }

  // --- FINAL INITIALIZATION ORDER & LANGUAGE SETUP ---
  async function initializeApp() {
    initBaseTheme();
    loadCustomTheme();
    loadHighContrastMode();
    const userLang = localStorage.getItem("neondev_user_language") || navigator.language.split("-")[0] || "es";
    await setLanguage(userLang);
    if (langSelect) {
      langSelect.addEventListener("change", (e) => {
        translations_prev = JSON.parse(JSON.stringify(translations));
        setLanguage(e.target.value);
      });
    }
  }
  initializeApp();
});
ile()
})
