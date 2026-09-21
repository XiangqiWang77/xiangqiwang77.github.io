// Progressive enhancement: every publication and link is available without JavaScript.
// Each page owns its list: first-author work at / and collaborations at /collaborations/.
const papers = [...document.querySelectorAll('.publication')];
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const searchInput = document.querySelector('#publication-search');
const clearButton = document.querySelector('#clear-filters');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
let activeFilter = 'all';

function filterPublications() {
  const words = searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let visible = 0;
  papers.forEach(paper => {
    const categoryMatch = activeFilter === 'all'
      || (activeFilter === 'published' && paper.dataset.status === 'published')
      || (activeFilter === 'progress' && paper.dataset.status !== 'published');
    const searchMatch = words.every(word => (paper.dataset.search || '').includes(word));
    paper.hidden = !(categoryMatch && searchMatch);
    if (!paper.hidden) visible++;
  });
  if (resultCount) resultCount.textContent = `${visible} of ${papers.length} works`;
  if (emptyState) emptyState.hidden = visible > 0;
  if (clearButton) clearButton.hidden = activeFilter === 'all' && words.length === 0;
  filterButtons.forEach(button => {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function resetFilters() {
  activeFilter = 'all';
  if (searchInput) searchInput.value = '';
  if (papers.length && searchInput) filterPublications();
}

if (papers.length && searchInput) {
  const tools = document.querySelector('.publication-tools');
  const results = document.querySelector('.publication-results');
  if (tools) tools.hidden = false;
  if (results) results.hidden = false;
  filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterPublications();
  }));
  searchInput.addEventListener('input', filterPublications);
  clearButton?.addEventListener('click', resetFilters);
  document.querySelector('#reset-search')?.addEventListener('click', () => {
    resetFilters();
    searchInput.focus();
  });
  document.querySelectorAll('[data-quick-filter]').forEach(link => link.addEventListener('click', () => {
    activeFilter = 'all';
    searchInput.value = link.dataset.quickFilter;
    filterPublications();
  }));
  // Research links must still reveal their paper after a visitor narrows the list.
  document.querySelectorAll('a[href^="#pub-"]').forEach(link => {
    link.addEventListener('click', resetFilters);
  });
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#pub-')) {
      const target = document.getElementById(location.hash.slice(1));
      if (target?.hidden) { resetFilters(); target.scrollIntoView(); }
    }
  });
  filterPublications();
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
