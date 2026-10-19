const STORAGE_KEY = 'image-like-counts';

async function readLikeCounts(store) {
  const value = await store.get(STORAGE_KEY, 'json');
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function writeLikeCounts(store, likeCounts) {
  await store.put(STORAGE_KEY, JSON.stringify(likeCounts));
}

export async function onRequestGet({ env }) {
  const store = env.LOVE_STORAGE;

  if (!store) {
    return Response.json(
      {
        likeCounts: {},
        message: 'LOVE_STORAGE binding is not configured for this Pages project.'
      },
      { status: 500 }
    );
  }

  try {
    const likeCounts = await readLikeCounts(store);
    return Response.json({ likeCounts });
  } catch (error) {
    console.error('like count list error', error);
    return Response.json(
      {
        likeCounts: {},
        message: 'Unable to read shared like counts.'
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
        likeCounts: {},
        message: 'LOVE_STORAGE binding is not configured for this Pages project.'
      },
      { status: 500 }
    );
  }

  try {
    const { src, delta } = await request.json();

    if (typeof src !== 'string' || !src.trim()) {
      return Response.json({ message: 'A valid image source is required.' }, { status: 400 });
    }

    if (delta !== 1 && delta !== -1) {
      return Response.json({ message: 'Delta must be 1 or -1.' }, { status: 400 });
    }

    const likeCounts = await readLikeCounts(store);
    const current = Number.isFinite(likeCounts[src]) ? likeCounts[src] : 0;
    const next = Math.max(0, current + delta);

    if (next === 0) {
      delete likeCounts[src];
    } else {
      likeCounts[src] = next;
    }

    await writeLikeCounts(store, likeCounts);

    return Response.json({ likeCounts, count: next });
  } catch (error) {
    console.error('like count save error', error);
    return Response.json(
      {
        likeCounts: {},
        message: 'Unable to save shared like count.'
      },
      { status: 500 }
    );
  }
}