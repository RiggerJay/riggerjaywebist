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

function openLightbox(src, alt = 'Full-size gallery image') {
  if (!lightboxDialog || !lightboxImage) return;

  lightboxImage.src = src;
  lightboxImage.alt = alt;

  if (typeof lightboxDialog.showModal === 'function') {
    lightboxDialog.showModal();
    return;
  }

  lightboxDialog.setAttribute('open', 'open');
}

function closeLightbox() {
  if (!lightboxDialog) return;

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

  (gallery.images || []).forEach((image) => {
    const thumbnail = document.createElement('button');
    thumbnail.type = 'button';
    thumbnail.className = 'gallery-thumb';
    thumbnail.setAttribute('aria-label', `Open ${gallery.name} image`);

    const preview = document.createElement('img');
    preview.src = image;
    preview.alt = `${gallery.name} gallery image`;
    preview.loading = 'lazy';

    thumbnail.appendChild(preview);
    thumbnail.addEventListener('click', () => openLightbox(image, `${gallery.name} gallery image`));
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
