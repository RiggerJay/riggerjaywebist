const galleryGrid = document.querySelector('#galleryGrid');
const galleryTemplate = document.querySelector('#galleryCardTemplate');
const featuredGrid = document.querySelector('#featuredGrid');
const lightboxDialog = document.querySelector('#imageDialog');
const lightboxImage = document.querySelector('#dialogImage');
const closeLightboxButton = document.querySelector('#closeDialog');

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
    image.addEventListener('click', () => openLightbox(image.src, image.alt));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(image.src, image.alt);
      }
    });

    galleryGrid.appendChild(clone);
  });
}

loadGalleries();
