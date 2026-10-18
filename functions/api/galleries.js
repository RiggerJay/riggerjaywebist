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
    const root = await bucket.list({ delimiter: '/' });
    const baseUrl = env.PUBLIC_R2_BASE_URL || 'https://riggerjayphotography.r2.dev';

    const homepagePhotos = (root.objects || [])
      .filter((object) => !object.key.endsWith('/') && !object.key.includes('/'))
      .map((object) => buildPublicUrl(baseUrl, object.key));

    const galleries = [];

    for (const prefix of root.commonPrefixes || []) {
      const folderName = prefix.replace(/\/$/, '').split('/').pop();
      if (!folderName) continue;

      const folderListing = await bucket.list({ prefix, delimiter: '/' });
      const images = (folderListing.objects || [])
        .filter((object) => !object.key.endsWith('/'))
        .map((object) => buildPublicUrl(baseUrl, object.key));

      galleries.push({
        name: toTitle(folderName),
        slug: folderName,
        count: images.length,
        cover: images[0] || '',
        images
      });
    }

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
