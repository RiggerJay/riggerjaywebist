const galleryGrid = document.querySelector('#galleryGrid');
const galleryTemplate = document.querySelector('#galleryCardTemplate');
const featuredGrid = document.querySelector('#featuredGrid');
const lightboxDialog = document.querySelector('#imageDialog');
const lightboxImage = document.querySelector('#dialogImage');
const closeLightboxButton = document.querySelector('#closeDialog');
const galleryDialog = document.querySelector('#galleryDialog');
const galleryDialogTitle = document.querySelector('#galleryDialogTitle');
const galleryDialogMeta = document.querySelector('#galleryDialogMeta');
const galleryDialogGrid = document.querySelector('#galleryDialogGrid');
const closeGalleryDialogButton = document.querySelector('#closeGalleryDialog');
const lightboxPanel = document.querySelector('#lightboxPanel');
const prevLightboxButton = document.querySelector('#prevLightbox');
const nextLightboxButton = document.querySelector('#nextLightbox');

let currentLightboxImages = [];
let currentLightboxIndex = -1;
let touchStartX = 0;
let touchStartY = 0;
let touchTracking = false;

function updateLightboxNavigation() {
  if (!prevLightboxButton || !nextLightboxButton) return;

  const hasMultipleImages = currentLightboxImages.length > 1;
  prevLightboxButton.hidden = !hasMultipleImages;
  nextLightboxButton.hidden = !hasMultipleImages;
  prevLightboxButton.disabled = !hasMultipleImages;
  nextLightboxButton.disabled = !hasMultipleImages;
}

function showLightboxImage(index) {
  if (!lightboxImage || index < 0 || index >= currentLightboxImages.length) return;

  currentLightboxIndex = index;
  const image = currentLightboxImages[index];
  lightboxImage.removeAttribute('src');
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  updateLightboxNavigation();
}

function openLightbox(src, alt = 'Full-size gallery image', options = {}) {
  if (!lightboxDialog || !lightboxImage) return;

  if (galleryDialog?.open) {
    closeGalleryDialog();
  }

  const imageList = Array.isArray(options.images) ? options.images : [];
  const activeIndex = typeof options.index === 'number' ? options.index : imageList.findIndex((image) => image.src === src);

  currentLightboxImages = imageList.length
    ? imageList
    : [{ src, alt }];
  currentLightboxIndex = activeIndex >= 0 ? activeIndex : 0;

  showLightboxImage(currentLightboxIndex);

  if (typeof lightboxDialog.showModal === 'function') {
    lightboxDialog.showModal();
    return;
  }

  lightboxDialog.setAttribute('open', 'open');
}

function closeLightbox() {
  if (!lightboxDialog) return;

  currentLightboxImages = [];
  currentLightboxIndex = -1;
  updateLightboxNavigation();

  if (typeof lightboxDialog.close === 'function') {
    lightboxDialog.close();
    return;
  }

  lightboxDialog.removeAttribute('open');
}

function openGallery(gallery) {
  if (!galleryDialog || !galleryDialogGrid || !galleryDialogTitle || !galleryDialogMeta) return;

  galleryDialogTitle.textContent = gallery.name;
  galleryDialogMeta.textContent = `${gallery.count} image${gallery.count === 1 ? '' : 's'}`;
  galleryDialogGrid.innerHTML = '';

  (gallery.images || []).forEach((image, index) => {
    const thumbnail = document.createElement('button');
    thumbnail.type = 'button';
    thumbnail.className = 'gallery-thumb';
    thumbnail.setAttribute('aria-label', `Open ${gallery.name} image`);

    const preview = document.createElement('img');
    preview.src = image;
    preview.alt = `${gallery.name} gallery image`;
    preview.loading = 'lazy';

    thumbnail.appendChild(preview);
    thumbnail.addEventListener('click', () => {
      const images = (gallery.images || []).map((src) => ({ src, alt: `${gallery.name} gallery image` }));
      openLightbox(image, `${gallery.name} gallery image`, { images, index });
    });
    galleryDialogGrid.appendChild(thumbnail);
  });

  if (typeof galleryDialog.showModal === 'function') {
    galleryDialog.showModal();
    return;
  }

  galleryDialog.setAttribute('open', 'open');
}

function closeGalleryDialog() {
  if (!galleryDialog) return;

  if (typeof galleryDialog.close === 'function') {
    galleryDialog.close();
    return;
  }

  galleryDialog.removeAttribute('open');
}

if (lightboxDialog) {
  lightboxDialog.addEventListener('click', (event) => {
    if (event.target === lightboxDialog) {
      closeLightbox();
    }
  });
}

if (closeLightboxButton) {
  closeLightboxButton.addEventListener('click', closeLightbox);
}

if (prevLightboxButton) {
  prevLightboxButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (currentLightboxImages.length < 2) return;
    const nextIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    showLightboxImage(nextIndex);
  });
}

if (nextLightboxButton) {
  nextLightboxButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (currentLightboxImages.length < 2) return;
    const nextIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
    showLightboxImage(nextIndex);
  });
}

if (lightboxPanel) {
  lightboxPanel.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchTracking = true;
  }, { passive: true });

  lightboxPanel.addEventListener('touchend', (event) => {
    if (!touchTracking || !event.changedTouches.length || currentLightboxImages.length < 2) {
      touchTracking = false;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    touchTracking = false;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
      const nextIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
      showLightboxImage(nextIndex);
      return;
    }

    const prevIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    showLightboxImage(prevIndex);
  }, { passive: true });
}

document.addEventListener('keydown', (event) => {
  if (!lightboxDialog?.open || currentLightboxImages.length < 2) return;

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    const prevIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    showLightboxImage(prevIndex);
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    const nextIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
    showLightboxImage(nextIndex);
  }
});

if (galleryDialog) {
  galleryDialog.addEventListener('click', (event) => {
    if (event.target === galleryDialog) {
      closeGalleryDialog();
    }
  });
}

if (closeGalleryDialogButton) {
  closeGalleryDialogButton.addEventListener('click', closeGalleryDialog);
}

async function loadGalleries() {
  try {
    const response = await fetch('/api/galleries');
    if (!response.ok) {
      throw new Error('Failed to load gallery data');
    }

    const payload = await response.json();
    renderFeaturedPhotos(payload.homepagePhotos || payload.featuredPhotos || []);
    renderGalleries(payload.galleries || []);
  } catch (error) {
    galleryGrid.innerHTML = `
      <div class="empty-state">
        <strong>Unable to load galleries right now.</strong>
        <p>Check the R2 binding and make sure the bucket folders are public or accessible.</p>
      </div>
    `;
    console.error(error);
  }
}

function renderFeaturedPhotos(images) {
  if (!featuredGrid) return;

  featuredGrid.innerHTML = '';

  if (!images.length) {
    featuredGrid.innerHTML = `
      <span class="featured-tile placeholder"></span>
      <span class="featured-tile placeholder tall"></span>
      <span class="featured-tile placeholder wide"></span>
      <span class="featured-tile placeholder"></span>
    `;
    return;
  }

  const tiles = images.slice(0, 4);

  tiles.forEach((image, index) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `featured-tile${index === 1 || index === 3 ? ' tall' : ''}${index === 2 ? ' wide' : ''}`;
    tile.style.backgroundImage = `url("${image}")`;
    tile.title = 'Open featured photo';
    tile.setAttribute('aria-label', 'Open featured photo');
    tile.addEventListener('click', () => openLightbox(image, 'Featured photo'));
    featuredGrid.appendChild(tile);
  });
}

function renderGalleries(galleries) {
  if (!galleries.length) {
    galleryGrid.innerHTML = `
      <div class="empty-state">
        <strong>No galleries found.</strong>
        <p>Upload images into subfolders in the R2 bucket to populate the portfolio.</p>
      </div>
    `;
    return;
  }

  galleryGrid.innerHTML = '';

  galleries.forEach((gallery) => {
    const clone = galleryTemplate.content.cloneNode(true);
    const image = clone.querySelector('img');
    const title = clone.querySelector('h3');
    const meta = clone.querySelector('.meta');
    const card = clone.querySelector('.gallery-card');

    image.src = gallery.cover || '/placeholder.svg';
    image.alt = `${gallery.name} gallery`;
    title.textContent = gallery.name;
    meta.textContent = `${gallery.count} image${gallery.count === 1 ? '' : 's'}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open ${gallery.name} gallery`);
    card.addEventListener('click', () => openGallery(gallery));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openGallery(gallery);
      }
    });

    galleryGrid.appendChild(clone);
  });
}

loadGalleries();
