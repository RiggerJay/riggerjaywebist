const toTitle = (value) =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildPublicUrl = (baseUrl, key) => {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedKey = key.replace(/^\//, '');
  return `${normalizedBase}/${encodeURI(normalizedKey)}`;
};

export async function onRequestGet({ env }) {
  const bucket = env.R2_PHOTOGRAPHY;

  if (!bucket) {
    return Response.json(
      {
        galleries: [],
        message: 'R2_PHOTOGRAPHY binding is not configured for this Pages project.'
      },
      { status: 500 }
    );
  }

  try {
    const root = await bucket.list();
    const baseUrl = env.PUBLIC_R2_BASE_URL || 'https://riggerjayphotography.r2.dev';

    const allObjects = root.objects || [];
    const homepagePhotos = allObjects
      .filter((object) => !object.key.endsWith('/') && !object.key.includes('/'))
      .map((object) => buildPublicUrl(baseUrl, object.key));

    const galleryMap = new Map();

    for (const object of allObjects) {
      const key = object.key.replace(/^\/+/, '');
      if (!key || key.endsWith('/')) continue;
      if (!key.includes('/')) continue;

      const folderName = key.split('/')[0];
      if (!folderName) continue;

      const existing = galleryMap.get(folderName) || {
        name: toTitle(folderName),
        slug: folderName,
        count: 0,
        cover: '',
        images: []
      };

      const imageUrl = buildPublicUrl(baseUrl, key);
      existing.images.push(imageUrl);
      existing.count = existing.images.length;
      existing.cover = existing.cover || imageUrl;
      galleryMap.set(folderName, existing);
    }

    const galleries = Array.from(galleryMap.values());

    return Response.json({
      galleries,
      homepagePhotos,
      featuredPhotos: homepagePhotos.slice(0, 4)
    });
  } catch (error) {
    console.error('gallery list error', error);
    return Response.json(
      {
        galleries: [],
        message: 'Unable to list galleries. Verify your R2 binding and public URL settings.'
      },
      { status: 500 }
    );
  }
}
