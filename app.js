(() => {
  // Initialize Supabase
  const SUPABASE_URL = 'https://yeeiagpqlkdfsawwoccr.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_wTY4fUgWkoo4kc8YIPAU1g_I78qdZdR';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let currentUser = null;

  // DOM elements
  const noteForm = document.getElementById("noteForm");
  const noteInput = document.getElementById("noteInput");
  const autocompleteGhost = document.getElementById("autocompleteGhost");
  const searchInput = document.getElementById("searchInput");
  const viewToggle = document.getElementById("viewToggle");
  const notesContainer = document.getElementById("notesContainer");
  const allList = document.getElementById("allList");
  const allTab = document.getElementById("allTab");
  const booksList = document.getElementById("booksList");
  const moviesList = document.getElementById("moviesList");
  const showsList = document.getElementById("showsList");
  const restaurantsList = document.getElementById("restaurantsList");
  const drinksList = document.getElementById("drinksList");
  const activitiesList = document.getElementById("activitiesList");
  const otherList = document.getElementById("otherList");
  const editModal = document.getElementById("editModal");
  const editTags = document.getElementById("editTags");
  const editTitle = document.getElementById("editTitle");
  const editFields = document.getElementById("editFields");
  const editHashTags = document.getElementById("editHashTags");
  const editNotes = document.getElementById("editNotes");
  const saveEditBtn = document.getElementById("saveEdit");
  const cancelEditBtn = document.getElementById("cancelEdit");

  // Auth elements
  const authModal = document.getElementById("authModal");
  const authTitle = document.getElementById("authTitle");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authSubmit = document.getElementById("authSubmit");
  const authToggle = document.getElementById("authToggle");
  const authError = document.getElementById("authError");
  const userEmail = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");

  // Storage keys
  const STORAGE_KEY = "smartNotesAppData";
  const AUTOCOMPLETE_KEY = "smartNotesAutocomplete";
  const ACTIVE_TAB_KEY = "smartNotesActiveTab";
  const VIEW_MODE_KEY = "smartNotesViewMode";

  // Define categories
  const CATEGORIES = {
    all: { name: 'All Results', listEl: allList, sectionEl: document.getElementById('allSection'), aliases: [] },
    book: { name: 'Books', listEl: booksList, sectionEl: document.getElementById('booksSection'), aliases: ['book', 'books'] },
    movie: { name: 'Movies', listEl: moviesList, sectionEl: document.getElementById('moviesSection'), aliases: ['movie', 'movies', 'film', 'films'] },
    show: { name: 'Shows', listEl: showsList, sectionEl: document.getElementById('showsSection'), aliases: ['show', 'shows', 'tv', 'series'] },
    restaurant: { name: 'Restaurants', listEl: restaurantsList, sectionEl: document.getElementById('restaurantsSection'), aliases: ['restaurant', 'restaurants'] },
    drink: { name: 'Drinks', listEl: drinksList, sectionEl: document.getElementById('drinksSection'), aliases: ['drink', 'drinks', 'beer', 'wine', 'cocktail'] },
    activity: { name: 'Activities', listEl: activitiesList, sectionEl: document.getElementById('activitiesSection'), aliases: ['activity', 'activities', 'hike', 'hiking', 'concert', 'museum', 'theater', 'gallery', 'event'] },
    other: { name: 'Other', listEl: otherList, sectionEl: document.getElementById('otherSection'), aliases: [] }
  };

  // Load notes from localStorage
  let notesData = [];
  let currentEditIndex = -1;
  let searchQuery = "";
  let autocompleteData = { keys: {}, values: {} }; // Track field keys and their values
  let activeTab = 'book'; // Default to Books tab
  let viewMode = 'comfort'; // 'compact' or 'comfort'
  let activeFilters = {}; // Store active filter selections per category { categoryKey: { fieldKey: value } }

  async function loadNotes() {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      notesData = data.map(row => ({
        id: row.id,
        tags: row.tags || [],
        hashTags: row.hash_tags || [],
        fields: row.fields || {},
        title: row.title || '',
        notes: row.notes || '',
        raw: row.raw || '',
        timestamp: row.timestamp
      }));

      renderNotes();
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  function loadAutocompleteData() {
    const saved = localStorage.getItem(AUTOCOMPLETE_KEY);
    if (saved) {
      try {
        autocompleteData = JSON.parse(saved);
      } catch (e) {
        autocompleteData = { keys: {}, values: {} };
      }
    }
    // Build autocomplete data from existing notes
    rebuildAutocompleteData();
  }

  function rebuildAutocompleteData() {
    notesData.forEach(note => {
      if (note.fields) {
        Object.entries(note.fields).forEach(([key, value]) => {
          // Track the key
          if (!autocompleteData.keys[key]) {
            autocompleteData.keys[key] = 0;
          }
          autocompleteData.keys[key]++;

          // Track key:value combinations
          if (!autocompleteData.values[key]) {
            autocompleteData.values[key] = {};
          }
          if (!autocompleteData.values[key][value]) {
            autocompleteData.values[key][value] = 0;
          }
          autocompleteData.values[key][value]++;
        });
      }
    });
    saveAutocompleteData();
  }

  function saveAutocompleteData() {
    localStorage.setItem(AUTOCOMPLETE_KEY, JSON.stringify(autocompleteData));
  }

  // Save notes - no longer needed for individual operations
  // Notes are saved directly to Supabase in addNote, saveEdit, deleteNote
  function saveNotes() {
    // Deprecated - kept for compatibility
  }

  // Load active tab from localStorage
  function loadActiveTab() {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    // Don't restore 'all' tab on page load (it's search-only)
    if (saved && CATEGORIES[saved] && saved !== 'all') {
      activeTab = saved;
    }
  }

  // Save active tab to localStorage
  function saveActiveTab() {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }

  // Switch to a specific tab
  function switchTab(categoryKey) {
    activeTab = categoryKey;
    saveActiveTab();

    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      const isActive = tab.dataset.category === categoryKey;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Update sections
    Object.entries(CATEGORIES).forEach(([key, category]) => {
      const isActive = key === categoryKey;
      category.sectionEl.classList.toggle('active', isActive);
    });
  }

  // Load view mode from localStorage
  function loadViewMode() {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved && (saved === 'compact' || saved === 'comfort')) {
      viewMode = saved;
    }
  }

  // Save view mode to localStorage
  function saveViewMode() {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }

  // Toggle between compact and comfort view
  function toggleView() {
    viewMode = viewMode === 'compact' ? 'comfort' : 'compact';
    saveViewMode();
    updateViewMode();
  }

  // Update UI based on view mode
  function updateViewMode() {
    if (viewMode === 'compact') {
      notesContainer.classList.add('compact-view');
      viewToggle.textContent = 'Comfort';
    } else {
      notesContainer.classList.remove('compact-view');
      viewToggle.textContent = 'Compact';
    }
  }

  // Sanitize and escape HTML for display
  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m];
    });
  }

  // Format timestamp
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Create list item element for a note
  function createListItem(note, index, showCategoryBadge = false) {
    const li = document.createElement("li");

    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";

    if (note.title) {
      const titleEl = document.createElement("strong");

      // Add category badge if requested (for "All Results" view)
      if (showCategoryBadge) {
        const categoryKey = getCategoryForNote(note);
        const categoryName = CATEGORIES[categoryKey]?.name || 'Other';
        const badge = document.createElement("span");
        badge.className = "category-badge";
        badge.textContent = categoryName.toUpperCase();
        titleEl.appendChild(badge);
      }

      const titleText = document.createTextNode(note.title);
      titleEl.appendChild(titleText);
      contentDiv.appendChild(titleEl);
    }

    if (note.notes) {
      const notesEl = document.createElement("small");
      notesEl.textContent = note.notes;
      contentDiv.appendChild(notesEl);
    }

    if (!note.title && !note.notes && note.raw) {
      contentDiv.textContent = note.raw;
    }

    // Add structured fields
    if (note.fields && Object.keys(note.fields).length > 0) {
      const fieldsDiv = document.createElement("div");
      fieldsDiv.className = "fields";
      Object.entries(note.fields).forEach(([key, value]) => {
        const fieldSpan = document.createElement("span");
        fieldSpan.className = "field";
        fieldSpan.innerHTML = `<span class="field-key">${escapeHTML(key)}:</span> ${escapeHTML(value)}`;
        fieldsDiv.appendChild(fieldSpan);
      });
      contentDiv.appendChild(fieldsDiv);
    }

    // Add hashtags (resource type is already shown in title)
    if (note.hashTags && note.hashTags.length > 0) {
      const tagsDiv = document.createElement("div");
      tagsDiv.className = "tags";

      note.hashTags.forEach(hashTag => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "tag";
        tagSpan.textContent = '#' + hashTag;
        tagsDiv.appendChild(tagSpan);
      });

      contentDiv.appendChild(tagsDiv);
    }

    // Add timestamp
    if (note.timestamp) {
      const timestampDiv = document.createElement("div");
      timestampDiv.className = "timestamp";
      timestampDiv.textContent = formatTimestamp(note.timestamp);
      contentDiv.appendChild(timestampDiv);
    }

    li.appendChild(contentDiv);

    // Add action buttons
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "note-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => editNote(index);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteNote(index);

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    li.appendChild(actionsDiv);

    return li;
  }

  // Filter notes based on search query
  function filterNotes() {
    if (!searchQuery) return notesData;

    // Split search query into individual terms for OR logic
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return notesData.filter(note => {
      // Check if ANY search term matches ANY field in the note
      return terms.some(term => {
        const titleMatch = note.title && note.title.toLowerCase().includes(term);
        const notesMatch = note.notes && note.notes.toLowerCase().includes(term);
        const rawMatch = note.raw && note.raw.toLowerCase().includes(term);
        const tagsMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(term));
        const hashTagsMatch = note.hashTags && note.hashTags.some(hashTag => hashTag.toLowerCase().includes(term));
        const fieldsMatch = note.fields && Object.entries(note.fields).some(([key, value]) =>
          key.toLowerCase().includes(term) || value.toLowerCase().includes(term)
        );

        return titleMatch || notesMatch || rawMatch || tagsMatch || hashTagsMatch || fieldsMatch;
      });
    });
  }

  // Apply field filters to notes
  function applyFieldFilters(notes, categoryKey) {
    if (!activeFilters[categoryKey] || Object.keys(activeFilters[categoryKey]).length === 0) {
      return notes;
    }

    return notes.filter(note => {
      // Check if note matches ALL active filters for this category
      return Object.entries(activeFilters[categoryKey]).every(([fieldKey, filterValue]) => {
        if (!filterValue || filterValue === 'all') return true; // No filter or "All" selected
        return note.fields && note.fields[fieldKey] && note.fields[fieldKey].toLowerCase() === filterValue.toLowerCase();
      });
    });
  }

  // Generate filter UI for a category
  function generateCategoryFilters(categoryKey) {
    if (categoryKey === 'all') return; // No filters for "All Results" view

    const filterContainer = document.getElementById(`${categoryKey === 'book' ? 'books' : categoryKey === 'movie' ? 'movies' : categoryKey === 'show' ? 'shows' : categoryKey === 'restaurant' ? 'restaurants' : categoryKey === 'drink' ? 'drinks' : categoryKey === 'activity' ? 'activities' : 'other'}Filters`);
    if (!filterContainer) return;

    // Get all notes for this category
    const categoryNotes = notesData.filter(note => getCategoryForNote(note) === categoryKey);

    if (categoryNotes.length === 0) {
      filterContainer.innerHTML = '';
      return;
    }

    // Find all unique field keys used in this category
    const fieldKeys = new Set();
    categoryNotes.forEach(note => {
      if (note.fields) {
        Object.keys(note.fields).forEach(key => fieldKeys.add(key));
      }
    });

    if (fieldKeys.size === 0) {
      filterContainer.innerHTML = '';
      return;
    }

    // Build filter UI
    let filterHTML = '<div class="filters">';

    fieldKeys.forEach(fieldKey => {
      // Get all unique values for this field
      const values = new Set();
      categoryNotes.forEach(note => {
        if (note.fields && note.fields[fieldKey]) {
          values.add(note.fields[fieldKey]);
        }
      });

      const sortedValues = Array.from(values).sort();
      const currentValue = activeFilters[categoryKey]?.[fieldKey] || 'all';

      filterHTML += `
        <div class="filter-group">
          <label>${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}:</label>
          <select class="filter-select" data-category="${categoryKey}" data-field="${fieldKey}">
            <option value="all" ${currentValue === 'all' ? 'selected' : ''}>All</option>
            ${sortedValues.map(value => `
              <option value="${escapeHTML(value)}" ${currentValue === value ? 'selected' : ''}>
                ${escapeHTML(value)}
              </option>
            `).join('')}
          </select>
        </div>
      `;
    });

    // Add clear filters button if any filters are active
    const hasActiveFilters = activeFilters[categoryKey] && Object.values(activeFilters[categoryKey]).some(v => v && v !== 'all');
    if (hasActiveFilters) {
      filterHTML += '<button class="clear-filters-btn" data-category="' + categoryKey + '">Clear Filters</button>';
    }

    filterHTML += '</div>';
    filterContainer.innerHTML = filterHTML;

    // Add event listeners to filter selects
    filterContainer.querySelectorAll('.filter-select').forEach(select => {
      select.addEventListener('change', handleFilterChange);
    });

    // Add event listener to clear button
    const clearBtn = filterContainer.querySelector('.clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', handleClearFilters);
    }
  }

  // Handle filter change
  function handleFilterChange(e) {
    const categoryKey = e.target.dataset.category;
    const fieldKey = e.target.dataset.field;
    const value = e.target.value;

    if (!activeFilters[categoryKey]) {
      activeFilters[categoryKey] = {};
    }

    if (value === 'all') {
      delete activeFilters[categoryKey][fieldKey];
    } else {
      activeFilters[categoryKey][fieldKey] = value;
    }

    renderNotes();
  }

  // Handle clear all filters
  function handleClearFilters(e) {
    const categoryKey = e.target.dataset.category;
    activeFilters[categoryKey] = {};
    renderNotes();
  }

  // Determine which category a note belongs to
  function getCategoryForNote(note) {
    if (!note.tags || note.tags.length === 0) return 'other';

    // Check if any tag matches a category alias
    for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
      if (categoryKey === 'other' || categoryKey === 'all') continue; // Skip 'other' and 'all', 'other' is the default

      for (const tag of note.tags) {
        if (category.aliases.includes(tag.toLowerCase())) {
          return categoryKey;
        }
      }
    }

    return 'other';
  }

  // Render all notes
  function renderNotes() {
    // Clear all lists
    allList.innerHTML = "";
    booksList.innerHTML = "";
    moviesList.innerHTML = "";
    showsList.innerHTML = "";
    restaurantsList.innerHTML = "";
    drinksList.innerHTML = "";
    activitiesList.innerHTML = "";
    otherList.innerHTML = "";

    const filteredNotes = filterNotes();

    // Show/hide "All Results" tab based on search query
    if (searchQuery) {
      allTab.style.display = 'block';
      // Auto-switch to "All Results" tab when searching
      if (activeTab !== 'all') {
        switchTab('all');
      }
    } else {
      allTab.style.display = 'none';
      // If we're on "All Results" tab and search is cleared, switch back to a valid tab
      if (activeTab === 'all') {
        switchTab('book');
      }
    }

    if (filteredNotes.length === 0) {
      const message = searchQuery ? "No notes found matching your search." : "No notes yet. Start adding some!";

      if (searchQuery) {
        allList.innerHTML = `<li><em>${message}</em></li>`;
      } else {
        otherList.innerHTML = `<li><em>${message}</em></li>`;
      }
      return;
    }

    // If searching, populate "All Results" view
    if (searchQuery) {
      filteredNotes.forEach(note => {
        const originalIndex = notesData.indexOf(note);
        allList.appendChild(createListItem(note, originalIndex, true)); // true = show category badge
      });
    }

    // Group notes by category for individual category tabs
    const notesByCategory = {
      book: [],
      movie: [],
      show: [],
      restaurant: [],
      drink: [],
      activity: [],
      other: []
    };

    filteredNotes.forEach(note => {
      const category = getCategoryForNote(note);
      notesByCategory[category].push(note);
    });

    // Render each category
    Object.entries(notesByCategory).forEach(([categoryKey, notes]) => {
      const category = CATEGORIES[categoryKey];

      // Generate filter UI for this category (only if not searching)
      if (!searchQuery) {
        generateCategoryFilters(categoryKey);
      }

      // Apply field filters to notes for this category (only if not searching)
      let displayNotes = notes;
      if (!searchQuery) {
        displayNotes = applyFieldFilters(notes, categoryKey);
      }

      if (displayNotes.length === 0) {
        const message = !searchQuery && notes.length > 0 && displayNotes.length === 0
          ? `No ${category.name.toLowerCase()} match the current filters.`
          : `No ${category.name.toLowerCase()} yet.`;
        category.listEl.innerHTML = `<li><em>${message}</em></li>`;
      } else {
        displayNotes.forEach(note => {
          const originalIndex = notesData.indexOf(note);
          category.listEl.appendChild(createListItem(note, originalIndex));
        });
      }
    });
  }

  // Parse input string for tags, fields, and content
  // Format: "category: Title, key:value, #hashtag, free-form notes"
  function parseNoteInput(text) {
    const raw = text.trim();
    let resourceTags = []; // Category tags (book, movie, etc.)
    let hashTags = []; // Hashtags (#sports, #inspiring)
    let fields = {};
    let title = "";
    let notes = "";
    let content = raw;

    // Check if there's a colon separating resource tags from content
    const colonIndex = raw.indexOf(':');
    if (colonIndex > 0) {
      const tagsPart = raw.substring(0, colonIndex).trim();
      content = raw.substring(colonIndex + 1).trim();

      // Split resource tags by comma
      resourceTags = tagsPart.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    }

    // If no resource tags specified, add default 'note' tag
    if (resourceTags.length === 0) {
      resourceTags = ['note'];
    }

    // Auto-add hashtags for drink sub-types (beer, wine, cocktail)
    // If someone types "beer: Heady Topper", automatically add #beer
    const drinkSubTypes = ['beer', 'wine', 'cocktail'];
    resourceTags.forEach(tag => {
      if (drinkSubTypes.includes(tag)) {
        // Add as hashtag if not already present
        if (!hashTags.includes(tag)) {
          hashTags.push(tag);
        }
      }
    });

    // Auto-add hashtags for activity sub-types (hike, concert, museum, etc.)
    // If someone types "hike: Blue Hills", automatically add #hike
    const activitySubTypes = ['hike', 'hiking', 'concert', 'museum', 'theater', 'gallery', 'event'];
    resourceTags.forEach(tag => {
      if (activitySubTypes.includes(tag)) {
        // Add as hashtag if not already present
        if (!hashTags.includes(tag)) {
          hashTags.push(tag);
        }
      }
    });

    // Parse content: split by comma
    const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length > 0) {
      // First part is always the title
      title = parts[0];

      // Process remaining parts
      let noteParts = [];
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];

        // Check if it's a hashtag
        if (part.startsWith('#')) {
          const hashTag = part.substring(1).trim().toLowerCase();
          if (hashTag.length > 0) {
            hashTags.push(hashTag);
          }
          continue;
        }

        // Check if it's a key:value field
        const kvMatch = part.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
        if (kvMatch) {
          // This is a key:value field
          const key = kvMatch[1].toLowerCase();
          const value = kvMatch[2].trim();
          fields[key] = value;

          // Track for autocomplete
          if (!autocompleteData.keys[key]) {
            autocompleteData.keys[key] = 0;
          }
          autocompleteData.keys[key]++;

          if (!autocompleteData.values[key]) {
            autocompleteData.values[key] = {};
          }
          if (!autocompleteData.values[key][value]) {
            autocompleteData.values[key][value] = 0;
          }
          autocompleteData.values[key][value]++;
        } else {
          // This is free-form notes
          noteParts.push(part);
        }
      }

      // Combine all non-field, non-hashtag parts as notes
      if (noteParts.length > 0) {
        notes = noteParts.join(', ');
      }
    }

    saveAutocompleteData();

    return {
      tags: resourceTags, // Resource type tags (for categorization)
      hashTags: hashTags, // User-added hashtags
      fields,
      title,
      notes,
      raw,
      timestamp: Date.now()
    };
  }

  // Autocomplete logic
  function updateAutocomplete() {
    const inputValue = noteInput.value;
    const cursorPos = noteInput.selectionStart;

    // Find the current segment (after last comma or start)
    const beforeCursor = inputValue.substring(0, cursorPos);
    const lastCommaIndex = beforeCursor.lastIndexOf(',');
    const currentSegment = beforeCursor.substring(lastCommaIndex + 1).trim();

    // Check if we're after the main colon
    const mainColonIndex = inputValue.indexOf(':');
    if (mainColonIndex === -1 || cursorPos <= mainColonIndex) {
      autocompleteGhost.textContent = '';
      return;
    }

    // Check if current segment looks like it could be a field (contains : or is typing one)
    const kvMatch = currentSegment.match(/^([a-zA-Z0-9_-]*):?([a-zA-Z0-9_-]*)$/);
    if (!kvMatch) {
      autocompleteGhost.textContent = '';
      return;
    }

    const [, key, value] = kvMatch;
    const hasColon = currentSegment.includes(':');

    let suggestion = '';

    if (!hasColon && key) {
      // Suggest key completion
      const matchingKeys = Object.keys(autocompleteData.keys)
        .filter(k => k.startsWith(key.toLowerCase()) && k !== key.toLowerCase())
        .sort((a, b) => autocompleteData.keys[b] - autocompleteData.keys[a]);

      if (matchingKeys.length > 0) {
        suggestion = matchingKeys[0].substring(key.length) + ':';
      }
    } else if (hasColon && key && autocompleteData.values[key]) {
      // Suggest value completion
      const matchingValues = Object.keys(autocompleteData.values[key])
        .filter(v => v.toLowerCase().startsWith(value.toLowerCase()) && v.toLowerCase() !== value.toLowerCase())
        .sort((a, b) => autocompleteData.values[key][b] - autocompleteData.values[key][a]);

      if (matchingValues.length > 0) {
        suggestion = matchingValues[0].substring(value.length);
      }
    }

    if (suggestion) {
      // Show only the suggestion, positioned after existing text
      const beforeText = inputValue.substring(0, cursorPos);
      // Use HTML to make beforeText invisible (for spacing) and suggestion visible
      autocompleteGhost.innerHTML = `<span style="color: transparent;">${escapeHTML(beforeText)}</span><span style="color: #ccc;">${escapeHTML(suggestion)}</span>`;
    } else {
      autocompleteGhost.innerHTML = '';
    }
  }

  // Handle Tab key for autocomplete
  function handleTab(e) {
    const ghostText = autocompleteGhost.textContent;
    if (ghostText) {
      e.preventDefault();
      const cursorPos = noteInput.selectionStart;
      noteInput.value = ghostText + noteInput.value.substring(cursorPos);
      noteInput.selectionStart = noteInput.selectionEnd = ghostText.length;
      updateAutocomplete();
    }
  }

  // Add note
  async function addNote(note) {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: currentUser.id,
          tags: note.tags,
          hash_tags: note.hashTags,
          fields: note.fields,
          title: note.title,
          notes: note.notes,
          raw: note.raw,
          timestamp: note.timestamp
        }])
        .select()
        .single();

      if (error) throw error;

      // Add the new note with its ID to the local array
      notesData.unshift({
        id: data.id,
        tags: data.tags,
        hashTags: data.hash_tags,
        fields: data.fields,
        title: data.title,
        notes: data.notes,
        raw: data.raw,
        timestamp: data.timestamp
      });

      // Switch to the tab where this note belongs
      const category = getCategoryForNote(note);
      switchTab(category);

      renderNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to save note. Please try again.');
    }
  }

  // Edit note
  function editNote(index) {
    currentEditIndex = index;
    const note = notesData[index];

    editTags.value = note.tags.join(', ');
    editTitle.value = note.title || '';
    editFields.value = Object.entries(note.fields || {}).map(([k, v]) => `${k}:${v}`).join(', ');
    editHashTags.value = (note.hashTags || []).join(', ');
    editNotes.value = note.notes || '';

    editModal.classList.add('show');
    editTags.focus();
  }

  // Save edited note
  async function saveEdit() {
    if (currentEditIndex < 0 || currentEditIndex >= notesData.length) return;
    if (!currentUser) return;

    const tags = editTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const title = editTitle.value.trim();
    const notes = editNotes.value.trim();
    const hashTags = editHashTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

    // Parse fields
    const fields = {};
    const fieldParts = editFields.value.split(',').map(f => f.trim()).filter(f => f.length > 0);
    fieldParts.forEach(part => {
      const kvMatch = part.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
      if (kvMatch) {
        fields[kvMatch[1].toLowerCase()] = kvMatch[2].trim();
      }
    });

    if (tags.length === 0) {
      tags.push('note');
    }

    // Reconstruct raw text
    let raw = tags.join(', ') + ': ' + title;
    if (Object.keys(fields).length > 0) {
      raw += ', ' + Object.entries(fields).map(([k, v]) => `${k}:${v}`).join(', ');
    }
    if (hashTags.length > 0) {
      raw += ', ' + hashTags.map(tag => `#${tag}`).join(', ');
    }
    if (notes) {
      raw += ', ' + notes;
    }

    const noteId = notesData[currentEditIndex].id;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          tags,
          hash_tags: hashTags,
          fields,
          title,
          notes,
          raw
        })
        .eq('id', noteId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Update local data
      notesData[currentEditIndex] = {
        ...notesData[currentEditIndex],
        tags,
        hashTags,
        fields,
        title,
        notes,
        raw
      };

      rebuildAutocompleteData();
      renderNotes();
      closeEditModal();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    }
  }

  // Close edit modal
  function closeEditModal() {
    editModal.classList.remove('show');
    currentEditIndex = -1;
    editTags.value = '';
    editTitle.value = '';
    editFields.value = '';
    editHashTags.value = '';
    editNotes.value = '';
  }

  // Delete note
  async function deleteNote(index) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    if (!currentUser) return;

    const noteId = notesData[index].id;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      notesData.splice(index, 1);
      renderNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  }

  // Authentication functions
  let isSignUp = false;

  async function handleAuth(e) {
    e.preventDefault();
    authError.textContent = '';

    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!email || !password) {
      authError.textContent = 'Please enter both email and password';
      return;
    }

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        if (data.user) {
          // Check if email confirmation is required
          if (data.session) {
            // No email confirmation required - user is logged in
            currentUser = data.user;
            authModal.style.display = 'none';
            userEmail.textContent = currentUser.email;
            userEmail.style.display = 'inline';
            logoutBtn.style.display = 'inline';
            await loadNotes();
          } else {
            // Email confirmation required
            authError.style.color = 'green';
            authError.textContent = 'Account created! Please check your email to verify your account, then sign in.';
            setTimeout(() => {
              toggleAuthMode();
            }, 3000);
          }
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        currentUser = data.user;
        authModal.style.display = 'none';
        userEmail.textContent = currentUser.email;
        userEmail.style.display = 'inline';
        logoutBtn.style.display = 'inline';

        // Load user's notes
        await loadNotes();
      }
    } catch (error) {
      console.error('Auth error:', error);
      authError.style.color = 'red';
      authError.textContent = error.message || 'Authentication failed';
    }
  }

  function toggleAuthMode() {
    isSignUp = !isSignUp;
    authError.textContent = '';
    authError.style.color = 'red';

    if (isSignUp) {
      authTitle.textContent = 'Sign Up';
      authSubmit.textContent = 'Sign Up';
      authToggle.textContent = 'Already have an account? Sign In';
    } else {
      authTitle.textContent = 'Sign In';
      authSubmit.textContent = 'Sign In';
      authToggle.textContent = 'Need an account? Sign Up';
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      currentUser = null;
      notesData = [];
      authModal.style.display = 'block';
      userEmail.style.display = 'none';
      logoutBtn.style.display = 'none';
      authEmail.value = '';
      authPassword.value = '';
      authError.textContent = '';
      renderNotes();
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to log out');
    }
  }

  // Check for existing session
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      currentUser = session.user;
      authModal.style.display = 'none';
      userEmail.textContent = currentUser.email;
      userEmail.style.display = 'inline';
      logoutBtn.style.display = 'inline';
      await loadNotes();
    }
  }

  // Event listeners
  noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputVal = noteInput.value.trim();
    if (!inputVal) return;

    const note = parseNoteInput(inputVal);
    addNote(note);

    noteInput.value = "";
    autocompleteGhost.innerHTML = "";
    noteInput.focus();
  });

  noteInput.addEventListener("input", updateAutocomplete);
  noteInput.addEventListener("keydown", (e) => {
    if (e.key === 'Tab') {
      handleTab(e);
    }
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderNotes();
  });

  viewToggle.addEventListener("click", toggleView);

  saveEditBtn.addEventListener("click", saveEdit);
  cancelEditBtn.addEventListener("click", closeEditModal);

  // Close modal when clicking outside
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Tab click event listeners
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.category);
    });
  });

  // Auth event listeners
  authSubmit.addEventListener('click', handleAuth);
  authToggle.addEventListener('click', toggleAuthMode);
  logoutBtn.addEventListener('click', handleLogout);

  // Close auth modal when clicking outside (but not during initial load)
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal && currentUser) {
      authModal.style.display = 'none';
    }
  });

  // Initialize app
  loadAutocompleteData();
  loadActiveTab();
  loadViewMode();
  switchTab(activeTab); // Set the active tab
  updateViewMode(); // Set the view mode
  checkSession(); // Check for existing session and load notes if logged in
})();
