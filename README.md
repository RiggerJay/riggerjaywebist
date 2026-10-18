# RiggerJay Photography

This project is a lightweight Cloudflare Pages app for a photography portfolio. It reads the folders in the R2 bucket and renders each subfolder as a gallery.

## How it works

- Cloudflare Pages hosts the frontend.
- The Pages Function at `/api/galleries` lists the top-level folders in the R2 bucket.
- Each subfolder is treated as one gallery.
- The gallery card uses the first image as the cover and displays the total number of images.

## Setup

1. Create or confirm the R2 bucket named `riggerjayphotography`.
2. In Cloudflare Pages, add a binding:
   - Name: `R2_PHOTOGRAPHY`
   - Resource: your `riggerjayphotography` bucket
3. Also add a Pages environment variable:
   - Name: `PUBLIC_R2_BASE_URL`
   - Value: `https://riggerjayphotography.r2.dev`
   - If you use a custom domain for R2, set that instead.
4. Deploy the project to Cloudflare Pages.

## Folder structure

Upload photos to the bucket like this:

- `riggerjayphotography/`
  - `portraits/`
    - `portrait-1.jpg`
    - `portrait-2.jpg`
  - `travel/`
    - `photo-1.jpg`

The app will turn these subfolders into entries named `Portraits` and `Travel`.

## Local development

```bash
npm install
npm run dev
```

Then open the local URL shown by Wrangler.
