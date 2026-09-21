const statuses = new Set(['published', 'submission', 'preprint', 'ongoing']);
const roles = new Set(['first', 'coauthor']);

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validatePublications(publications) {
  assert(Array.isArray(publications) && publications.length > 0,
    'data/publications.json must contain a nonempty array.');
  const ids = new Set();
  publications.forEach((publication, index) => {
    const label = `Publication ${index + 1}`;
    assert(publication && typeof publication === 'object', `${label} must be an object.`);
    assert(typeof publication.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(publication.id),
      `${label} needs a lowercase, hyphen-separated id.`);
    assert(!ids.has(publication.id), `${label} duplicates id "${publication.id}".`);
    ids.add(publication.id);
    for (const key of ['title', 'venue']) {
      assert(typeof publication[key] === 'string' && publication[key].trim(), `${label} needs ${key}.`);
    }
    assert((typeof publication.authors === 'string' && publication.authors.trim()) ||
      (Array.isArray(publication.authors) && publication.authors.length > 0 &&
      publication.authors.every((author) => typeof author === 'string' && author.trim())),
    `${label} needs an authors string or array of author names.`);
    assert(publication.year === null || (Number.isInteger(publication.year) && publication.year >= 2000 && publication.year <= 2100),
      `${label} needs a four-digit year between 2000 and 2100, or null when unspecified.`);
    assert(statuses.has(publication.status), `${label} has an invalid status.`);
    assert(roles.has(publication.role), `${label} has an invalid role.`);
    assert(Array.isArray(publication.topics) && publication.topics.length > 0 &&
      publication.topics.every((topic) => typeof topic === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(topic)),
    `${label} topics must be a nonempty array of lowercase tags.`);
    for (const key of ['url', 'code']) {
      const value = publication[key];
      if (value === undefined || value === null || value === '') continue;
      assert(typeof value === 'string', `${label} ${key} must be a URL string.`);
      let url;
      try { url = new URL(value); } catch { throw new Error(`${label} has an invalid ${key} URL.`); }
      assert(['https:', 'http:'].includes(url.protocol), `${label} ${key} must use HTTPS or HTTP.`);
    }
    assert(publication.note === undefined || publication.note === null || typeof publication.note === 'string',
      `${label} note must be a string.`);
  });
  return publications;
}

export function renderPublications(publications) {
  validatePublications(publications);
  const labels = { submission: 'Under review', preprint: 'Preprint', ongoing: 'Ongoing' };
  return publications.map((publication, index) => {
    const authors = Array.isArray(publication.authors) ? publication.authors.join(', ') : publication.authors;
    const search = [publication.title, authors, publication.venue, publication.note || '', ...publication.topics].join(' ').toLowerCase();
    const authorHtml = escapeHtml(authors).replace(/Xiangqi Wang/g, '<strong>Xiangqi Wang</strong>');
    const title = escapeHtml(publication.title);
    const yearLabel = publication.year !== null && !new RegExp(`\\b${publication.year}\\b`).test(publication.venue)
      ? ` · ${publication.year}` : '';
    const link = (url, label) => `<a href="${escapeHtml(url)}"${['Paper', 'Code'].includes(label) ? ` aria-label="${label}: ${title}"` : ''} target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true"> ↗</span></a>`;
    const links = [publication.url ? link(publication.url, 'Paper') : '', publication.code ? link(publication.code, 'Code') : ''].filter(Boolean).join('\n          ');
    return `      <li class="publication" id="pub-${escapeHtml(publication.id)}" data-year="${publication.year ?? ''}" data-status="${publication.status}" data-role="${publication.role}" data-topics="${escapeHtml(publication.topics.join(' '))}" data-search="${escapeHtml(search)}">
        <span class="pub-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
        <div class="pub-content">
          <div class="pub-meta"><span class="pub-venue">${escapeHtml(publication.venue)}${yearLabel}</span>${publication.status !== 'published' ? `<span class="pub-status">${labels[publication.status]}</span>` : ''}</div>
          <h3>${publication.url ? link(publication.url, title) : title}</h3>
          <p class="pub-authors">${authorHtml}</p>${publication.note ? `\n          <p class="pub-note">${escapeHtml(publication.note)}</p>` : ''}${links ? `\n          <div class="pub-links">${links}</div>` : ''}
        </div>
      </li>`;
  }).join('\n');
}
