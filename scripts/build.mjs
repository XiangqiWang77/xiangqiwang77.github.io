import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, renderPublications, validatePublications } from './publications.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(root, 'dist');
const source = join(root, 'site');
const placeholder = '<!-- PUBLICATIONS -->';
const siteUrl = new URL(process.env.SITE_URL || 'https://xiangqiwang77.github.io/');
if (!['https:', 'http:'].includes(siteUrl.protocol)) throw new Error('SITE_URL must use HTTP or HTTPS.');
siteUrl.pathname = `${siteUrl.pathname.replace(/\/$/, '')}/`;
siteUrl.search = '';
siteUrl.hash = '';

const publications = JSON.parse(await readFile(join(root, 'data', 'publications.json'), 'utf8'));
validatePublications(publications);
const pageDefinitions = [
  { path: 'index.html', role: 'first', url: '' },
  { path: 'collaborations/index.html', role: 'coauthor', url: 'collaborations/' },
];
const pages = await Promise.all(pageDefinitions.map(async (page) => {
  const template = await readFile(join(source, page.path), 'utf8');
  if (template.split(placeholder).length !== 2) throw new Error(`site/${page.path} must contain exactly one PUBLICATIONS placeholder.`);
  const selectedPublications = publications.filter((publication) => publication.role === page.role);
  return { ...page, html: template.replace(placeholder, renderPublications(selectedPublications)) };
}));
const cvPath = join(source, 'assets', 'xiangqi-wang-cv.pdf');
let cv;
try { cv = await readFile(cvPath); } catch {
  throw new Error('The final CV is required at site/assets/xiangqi-wang-cv.pdf before building.');
}
if (cv.subarray(0, 5).toString() !== '%PDF-') throw new Error('The final CV must be a valid PDF file.');

// This derived output directory is fixed beneath the repository, never supplied by input.
if (destination !== resolve(root, 'dist')) throw new Error('Invalid build destination.');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
for (const page of pages) await writeFile(join(destination, page.path), page.html);
await writeFile(join(destination, 'cv.pdf'), cv);
await writeFile(join(destination, '.nojekyll'), '');
await writeFile(join(destination, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`);
await writeFile(join(destination, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${escapeHtml(new URL(page.url, siteUrl).href)}</loc></url>`).join('')}</urlset>\n`);

const redirects = { about: 'about', publications: 'publications', projects: 'projects', news: 'experience' };
for (const [path, anchor] of Object.entries(redirects)) {
  const target = `../#${anchor}`;
  const absolute = new URL(`#${anchor}`, siteUrl).href;
  const redirectHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Xiangqi Wang — ${path[0].toUpperCase() + path.slice(1)}</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${escapeHtml(absolute)}"></head><body><p>This page has moved to <a href="${target}">Xiangqi Wang’s website</a>.</p></body></html>\n`;
  await mkdir(join(destination, path), { recursive: true });
  await writeFile(join(destination, path, 'index.html'), redirectHtml);
}

console.log(`Built ${publications.filter((publication) => publication.role === 'first').length} first-author works on the homepage and ${publications.filter((publication) => publication.role === 'coauthor').length} collaborations on a separate page, plus 4 legacy redirects and the /cv.pdf compatibility copy in dist/.`);
