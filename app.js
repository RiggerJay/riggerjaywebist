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
const loveLightboxButton = document.querySelector('#loveLightbox');
const shareLightboxButton = document.querySelector('#shareLightbox');

const lovedImagesEndpoint = '/api/loves';
const likedImagesStorageKey = 'riggerjay-liked-images';

let currentLightboxImages = [];
let currentLightboxIndex = -1;
let currentLightboxLoveButton = null;
let currentLightboxShareButton = null;
let touchStartX = 0;
let touchStartY = 0;
let touchTracking = false;
let likeCounts = {};
let likeCountsLoaded = false;
let likedImages = new Set();

function readLikedImages() {
  try {
    const value = window.localStorage.getItem(likedImagesStorageKey);
    const parsed = value ? JSON.parse(value) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeLikedImages(nextLikedImages) {
  try {
    window.localStorage.setItem(likedImagesStorageKey, JSON.stringify(Array.from(nextLikedImages)));
  } catch {
    // Ignore storage failures.
  }
}

function getLikeCount(src) {
  return Number.isFinite(likeCounts[src]) ? likeCounts[src] : 0;
}

function updateLoveCount(button, count) {
  if (!button) return;

  const countNode = button.querySelector('.like-count');
  if (!countNode) return;
  countNode.textContent = String(Math.max(0, count));
}

function syncLoveButtonsForImage(src) {
  const loved = likedImages.has(src);
  const count = getLikeCount(src);

  document.querySelectorAll('.love-action[data-love-src]').forEach((button) => {
    if (button.dataset.loveSrc !== src) return;
    updateLoveButton(button, loved);
    updateLoveCount(button, count);
  });
}

function normalizeLikedImagesWithCounts() {
  let updated = false;

  likedImages.forEach((src) => {
    if (getLikeCount(src) > 0) return;
    likedImages.delete(src);
    updated = true;
  });

  if (updated) {
    writeLikedImages(likedImages);
  }
}

async function loadLikeCounts() {
  try {
    const response = await fetch(lovedImagesEndpoint);
    if (!response.ok) {
      throw new Error('Unable to load like counts');
    }

    const payload = await response.json();
    likeCounts = payload.likeCounts && typeof payload.likeCounts === 'object' ? payload.likeCounts : {};
    normalizeLikedImagesWithCounts();
    likeCountsLoaded = true;
    return true;
  } catch {
    return false;
  }
}

function isLoved(src) {
  return likedImages.has(src);
}

async function setLoved(src, loved) {
  const previousCount = getLikeCount(src);

  if (loved) {
    likedImages.add(src);
  } else {
    likedImages.delete(src);
  }
  writeLikedImages(likedImages);

  const delta = loved ? 1 : -1;
  likeCounts[src] = Math.max(0, previousCount + delta);
  if (likeCounts[src] === 0) {
    delete likeCounts[src];
  }
  syncLoveButtonsForImage(src);

  try {
    const response = await fetch(lovedImagesEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ src, delta })
    });

    if (!response.ok) {
      throw new Error('Unable to save shared like');
    }

    const payload = await response.json();
    likeCounts = payload.likeCounts && typeof payload.likeCounts === 'object' ? payload.likeCounts : likeCounts;
    likeCountsLoaded = true;
    if (typeof payload.count === 'number') {
      likeCounts[src] = payload.count;
    }
    syncLoveButtonsForImage(src);
    return true;
  } catch {
    if (previousCount === 0) {
      delete likeCounts[src];
    } else {
      likeCounts[src] = previousCount;
    }

    if (loved) {
      likedImages.delete(src);
    } else {
      likedImages.add(src);
    }
    writeLikedImages(likedImages);
    syncLoveButtonsForImage(src);
    return false;
  }
}

function updateLoveButton(button, loved) {
  if (!button) return;

  button.classList.toggle('is-loved', loved);
  button.setAttribute('aria-pressed', loved ? 'true' : 'false');
  button.title = loved ? 'Unlove image' : 'Love image';
  button.setAttribute('aria-label', loved ? 'Unlove image' : 'Love image');
}

async function shareImage(src, title) {
  const shareData = {
    title,
    text: title,
    url: src,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch {
    // Fall through to clipboard fallback.
  }

  try {
    await navigator.clipboard.writeText(src);
    return;
  } catch {
    window.prompt('Copy this image link', src);
  }
}

function getCurrentLightboxImage() {
  return currentLightboxImages[currentLightboxIndex] || null;
}

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

  const loved = isLoved(image.src);
  if (currentLightboxLoveButton) {
    currentLightboxLoveButton.dataset.loveSrc = image.src;
    updateLoveCount(currentLightboxLoveButton, getLikeCount(image.src));
  }
  updateLoveButton(currentLightboxLoveButton, loved);
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

  currentLightboxLoveButton = loveLightboxButton;
  currentLightboxShareButton = shareLightboxButton;

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
  currentLightboxLoveButton = null;
  currentLightboxShareButton = null;
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
    const thumbCard = document.createElement('div');
    thumbCard.className = 'gallery-thumb-card';

    const thumbnail = document.createElement('button');
    thumbnail.type = 'button';
    thumbnail.className = 'gallery-thumb';
    thumbnail.setAttribute('aria-label', `Open ${gallery.name} image`);

    const loveButton = document.createElement('button');
    loveButton.type = 'button';
    loveButton.className = 'image-action love-action gallery-thumb-love';
    loveButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.3-9.4-8.2C.4 9.4 1 5.8 3.7 4.2c2.2-1.3 4.8-.8 6.3 1 1.5-1.8 4.1-2.3 6.3-1 2.7 1.6 3.3 5.2 1.1 8.6C18.7 16.7 12 21 12 21Z" fill="currentColor"/></svg><span class="like-count">0</span>';
    loveButton.dataset.loveSrc = image;
    updateLoveButton(loveButton, isLoved(image));
    updateLoveCount(loveButton, getLikeCount(image));

    const preview = document.createElement('img');
    preview.src = image;
    preview.alt = `${gallery.name} gallery image`;
    preview.loading = 'lazy';

    thumbnail.appendChild(preview);
    thumbnail.addEventListener('click', () => {
      const images = (gallery.images || []).map((src) => ({ src, alt: `${gallery.name} gallery image` }));
      openLightbox(image, `${gallery.name} gallery image`, { images, index });
    });

    loveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const loved = !isLoved(image);
      setLoved(image, loved);
    });

    thumbCard.appendChild(thumbnail);
    thumbCard.appendChild(loveButton);
    galleryDialogGrid.appendChild(thumbCard);
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
    likedImages = readLikedImages();

    const [response, likesLoaded] = await Promise.all([
      fetch('/api/galleries'),
      loadLikeCounts()
    ]);

    if (!response.ok) {
      throw new Error('Failed to load gallery data');
    }

    const payload = await response.json();
    if (!likesLoaded) {
      likeCountsLoaded = true;
    }
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
    const tileWrap = document.createElement('div');
    tileWrap.className = `featured-item${index === 1 || index === 3 ? ' tall' : ''}${index === 2 ? ' wide' : ''}`;

    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'featured-tile';
    tile.style.backgroundImage = `url("${image}")`;
    tile.title = 'Open featured photo';
    tile.setAttribute('aria-label', 'Open featured photo');
    tile.addEventListener('click', () => openLightbox(image, 'Featured photo'));

    const loveButton = document.createElement('button');
    loveButton.type = 'button';
    loveButton.className = 'image-action love-action featured-love';
    loveButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.3-9.4-8.2C.4 9.4 1 5.8 3.7 4.2c2.2-1.3 4.8-.8 6.3 1 1.5-1.8 4.1-2.3 6.3-1 2.7 1.6 3.3 5.2 1.1 8.6C18.7 16.7 12 21 12 21Z" fill="currentColor"/></svg><span class="like-count">0</span>';
    loveButton.dataset.loveSrc = image;
    updateLoveButton(loveButton, isLoved(image));
    updateLoveCount(loveButton, getLikeCount(image));
    loveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const loved = !isLoved(image);
      setLoved(image, loved);
    });

    tileWrap.appendChild(tile);
    tileWrap.appendChild(loveButton);
    featuredGrid.appendChild(tileWrap);
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
    const loveButton = clone.querySelector('.love-action');
    const shareButton = clone.querySelector('.share-action');
    const imageActions = clone.querySelector('.image-actions');

    const galleryImages = (gallery.images || []).map((src) => ({ src, alt: `${gallery.name} gallery image` }));

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

    if (imageActions) {
      imageActions.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }

    if (loveButton) {
      loveButton.dataset.loveSrc = image.src;
      updateLoveButton(loveButton, isLoved(image.src));
      updateLoveCount(loveButton, getLikeCount(image.src));
      loveButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const loved = !isLoved(image.src);
        setLoved(image.src, loved);
      });
    }

    if (shareButton) {
      shareButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await shareImage(image.src, `${gallery.name} gallery image`);
      });
    }

    galleryGrid.appendChild(clone);
  });
}

if (loveLightboxButton) {
  loveLightboxButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentImage = getCurrentLightboxImage();
    if (!currentImage) return;
    const loved = !isLoved(currentImage.src);
    setLoved(currentImage.src, loved);
  });
}

if (shareLightboxButton) {
  shareLightboxButton.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentImage = getCurrentLightboxImage();
    if (!currentImage) return;
    await shareImage(currentImage.src, currentImage.alt || 'Full-size gallery image');
  });
}

loadGalleries();
