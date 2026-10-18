const galleryGrid = document.querySelector('#galleryGrid');
const galleryTemplate = document.querySelector('#galleryCardTemplate');
const featuredGrid = document.querySelector('#featuredGrid');

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
    const tile = document.createElement('div');
    tile.className = `featured-tile${index === 1 || index === 3 ? ' tall' : ''}${index === 2 ? ' wide' : ''}`;
    tile.style.backgroundImage = `url("${image}")`;
    tile.title = 'Featured photo';
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

    image.src = gallery.cover || '/placeholder.svg';
    image.alt = `${gallery.name} gallery`;
    title.textContent = gallery.name;
    meta.textContent = `${gallery.count} image${gallery.count === 1 ? '' : 's'}`;

    galleryGrid.appendChild(clone);
  });
}

loadGalleries();
