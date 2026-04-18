/* ============================================
   WHITE RAVEN — JS
   ============================================ */

// ---- NAV SCROLL ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ---- HAMBURGER / MOBILE MENU ----
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
  hamburger.setAttribute('aria-expanded', isOpen);
});

mobileLinks.forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ---- SCROLL FADE-IN (Intersection Observer) ----
const fadeEls = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

fadeEls.forEach(el => observer.observe(el));

// ---- PARALLAX HERO ----
const heroContent = document.querySelector('.hero-content');
const heroForest = document.querySelector('.hero-forest');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y < window.innerHeight) {
    if (heroContent) heroContent.style.transform = `translateY(${y * 0.25}px)`;
    if (heroForest) heroForest.style.transform = `translateY(${y * 0.12}px)`;
  }
}, { passive: true });

// ---- SMOOTH ANCHOR SCROLL ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ---- COUNTER ANIMATION (stats) ----
const statNumbers = document.querySelectorAll('.stat-number');

const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent.trim();
      const num = parseInt(raw.replace(/\D/g, ''), 10);
      if (isNaN(num)) return;
      const prefix = raw.match(/^[^\d]*/)[0];
      const suffix = raw.match(/[^\d]*$/)[0];
      const duration = 1800;
      const start = performance.now();

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + Math.floor(eased * num) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.5 }
);

statNumbers.forEach(el => countObserver.observe(el));

// ---- GOOGLE PLACES PHOTOS ----
const photoSlots = [
  'about-hero',
  'about-detail',
  'drink-espresso',
  'drink-chai',
  'drink-pastry',
  'atmosphere-redwoods',
  'atmosphere-patio',
  'atmosphere-study',
  'atmosphere-community'
];

const photoElements = photoSlots
  .map(slot => document.querySelector(`[data-photo-slot="${slot}"]`))
  .filter(Boolean);

const photoCredits = document.getElementById('photoCredits');

async function loadPlacePhotos() {
  const { fallbackPhotoBySlot } = getPhotoConfig();
  showFallbackPhotos(fallbackPhotoBySlot);
}

function getPhotoConfig() {
  const config = window.WHITE_RAVEN_CONFIG || {};
  return {
    fallbackPhotoBySlot: config.fallbackPhotoBySlot && typeof config.fallbackPhotoBySlot === 'object' ? config.fallbackPhotoBySlot : {}
  };
}

function showFallbackPhotos(fallbackPhotoBySlot) {
  const slots = Object.entries(fallbackPhotoBySlot).filter(([, photo]) => photo && photo.photoUri);
  if (slots.length === 0) {
    return;
  }

  slots.forEach(([slot, photo]) => applyPhotoToSlot(slot, photo));
  renderPhotoCredits(slots.map(([, photo]) => photo), 'White Raven');
}

function applyPhotoToSlot(slot, photo) {
  const element = document.querySelector(`[data-photo-slot="${slot}"]`);
  if (!element || !photo.photoUri) {
    return;
  }

  element.style.backgroundImage = `url("${photo.photoUri}")`;
  element.style.backgroundSize = photo.backgroundSize || 'cover';
  element.style.backgroundPosition = photo.backgroundPosition || 'center';
  element.classList.add('is-loaded');
}

function renderPhotoCredits(photos, placeName) {
  if (!photoCredits) {
    return;
  }

  const attributionLinks = [];
  const seenAttributions = new Set();

  photos.forEach(photo => {
    photo.authorAttributions.forEach(attribution => {
      const label = attribution.displayName || attribution.uri;
      if (!label || seenAttributions.has(label)) {
        return;
      }
      seenAttributions.add(label);

      if (attribution.uri) {
        attributionLinks.push(`<a href="${attribution.uri}" target="_blank" rel="noreferrer">${label}</a>`);
      } else {
        attributionLinks.push(label);
      }
    });
  });

  if (attributionLinks.length === 0) {
    photoCredits.hidden = true;
    photoCredits.textContent = '';
    return;
  }

  const sourceName = placeName || 'White Raven';
  photoCredits.innerHTML = `Photos via Google Places for ${sourceName}. Credits: ${attributionLinks.join(', ')}`;
  photoCredits.hidden = false;
}

loadPlacePhotos();
