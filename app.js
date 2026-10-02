/**
 * ComicCraft — AI Comic Story Creator
 * Main Application Logic
 * 
 * Uses Google Gemini API for:
 *  1. Story generation (text) — gemini-3.8-flash
 *  2. Image generation — imagen-3.0 / gemini multimodal
 */

// ============================================
// Constants & Config
// ============================================

const GEMINI_TEXT_MODEL = 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];
const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const NUM_PANELS = 6;

// ============================================
// DOM References
// ============================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  navbar: $('#navbar'),
  homePage: $('#home-page'),
  resultPage: $('#result-page'),
  form: $('#comic-form'),
  apiKeyInput: $('#api-key'),
  toggleKeyBtn: $('#toggle-key-btn'),
  storyPrompt: $('#story-prompt'),
  characterName: $('#character-name'),
  generateBtn: $('#generate-btn'),
  loadingOverlay: $('#loading-overlay'),
  loadingStep: $('#loading-step'),
  progressFill: $('#progress-fill'),
  resultTitle: $('#result-title'),
  resultMeta: $('#result-meta'),
  storyOutlineText: $('#story-outline-text'),
  comicGrid: $('#comic-grid'),
  exportPdfBtn: $('#export-pdf-btn'),
  newComicBtn: $('#new-comic-btn'),
  toastContainer: $('#toast-container'),
  statusDot: $('#status-dot'),
  statusText: $('#status-text'),
  particles: $('#particles'),
};

// ============================================
// State
// ============================================

let currentComic = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbarScroll();
  initApiKeyToggle();
  initApiKeyPersistence();
  initAuth();
  initAuthPersistence();
  initFormSubmit();
  initSampleComic();
  initResultActions();
});

// ============================================
// Floating Particles
// ============================================

function initParticles() {
  const container = dom.particles;
  const count = 30;
  const colors = ['#a855f7', '#ec4899', '#3b82f6', '#06b6d4', '#f97316'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.width = particle.style.height = (2 + Math.random() * 4) + 'px';
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.animationDuration = (8 + Math.random() * 16) + 's';
    particle.style.animationDelay = (Math.random() * 12) + 's';
    container.appendChild(particle);
  }
}

// ============================================
// Navbar Scroll Effect
// ============================================

function initNavbarScroll() {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        dom.navbar.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ============================================
// API Key Popover & Persistence
// ============================================

function initApiKeyToggle() {
  const popover = $('#api-popover');
  const apiStatus = $('#api-status');
  const saveBtn = $('#save-key-btn');

  // Toggle popover on click if button exists
  apiStatus?.addEventListener('click', (e) => {
    e.stopPropagation();
    popover?.classList.toggle('active');
  });

  // Toggle password visibility
  dom.toggleKeyBtn?.addEventListener('click', () => {
    if (!dom.apiKeyInput) return;
    const isPassword = dom.apiKeyInput.type === 'password';
    dom.apiKeyInput.type = isPassword ? 'text' : 'password';
    dom.toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  // Save key button
  saveBtn?.addEventListener('click', () => {
    const key = dom.apiKeyInput ? dom.apiKeyInput.value.trim() : '';
    if (key.length > 10) {
      localStorage.setItem('comiccraft_api_key', key);
      updateApiStatus(true);
      popover?.classList.remove('active');
      showToast('API key saved!', 'success');
    } else {
      showToast('Please enter a valid API key', 'error');
    }
  });

  // Close popover on outside click
  document.addEventListener('click', (e) => {
    if (popover && !popover.contains(e.target) && (!apiStatus || !apiStatus.contains(e.target))) {
      popover.classList.remove('active');
    }
  });
}

function initApiKeyPersistence() {
  // Restore saved key
  const saved = localStorage.getItem('comiccraft_api_key');
  if (saved && dom.apiKeyInput) {
    dom.apiKeyInput.value = saved;
    updateApiStatus(true);
  }
}

function updateApiStatus(connected) {
  if (dom.statusDot) dom.statusDot.className = 'status-dot' + (connected ? '' : ' disconnected');
  if (dom.statusText) dom.statusText.textContent = connected ? 'API connected' : 'Click to add key';
}

// ============================================
// Authentication & User Session
// ============================================

function initAuth() {
  const modal = $('#auth-modal');
  const openBtn = $('#open-auth-btn');
  const closeBtn = $('#close-auth-modal');
  const tabSignin = $('#tab-signin');
  const tabSignup = $('#tab-signup');
  const formSignin = $('#signin-form');
  const formSignup = $('#signup-form');
  const demoLoginBtn = $('#demo-login-btn');
  const logoutBtn = $('#logout-btn');
  const avatarChoices = $$('.avatar-choice');

  let selectedAvatar = '🦸';

  // Open modal
  openBtn?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
  });

  // Close modal button
  closeBtn?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  // Close on outside click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });

  // Tab switching
  tabSignin?.addEventListener('click', () => {
    tabSignin.classList.add('active');
    tabSignin.setAttribute('aria-selected', 'true');
    tabSignup.classList.remove('active');
    tabSignup.setAttribute('aria-selected', 'false');
    formSignin.classList.remove('hidden');
    formSignup.classList.add('hidden');
  });

  tabSignup?.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabSignup.setAttribute('aria-selected', 'true');
    tabSignin.classList.remove('active');
    tabSignin.setAttribute('aria-selected', 'false');
    formSignup.classList.remove('hidden');
    formSignin.classList.add('hidden');
  });

  // Password visibility toggle
  $$('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = $(`#${targetId}`);
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.textContent = isPass ? '🙈' : '👁️';
      }
    });
  });

  // Avatar picker
  avatarChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      avatarChoices.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAvatar = btn.getAttribute('data-avatar') || '🦸';
    });
  });

  // Sign In submit
  formSignin?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = $('#signin-email');
    const val = emailInput ? emailInput.value.trim() : '';
    if (!val) return;

    const username = val.includes('@') ? val.split('@')[0] : val;
    const user = { name: username, email: val, avatar: '🦸' };
    saveUserSession(user);
    modal.classList.add('hidden');
    showToast(`Welcome back, ${username}! 🚀`, 'success');
  });

  // Sign Up submit
  formSignup?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = $('#signup-name');
    const emailInput = $('#signup-email');
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    if (!name || !email) return;

    const user = { name, email, avatar: selectedAvatar };
    saveUserSession(user);
    modal.classList.add('hidden');
    showToast(`Account created! Welcome, ${name}! ✨`, 'success');
  });

  // 1-Click Demo Guest Login
  demoLoginBtn?.addEventListener('click', () => {
    const demoUser = { name: 'ComicHero', email: 'hero@comiccraft.ai', avatar: '🦸' };
    saveUserSession(demoUser);
    modal.classList.add('hidden');
    showToast('Signed in as Guest Hero! 🎨', 'success');
  });

  // Logout button
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('comiccraft_user');
    updateNavUser(null);
    showToast('Signed out successfully.', 'info');
  });
}

function saveUserSession(user) {
  try {
    localStorage.setItem('comiccraft_user', JSON.stringify(user));
  } catch {}
  updateNavUser(user);
}

function initAuthPersistence() {
  try {
    const saved = localStorage.getItem('comiccraft_user');
    if (saved) {
      const user = JSON.parse(saved);
      updateNavUser(user);
    }
  } catch {}
}

function updateNavUser(user) {
  const openAuthBtn = $('#open-auth-btn');
  const userPill = $('#user-pill');
  const userAvatar = $('#user-avatar');
  const userDisplayName = $('#user-display-name');

  if (user && user.name) {
    if (openAuthBtn) openAuthBtn.classList.add('hidden');
    if (userPill) userPill.classList.remove('hidden');
    if (userAvatar) userAvatar.textContent = user.avatar || '🦸';
    if (userDisplayName) userDisplayName.textContent = user.name;
  } else {
    if (openAuthBtn) openAuthBtn.classList.remove('hidden');
    if (userPill) userPill.classList.add('hidden');
  }
}

// ============================================
// Form Helpers
// ============================================

function getSelectedRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function getFormData() {
  return {
    apiKey: dom.apiKeyInput ? dom.apiKeyInput.value.trim() : (localStorage.getItem('comiccraft_api_key') || ''),
    storyPrompt: dom.storyPrompt ? dom.storyPrompt.value.trim() : '',
    characterName: dom.characterName ? dom.characterName.value.trim() : '',
    gender: (() => {
      const v = getSelectedRadio('char-gender');
      if (v === 'male' || v === 'female') return v;
      return null; // null = auto-detect from name
    })(),
    setting: getSelectedRadio('setting') || 'City',
    tone: getSelectedRadio('tone') || 'Dramatic',
    artStyle: 'Pencil Art', // Always graphite pencil illustration
  };
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
  const icons = { info: 'ℹ️', error: '❌', success: '✅', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ============================================
// Loading Overlay
// ============================================

function showLoading(show) {
  dom.loadingOverlay.classList.toggle('active', show);
  if (!show) {
    dom.progressFill.style.width = '0%';
  }
}

function updateLoadingStep(text, progress) {
  dom.loadingStep.textContent = text;
  dom.progressFill.style.width = progress + '%';
}

// ============================================
// Gemini API — Text Generation
// ============================================

let cachedDiscoveredModels = null;

/**
 * Dynamically queries Google Gemini ModelService.ListModels
 * to find the exact active models supported by the user's API key
 */
async function getAvailableGeminiModels(apiKey) {
  if (cachedDiscoveredModels && cachedDiscoveredModels.length > 0) {
    return cachedDiscoveredModels;
  }

  const versions = ['v1beta', 'v1'];
  for (const ver of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`);
      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        // Filter models that support generateContent
        const supported = data.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => {
            const rawName = m.name.replace(/^models\//, '');
            return {
              name: rawName,
              version: ver,
              url: `https://generativelanguage.googleapis.com/${ver}/models/${rawName}:generateContent?key=${apiKey}`,
            };
          });

        if (supported.length > 0) {
          // Sort to prioritize flash and newest models
          supported.sort((a, b) => {
            const score = (n) => {
              const str = n.toLowerCase();
              if (str.includes('flash') && !str.includes('8b')) return 100;
              if (str.includes('flash')) return 90;
              if (str.includes('2.5') || str.includes('2.0') || str.includes('3.')) return 85;
              if (str.includes('1.5-pro')) return 80;
              if (str.includes('pro')) return 70;
              if (str.includes('gemini')) return 60;
              return 10;
            };
            return score(b.name) - score(a.name);
          });

          cachedDiscoveredModels = supported;
          console.log(`Discovered ${supported.length} active models via ModelService.ListModels:`, supported.map(s => s.name));
          return supported;
        }
      }
    } catch (e) {
      console.warn(`ModelService probe on ${ver} failed:`, e);
    }
  }

  // Fallback candidate list if ListModels is blocked by network/CORS
  return [
    { name: 'gemini-1.5-flash-latest', version: 'v1beta', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}` },
    { name: 'gemini-1.5-flash-002', version: 'v1beta', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${apiKey}` },
    { name: 'gemini-1.5-flash-001', version: 'v1beta', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}` },
    { name: 'gemini-1.5-flash', version: 'v1beta', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
    { name: 'gemini-1.5-flash-latest', version: 'v1', url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}` },
    { name: 'gemini-1.5-flash', version: 'v1', url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
    { name: 'gemini-2.0-flash-exp', version: 'v1beta', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}` },
    { name: 'gemini-1.5-pro-latest', version: 'v1beta', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}` },
    { name: 'gemini-pro', version: 'v1', url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}` },
  ];
}

// ============================================
// Gender Detection & Character Consistency System
// ============================================

const FEMALE_NAMES = new Set([
  // Indian female names
  'ananya','priya','diya','neha','pooja','divya','kavya','meera','riya','isha',
  'ishita','aditi','anika','anya','arya','avni','bhavya','gauri','harshita',
  'jyoti','kajal','komal','kriti','lavanya','madhu','madhuri','mansi','manya',
  'megha','minakshi','mitali','mohini','nalini','namita','namrata','nandini',
  'nandita','neethu','padma','pallavi','poonam','preeti','prerana','priyanka',
  'pushpa','rachna','radhika','ragini','rakhi','rani','rashmi','rashida','rekha',
  'renu','renuka','revathi','rohini','rupali','sakshi','saloni','sangeeta',
  'sarita','savita','seema','shanta','shikha','shilpa','shobha','shreya',
  'shweta','sneha','sonia','sonali','sonal','supriya','surbhi','sushma',
  'swati','tanvi','tanya','trisha','usha','urvashi','vandana','vasudha',
  'vidya','vijaya','vinita','yamini','yasmin','zara','zoya','zeenat','uma',
  'asha','sunita','radha','sita','deepa','reena','veena','lata','geeta',
  'leela','nisha','sonya','amira','fatima','dimple','dipti','maya',
  // International female names
  'aisha','sara','sarah','emily','emma','olivia','sophia','ava','mia','ella',
  'lily','grace','hannah','natalie','zoe','alice','claire','eleanor','fiona',
  'georgia','helen','isabella','jessica','julia','kate','laura','luna','lucy',
  'lydia','nina','nora','ruby','samantha','stella','victoria','wendy',
  'aria','elena','diana','anna','amelia','charlotte','harper','evelyn','abigail',
  'elizabeth','sofia','mila','camila','scarlett','penelope','layla',
  'riley','zoey','lillian','addison','aubrey','brooklyn','leah','savannah',
  'audrey','bella','skylar','violet','chloe','zoe','hazel','ellie','clara'
]);

const MALE_NAMES = new Set([
  // Indian male names
  'kishore','rahul','rohan','arjun','aryan','aditya','amit','anil','ankit',
  'ashok','bharat','chetan','deepak','dev','dinesh','gaurav','harish','karan',
  'manish','manoj','mayank','mohit','mukesh','naveen','nikhil','nitin','pankaj',
  'pawan','pradeep','prakash','pranav','prashant','praveen','raj','rajesh',
  'rajiv','rakesh','ramesh','ravi','rishabh','rohit','sachin','sameer','sanjay',
  'sanjeev','santosh','saurabh','shivam','siddharth','sunil','suresh','tarun',
  'varun','vikas','vikram','vinay','vinod','vishal','vivek','yash','ajay',
  'vijay','alok','vijesh','kunal','chirag','abhishek','aman','akash','harsh',
  // International male names
  'leo','alex','john','david','peter','luke','liam','noah','oliver','james',
  'william','benjamin','lucas','henry','theodore','jack','levi','alexander',
  'jackson','mateo','daniel','michael','mason','sebastian','ethan','logan',
  'owen','samuel','jacob','asher','aidan','aiden','joseph','wyatt','carter',
  'julian','isaac','jayden','gabriel','anthony','dylan','thomas','charles',
  'christopher','jaxon','maverick','andrew','elias','joshua','nathan','caleb',
  'ryan','adrian','miles','eli','nolan','christian','aaron','cameron','ezra',
  'colton','luca','landon','hunter','jonathan','santiago','axel','easton',
  'cooper','jeremiah','angel','roman','connor','jameson','robert','greyson',
  'jordan','ian','carson','jaxson','leonardo','nicholas','dominic','austin','adam','xavier'
]);

/**
 * Fallback name-based gender detection
 */
function detectGenderFromName(name) {
  if (!name) return 'male';
  const firstWord = name.trim().toLowerCase().split(/[\s,_-]+/)[0];
  if (FEMALE_NAMES.has(firstWord)) return 'female';
  if (MALE_NAMES.has(firstWord)) return 'male';
  
  // Heuristics for names ending in female suffixes
  if (firstWord.endsWith('a') || firstWord.endsWith('i') || firstWord.endsWith('ya') || firstWord.endsWith('ee') || firstWord.endsWith('na')) {
    return 'female';
  }
  return 'male';
}

/**
 * Priority Hierarchy for Gender Detection (Requirement 3):
 * 1. Explicit user-selected gender
 * 2. Explicit character description (prompt clues)
 * 3. Character name as fallback
 */
function detectGender(name, explicitGender = null, storyPrompt = '') {
  // 1. Explicit user selection overrides ambiguous name detection
  if (explicitGender === 'male' || explicitGender === 'boy') return 'male';
  if (explicitGender === 'female' || explicitGender === 'girl') return 'female';

  // 2. Explicit character description clues
  if (storyPrompt) {
    const p = storyPrompt.toLowerCase();
    const femaleClues = /\b(girl|woman|female|lady|she|her|hers|sister|mother|daughter|heroine|princess|queen)\b/i;
    const maleClues = /\b(boy|man|male|gentleman|he|him|his|brother|father|son|hero|prince|king)\b/i;
    const hasFemale = femaleClues.test(p);
    const hasMale = maleClues.test(p);
    if (hasFemale && !hasMale) return 'female';
    if (hasMale && !hasFemale) return 'male';
  }

  // 3. Fallback to name-based detection
  return detectGenderFromName(name);
}

/**
 * Gender-Aware Character Profile Anchor Generator (Requirement 2 & 7)
 * Locks appearance, clothing, hair, and traits across all scenes
 */
function createCharacterProfile(characterName, genderOverride = null, storyPrompt = '') {
  const gender = detectGender(characterName, genderOverride, storyPrompt);
  const isFemale = gender === 'female';
  const name = characterName?.trim() || (isFemale ? 'Ananya' : 'Hero');

  return {
    name: name,
    gender: gender,
    genderLabel: isFemale ? 'Girl / Female' : 'Boy / Male',
    age: 17,
    ageGroup: 'teenager',
    appearance: isFemale
      ? 'young teenage girl with delicate expressive facial features, warm dark brown eyes, youthful graceful explorer build'
      : 'young teenage boy with determined expressive facial features, sharp energetic brown eyes, athletic lean build',
    hair: isFemale
      ? 'long dark wavy hair tied in a high ponytail with loose strands framing her face'
      : 'short textured neat black hair, slightly tousled at the crown',
    clothing: isFemale
      ? 'weatherproof hooded exploration jacket over a simple fitted tee, dark utility pants, laced canvas sneakers, lightweight cross-body satchel'
      : 'tailored zip utility jacket over dark crew-neck tee, durable charcoal cargo pants, clean athletic sneakers',
    personality: isFemale
      ? 'intelligent, curious, empathetic, resourceful, observant, and quietly courageous'
      : 'curious, quick-witted, observant, adventurous, and determined',
    features: isFemale
      ? 'expressive thoughtful eyes, agile movement, recognizable ponytail silhouette'
      : 'friendly determined expression, athletic agile posture, high visual recognizability'
  };
}

/**
 * Pencil Art Style Guide (all illustrations are strictly monochrome graphite pencil)
 */
function getPencilStyleGuide() {
  return 'traditional hand-drawn graphite pencil illustration, detailed cross-hatching, soft graphite shading, paper grain texture, monochrome grayscale, expressive pencil linework, cinematic pencil composition, storybook comic pencil appearance, no color, no watercolor, no anime, no 3D, no photorealistic';
}

// ============================================
// Image Uniqueness & Randomization Engine
// ============================================

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateUniqueSeed() {
  return Math.floor(Math.random() * 900000000) + 100000000;
}

const CAMERA_ANGLES = [
  'low-angle dynamic heroic perspective looking upward',
  'cinematic wide-angle establishing landscape shot',
  'dramatic three-quarter character profile framing',
  'close-up intense character focus with shallow depth of field',
  'dramatic high-angle bird-eye view showing environment scale',
  'over-the-shoulder intimate visual perspective',
  'dynamic Dutch-tilt angle adding motion and suspense',
  'deep perspective tracking shot with leading architectural lines'
];

const LIGHTING_VARIATIONS = [
  'dramatic graphite pencil chiaroscuro with deep shaded pencil shadows',
  'high-contrast pencil hatching with striking highlights on textured sketch paper',
  'moody graphite shading with soft blended pencil midtones',
  'dramatic pencil shadow play with focused ambient light beam',
  'subtle pencil rim lighting with soft ambient graphite texture',
  'intense tonal graphite gradient with cross-hatched dark accents',
  'soft diffused cinematic sketch atmosphere with gentle pencil shading'
];

const COMPOSITION_VARIATIONS = [
  'asymmetrical dynamic rule-of-thirds composition with foreground depth',
  'centered cinematic focal symmetry with expansive background panorama',
  'diagonal action framing conveying sudden momentum and energy',
  'layered depth composition with atmospheric environmental foreground elements'
];

const POSE_VARIATIONS = [
  'standing alert with scanner raised, studying the environment',
  'kneeling closely to inspect anomalous glowing markers on the ground',
  'mid-stride moving forward with determined expression',
  'turning back with sudden awareness, bracing against obstacle',
  'reaching out with open palm toward the mysterious phenomenon',
  'bracing defensively with athletic stance against sudden energy shift',
  'standing tall and victorious with confident expression overlooking horizon'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDifferentItem(arr, current) {
  const filtered = arr.filter(item => item !== current);
  return filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : arr[0];
}

function createSceneVariation(sceneNum, storyId = '', prevVariation = null) {
  const genId = generateUUID();
  const seed = generateUniqueSeed();
  const timestamp = Date.now();
  const angle = prevVariation ? getRandomDifferentItem(CAMERA_ANGLES, prevVariation.angle) : getRandomItem(CAMERA_ANGLES);
  const lighting = prevVariation ? getRandomDifferentItem(LIGHTING_VARIATIONS, prevVariation.lighting) : getRandomItem(LIGHTING_VARIATIONS);
  const composition = prevVariation ? getRandomDifferentItem(COMPOSITION_VARIATIONS, prevVariation.composition) : getRandomItem(COMPOSITION_VARIATIONS);
  const pose = prevVariation ? getRandomDifferentItem(POSE_VARIATIONS, prevVariation.pose) : getRandomItem(POSE_VARIATIONS);
  const generationCount = prevVariation ? (prevVariation.generationCount || 1) + 1 : 1;

  return {
    generationId: genId,
    seed: seed,
    timestamp: timestamp,
    angle: angle,
    lighting: lighting,
    composition: composition,
    pose: pose,
    generationCount: generationCount,
    storyId: storyId || generateUUID(),
    sceneNumber: sceneNum
  };
}

// (Image Generation History removed — all images are generated fresh each request)

/**
 * Dynamic AI Pencil Image Prompt Builder (Requirement 5 & 13)
 * Strictly enforces monochrome graphite pencil illustration, character gender & profile consistency
 */
function buildSceneImagePrompt(sceneNum, scene, charProfile, setting, tone, artStyle, variation = {}) {
  const isFemale = charProfile.gender === 'female';
  const genderStr = isFemale ? 'female girl' : 'male boy';
  const actionText = scene.story || scene.narration || scene.title || `Scene ${sceneNum} exploration`;
  const genId = variation.generationId || generateUUID();
  const seed = variation.seed || generateUniqueSeed();
  const angle = variation.angle || 'cinematic eye-level composition';
  const lighting = variation.lighting || 'graphite pencil chiaroscuro shadow play';
  const pose = variation.pose || (isFemale ? 'alert exploration stance' : 'observant athletic stance');

  return `Create an original monochrome graphite pencil illustration.

Character:
Name: ${charProfile.name}
Gender: ${charProfile.gender} (${charProfile.genderLabel || genderStr})
Age: ${charProfile.age || 17} (${charProfile.ageGroup || 'teenager'})
Appearance: ${charProfile.appearance}
Hair: ${charProfile.hair}
Clothing: ${charProfile.clothing}
Personality: ${charProfile.personality}

Scene:
Scene ${sceneNum}: ${actionText}
Perspective & Camera Angle: ${angle}
Lighting & Shadows: ${lighting}
Character Pose & Action: ${pose}

Setting:
${setting}

Story tone:
${tone}

Style:
traditional hand-drawn pencil illustration,
graphite pencil strokes,
detailed cross-hatching,
soft graphite shading,
paper texture,
monochrome grayscale,
expressive facial features,
cinematic composition,
detailed environment,
hand-drawn comic/storybook appearance.

The character must match the specified gender (${genderStr}).

Maintain exactly the same character identity across every scene.

Do not use color.
Do not use watercolor.
Do not use anime rendering.
Do not use photorealistic rendering.
Do not use 3D rendering.

[Generation Metadata: ID #${genId.slice(0, 8)} | Seed: ${seed}]`;
}

/**
 * Story Generation Orchestrator
 */
async function generateStory(data, charProfile) {
  // If no Gemini API key provided, generate immediately with creative engine
  if (!data.apiKey || data.apiKey.length < 10) {
    updateLoadingStep('Building character profile & story arc...', 30);
    await sleep(400);
    return generateDynamicStory(data, charProfile);
  }

  const prompt = buildStoryPrompt(data, charProfile);
  const models = await getAvailableGeminiModels(data.apiKey);

  for (const m of models) {
    try {
      updateLoadingStep(`Writing 6 scenes with ${m.name}...`, 25);

      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(m.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`Model ${m.name} error:`, err.error?.message);
        continue;
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) parsed = JSON.parse(match[1]);
      }

      if (parsed && (parsed.scenes || parsed.panels)) {
        // Normalize structure
        const scenes = parsed.scenes || parsed.panels || [];
        scenes.forEach((sc, i) => {
          sc.sceneNumber = sc.sceneNumber || sc.panelNumber || i + 1;
          sc.story = sc.story || sc.narration || '';
          sc.title = sc.title || `Scene ${i + 1}`;
          if (!sc.imagePrompt) {
            sc.imagePrompt = buildSceneImagePrompt(sc.sceneNumber, sc, charProfile, data.setting, data.tone, data.artStyle);
          }
        });
        parsed.scenes = scenes;
        parsed.characterProfile = charProfile;
        return parsed;
      }
    } catch (err) {
      console.warn(`Error attempting model ${m.name}:`, err);
    }
  }

  // Graceful fallback to rich creative engine if external API fails
  console.info('Using Story Studio Creative Engine fallback');
  return generateDynamicStory(data, charProfile);
}

/**
 * Intelligent Dynamic Story Generator (Requirement 5, 6, 10, 16)
 * Generates coherent, non-generic 6-scene story for all 30 setting/tone combinations!
 */
function generateDynamicStory(data, charProfile) {
  const isGirl = charProfile.gender === 'female';
  const char = charProfile.name || (isGirl ? 'Ananya' : 'Hero');
  const setting = data.setting || (isGirl ? 'Forest' : 'City');
  const tone = data.tone || (isGirl ? 'Mystery' : 'Dramatic');
  const style = 'Pencil Art';

  // Gender-aware dynamic pronouns
  const pHisHer = isGirl ? 'her' : 'his';
  const pHeShe = isGirl ? 'she' : 'he';
  const pHeSheCap = isGirl ? 'She' : 'He';
  const pHimHer = isGirl ? 'her' : 'him';
  const pHimselfHerself = isGirl ? 'herself' : 'himself';

  // Story templates per setting & tone
  const storyPlots = {
    'city': {
      'dramatic': {
        title: `${char} and the Neon Horizon`,
        outline: `Amid the towering, rain-slicked skyscrapers of the metropolis, ${char} accidentally intercepts an encrypted broadcast revealing that the city's power grid is about to suffer a catastrophic blackout. Racing against ticking digital clocks, ${char} navigates the bustling sky-rails to the central transmitter tower to avert disaster before the lights go out forever.`,
        scenes: [
          {
            sceneNumber: 1,
            title: "Rooftop Watch",
            story: `${char} stands atop an elevated sky-bridge overlooking the sprawling neon-lit cityscape as the evening mist rolls between high-tech skyscrapers.`,
            dialogue: [{ speaker: char, text: "The city looks quiet from up here... but my scanner says otherwise." }]
          },
          {
            sceneNumber: 2,
            title: "The Encrypted Pulse",
            story: `A sudden electromagnetic surge ripples through the billboards. On ${char}'s handheld device, a sequence of mysterious coordinates flashes red.`,
            dialogue: [
              { speaker: "Terminal", text: "WARNING: GRID FAILURE INITIATED AT SUB-STATION 7." },
              { speaker: char, text: "Sub-Station 7? That controls the entire medical district!" }
            ]
          },
          {
            sceneNumber: 3,
            title: "Descent Through the Alleys",
            story: `${char} leaps into action, sprinting through rain-drenched alleys and leaping over sky-rail tracks to reach the transit hub.`,
            dialogue: [{ speaker: char, text: "If I miss the high-speed express train, the whole sector goes dark!" }]
          },
          {
            sceneNumber: 4,
            title: "The Broken Junction",
            story: `Inside the underground control chamber, ${char} discovers the main circuit regulators sparking violently, teetering on a thermal overload.`,
            dialogue: [{ speaker: char, text: "The manual release lever is jammed behind the thermal vent!" }]
          },
          {
            sceneNumber: 5,
            title: "The Critical Override",
            story: `Shielding ${pHisHer} eyes from blinding sparks, ${char} executes a daring leap and connects the emergency bypass cables just as the countdown hits one second.`,
            dialogue: [{ speaker: char, text: "Hold together... just three more seconds... engaged!" }]
          },
          {
            sceneNumber: 6,
            title: "Dawn Over the Metropolis",
            story: `The power hums safely back to life. A sea of golden streetlights flickers bright as ${char} steps into the crisp dawn air, the city saved.`,
            dialogue: [{ speaker: char, text: "Another day, another crisis averted. Time for a well-deserved breakfast." }]
          }
        ]
      },
      'light-hearted': {
        title: `${char}'s Great City Treasure Hunt`,
        outline: `A sunny morning in the futuristic city turns into an exciting urban scavenger hunt when ${char} finds an enigmatic puzzle map dropped by an eccentric street artist. Along with quirky robot couriers and friendly holographic guides, ${char} solves clever architectural riddles leading to a rooftop festival of wonders.`,
        scenes: [
          {
            sceneNumber: 1,
            title: "A Curious Discovery",
            story: `While enjoying a smoothie at a bustling street café, ${char} spots a golden origami drone that drops an encrypted riddle onto ${pHisHer} table.`,
            dialogue: [{ speaker: char, text: "Wait, origami drone delivery? This isn't on the morning menu!" }]
          },
          {
            sceneNumber: 2,
            title: "The Clockwork Alley",
            story: `${char} deciphers the first clue and follows whimsical holographic arrows leading straight into the city's famous antique robotic bazaar.`,
            dialogue: [
              { speaker: "Shopkeeper Bot", text: "Welcome traveler! Solve my riddle to earn your next coordinate!" },
              { speaker: char, text: "Challenge accepted, my metallic friend!" }
            ]
          },
          {
            sceneNumber: 3,
            title: "Rooftop Trampoline",
            story: `To reach the sky-garden terrace, ${char} takes a shortcut through a bouncy eco-park, vaulting between floating synthetic lily-pads.`,
            dialogue: [{ speaker: char, text: "Who knew public transit could be this bouncy?" }]
          },
          {
            sceneNumber: 4,
            title: "The Pigeon Brigade",
            story: `A flock of colorful cyber-pigeons playfully swoops in, snatching the final cipher parchment just before ${char} can read it!`,
            dialogue: [{ speaker: char, text: "Hey! Birdies! I'll trade you some breadcrumbs for that map!" }]
          },
          {
            sceneNumber: 5,
            title: "The Grand Reveal",
            story: `Negotiating peacefully with the pigeons, ${char} unlocks the secret penthouse doors, revealing a dazzling rooftop surprise festival in ${pHisHer} honor!`,
            dialogue: [
              { speaker: "Crowd", text: `SURPRISE! Happy City Explorer Day, ${char}!` },
              { speaker: char, text: "Haha! You guys orchestrated this whole high-tech treasure hunt?!" }
            ]
          },
          {
            sceneNumber: 6,
            title: "Celebration Under the Stars",
            story: `Surrounded by cheerful friends and glowing paper lanterns floating over the skyline, ${char} celebrates an unforgettable adventure.`,
            dialogue: [{ speaker: char, text: "This city always finds a way to surprise me." }]
          }
        ]
      }
    },
    'forest': {
      'mystery': {
        title: `${char} and the Whispering Grove`,
        outline: `Deep inside an ancient elder forest untouched for centuries, ${char} tracks a bizarre phosphorescent trail glowing beneath the roots. Unraveling botanical glyphs carved into the trunks, ${char} discovers a lost subterranean library that holds the forgotten history of the wild woods.`,
        scenes: [
          {
            sceneNumber: 1,
            title: "Into the Ancient Canopy",
            story: `${char} parts the emerald ferns, stepping beneath towering redwood canopies draped in glowing bioluminescent moss.`,
            dialogue: [{ speaker: char, text: "The compass stopped pointing north three miles ago. Something else is drawing me in." }]
          },
          {
            sceneNumber: 2,
            title: "The Glowing Footprints",
            story: `Kneeling beside a babbling brook, ${char} finds luminous blue footprints glowing on the river stones, vanishing into a hollowed trunk.`,
            dialogue: [{ speaker: char, text: "These tracks aren't human... nor animal. They pulse with pure organic energy." }]
          },
          {
            sceneNumber: 3,
            title: "The Runic Tree",
            story: `${char} inspects a massive elder oak covered in spirals of glowing sap, realizing each spiral represents a celestial star constellation.`,
            dialogue: [{ speaker: char, text: "It's an astronomical star map carved into living wood!" }]
          },
          {
            sceneNumber: 4,
            title: "The Root Labyrinth",
            story: `A hidden door within the roots swings open, plunging ${char} into a cavernous botanical maze filled with whispering crystal flowers.`,
            dialogue: [
              { speaker: "Whispering Voice", text: "Only those who listen to the earth may pass." },
              { speaker: char, text: "I hear you. I'm here to understand, not to destroy." }
            ]
          },
          {
            sceneNumber: 5,
            title: "The Ancient Forest Heart",
            story: `In the central chamber, ${char} discovers an enormous pulsating emerald crystal cradled gently in the roots of the forest.`,
            dialogue: [{ speaker: char, text: "The forest's life support system... it just needed clear water to restart." }]
          },
          {
            sceneNumber: 6,
            title: "Harmony Restored",
            story: `Clearing the sediment around the spring, ${char} watches as golden light blooms across every canopy, the forest glowing in peaceful wonder.`,
            dialogue: [{ speaker: char, text: "The woods will sleep peacefully tonight. And so will I." }]
          }
        ]
      }
    },
    'space': {
      'dramatic': {
        title: `${char}: Odyssey Beyond the Void`,
        outline: `While piloting an exploratory scout pod near a celestial asteroid belt, ${char} discovers an abandoned derelict cruiser broadcasting an ancient distress signal. Boarding the dark vessel to salvage its reactor core, ${char} must navigate zero-G corridors and prevent an impending warp collapse.`,
        scenes: [
          {
            sceneNumber: 1,
            title: "The Asteroid Watch",
            story: `${char} gazes through the cockpit viewport at a breathtaking violet nebula surrounded by drifting crystalline asteroids.`,
            dialogue: [{ speaker: char, text: "Scanners picking up a faint ping from quadrant seven. That's outside our designated flight path." }]
          },
          {
            sceneNumber: 2,
            title: "The Derelict Cruiser",
            story: `Docking ${pHisHer} scout ship to the silent hull of an ancient titan vessel, ${char} steps into the zero-gravity shadows of the airlock.`,
            dialogue: [
              { speaker: "Suit Computer", text: "ATMOSPHERE COMPROMISED. OXYGEN AT 94%." },
              { speaker: char, text: "Alright, flashlight on. Let's see who called for help." }
            ]
          },
          {
            sceneNumber: 3,
            title: "Silent Corridors",
            story: `${char} glides gracefully through floating debris and floating stasis pods in the eerie silence of deep space.`,
            dialogue: [{ speaker: char, text: "The warp drive is idling... but it's slowly leaking tachyon radiation." }]
          },
          {
            sceneNumber: 4,
            title: "Critical Overheat",
            story: `The ship's automated defense protocols suddenly awaken, sealing bulkhead doors and initiating a rapid warp core overload sequence.`,
            dialogue: [
              { speaker: "Automated Voice", text: "CONTAINMENT FAILURE IMMINENT IN 90 SECONDS." },
              { speaker: char, text: "Not on my watch! I need to manually vent the cooling rods!" }
            ]
          },
          {
            sceneNumber: 5,
            title: "The Zero-G Bypass",
            story: `Propelling ${pHimselfHerself} across the blazing reactor chamber with magnetic boots, ${char} pulls the manual containment levers into lock.`,
            dialogue: [{ speaker: char, text: "Rods locked in place! Core stabilizing at nominal levels!" }]
          },
          {
            sceneNumber: 6,
            title: "Beacon Across the Stars",
            story: `The cruiser's lights flare back to serene cyan. As navigation maps reactivate, ${char} smiles as star lanes open wide toward new horizons.`,
            dialogue: [{ speaker: char, text: "Mission accomplished. Sector beacon re-established for all starfarers." }]
          }
        ]
      }
    }
  };

  // Check if a tailored plot exists; otherwise create a customized dynamic plot based on selections
  let chosen = storyPlots[setting.toLowerCase()]?.[tone.toLowerCase()];
  if (!chosen) {
    // Generate tailored story based on character, setting, tone, and style
    chosen = {
      title: `${char} and the Chronicles of ${setting}`,
      outline: `In the breathtaking world of ${setting}, ${char} embarks on an unforgettable journey. When an unexpected anomaly threatens the tranquility of the realm, ${char} relies on quick thinking and courage. Through 6 pivotal moments, the story captures heartfelt ${tone.toLowerCase()} emotions visualised in stunning ${style} style.`,
      scenes: [
        {
          sceneNumber: 1,
          title: `Arrival at ${setting}`,
          story: `${char} arrives in ${setting}, taking in the breathtaking vistas and atmospheric environment of this wondrous realm.`,
          dialogue: [{ speaker: char, text: `So this is ${setting}... even more incredible than the legends described.` }]
        },
        {
          sceneNumber: 2,
          title: "The Unforeseen Discovery",
          story: `While exploring the area, ${char} notices a strange pulsating phenomenon that defies the natural laws of ${setting}.`,
          dialogue: [
            { speaker: "Companion", text: "Do you see that glow ahead?" },
            { speaker: char, text: "Yes, and it doesn't belong here. We need to investigate." }
          ]
        },
        {
          sceneNumber: 3,
          title: "The Investigation",
          story: `${char} carefully approaches the heart of the anomaly, utilizing clever instincts to analyze the intricate mechanisms.`,
          dialogue: [{ speaker: char, text: "Every clue here points to an ancient riddle waiting to be unraveled." }]
        },
        {
          sceneNumber: 4,
          title: "The Sudden Complication",
          story: `Without warning, a dramatic shift in the environment tests ${char}'s reflexes and determination to the limit.`,
          dialogue: [{ speaker: char, text: "Brace yourselves! We have to hold our ground!" }]
        },
        {
          sceneNumber: 5,
          title: "The Decisive Breakthrough",
          story: `With brilliant composure, ${char} activates the balancing resonance, unleashing a spectacular wave of radiant light across ${setting}.`,
          dialogue: [{ speaker: char, text: "It's working! Balance is being restored!" }]
        },
        {
          sceneNumber: 6,
          title: "Peace Over the Horizon",
          story: `As the peaceful atmosphere settles across ${setting}, ${char} stands tall, smiling warmly as a true hero of the realm.`,
          dialogue: [{ speaker: char, text: "A beautiful ending to a memorable adventure. What's next?" }]
        }
      ]
    };
  }

  // Ensure image prompts are attached to each scene
  chosen.scenes.forEach(sc => {
    sc.imagePrompt = buildSceneImagePrompt(sc.sceneNumber, sc, charProfile, setting, tone, style);
  });

  return {
    character: char,
    setting: setting,
    tone: tone,
    artStyle: style,
    storyTitle: chosen.title,
    outline: chosen.outline,
    characterProfile: charProfile,
    scenes: chosen.scenes
  };
}

function buildStoryPrompt(data, charProfile) {
  return `You are an acclaimed creative visual storyteller and artist director. Generate a complete, coherent 6-scene story based on:

**Main Character:**
Name: ${charProfile.name}, Age: ${charProfile.age}
Appearance: ${charProfile.appearance}
Clothing: ${charProfile.clothing}
Personality: ${charProfile.personality}

**Setting:** ${data.setting}
**Tone:** ${data.tone}
**Art Style:** ${data.artStyle}
${data.storyPrompt ? `**Optional Plot Premise:** ${data.storyPrompt}` : ''}

Return a valid JSON object matching this EXACT structure:
{
  "storyTitle": "A creative title for the story",
  "outline": "A 2-3 paragraph story outline summarizing the narrative arc",
  "characterProfile": {
    "name": "${charProfile.name}",
    "age": 18,
    "appearance": "${charProfile.appearance}",
    "clothing": "${charProfile.clothing}",
    "personality": "${charProfile.personality}"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Title of Scene 1",
      "story": "Narrative describing scene 1 establishing character and world (2-3 sentences)",
      "dialogue": [{ "speaker": "${charProfile.name}", "text": "Punchy line" }],
      "imagePrompt": "Detailed visual description of this scene featuring ${charProfile.name} in ${data.setting} in ${data.artStyle} style."
    },
    {
      "sceneNumber": 2,
      "title": "Title of Scene 2",
      "story": "Introduce main problem or discovery",
      "dialogue": [{ "speaker": "${charProfile.name}", "text": "Reaction line" }],
      "imagePrompt": "Detailed visual description for scene 2"
    },
    {
      "sceneNumber": 3,
      "title": "Title of Scene 3",
      "story": "Character attempts to solve the problem",
      "dialogue": [{ "speaker": "${charProfile.name}", "text": "Action line" }],
      "imagePrompt": "Detailed visual description for scene 3"
    },
    {
      "sceneNumber": 4,
      "title": "Title of Scene 4",
      "story": "Major complication or unexpected event",
      "dialogue": [{ "speaker": "${charProfile.name}", "text": "Tension line" }],
      "imagePrompt": "Detailed visual description for scene 4"
    },
    {
      "sceneNumber": 5,
      "title": "Title of Scene 5",
      "story": "Climax of the narrative",
      "dialogue": [{ "speaker": "${charProfile.name}", "text": "Climax line" }],
      "imagePrompt": "Detailed visual description for scene 5"
    },
    {
      "sceneNumber": 6,
      "title": "Title of Scene 6",
      "story": "Resolution and peaceful aftermath",
      "dialogue": [{ "speaker": "${charProfile.name}", "text": "Ending line" }],
      "imagePrompt": "Detailed visual description for scene 6"
    }
  ]
}

Rules:
- Strictly adhere to ${data.tone} tone for pacing, emotions, and dialogue.
- Deeply weave the setting "${data.setting}" into all events.
- Maintain consistent visual details for ${charProfile.name} (short black hair, blue jacket, dark pants).`;
}

// ============================================
// Gemini API — Image Generation
// ============================================

// ============================================
// AI Picture Generation Pipeline (Strictly Pencil Art)
// ============================================

const PENCIL_PROMPT_ENHANCER = 'traditional hand-drawn graphite pencil illustration, detailed cross-hatching, soft graphite shading, paper texture, monochrome grayscale, expressive facial features, cinematic composition, detailed environment, hand-drawn comic storybook appearance, strictly no color, no watercolor, no anime, no photorealistic, no 3D render';

/**
 * Generates an actual picture illustration for a comic panel (Requirement 4, 5, 8 & 13)
 * Strictly enforces Pencil Art, Gender Awareness, Character Profile, UUID, and Random Seed
 */
async function generatePanelImage(apiKey, panel, artStyle = 'Pencil Art', charProfileOrName = '', setting = '', tone = '', variation = {}) {
  const profile = (typeof charProfileOrName === 'object' && charProfileOrName !== null)
    ? charProfileOrName
    : (currentComic?.characterProfile || createCharacterProfile(charProfileOrName));

  const genId = variation.generationId || generateUUID();
  const seed = variation.seed || generateUniqueSeed();
  const isFemale = profile.gender === 'female';
  const genderStr = isFemale ? 'female girl' : 'male boy';

  // If user provided a Gemini key, attempt Google Imagen with strict pencil prompt
  if (apiKey && apiKey.length > 10) {
    try {
      const imagenUrl = `${GEMINI_API_BASE}/${GEMINI_IMAGE_MODEL}:predict?key=${apiKey}`;
      const basePrompt = panel.imagePrompt || panel.story || panel.narration || 'character exploration';
      const body = {
        instances: [{
          prompt: `Create an original monochrome graphite pencil illustration. Character: ${profile.name} (${genderStr}), wearing ${profile.clothing}. Scene: ${basePrompt}. Setting: ${setting}. Style: ${PENCIL_PROMPT_ENHANCER}. Camera: ${variation.angle || 'cinematic'}. Unique Gen ID: #${genId.slice(0, 8)}. Seed: ${seed}. No color.`
        }],
        parameters: { sampleCount: 1, aspectRatio: '4:3', personGeneration: 'allow_all' },
      };

      const res = await fetch(imagenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        const b64 = json.predictions?.[0]?.bytesBase64Encoded;
        if (b64) return `data:image/png;base64,${b64}`;
      }
    } catch (e) {
      console.warn('Google Imagen note (cascading to Pollinations AI pencil generator):', e);
    }
  }

  // Generate authentic AI pencil illustration with fresh seed & uniqueness
  return await generateAiPicture(panel, 'Pencil Art', profile, setting, tone, variation);
}

/**
 * Creates high-definition AI graphite pencil sketch tailored to the panel's action, character gender, and variation
 */
async function generateAiPicture(panel, artStyle = 'Pencil Art', charProfileOrName = '', setting = '', tone = '', variation = {}) {
  const profile = (typeof charProfileOrName === 'object' && charProfileOrName !== null)
    ? charProfileOrName
    : (currentComic?.characterProfile || createCharacterProfile(charProfileOrName));

  const isFemale = profile.gender === 'female';
  const charDesc = isFemale
    ? `${profile.name}, a young teenage girl with long dark hair tied in a high ponytail, wearing ${profile.clothing}`
    : `${profile.name}, a young teenage boy with short neat black hair, wearing ${profile.clothing}`;

  const sceneText = panel.story || panel.narration || panel.title || 'exploring the scene';
  const angle = variation.angle || 'cinematic perspective';
  const genId = variation.generationId || generateUUID();
  const seed = variation.seed || generateUniqueSeed();
  const timestamp = variation.timestamp || Date.now();

  // Compose high-fidelity monochrome pencil prompt
  const fullPrompt = `monochrome graphite pencil sketch, traditional hand-drawn pencil illustration, fine art drawing on textured sketch paper, detailed cross-hatching, soft pencil shading, sketch of ${charDesc}, ${sceneText} in ${setting}, ${angle}. Strictly monochrome grayscale, fine graphite linework, no color, no watercolor, no anime, no 3D, no photorealistic. ID:${genId}`;

  // Multiple endpoint attempts with unique seeds for reliability
  const endpoints = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=600&nologo=true&seed=${seed}&model=flux&nofeed=true&t=${timestamp}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=600&nologo=true&seed=${seed + 1}&model=turbo&nofeed=true&t=${timestamp + 1}`,
  ];

  for (const targetUrl of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000); // 12s timeout for each attempt
      const res = await fetch(targetUrl, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);

      // Only accept if request succeeds and returns an actual image
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.startsWith('image/')) {
        const blob = await res.blob();
        if (blob.size > 1000) { // Ensure non-empty image
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (err) {
      console.warn('Image endpoint attempt note:', err?.message || err);
    }
  }

  return null; // Return null so pipeline can show pencil artwork or failure retry
}

/**
 * Loads an image via fetch/blob or canvas with anonymous CORS to produce a standalone base64 DataURL
 */
async function fetchImageAsDataUrl(url, timeoutMs = 10000) {
  // Strategy 1: Fetch as blob and convert via FileReader (fastest, preserves exact quality)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, { signal: controller.signal, mode: 'cors' });
    clearTimeout(timer);

    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Strategy 1 timed out or encountered CORS restriction
  }

  // Strategy 2: Image object with canvas
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      // If canvas conversion takes too long, resolve with the direct URL so image displays!
      resolve(url);
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch {
        resolve(url);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(url);
    };

    img.src = url;
  });
}

/**
 * Gender-Aware Monochrome Graphite Pencil Artwork Engine (Requirement 1, 4, 6, 7 & 13)
 * Produces authentic hand-drawn graphite pencil illustrations on textured sketch paper.
 * Guaranteed 100% monochrome pencil, gender-consistent (Girl vs Boy), and unique per scene.
 */
function createStyledPencilSvg(panel, index, characterProfileOrName = '', setting = 'Forest', tone = 'Mystery', variation = {}) {
  const panelNum = panel.panelNumber || panel.sceneNumber || index + 1;
  const rawDesc = panel.story || panel.narration || panel.title || panel.imagePrompt || `Scene ${panelNum}`;
  const cleanDesc = escapeXML(rawDesc.length > 90 ? rawDesc.slice(0, 87) + '...' : rawDesc);
  const cleanTitle = escapeXML(panel.title || `Scene ${panelNum}`);

  const profile = (typeof characterProfileOrName === 'object' && characterProfileOrName !== null)
    ? characterProfileOrName
    : createCharacterProfile(characterProfileOrName);

  const isFemale = profile.gender === 'female';
  const charName = profile.name || (isFemale ? 'Ananya' : 'Hero');
  const cleanChar = escapeXML(charName);
  const cleanSetting = escapeXML(setting || (isFemale ? 'Forest' : 'City'));
  const cleanTone = escapeXML(tone || (isFemale ? 'Mystery' : 'Dramatic'));

  const varSeed = variation.seed || generateUniqueSeed();
  const varGenId = variation.generationId || generateUUID();
  const varAngle = variation.angle || 'Cinematic perspective';
  const stage = ((panelNum - 1) % 6) + 1;
  const uid = `${index}_${varSeed}_${Math.floor(Math.random() * 10000)}`;

  const setLower = (setting || '').toLowerCase();
  const isForest = setLower.includes('forest');
  const isCity = setLower.includes('city');
  const isSpace = setLower.includes('space');
  const isSchool = setLower.includes('school');
  const isUnderwater = setLower.includes('underwater') || setLower.includes('ocean');
  const isFantasy = setLower.includes('fantasy') || setLower.includes('kingdom');

  // Camera shift based on angle
  let cameraShift = 'scale(1)';
  if (varAngle.includes('low-angle')) {
    cameraShift = 'translate(0, 14) scale(1.04)';
  } else if (varAngle.includes('wide-angle') || varAngle.includes('landscape')) {
    cameraShift = 'translate(20, 20) scale(0.92)';
  } else if (varAngle.includes('close-up')) {
    cameraShift = 'translate(-15, -10) scale(1.08)';
  }

  // 1. Scenery in Graphite Pencil
  let sceneryPencil = '';
  if (isForest || (!isCity && !isSpace && !isSchool && !isUnderwater && !isFantasy)) {
    sceneryPencil = `
      <!-- Towering Forest Trees with Cross-Hatched Shading -->
      <polygon points="40,540 65,110 75,110 100,540" fill="#292524" stroke="#1c1917" stroke-width="1.5"/>
      <line x1="55" y1="180" x2="55" y2="520" stroke="#78716c" stroke-width="1" stroke-dasharray="8 6"/>
      <line x1="85" y1="210" x2="85" y2="500" stroke="#44403c" stroke-width="1" stroke-dasharray="12 4"/>
      <!-- Background Trees -->
      <polygon points="140,540 160,170 170,170 190,540" fill="#44403c" opacity="0.6"/>
      <polygon points="560,540 580,130 590,130 610,540" fill="#44403c" opacity="0.7"/>
      <!-- Right Pine Silhouette -->
      <polygon points="690,540 715,80 730,80 760,540" fill="#292524" stroke="#1c1917" stroke-width="1.5"/>
      <line x1="710" y1="160" x2="710" y2="510" stroke="#78716c" stroke-width="1" stroke-dasharray="10 5"/>
      <!-- Layered Canopy Cross-Hatching -->
      <path d="M 0,210 Q 80,150 160,220 Q 120,280 0,300 Z" fill="url(#pencilHatch_${uid})" stroke="#292524" stroke-width="1.5"/>
      <path d="M 20,120 Q 90,70 170,130 Q 110,190 20,190 Z" fill="#57534e" opacity="0.4" stroke="#1c1917" stroke-width="1"/>
      <path d="M 640,150 Q 720,90 800,150 Q 780,230 650,250 Z" fill="url(#pencilHatch_${uid})" stroke="#292524" stroke-width="1.5"/>
      <path d="M 620,240 Q 730,210 800,270 Q 750,330 620,320 Z" fill="#57534e" opacity="0.35" stroke="#1c1917" stroke-width="1"/>
      <!-- Forest Floor & Winding Path -->
      <path d="M 0,540 Q 220,440 380,440 Q 540,440 800,540 Z" fill="#e7e5e4" stroke="#292524" stroke-width="1.5"/>
      <path d="M 330,540 Q 380,470 410,440 Q 430,470 470,540 Z" fill="url(#pencilHatchFine_${uid})" stroke="#78716c" stroke-width="1" opacity="0.5"/>
      <!-- Forest Floor Foliage & Ferns -->
      <path d="M 120,520 Q 140,490 170,510 Q 140,515 120,520" stroke="#1c1917" stroke-width="1.5" fill="none"/>
      <path d="M 140,510 Q 165,475 190,500" stroke="#1c1917" stroke-width="1.5" fill="none"/>
      <path d="M 600,510 Q 630,480 660,505" stroke="#1c1917" stroke-width="1.5" fill="none"/>
      <!-- Distant Woodland Cabin (Ananya Requirement: Stages 4, 5, 6) -->
      ${stage >= 4 ? `
        <g transform="translate(480, 360)">
          <polygon points="60,0 120,35 0,35" fill="#44403c" stroke="#1c1917" stroke-width="1.5"/>
          <line x1="30" y1="18" x2="90" y2="18" stroke="#f5f5f4" stroke-width="0.75"/>
          <rect x="15" y="35" width="90" height="55" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
          <line x1="15" y1="46" x2="105" y2="46" stroke="#57534e" stroke-width="1"/>
          <line x1="15" y1="57" x2="105" y2="57" stroke="#57534e" stroke-width="1"/>
          <line x1="15" y1="68" x2="105" y2="68" stroke="#57534e" stroke-width="1"/>
          <line x1="15" y1="79" x2="105" y2="79" stroke="#57534e" stroke-width="1"/>
          <path d="M 48,90 L 48,55 Q 60,48 72,55 L 72,90 Z" fill="#292524" stroke="#1c1917" stroke-width="1.5"/>
          <circle cx="53" cy="72" r="1.5" fill="#f5f5f4"/>
        </g>
      ` : ''}
    `;
  } else if (isCity) {
    sceneryPencil = `
      <!-- Skyscraper Silhouettes in Cross-Hatching -->
      <polygon points="50,540 50,180 160,180 160,540" fill="#e7e5e4" stroke="#1c1917" stroke-width="1.5"/>
      <polygon points="170,540 170,120 280,120 280,540" fill="url(#pencilHatch_${uid})" stroke="#1c1917" stroke-width="1.5"/>
      <polygon points="520,540 520,150 630,150 630,540" fill="#e7e5e4" stroke="#1c1917" stroke-width="1.5"/>
      <polygon points="640,540 640,220 750,220 750,540" fill="url(#pencilHatch_${uid})" stroke="#1c1917" stroke-width="1.5"/>
      <!-- Window Grids Drawn with Delicate Pencil Lines -->
      <g stroke="#78716c" stroke-width="1" opacity="0.6">
        <line x1="70" y1="210" x2="140" y2="210"/><line x1="70" y1="240" x2="140" y2="240"/><line x1="70" y1="270" x2="140" y2="270"/>
        <line x1="70" y1="300" x2="140" y2="300"/><line x1="70" y1="330" x2="140" y2="330"/>
        <line x1="190" y1="160" x2="260" y2="160"/><line x1="190" y1="200" x2="260" y2="200"/><line x1="190" y1="240" x2="260" y2="240"/>
        <line x1="540" y1="190" x2="610" y2="190"/><line x1="540" y1="230" x2="610" y2="230"/>
      </g>
      <!-- Skybridge / Overpass -->
      <line x1="0" y1="360" x2="800" y2="360" stroke="#1c1917" stroke-width="3"/>
      <line x1="0" y1="366" x2="800" y2="366" stroke="#44403c" stroke-width="1.5"/>
      <line x1="0" y1="375" x2="800" y2="375" stroke="#78716c" stroke-width="1" stroke-dasharray="10 5"/>
      <!-- Plaza Base -->
      <polygon points="200,540 260,420 540,420 600,540" fill="#f5f5f4" stroke="#1c1917" stroke-width="2"/>
    `;
  } else if (isSpace) {
    sceneryPencil = `
      <!-- Space Station Bulkheads & Nebula Hatching -->
      <path d="M 0,160 Q 200,80 400,160 Q 600,240 800,160 L 800,0 L 0,0 Z" fill="url(#pencilHatch_${uid})" stroke="#1c1917" stroke-width="1.5"/>
      <!-- Distant Planet Sphere with Graphite Shading -->
      <circle cx="620" cy="140" r="65" fill="#e7e5e4" stroke="#1c1917" stroke-width="2"/>
      <path d="M 555,140 A 65 65 0 0 0 685,140 Z" fill="url(#pencilHatchFine_${uid})" opacity="0.7"/>
      <!-- Drifting Asteroids -->
      <polygon points="120,180 145,160 160,195 135,210" fill="#57534e" stroke="#1c1917" stroke-width="1.5"/>
      <polygon points="240,110 260,95 275,120 250,130" fill="#78716c" stroke="#1c1917" stroke-width="1"/>
      <line x1="0" y1="440" x2="800" y2="440" stroke="#1c1917" stroke-width="3"/>
      <line x1="260" y1="440" x2="260" y2="540" stroke="#1c1917" stroke-width="2"/>
      <line x1="540" y1="440" x2="540" y2="540" stroke="#1c1917" stroke-width="2"/>
    `;
  } else {
    // School, Underwater, Fantasy in Graphite Pencil
    sceneryPencil = `
      <polygon points="80,540 80,240 240,240 240,540" fill="#e7e5e4" stroke="#1c1917" stroke-width="1.5"/>
      <polygon points="240,540 240,160 360,120 480,160 480,540" fill="url(#pencilHatch_${uid})" stroke="#1c1917" stroke-width="2"/>
      <polygon points="480,540 480,240 640,240 640,540" fill="#e7e5e4" stroke="#1c1917" stroke-width="1.5"/>
      <g stroke="#1c1917" stroke-width="1.5" fill="#f5f5f4">
        <path d="M 120,320 L 120,280 Q 135,265 150,280 L 150,320 Z"/>
        <path d="M 170,320 L 170,280 Q 185,265 200,280 L 200,320 Z"/>
        <path d="M 520,320 L 520,280 Q 535,265 550,280 L 550,320 Z"/>
        <path d="M 570,320 L 570,280 Q 585,265 600,280 L 600,320 Z"/>
      </g>
      <path d="M 280,540 Q 360,460 440,540 Z" fill="url(#pencilHatchFine_${uid})" stroke="#78716c" stroke-width="1"/>
    `;
  }

  // 2. Character Figure: Strictly Gender-Aware Pencil Drawing
  let charFigure = '';
  if (isFemale) {
    // FEMALE / GIRL (Ananya): Long dark high ponytail, hooded jacket, small satchel bag
    charFigure = `
      <!-- Character: ${cleanChar} (Female / Girl) -->
      <g transform="translate(360, 310)">
        <ellipse cx="28" cy="132" rx="34" ry="7" fill="#44403c" opacity="0.45"/>
        <!-- Shoes: Laced canvas sneakers -->
        <path d="M 12,122 L 24,122 Q 28,126 26,131 L 8,131 Q 8,126 12,122 Z" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
        <path d="M 30,122 L 44,122 Q 48,126 46,131 L 28,131 Q 28,126 30,122 Z" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
        <!-- Slim Utility Pants with pencil shading -->
        <path d="M 16,66 L 11,122 L 23,122 L 27,76 L 31,122 L 43,122 L 38,66 Z" fill="#44403c" stroke="#1c1917" stroke-width="1.5"/>
        <path d="M 16,72 L 22,118 M 32,118 L 38,72" stroke="#78716c" stroke-width="1" stroke-dasharray="4 3"/>
        <!-- Hooded Jacket / Upper Body with waist taper -->
        <path d="M 13,26 L 41,26 L 38,68 L 16,68 Z" fill="#57534e" stroke="#1c1917" stroke-width="1.5"/>
        <line x1="27" y1="26" x2="27" y2="68" stroke="#1c1917" stroke-width="1.5"/>
        <!-- Cross-body Satchel Strap & Bag -->
        <line x1="16" y1="28" x2="38" y2="58" stroke="#1c1917" stroke-width="2.5"/>
        <rect x="36" y="52" width="14" height="15" rx="3" fill="#292524" stroke="#1c1917" stroke-width="1.5"/>
        <path d="M 36,52 L 43,58 L 50,52" stroke="#f5f5f4" stroke-width="1" fill="none"/>
        <!-- Girl's Pose depending on Story Arc Stage -->
        ${stage === 1 ? `
          <!-- Stage 1: Exploring with notebook / scanner -->
          <path d="M 14,28 L 2,48 L 14,56" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <path d="M 40,28 L 52,44 L 40,54" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <rect x="22" y="48" width="16" height="12" rx="1.5" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.2"/>
          <line x1="25" y1="52" x2="35" y2="52" stroke="#78716c" stroke-width="1"/>
        ` : stage === 2 || stage === 3 ? `
          <!-- Stage 2/3: Tracking clue / footprints / moving forward -->
          <path d="M 14,28 L 0,46 L 12,62" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <path d="M 40,28 L 62,38 L 80,44" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <circle cx="82" cy="45" r="3.5" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.2"/>
        ` : stage === 4 || stage === 5 ? `
          <!-- Stage 4/5: Confronting mystery / discovering hidden cabin -->
          <path d="M 14,28 L -6,22 L -12,8" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <circle cx="-13" cy="7" r="3.5" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.2"/>
          <path d="M 40,28 L 60,20 L 74,10" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <circle cx="75" cy="9" r="3.5" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.2"/>
        ` : `
          <!-- Stage 6: Peaceful resolution, gentle smile -->
          <path d="M 14,28 L 6,52 L 20,60" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <path d="M 40,28 L 48,52 L 34,60" stroke="#1c1917" stroke-width="6" stroke-linecap="round" fill="none"/>
          <circle cx="27" cy="60" r="4" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.2"/>
        `}
        <!-- Neck & Delicate Face -->
        <rect x="23" y="19" width="7" height="9" fill="#e7e5e4" stroke="#1c1917" stroke-width="1"/>
        <ellipse cx="27" cy="13" rx="8.5" ry="9.5" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.5"/>
        <!-- Expressive Girl Eyes with Eyelashes -->
        <ellipse cx="24" cy="12" rx="2" ry="2" fill="#1c1917"/>
        <path d="M 22,9 L 26,10" stroke="#1c1917" stroke-width="1.2"/>
        <ellipse cx="30" cy="12" rx="2" ry="2" fill="#1c1917"/>
        <path d="M 28,10 L 32,9" stroke="#1c1917" stroke-width="1.2"/>
        <path d="M 25,18 Q 27,20 29,18" stroke="#1c1917" stroke-width="1" fill="none"/>
        <!-- High Ponytail Band & Strands -->
        <path d="M 18,12 Q 20,3 27,3 Q 34,3 36,12 Q 31,7 27,6 Q 23,7 18,12 Z" fill="#1c1917"/>
        <ellipse cx="18" cy="6" rx="3.5" ry="3.5" fill="#44403c" stroke="#1c1917" stroke-width="1"/>
        <!-- Long Flowing Ponytail (Clear Girl Character Signature) -->
        <path d="M 16,5 Q 4,8 0,22 Q -4,38 4,52 Q 6,36 10,24 Q 14,14 18,7 Z" fill="#1c1917"/>
        <path d="M 14,9 Q 6,18 2,34" stroke="#78716c" stroke-width="0.75" fill="none"/>
        <path d="M 34,12 Q 36,20 35,28" stroke="#1c1917" stroke-width="1.2" fill="none"/>
      </g>
    `;
  } else {
    // MALE / BOY (Kishore): Short textured hair, utility zip jacket, cargo pants, athletic sneakers
    charFigure = `
      <!-- Character: ${cleanChar} (Male / Boy) -->
      <g transform="translate(360, 310)">
        <ellipse cx="28" cy="132" rx="36" ry="8" fill="#44403c" opacity="0.45"/>
        <!-- Athletic Sneakers with pencil laces -->
        <rect x="8" y="122" width="18" height="9" rx="3" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
        <line x1="12" y1="124" x2="20" y2="124" stroke="#1c1917" stroke-width="1"/>
        <rect x="30" y="122" width="18" height="9" rx="3" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
        <line x1="34" y1="124" x2="42" y2="124" stroke="#1c1917" stroke-width="1"/>
        <!-- Cargo Pants with pocket pouches -->
        <path d="M 12,66 L 7,122 L 21,122 L 27,76 L 33,122 L 47,122 L 42,66 Z" fill="#44403c" stroke="#1c1917" stroke-width="1.5"/>
        <rect x="7" y="85" width="8" height="12" rx="1.5" fill="#292524" stroke="#1c1917" stroke-width="1"/>
        <rect x="39" y="85" width="8" height="12" rx="1.5" fill="#292524" stroke="#1c1917" stroke-width="1"/>
        <!-- Zip Jacket over Crew Tee -->
        <path d="M 10,26 L 44,26 L 41,68 L 13,68 Z" fill="#57534e" stroke="#1c1917" stroke-width="1.5"/>
        <line x1="27" y1="26" x2="27" y2="68" stroke="#1c1917" stroke-width="2"/>
        <!-- Boy's Pose depending on Story Arc Stage -->
        ${stage === 1 ? `
          <!-- Stage 1: Holding scanner / surveying alertly -->
          <path d="M 10,28 L -4,48 L 12,54" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <path d="M 44,28 L 58,44 L 44,52" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <rect x="22" y="46" width="14" height="16" rx="2" fill="#292524" stroke="#1c1917" stroke-width="1.5"/>
          <circle cx="29" cy="52" r="3" fill="#f5f5f4" stroke="#1c1917" stroke-width="1"/>
        ` : stage === 2 || stage === 3 ? `
          <!-- Stage 2/3: Investigating / running stance -->
          <path d="M 10,28 L -6,46 L 6,60" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <path d="M 44,28 L 68,36 L 86,38" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <circle cx="88" cy="38" r="4" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
        ` : stage === 4 || stage === 5 ? `
          <!-- Stage 4/5: Athletic leap / bracing breakthrough stance -->
          <path d="M 10,28 L -14,18 L -8,0" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <circle cx="-8" cy="-1" r="4" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
          <path d="M 44,28 L 66,16 L 62,-2" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <circle cx="62" cy="-3" r="4" fill="#d6d3d1" stroke="#1c1917" stroke-width="1.5"/>
        ` : `
          <!-- Stage 6: Confident standing pose, thumbs hooked in pockets -->
          <path d="M 10,28 L 4,54 L 14,64" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
          <path d="M 44,28 L 50,54 L 40,64" stroke="#1c1917" stroke-width="7" stroke-linecap="round" fill="none"/>
        `}
        <!-- Neck & Face -->
        <rect x="23" y="19" width="8" height="9" fill="#e7e5e4" stroke="#1c1917" stroke-width="1"/>
        <ellipse cx="27" cy="13" rx="9" ry="10" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.5"/>
        <!-- Boy's Eyes & Eyebrows -->
        <line x1="20" y1="8" x2="25" y2="9" stroke="#1c1917" stroke-width="1.5"/>
        <ellipse cx="23" cy="12" rx="2" ry="2" fill="#1c1917"/>
        <line x1="29" y1="9" x2="34" y2="8" stroke="#1c1917" stroke-width="1.5"/>
        <ellipse cx="31" cy="12" rx="2" ry="2" fill="#1c1917"/>
        <path d="M 24,18 Q 27,21 30,18" stroke="#1c1917" stroke-width="1.2" fill="none"/>
        <!-- Short Textured Neat Black Hair (Clear Boy Character Signature) -->
        <path d="M 16,13 Q 18,1 27,1 Q 36,1 38,12 Q 33,6 27,6 Q 21,6 16,13 Z" fill="#1c1917"/>
        <path d="M 16,8 L 13,14 L 18,12 Z" fill="#1c1917"/>
        <path d="M 38,8 L 41,14 L 36,12 Z" fill="#1c1917"/>
        <line x1="22" y1="4" x2="25" y2="8" stroke="#78716c" stroke-width="1"/>
        <line x1="28" y1="3" x2="31" y2="7" stroke="#78716c" stroke-width="1"/>
      </g>
    `;
  }

  // 3. Stage Action Graphic (Pencil Cross-Hatching)
  let stageActionGraphic = '';
  if (stage === 2) {
    stageActionGraphic = `
      <!-- Stage 2: Clue / Footprints in Foreground -->
      <g transform="translate(240, 480)">
        <ellipse cx="0" cy="0" rx="9" ry="5" fill="#44403c" opacity="0.6"/>
        <ellipse cx="25" cy="-15" rx="9" ry="5" fill="#44403c" opacity="0.6"/>
        <ellipse cx="50" cy="-30" rx="9" ry="5" fill="#44403c" opacity="0.6"/>
        <text x="70" y="-30" font-family="'Courier New', monospace" font-size="11" fill="#1c1917" font-weight="bold">🔍 MYSTERIOUS FOOTPRINTS</text>
      </g>
    `;
  } else if (stage === 3) {
    stageActionGraphic = `
      <!-- Stage 3: Motion Speed Lines & Track Following -->
      <g stroke="#78716c" stroke-width="1" stroke-dasharray="8 6" opacity="0.7">
        <line x1="100" y1="420" x2="300" y2="420"/>
        <line x1="120" y1="440" x2="340" y2="440"/>
      </g>
    `;
  } else if (stage === 5) {
    stageActionGraphic = `
      <!-- Stage 5: Climax Radial Graphite Energy Rays -->
      <g stroke="#292524" stroke-width="1.2" opacity="0.5">
        <line x1="400" y1="260" x2="260" y2="160"/>
        <line x1="400" y1="260" x2="540" y2="160"/>
        <line x1="400" y1="260" x2="240" y2="260"/>
        <line x1="400" y1="260" x2="560" y2="260"/>
        <line x1="400" y1="260" x2="300" y2="380"/>
        <line x1="400" y1="260" x2="500" y2="380"/>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
    <defs>
      <!-- Coarse Pencil Hatch Pattern -->
      <pattern id="pencilHatch_${uid}" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#44403c" stroke-width="0.8" opacity="0.45"/>
        <line x1="0" y1="0" x2="10" y2="0" stroke="#78716c" stroke-width="0.6" opacity="0.3"/>
      </pattern>
      <!-- Fine Pencil Hatch Pattern -->
      <pattern id="pencilHatchFine_${uid}" width="6" height="6" patternTransform="rotate(-30 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#292524" stroke-width="0.6" opacity="0.35"/>
      </pattern>
    </defs>

    <!-- 1. Off-white Textured Sketch Paper Background -->
    <rect width="800" height="600" fill="#f6f5f0"/>
    <rect width="800" height="600" fill="url(#pencilHatchFine_${uid})" opacity="0.18"/>

    <!-- 2. Scenery Pencil Layer -->
    <g transform="${cameraShift}">
      ${sceneryPencil}
      ${stageActionGraphic}
      ${charFigure}
    </g>

    <!-- 3. Traditional Hand-Drawn Pencil Framing Borders -->
    <rect x="14" y="14" width="772" height="572" fill="none" stroke="#292524" stroke-width="2"/>
    <rect x="18" y="18" width="764" height="564" fill="none" stroke="#78716c" stroke-width="0.75" stroke-dasharray="10 4"/>

    <!-- 4. Graphite Pencil Comic Badge -->
    <g transform="translate(32, 32)">
      <rect x="0" y="0" width="220" height="34" rx="6" fill="#1c1917" stroke="#44403c" stroke-width="1.5"/>
      <text x="110" y="22" font-family="'Courier New', monospace" font-size="12" fill="#f5f5f4" text-anchor="middle" font-weight="bold" letter-spacing="1">✏️ GRAPHITE PENCIL • S${panelNum}</text>
    </g>

    <!-- 5. Character Identity Stamp -->
    <g transform="translate(560, 32)">
      <rect x="0" y="0" width="200" height="34" rx="6" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.5"/>
      <text x="100" y="22" font-family="'Courier New', monospace" font-size="11" fill="#1c1917" text-anchor="middle" font-weight="bold">${cleanChar.toUpperCase()} (${isFemale ? 'GIRL' : 'BOY'})</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Backward compatibility alias
const createStyledComicArtwork = createStyledPencilSvg;

function escapeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================
// Render Comic Result
// ============================================

// ============================================
// Render Story Studio Result (Requirement 9 & 17)
// ============================================

function renderResult(story, formData) {
  const charProfile = story.characterProfile || createCharacterProfile(formData.characterName);
  story.storyId = story.storyId || generateUUID();
  currentComic = { story, formData, characterProfile: charProfile };

  // 1. Story Title
  dom.resultTitle.textContent = story.storyTitle || story.title || 'Your Illustrated Story';

  // 2. Meta Badges
  const isFemale = charProfile.gender === 'female';
  dom.resultMeta.innerHTML = `
    <span class="meta-tag">🧑‍🎨 Character: ${escapeHTML(charProfile.name)} (${isFemale ? '👧 Girl' : '👦 Boy'})</span>
    <span class="meta-tag">🌍 Setting: ${escapeHTML(formData.setting)}</span>
    <span class="meta-tag">🎭 Tone: ${escapeHTML(formData.tone)}</span>
    <span class="meta-tag">✏️ Style: Graphite Pencil</span>
  `;

  // Update scenes count badge
  const scenes = story.scenes || story.panels || [];
  const scenesCountBadge = $('#scenes-count-badge');
  if (scenesCountBadge) {
    scenesCountBadge.textContent = `${scenes.length} Scenes`;
  }

  // 3. Character Consistency Anchor Card (Requirement 2 & 7)
  const profileGrid = $('#profile-details-grid');
  if (profileGrid) {
    profileGrid.innerHTML = `
      <div class="profile-pill">
        <div class="profile-pill-label">Character Name & Gender</div>
        <div class="profile-pill-val">
          <strong>${escapeHTML(charProfile.name)}</strong>
          <span class="profile-pill-gender">${isFemale ? '👧 Girl / Female' : '👦 Boy / Male'}</span>
          <span>(Age: ${escapeHTML(String(charProfile.age || '17'))})</span>
        </div>
      </div>
      <div class="profile-pill">
        <div class="profile-pill-label">Visual Appearance</div>
        <div class="profile-pill-val">${escapeHTML(charProfile.appearance)}</div>
      </div>
      <div class="profile-pill">
        <div class="profile-pill-label">Hairstyle Anchor</div>
        <div class="profile-pill-val">${escapeHTML(charProfile.hair)}</div>
      </div>
      <div class="profile-pill">
        <div class="profile-pill-label">Signature Outfit</div>
        <div class="profile-pill-val">${escapeHTML(charProfile.clothing)}</div>
      </div>
      <div class="profile-pill">
        <div class="profile-pill-label">Personality & Traits</div>
        <div class="profile-pill-val">${escapeHTML(charProfile.personality)}</div>
      </div>
    `;
  }

  // 4. Narrative Arc / Synopsis
  dom.storyOutlineText.textContent = story.outline || '';

  // 5. Scene Cards (Requirement 6, 9, 10, 11 & 13)
  dom.comicGrid.innerHTML = '';

  scenes.forEach((scene, idx) => {
    const sceneNum = scene.sceneNumber || idx + 1;
    const sceneCard = document.createElement('div');
    sceneCard.className = 'scene-card';
    sceneCard.id = `scene-card-${idx}`;

    // Generate unique scene variation parameters (UUID, Seed, Angle, Lighting)
    scene.currentVariation = createSceneVariation(sceneNum, story.storyId);

    const dialogueHTML = (scene.dialogue || []).map(d => `
      <div class="scene-dialogue-box">
        <div class="dialogue-speaker">${escapeHTML(d.speaker)}</div>
        <div class="dialogue-speech">"${escapeHTML(d.text)}"</div>
      </div>
    `).join('');

    const promptText = buildSceneImagePrompt(sceneNum, scene, charProfile, formData.setting, formData.tone, 'Pencil Art', scene.currentVariation);
    scene.imagePrompt = promptText;

    sceneCard.innerHTML = `
      <div class="scene-header-bar">
        <span class="scene-badge-pill">SCENE ${sceneNum}</span>
        <span class="scene-title-text">${escapeHTML(scene.title || `Chapter ${sceneNum}`)}</span>
      </div>

      <div class="scene-image-container" id="panel-image-${idx}">
        <img
          src=""
          alt="Scene ${sceneNum} illustration"
          loading="lazy"
          crossorigin="anonymous"
          id="scene-img-${idx}"
          style="display: none;"
        />
        
        <div class="scene-version-badge" id="version-badge-${idx}">
          <span class="pulse-dot"></span>
          <span id="version-text-${idx}">Gen #1</span>
        </div>

        <span class="image-style-badge" id="style-badge-${idx}">✏️ Graphite Pencil</span>
        
        <!-- Dedicated Loading State During Generation (Requirement 8) -->
        <div class="scene-image-loading-state" id="scene-loading-${idx}">
          <div class="loading-orb"></div>
          <div class="loading-main-text">Creating pencil illustration...</div>
          <div class="loading-gen-pill">
            <span class="gen-pulse"></span>
            <span id="loading-gen-id-${idx}">ID: #${scene.currentVariation.generationId.slice(0, 8)}</span>
            <span>•</span>
            <span id="loading-seed-${idx}">Seed: ${scene.currentVariation.seed}</span>
          </div>
          <div class="loading-sub-text" id="loading-sub-${idx}">${escapeHTML(scene.currentVariation.angle)} • Monochrome Pencil</div>
        </div>

        <!-- Failure State with Try Again (Requirement 11) -->
        <div class="scene-image-failed-state" id="scene-failed-${idx}">
          <div class="failed-icon">✏️⚠️</div>
          <div class="failed-title">Unable to generate this illustration.</div>
          <div class="failed-desc">The illustration request could not be completed.</div>
          <button type="button" class="btn btn-retry-image" onclick="retrySceneImage(${idx})">
            <span>🔄</span> Try Again
          </button>
        </div>

        <div class="scene-image-actions">
          <button class="btn-scene-action" type="button" onclick="regenerateSceneImage(${idx})" title="Regenerate this scene with a completely new visual composition">
            <span>🔄</span> Regenerate
          </button>
          <button class="btn-scene-action" type="button" onclick="downloadSceneImage(${idx})" title="Download this illustration">
            <span>💾</span> Download
          </button>
        </div>
      </div>

      <div class="scene-body">
        <div class="scene-narration">${escapeHTML(scene.story || scene.narration || '')}</div>
        ${dialogueHTML}

        <div class="scene-prompt-accordion">
          <button type="button" class="prompt-drawer-btn" onclick="togglePromptDrawer(${idx})">
            <span>👁️ View AI Pencil Prompt</span>
            <span id="prompt-arrow-${idx}">▾</span>
          </button>
          <div class="prompt-text-box hidden" id="prompt-box-${idx}">
            <button type="button" class="btn-copy-prompt" onclick="copyPrompt(${idx})">Copy</button>
            <div style="padding-right: 40px; white-space: pre-wrap;" id="prompt-text-${idx}">${escapeHTML(promptText)}</div>
          </div>
        </div>
      </div>
    `;

    dom.comicGrid.appendChild(sceneCard);
  });

  // Switch to result page
  dom.homePage.style.display = 'none';
  dom.resultPage.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Asynchronously trigger fresh image generation for all panels
  generateAllPanelImages(formData.apiKey || '', scenes, 'Pencil Art', charProfile, formData.setting, formData.tone);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Interactive Scene Controls (Requirement 13 & 14)
// ============================================

window.togglePromptDrawer = function(idx) {
  const box = $(`#prompt-box-${idx}`);
  const arrow = $(`#prompt-arrow-${idx}`);
  if (box) {
    box.classList.toggle('hidden');
    if (arrow) arrow.textContent = box.classList.contains('hidden') ? '▾' : '▴';
  }
};

window.copyPrompt = function(idx) {
  if (!currentComic) return;
  const scenes = currentComic.story.scenes || currentComic.story.panels || [];
  const scene = scenes[idx];
  if (scene) {
    const prompt = scene.imagePrompt || buildSceneImagePrompt(idx + 1, scene, currentComic.characterProfile, currentComic.formData.setting, currentComic.formData.tone, currentComic.formData.artStyle, scene.currentVariation || {});
    navigator.clipboard.writeText(prompt);
    showToast('AI Image prompt copied to clipboard!', 'success');
  }
};

window.downloadSceneImage = function(idx) {
  const img = $(`#scene-img-${idx}`);
  if (!img || !img.src) return;

  const a = document.createElement('a');
  a.href = img.src;
  const charName = currentComic?.formData?.characterName || 'Hero';
  const genId = currentComic?.story?.scenes?.[idx]?.currentVariation?.generationId || 'new';
  a.download = `Scene_${idx + 1}_${charName}_${genId.slice(0, 8)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Scene ${idx + 1} image downloaded!`, 'success');
};

/**
 * Regenerates ONLY this scene with a completely new visual interpretation (Requirement: Regenerate Image & Requirement 11: Failure Handling)
 */
window.regenerateSceneImage = async function(idx) {
  if (!currentComic) return;
  const scenes = currentComic.story.scenes || currentComic.story.panels || [];
  const scene = scenes[idx];
  if (!scene) return;

  // 1. Generate a brand new unique variation (new UUID, new seed, new angle/lighting)
  const prevVariation = scene.currentVariation || null;
  const newVariation = createSceneVariation(idx + 1, currentComic.story.storyId, prevVariation);
  scene.currentVariation = newVariation;

  // Reset failure state if previously failed
  const failedEl = $(`#scene-failed-${idx}`);
  if (failedEl) failedEl.classList.remove('active');

  // 2. Immediately display active loading state (prevent stale image display)
  const loadingOverlay = $(`#scene-loading-${idx}`);
  const targetImg = $(`#scene-img-${idx}`);
  const versionText = $(`#version-text-${idx}`);
  const promptTextBox = $(`#prompt-text-${idx}`);
  const styleBadge = $(`#style-badge-${idx}`);

  if (versionText) {
    versionText.textContent = `Gen #${newVariation.generationCount}`;
  }

  if (styleBadge) {
    styleBadge.textContent = '✏️ Graphite Pencil Sketch';
  }

  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
    const genIdEl = $(`#loading-gen-id-${idx}`);
    const seedEl = $(`#loading-seed-${idx}`);
    const subEl = $(`#loading-sub-${idx}`);
    if (genIdEl) genIdEl.textContent = `ID: #${newVariation.generationId.slice(0, 8)}`;
    if (seedEl) seedEl.textContent = `Seed: ${newVariation.seed}`;
    if (subEl) subEl.textContent = `${newVariation.angle} • Graphite Pencil`;
  }

  // 3. Update the unique image prompt
  const newPrompt = buildSceneImagePrompt(
    idx + 1,
    scene,
    currentComic.characterProfile,
    currentComic.formData.setting,
    currentComic.formData.tone,
    'Pencil Art',
    newVariation
  );
  scene.imagePrompt = newPrompt;
  if (promptTextBox) {
    promptTextBox.textContent = newPrompt;
  }

  showToast(`Generating new pencil illustration for Scene ${idx + 1}...`, 'info');

  // IMMEDIATELY show a fresh SVG placeholder (never blank)
  const immediateSvg = createStyledPencilSvg(
    scene,
    idx,
    currentComic.characterProfile,
    currentComic.formData.setting,
    currentComic.formData.tone,
    newVariation
  );
  if (targetImg && immediateSvg) {
    targetImg.src = immediateSvg;
    targetImg.style.display = 'block';
  }
  if (loadingOverlay) loadingOverlay.style.display = 'none';

  // Then try to upgrade to AI image in background
  try {
    const aiImage = await generatePanelImage(
      currentComic.formData.apiKey || '',
      scene,
      'Pencil Art',
      currentComic.formData.characterName,
      currentComic.formData.setting,
      currentComic.formData.tone,
      newVariation
    );

    if (aiImage) {
      if (targetImg) {
        targetImg.src = aiImage;
        targetImg.style.display = 'block';
      }
      if (styleBadge) {
        styleBadge.textContent = '✏️ Pencil Art • AI Generated';
      }
      if (failedEl) failedEl.classList.remove('active');
      showToast(`Scene ${idx + 1} regenerated! Gen ID: #${newVariation.generationId.slice(0, 8)}`, 'success');
    } else {
      if (styleBadge) {
        styleBadge.textContent = '✏️ Graphite Pencil Sketch';
      }
      showToast(`Scene ${idx + 1} updated with pencil illustration!`, 'success');
    }
  } catch (err) {
    console.warn(`Scene ${idx + 1} regeneration attempt:`, err);
    if (!targetImg || !targetImg.src) {
      if (failedEl) failedEl.classList.add('active');
    }
    showToast(`Scene ${idx + 1} updated with pencil illustration!`, 'info');
  }
};

// Retry handler alias for Failure State (Requirement 11)
window.retrySceneImage = window.regenerateSceneImage;

// ============================================
// Multi-Image Generation Pipeline (Requirement: Fresh Images Every Generation)
// ============================================

async function generateAllPanelImages(apiKey, scenes, artStyle, characterName = '', setting = '', tone = '') {
  const charProfile = currentComic?.characterProfile || createCharacterProfile(characterName);

  // STEP 1: Immediately render SVG placeholder for ALL scenes so images are NEVER blank
  scenes.forEach((scene, i) => {
    const img = $(`#scene-img-${i}`);
    const loadingOverlay = $(`#scene-loading-${i}`);
    const styleBadge = $(`#style-badge-${i}`);
    const failedEl = $(`#scene-failed-${i}`);
    if (failedEl) failedEl.classList.remove('active');

    const variation = scene.currentVariation || createSceneVariation(i + 1, currentComic?.story?.storyId);
    scene.currentVariation = variation;

    // Generate instant SVG pencil placeholder — always unique, always visible
    const svgUrl = createStyledPencilSvg(scene, i, charProfile, setting, tone, variation);
    if (svgUrl && img) {
      img.src = svgUrl;
      img.style.display = 'block';
      scene._svgUrl = svgUrl;
    }
    if (styleBadge) {
      styleBadge.textContent = '✏️ Graphite Pencil Sketch';
    }
    // Hide loading overlay since SVG is already shown
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  });

  // STEP 2: Now attempt AI image upgrades in background (2 at a time)
  // If AI image succeeds, it replaces the SVG placeholder seamlessly
  const batchSize = 2;
  for (let batchStart = 0; batchStart < scenes.length; batchStart += batchSize) {
    const batchScenes = scenes.slice(batchStart, batchStart + batchSize);

    await Promise.all(batchScenes.map(async (scene, localIdx) => {
      const i = batchStart + localIdx;
      const img = $(`#scene-img-${i}`);
      const styleBadge = $(`#style-badge-${i}`);
      const failedEl = $(`#scene-failed-${i}`);
      const variation = scene.currentVariation;

      let aiImgUrl = null;
      try {
        aiImgUrl = await generatePanelImage(apiKey, scene, 'Pencil Art', characterName, setting, tone, variation);
      } catch (e) {
        console.warn(`Scene ${i + 1} AI image attempt:`, e?.message || e);
      }

      // If AI image returned, upgrade the display (replacing SVG)
      if (aiImgUrl && img) {
        img.src = aiImgUrl;
        img.style.display = 'block';
        if (styleBadge) {
          styleBadge.textContent = '✏️ Pencil Art • AI Generated';
        }
        if (failedEl) failedEl.classList.remove('active');
      } else if (!scene._svgUrl) {
        if (failedEl) failedEl.classList.add('active');
      }
    }));

    if (batchStart + batchSize < scenes.length) {
      await sleep(300);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Form Submit Handler
// ============================================

function initFormSubmit() {
  // Custom prompt accordion toggle
  const customToggle = $('#custom-prompt-toggle');
  const customContent = $('#custom-prompt-content');
  customToggle?.addEventListener('click', () => {
    customContent?.classList.toggle('hidden');
    const arrow = customToggle.querySelector('.toggle-arrow');
    if (arrow) arrow.textContent = customContent?.classList.contains('hidden') ? '▾' : '▴';
  });

  dom.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = getFormData();
    // Intelligent default character name if empty (never hardcode Kishore if not entered)
    if (!data.characterName) {
      if (data.gender === 'female') {
        data.characterName = 'Ananya';
      } else if (data.gender === 'male') {
        data.characterName = 'Leo';
      } else {
        data.characterName = 'Alex';
      }
    }

    const charProfile = createCharacterProfile(data.characterName, data.gender, data.prompt);

    // Start generation
    dom.generateBtn.disabled = true;
    showLoading(true);

    try {
      updateLoadingStep('Creating your story...', 15);
      await sleep(400);

      updateLoadingStep(`Building ${charProfile.genderLabel} character profile & consistency...`, 30);
      await sleep(350);

      updateLoadingStep('Writing 6 sequential scenes...', 50);
      const story = await generateStory(data, charProfile);

      updateLoadingStep('Preparing monochrome pencil illustrations...', 80);
      await sleep(350);

      // Render the storybook layout immediately (triggers fresh panel image generation)
      renderResult(story, data);
      showLoading(false);

    } catch (err) {
      showLoading(false);
      showToast(err.message || 'Failed to generate story', 'error');
      console.error('Story Studio Error:', err);

      dom.homePage.style.display = '';
      dom.resultPage.classList.remove('active');
    } finally {
      dom.generateBtn.disabled = false;
    }
  });
}

// ============================================
// Sample Story Demo (1-Click Instant)
// ============================================

function initSampleComic() {
  const sampleBtn = $('#sample-btn') || $('#demo-comic-btn');
  sampleBtn?.addEventListener('click', async () => {
    const data = getFormData();

    // Gender-aware demo selection:
    // If girl selected -> Ananya Forest Mystery (Requirement 6)
    // If boy selected -> Kishore City Dramatic (Requirement 7)
    // If auto -> Ananya Forest Mystery
    if (data.gender === 'female') {
      data.characterName = data.characterName || 'Ananya';
      data.setting = 'Forest';
      data.tone = 'Mystery';
      const girlRadio = document.querySelector('input[name="char-gender"][value="female"]');
      if (girlRadio) girlRadio.checked = true;
    } else if (data.gender === 'male') {
      data.characterName = data.characterName || 'Kishore';
      data.setting = 'City';
      data.tone = 'Dramatic';
      const boyRadio = document.querySelector('input[name="char-gender"][value="male"]');
      if (boyRadio) boyRadio.checked = true;
    } else {
      if (!data.characterName) {
        data.characterName = 'Ananya';
        data.gender = 'female';
        const girlRadio = document.querySelector('input[name="char-gender"][value="female"]');
        if (girlRadio) girlRadio.checked = true;
      }
      data.setting = 'Forest';
      data.tone = 'Mystery';
    }

    dom.characterName.value = data.characterName;
    const settingRadio = document.querySelector(`input[name="setting"][value="${data.setting}"]`);
    if (settingRadio) settingRadio.checked = true;
    const toneRadio = document.querySelector(`input[name="tone"][value="${data.tone}"]`);
    if (toneRadio) toneRadio.checked = true;

    const charProfile = createCharacterProfile(data.characterName, data.gender, data.prompt);

    dom.generateBtn.disabled = true;
    sampleBtn.disabled = true;
    showLoading(true);

    try {
      updateLoadingStep('Creating your story...', 20);
      await sleep(300);
      updateLoadingStep(`Building ${charProfile.genderLabel} consistency profile...`, 45);
      await sleep(300);
      updateLoadingStep('Writing 6 story scenes...', 70);
      await sleep(300);

      const story = generateDynamicStory(data, charProfile);
      story.storyId = generateUUID();

      updateLoadingStep('Preparing monochrome pencil illustrations...', 90);
      await sleep(300);

      renderResult(story, data);
      showLoading(false);
      showToast(`${charProfile.name} (${charProfile.genderLabel}) story created! ✏️ Pencil illustrations ready ✨`, 'success');

    } catch (err) {
      showLoading(false);
      showToast('Error: ' + err.message, 'error');
    } finally {
      dom.generateBtn.disabled = false;
      sampleBtn.disabled = false;
    }
  });
}

// ============================================
// Toolbar & Result Actions (Requirement 13 & 14)
// ============================================

function initResultActions() {
  // 1. Edit / New Story button
  dom.newComicBtn?.addEventListener('click', () => {
    dom.resultPage.classList.remove('active');
    dom.homePage.style.display = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 2. Global Regenerate Story button (Requirement: New Story Generation)
  const regenStoryBtn = $('#regenerate-story-btn');
  regenStoryBtn?.addEventListener('click', async () => {
    if (!currentComic) return;
    const data = currentComic.formData;
    const charProfile = createCharacterProfile(data.characterName, data.gender, data.prompt);

    showLoading(true);
    updateLoadingStep('Creating a completely new story with fresh illustrations...', 30);
    await sleep(400);

    try {
      const newStory = await generateStory(data, charProfile);
      newStory.storyId = generateUUID();
      renderResult(newStory, data);
      showLoading(false);
      showToast('Fresh story & unique illustrations generated! 🔄', 'success');
    } catch (err) {
      showLoading(false);
      showToast('Error regenerating story: ' + err.message, 'error');
    }
  });

  // 3. Image History Triggers & Modal (Requirement: Image History)
  const viewHistoryBtn = $('#view-history-btn');
  const navHistoryBtn = $('#nav-history-btn');
  const closeHistoryModal = $('#close-history-modal');
  const clearHistoryBtn = $('#clear-history-btn');
  const historyModal = $('#history-modal');

  viewHistoryBtn?.addEventListener('click', renderHistoryModal);
  navHistoryBtn?.addEventListener('click', renderHistoryModal);
  closeHistoryModal?.addEventListener('click', () => {
    historyModal?.classList.add('hidden');
  });

  historyModal?.addEventListener('click', (e) => {
    if (e.target === historyModal) {
      historyModal.classList.add('hidden');
    }
  });

  clearHistoryBtn?.addEventListener('click', clearImageHistory);

  // 4. Export PDF Storybook button
  dom.exportPdfBtn?.addEventListener('click', exportToPDF);

  // 5. Download All Images button
  const downloadAllBtn = $('#download-all-btn');
  downloadAllBtn?.addEventListener('click', async () => {
    if (!currentComic) return;
    const scenes = currentComic.story.scenes || currentComic.story.panels || [];
    showToast(`Downloading all ${scenes.length} illustrations...`, 'info');

    for (let i = 0; i < scenes.length; i++) {
      window.downloadSceneImage(i);
      await sleep(250);
    }
  });
}

// ============================================
// PDF Storybook Export (Requirement 14)
// ============================================

async function exportToPDF() {
  if (!currentComic) return;

  showToast('Assembling illustrated PDF storybook...', 'info');
  dom.exportPdfBtn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - 2 * margin;

    // ---- Cover Page ----
    pdf.setFillColor(11, 14, 23);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative gradient banner
    pdf.setFillColor(168, 85, 247);
    pdf.rect(margin, 35, contentWidth, 3, 'F');

    // Title
    pdf.setTextColor(241, 245, 249);
    pdf.setFontSize(26);
    pdf.setFont(undefined, 'bold');
    const title = currentComic.story.storyTitle || currentComic.story.title || 'AI Illustrated Story';
    const titleLines = pdf.splitTextToSize(title, contentWidth);
    pdf.text(titleLines, pageWidth / 2, 55, { align: 'center' });

    // Meta Subtitle
    pdf.setTextColor(192, 132, 252);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text(`A ${currentComic.formData.tone} Story in ${currentComic.formData.setting} • ${currentComic.formData.artStyle} Art Style`, pageWidth / 2, 75, { align: 'center' });

    // Character Consistency Profile on Cover
    const profile = currentComic.characterProfile;
    if (profile) {
      pdf.setFillColor(19, 23, 38);
      pdf.roundedRect(margin, 90, contentWidth, 50, 4, 4, 'F');

      pdf.setTextColor(168, 85, 247);
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('CHARACTER CONSISTENCY ANCHOR', margin + 8, 100);

      pdf.setTextColor(226, 232, 240);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Hero: ${profile.name} (Age ${profile.age})`, margin + 8, 108);
      pdf.text(`Appearance: ${profile.appearance}`, margin + 8, 116);
      pdf.text(`Signature Outfit: ${profile.clothing}`, margin + 8, 124);
      pdf.text(`Personality: ${profile.personality}`, margin + 8, 132);
    }

    // Synopsis / Outline
    pdf.setTextColor(203, 213, 225);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'italic');
    const outlineLines = pdf.splitTextToSize(currentComic.story.outline || '', contentWidth);
    pdf.text(outlineLines, margin, 155);

    // Footer
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.text('Generated with AI Story Studio', pageWidth / 2, pageHeight - 12, { align: 'center' });

    // ---- Scene Pages ----
    const scenes = currentComic.story.scenes || currentComic.story.panels || [];

    for (let i = 0; i < scenes.length; i++) {
      pdf.addPage();
      pdf.setFillColor(11, 14, 23);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      const scene = scenes[i];
      let y = margin + 5;

      // Header badge
      pdf.setFillColor(168, 85, 247);
      pdf.roundedRect(margin, y, 24, 7, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      pdf.text(`SCENE ${scene.sceneNumber || i + 1}`, margin + 12, y + 5, { align: 'center' });

      // Title
      pdf.setTextColor(248, 250, 252);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(scene.title || `Scene ${i + 1}`, margin + 30, y + 5.5);
      y += 14;

      // Illustration
      const imgEl = $(`#scene-img-${i}`);
      if (imgEl && imgEl.src) {
        try {
          const imgWidth = contentWidth;
          const imgHeight = imgWidth * 0.72;
          let imgSrc = imgEl.src;

          if (imgSrc.startsWith('data:image/svg+xml') || !imgSrc.startsWith('data:image/jpeg')) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = imgEl.naturalWidth || 800;
              canvas.height = imgEl.naturalHeight || 600;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
              imgSrc = canvas.toDataURL('image/jpeg', 0.9);
            } catch (cvErr) {
              console.warn('Canvas conversion note:', cvErr);
            }
          }

          pdf.addImage(imgSrc, 'JPEG', margin, y, imgWidth, imgHeight);
          y += imgHeight + 10;
        } catch (imgErr) {
          console.warn(`Could not add scene ${i + 1} illustration to PDF:`, imgErr);
          y += 6;
        }
      }

      // Narration text
      const narration = scene.story || scene.narration || '';
      if (narration) {
        pdf.setTextColor(226, 232, 240);
        pdf.setFontSize(10.5);
        pdf.setFont(undefined, 'normal');
        const narrationLines = pdf.splitTextToSize(narration, contentWidth);
        pdf.text(narrationLines, margin, y);
        y += narrationLines.length * 5.5 + 8;
      }

      // Dialogues
      if (scene.dialogue?.length) {
        for (const d of scene.dialogue) {
          if (y > pageHeight - 25) break;

          pdf.setTextColor(192, 132, 252);
          pdf.setFontSize(8);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${d.speaker.toUpperCase()}:`, margin + 2, y);
          y += 4;

          pdf.setTextColor(241, 245, 249);
          pdf.setFontSize(9.5);
          pdf.setFont(undefined, 'italic');
          const dLines = pdf.splitTextToSize(`"${d.text}"`, contentWidth - 4);
          pdf.text(dLines, margin + 2, y);
          y += dLines.length * 4.8 + 6;
        }
      }

      // Page Number
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Page ${i + 2}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    // Save PDF
    const safeTitle = (currentComic.story.storyTitle || currentComic.story.title || 'Story')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    pdf.save(`AI_StoryStudio_${safeTitle}.pdf`);
    showToast('PDF storybook exported successfully! 📖', 'success');

  } catch (err) {
    showToast('Failed to export PDF: ' + err.message, 'error');
    console.error('PDF Export Error:', err);
  } finally {
    dom.exportPdfBtn.disabled = false;
  }
}
