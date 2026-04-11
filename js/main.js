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
  const config = window.WHITE_RAVEN_CONFIG || {};
  const apiKey = config.googlePlacesApiKey ? config.googlePlacesApiKey.trim() : '';
  const textQuery = config.placeTextQuery || 'White Raven, 6253 Highway 9, Felton, CA 95018';

  if (!apiKey || photoElements.length === 0) {
    if (!apiKey) {
      console.warn('White Raven Places photos are disabled because WHITE_RAVEN_CONFIG.googlePlacesApiKey is empty.');
    }
    return;
  }

  try {
    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.photos'
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 1,
        languageCode: 'en'
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Text Search failed with ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const place = searchData.places && searchData.places[0];
    const photos = place && Array.isArray(place.photos) ? place.photos : [];

    if (photos.length === 0) {
      console.warn('Places API returned no photos for the configured White Raven query.');
      return;
    }

    const selectedPhotos = photos.slice(0, Math.min(photos.length, 6));
    const resolvedPhotos = await Promise.all(selectedPhotos.map(photo => getPhotoMedia(photo, apiKey)));
    const usablePhotos = resolvedPhotos.filter(Boolean);

    if (usablePhotos.length === 0) {
      console.warn('Places API photo metadata resolved, but no photo URLs were returned.');
      return;
    }

    photoElements.forEach((element, index) => {
      const photo = usablePhotos[index % usablePhotos.length];
      element.style.backgroundImage = `url("${photo.photoUri}")`;
      element.classList.add('is-loaded');
    });

    renderPhotoCredits(usablePhotos, place.displayName && place.displayName.text);
  } catch (error) {
    console.error('Unable to load White Raven photos from Google Places.', error);
  }
}

async function getPhotoMedia(photo, apiKey) {
  if (!photo || !photo.name) {
    return null;
  }

  const url = new URL(`https://places.googleapis.com/v1/${photo.name}/media`);
  url.searchParams.set('maxWidthPx', '1600');
  url.searchParams.set('skipHttpRedirect', 'true');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data.photoUri) {
    return null;
  }

  return {
    photoUri: data.photoUri,
    authorAttributions: Array.isArray(photo.authorAttributions) ? photo.authorAttributions : []
  };
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
