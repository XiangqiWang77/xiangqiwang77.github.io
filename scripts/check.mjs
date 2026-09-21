import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPublications, validatePublications } from './publications.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const html = await readFile(join(output, 'index.html'), 'utf8');
const publications = JSON.parse(await readFile(join(root, 'data', 'publications.json'), 'utf8'));
validatePublications(publications);
const collaborationsHtml = await readFile(join(output, 'collaborations', 'index.html'), 'utf8');
const authoredPages = [
  { path: 'index.html', html, role: 'first', canonicalPath: '/' },
  { path: 'collaborations/index.html', html: collaborationsHtml, role: 'coauthor', canonicalPath: '/collaborations/' },
];
const renderedPublicationIds = [];
for (const page of authoredPages) {
  const expected = publications.filter((publication) => publication.role === page.role);
  assert(!page.html.includes('<!-- PUBLICATIONS -->'), `${page.path}: Publication placeholder was not replaced.`);
  assert.equal((page.html.match(/class="publication"/g) || []).length, expected.length, `${page.path}: All publications of the expected authorship role must be rendered.`);
  const rendered = [...page.html.matchAll(/<li class="publication"[^>]*id="pub-([^"]+)"[^>]*data-role="([^"]+)"/g)];
  assert.equal(rendered.length, expected.length, `${page.path}: Publication metadata is required.`);
  assert(rendered.every((match) => match[2] === page.role), `${page.path}: First-author and coauthored works must be on separate pages.`);
  assert.deepEqual(rendered.map((match) => match[1]), expected.map((publication) => publication.id), `${page.path}: Publication ordering must match the source data.`);
  renderedPublicationIds.push(...rendered.map((match) => match[1]));
  assert(/<title>[^<]+<\/title>/i.test(page.html), `${page.path}: A page title is required.`);
  assert(/<meta\s+[^>]*name=["']description["']/i.test(page.html), `${page.path}: A page description is required.`);
  assert(/<html\s+[^>]*lang=["']en["']/i.test(page.html), `${page.path}: The page language is required.`);
  const canonical = page.html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  assert(canonical && new URL(canonical).pathname === page.canonicalPath, `${page.path}: The page must have its own canonical URL.`);
  const ids = [...page.html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page.path}: HTML IDs must be unique.`);
  assert(!page.html.includes('data-filter="first"'), `${page.path}: Authorship is separated by page, not a first-author filter.`);
}
assert.equal(new Set(renderedPublicationIds).size, publications.length, 'All publications must appear exactly once across the two pages.');
const rootIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
const sample = {
  id: 'escape-test', title: 'Safety < & "title"', authors: 'Xiangqi Wang, A & B', year: 2026,
  venue: 'Test', status: 'submission', role: 'first', topics: ['test'], url: '', code: '', note: '<script>unsafe</script>',
};
const rendered = renderPublications([sample]);
assert(rendered.includes('Safety &lt; &amp; &quot;title&quot;'), 'Publication titles must be HTML escaped.');
assert(!rendered.includes('<script>'), 'Publication data must not render as markup.');
assert(rendered.includes('<strong>Xiangqi Wang</strong>'), 'The site owner must be highlighted in author lists.');
assert(rendered.includes('Under review'), 'Submission status must stay explicit.');
assert(rendered.includes('FIRST AUTHOR'), 'First authorship must be visible.');
assert.throws(() => renderPublications([{ ...sample, url: 'javascript:alert(1)' }]), /HTTPS or HTTP/);
assert.throws(() => validatePublications([sample, sample]), /duplicates id/);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}

const files = await walk(output);
const scripts = (await walk(join(root, 'scripts'))).filter((file) => extname(file) === '.mjs');
for (const file of [...scripts, ...files.filter((file) => ['.js', '.mjs'].includes(extname(file)))]) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

let localReferences = 0;
for (const file of files.filter((file) => ['.html', '.css'].includes(extname(file)))) {
  const content = await readFile(file, 'utf8');
  const references = extname(file) === '.html'
    ? [...content.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)].map((match) => match[1])
    : [...content.matchAll(/url\(\s*["']?([^\s)'";]+)["']?\s*\)/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) continue;
    const [pathWithQuery, anchor] = reference.split('#');
    const assetPath = decodeURIComponent(pathWithQuery.split('?')[0]);
    let resolved = assetPath.startsWith('/') ? join(output, assetPath.slice(1)) : resolve(dirname(file), assetPath || relative(dirname(file), file));
    assert(resolved === output || resolved.startsWith(`${output}${sep}`), `Reference escapes dist/: ${reference}`);
    let info;
    try { info = await stat(resolved); } catch { throw new Error(`Missing local reference in ${relative(output, file)}: ${reference}`); }
    if (info.isDirectory()) resolved = join(resolved, 'index.html');
    await stat(resolved);
    if (anchor && extname(resolved) === '.html') {
      const targetIds = resolved === join(output, 'index.html') ? rootIds : new Set(
        [...(await readFile(resolved, 'utf8')).matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
      assert(targetIds.has(decodeURIComponent(anchor)), `Missing anchor in ${relative(output, file)}: ${reference}`);
    }
    localReferences++;
  }
}

for (const file of ['robots.txt', 'sitemap.xml', '.nojekyll', 'collaborations/index.html', 'about/index.html', 'publications/index.html', 'projects/index.html', 'news/index.html']) {
  await stat(join(output, file));
}
const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 2, 'The sitemap must contain the homepage and collaborations page.');
assert(sitemap.includes('/collaborations/</loc>'), 'The collaborations page must be discoverable in the sitemap.');
assert((await readFile(join(output, 'publications', 'index.html'), 'utf8')).includes('../#publications'), 'The old publications URL must still redirect to first-author work on the homepage.');

const cv = await readFile(join(output, 'assets', 'xiangqi-wang-cv.pdf'));
assert.equal(cv.subarray(0, 5).toString(), '%PDF-', 'The downloadable CV must be a PDF.');
assert.deepEqual(await readFile(join(output, 'cv.pdf')), cv, 'The legacy /cv.pdf URL must serve the current CV.');
assert(/href=["'](?:\.\/)?assets\/xiangqi-wang-cv\.pdf["']/.test(html), 'The homepage must link to the current CV.');

for (const filename of ['dm-sans.woff2', 'instrument-serif.woff2', 'instrument-serif-italic.woff2']) {
  const font = await readFile(join(output, 'assets', filename));
  assert.equal(font.subarray(0, 4).toString(), 'wOF2', `${filename} must be a WOFF2 font.`);
}
for (const filename of ['DM-Sans-LICENSE.txt', 'Instrument-Serif-LICENSE.txt']) {
  assert((await stat(join(output, 'assets', filename))).size > 0, `${filename} must accompany the fonts.`);
}
const socialImage = await readFile(join(output, 'assets', 'social-card.png'));
assert.deepEqual(socialImage.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'The social preview must be a PNG image.');
assert(html.includes('assets/social-card.png'), 'The homepage must reference the social preview image.');

console.log(`Checks passed: ${publications.length} publications across separate authorship pages, ${localReferences} local references, JavaScript syntax, escaped data, sitemap, legacy redirects, CV compatibility, fonts, and social preview.`);
