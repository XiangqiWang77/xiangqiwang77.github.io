# Xiangqi Wang — personal website

A responsive research portfolio for [xiangqiwang77.github.io](https://xiangqiwang77.github.io/). The published site is generated from `site/` and `data/publications.json` using Node.js 22 or newer. It has no npm dependencies.

## Build and preview

```sh
npm run build
npm run check
```

The generated website is in `dist/`. Preview that directory with any static HTTP server, for example `python -m http.server 8000 --directory dist`, then open `http://localhost:8000`.

`npm run check` validates publication data, generated publication markup, unique IDs, local assets and anchor links, legacy redirects, JavaScript syntax, the downloadable CV and its legacy URL, self-hosted fonts with licenses, and the social preview PNG. Run it after rebuilding.

## Update content

- Edit the biography, research overview, experience, education, contact links, and page metadata in `site/index.html`.
- `data/profile.json` preserves structured resume reference data only; it is not rendered by the build. Updating visible profile content requires editing `site/index.html`.
- Edit the design in `site/assets/styles.css` and browser interactions in `site/assets/main.js`.
- Add or revise publication records in `data/publications.json`. The array order controls the display order. Each record has a unique lowercase `id`, `title`, `authors` (a string or array of names), integer `year` (or `null` when unspecified), `venue`, `status`, `role`, `topics`, and optional `url`, `code`, and `note`.
- Use a publication `status` of `published`, `submission`, `preprint`, or `ongoing`. Use `role: "first"` for first/co-first authorship and `"coauthor"` otherwise. Keep submission and preprint labels accurate; the build displays them explicitly.
- Topic tags are lowercase words joined with hyphens, and should match the available browser filters. Use full `https://` links for papers and code, or leave them empty when there is no public link.
- Place downloads, images, and other public assets inside `site/`, then reference them from the page. Never include private files in this directory.
- Replace `site/assets/xiangqi-wang-cv.pdf` when updating the public CV. The build requires this PDF and also copies it to `dist/cv.pdf`, preserving the old `/cv.pdf` download URL.

Publication text is escaped by the build and remains readable when JavaScript is disabled. `<!-- PUBLICATIONS -->` must appear exactly once in `site/index.html` inside the publication list.

## Deployment

The single workflow in `.github/workflows/deploy.yml` builds and checks the site, then deploys `dist/` to GitHub Pages after a push to `main`. It can also be started manually in GitHub Actions. The repository's **Settings → Pages → Build and deployment → Source** should be **GitHub Actions**.

The build uses `SITE_URL` for the sitemap and redirect canonical URLs, defaulting to `https://xiangqiwang77.github.io/`. The deployment workflow takes this value from GitHub Pages. The old section URLs `/about/`, `/publications/`, and `/projects/` redirect to the corresponding sections on the new homepage; `/news/` redirects to experience.

The previous Hugo files in `content/`, `themes/`, `static/`, and `public/` are retained as historical source material. They are not copied to the published site, and Hugo is no longer required.
