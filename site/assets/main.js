// Progressive enhancement: all research and links remain available without JavaScript.
const papers = [...document.querySelectorAll('.publication')];
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const searchInput = document.querySelector('#publication-search');
const clearButton = document.querySelector('#clear-filters');
let activeFilter = 'all';
function filterPublications() {
  const words = searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let visible = 0;
  papers.forEach(paper => {
    const categoryMatch = activeFilter === 'all' || (activeFilter === 'first' && paper.dataset.role === 'first') || (activeFilter === 'published' && paper.dataset.status === 'published') || (activeFilter === 'progress' && paper.dataset.status !== 'published');
    const searchMatch = words.every(word => paper.dataset.search.includes(word));
    paper.hidden = !(categoryMatch && searchMatch);
    if (!paper.hidden) visible++;
  });
  document.querySelector('#result-count').textContent = `${visible} of ${papers.length} works`;
  document.querySelector('#empty-state').hidden = visible > 0;
  clearButton.hidden = activeFilter === 'all' && words.length === 0;
  filterButtons.forEach(button => {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function resetFilters() { activeFilter = 'all'; searchInput.value = ''; filterPublications(); }
if (papers.length && searchInput) {
  document.querySelector('.publication-tools').hidden = false;
  document.querySelector('.publication-results').hidden = false;
  filterButtons.forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; filterPublications(); }));
  searchInput.addEventListener('input', filterPublications);
  clearButton.addEventListener('click', resetFilters);
  document.querySelector('#reset-search').addEventListener('click', () => { resetFilters(); searchInput.focus(); });
  document.querySelectorAll('[data-quick-filter]').forEach(link => link.addEventListener('click', () => { activeFilter = 'all'; searchInput.value = link.dataset.quickFilter; filterPublications(); }));
  filterPublications();
}
const researchThemes = {
  adapt: {word:'Adapt.', index:'01', description:'Adapt from new experience.\nPreserve what matters.'},
  reason: {word:'Reason.', index:'02', description:'Think flexibly and reliably.\nGet there for the right reasons.'},
  align: {word:'Align.', index:'03', description:'Learn with a sense of direction.\nStay true as capabilities grow.'}
};
document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
  const theme = researchThemes[button.dataset.theme];
  document.querySelector('#orbit-word').textContent = theme.word;
  document.querySelector('#orbit-index').textContent = theme.index;
  const description = document.querySelector('#orbit-description');
  description.replaceChildren();
  theme.description.split('\n').forEach((line, index) => { if (index) description.append(document.createElement('br')); description.append(document.createTextNode(line)); });
  document.querySelectorAll('[data-theme]').forEach(node => { const active = node === button; node.classList.toggle('is-active', active); node.setAttribute('aria-pressed', String(active)); });
}));
document.querySelector('#year').textContent = new Date().getFullYear();
