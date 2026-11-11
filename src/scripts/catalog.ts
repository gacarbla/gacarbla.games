export {};

const CATALOG_PATH = '/juegos/';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-catalog]')) {
  setupCatalog(root);
}

function setupCatalog(root: HTMLElement): void {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-game-card]'));
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const searchInput = root.querySelector<HTMLInputElement>('[data-game-search]');
  const clearButton = root.querySelector<HTMLButtonElement>('[data-search-clear]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-reset-filters]');
  const emptyState = root.querySelector<HTMLElement>('[data-empty]');
  const resultsLive = root.querySelector<HTMLElement>('[data-results-live]');
  const searchWrap = searchInput?.closest<HTMLElement>('.search') ?? null;
  const isCatalogPage = window.location.pathname === CATALOG_PATH;

  if (cards.length === 0) return;

  const params = new URLSearchParams(window.location.search);
  let category = isCatalogPage ? (params.get('categoria')?.trim() ?? 'todos') : 'todos';
  let query = isCatalogPage ? (params.get('q') ?? '') : '';

  if (!chips.some((chip) => chip.dataset.filter === category)) category = 'todos';
  if (!searchInput) query = '';

  function syncChips(): void {
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === category));
    }
  }

  function syncUrl(): void {
    if (!isCatalogPage) return;
    const url = new URL(window.location.href);
    if (category === 'todos') url.searchParams.delete('categoria');
    else url.searchParams.set('categoria', category);

    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function apply(): void {
    const needle = normalize(query);
    let visible = 0;

    for (const card of cards) {
      const cardCategory = card.dataset.category ?? '';
      const haystack = normalize(card.dataset.search ?? card.textContent ?? '');
      const matchesCategory = category === 'todos' || cardCategory === category;
      const matchesQuery = needle.length === 0 || haystack.includes(needle);
      const matches = matchesCategory && matchesQuery;
      card.hidden = !matches;
      if (matches) visible += 1;
    }

    if (emptyState) emptyState.hidden = visible > 0;
    if (resultsLive) {
      resultsLive.textContent =
        visible === 0
          ? 'No hay juegos que coincidan con el filtro.'
          : `${visible} ${visible === 1 ? 'juego visible' : 'juegos visibles'}.`;
    }
    searchWrap?.classList.toggle('has-value', query.trim().length > 0);
    syncChips();
    syncUrl();
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      category = chip.dataset.filter ?? 'todos';
      apply();
    });
  }

  searchInput?.addEventListener('input', () => {
    query = searchInput.value;
    apply();
  });

  searchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    searchInput.value = '';
    query = '';
    apply();
  });

  clearButton?.addEventListener('click', () => {
    if (!searchInput) return;
    searchInput.value = '';
    query = '';
    apply();
    searchInput.focus();
  });

  resetButton?.addEventListener('click', () => {
    category = 'todos';
    query = '';
    if (searchInput) searchInput.value = '';
    apply();
    searchInput?.focus();
  });

  if (searchInput) searchInput.value = query;
  apply();
}
