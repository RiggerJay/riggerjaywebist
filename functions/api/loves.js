const STORAGE_KEY = 'loved-images';

async function readLovedImages(store) {
  const value = await store.get(STORAGE_KEY, 'json');
  return Array.isArray(value) ? value : [];
}

async function writeLovedImages(store, lovedImages) {
  await store.put(STORAGE_KEY, JSON.stringify(lovedImages));
}

export async function onRequestGet({ env }) {
  const store = env.LOVE_STORAGE;

  if (!store) {
    return Response.json(
      {
        lovedImages: [],
        message: 'LOVE_STORAGE binding is not configured for this Pages project.'
      },
      { status: 500 }
    );
  }

  try {
    const lovedImages = await readLovedImages(store);
    return Response.json({ lovedImages });
  } catch (error) {
    console.error('love list error', error);
    return Response.json(
      {
        lovedImages: [],
        message: 'Unable to read shared likes.'
      },
      { status: 500 }
    );
  }
}

export async function onRequestPost({ request, env }) {
  const store = env.LOVE_STORAGE;

  if (!store) {
    return Response.json(
      {
        lovedImages: [],
        message: 'LOVE_STORAGE binding is not configured for this Pages project.'
      },
      { status: 500 }
    );
  }

  try {
    const { src, loved } = await request.json();

    if (typeof src !== 'string' || !src.trim()) {
      return Response.json({ message: 'A valid image source is required.' }, { status: 400 });
    }

    const lovedImages = new Set(await readLovedImages(store));

    if (loved) {
      lovedImages.add(src);
    } else {
      lovedImages.delete(src);
    }

    const updatedLovedImages = Array.from(lovedImages);
    await writeLovedImages(store, updatedLovedImages);

    return Response.json({ lovedImages: updatedLovedImages });
  } catch (error) {
    console.error('love save error', error);
    return Response.json(
      {
        lovedImages: [],
        message: 'Unable to save shared likes.'
      },
      { status: 500 }
    );
  }
}