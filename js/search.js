import Fuse from 'fuse.js'

const store = {
  searchItems: null,
  fuse: null,
}

const keywordEl = document.getElementById("keyword")
const searchInputEl = document.getElementById("search-input")
const searchEmptyEl = document.getElementById("search-empty")

function loadSearchItems() {
  const items = []
  document.querySelectorAll('.apps_item').forEach(el => {
    const nameEl = el.querySelector('.name')
    items.push({
      name: nameEl.textContent,
      url: el.href,
      el,
      nameEl,
      clsss: 'apps_item',
    })
  })

  document.querySelectorAll('.links_item').forEach(el => {
    items.push({
      name: el.textContent,
      url: el.href,
      el,
      nameEl: el,
      clsss: 'links_item',
    })
  })

  store.searchItems = items
  store.fuse = new Fuse(items, {
    keys: ['name', 'url'],
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    threshold: 0.1,
  })
}

function handleSearchInput(keyword) {
  // Security fix: Use textContent instead of innerHTML
  if (keyword) {
    keywordEl.textContent = keyword;
    // Restore proper styling structure if needed, or if CSS expects a span, create it safely
    // Looking at CSS #keyword span, it expects a span.
    keywordEl.innerHTML = ''; // Clear
    const span = document.createElement('span');
    span.textContent = keyword;
    keywordEl.appendChild(span);
  } else {
    keywordEl.innerHTML = ''
  }

  if (keyword.trim() === '') {
    document.querySelectorAll('.apps_item_wrap, .links_category').forEach(el => {
      el.classList.remove('hidden')
    })
    document.querySelectorAll('.apps, #links').forEach(el => {
      el.classList.remove('hidden')
    })
    store.searchItems.forEach(item => {
      if (item.nameEl) {
        // Security fix: Restore original text safely
        item.nameEl.textContent = item.name
      }
      item.el.classList.remove('matched')
    })
    searchEmptyEl.classList.add('hidden')
    return
  }

  const items = store.fuse.search(keyword)

  document.querySelectorAll('.apps_item_wrap').forEach(el => {
    el.classList.add('hidden')
  })
  document.querySelectorAll('.links_category').forEach(el => {
    el.classList.add('hidden')
  })
  document.querySelectorAll('.apps, #links').forEach(el => {
    el.classList.add('hidden')
  })

  store.searchItems.forEach(item => {
    if (item.nameEl) {
      item.nameEl.textContent = item.name
    }
    item.el.classList.remove('matched')
  })

  if (items.length === 0) {
    searchEmptyEl.classList.remove('hidden')
  } else {
    searchEmptyEl.classList.add('hidden')

    const visibleAppsSections = new Set()
    const visibleLinks = false

    items.forEach(i => {
      const item = i.item
      const nameMatch = i.matches.find(m => m.key === 'name')

      if (item.clsss === 'apps_item') {
        const wrap = item.el.closest('.apps_item_wrap')
        wrap.classList.remove('hidden')
        const section = item.el.closest('.apps')
        section.classList.remove('hidden')
        visibleAppsSections.add(section)
      }

      if (item.clsss === 'links_item') {
        const category = item.el.closest('.links_category')
        category.classList.remove('hidden')
        const section = item.el.closest('#links')
        section.classList.remove('hidden')
      }

      if (nameMatch && item.nameEl) {
        highlightText(item.nameEl, nameMatch)
        item.el.classList.add('matched')
      }
    })
  }
}

function highlightText(el, match) {
  match.indices.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))
  const text = match.value

  // Security fix: Build fragment safely instead of innerHTML
  el.innerHTML = '';
  let lastIndex = 0;

  // Fuse.js indices are sorted by relevance? We need them sorted by position for reconstruction
  // Actually the loop above sorted them by length maybe? Let's rely on standard sort for position
  const indices = [...match.indices].sort((a, b) => a[0] - b[0]);

  indices.forEach(range => {
    const start = range[0];
    const end = range[1] + 1;

    // Add text before match
    if (start > lastIndex) {
      el.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    // Add matched text
    const em = document.createElement('em');
    em.textContent = text.slice(start, end);
    el.appendChild(em);

    lastIndex = end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    el.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

export function initKeyboardSearch() {
  loadSearchItems()

  searchInputEl.addEventListener('input', (e) => {
    handleSearchInput(e.target.value)
  })

  searchInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInputEl.value = ''
      handleSearchInput('')
      searchInputEl.blur() // Also blur on escape
    }
  })

  // UX Optimization: Global shortcut "/" to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/') {
      // Don't trigger if user is already typing in an input
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      searchInputEl.focus();
    }
  })
}
