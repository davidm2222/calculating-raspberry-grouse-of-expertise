(() => {
  const noteForm = document.getElementById("noteForm");
  const noteInput = document.getElementById("noteInput");
  const autocompleteGhost = document.getElementById("autocompleteGhost");
  const searchInput = document.getElementById("searchInput");
  const viewToggle = document.getElementById("viewToggle");
  const notesContainer = document.getElementById("notesContainer");
  const booksList = document.getElementById("booksList");
  const moviesList = document.getElementById("moviesList");
  const showsList = document.getElementById("showsList");
  const restaurantsList = document.getElementById("restaurantsList");
  const otherList = document.getElementById("otherList");
  const editModal = document.getElementById("editModal");
  const editTags = document.getElementById("editTags");
  const editTitle = document.getElementById("editTitle");
  const editFields = document.getElementById("editFields");
  const editNotes = document.getElementById("editNotes");
  const saveEditBtn = document.getElementById("saveEdit");
  const cancelEditBtn = document.getElementById("cancelEdit");

  // Storage keys
  const STORAGE_KEY = "smartNotesAppData";
  const AUTOCOMPLETE_KEY = "smartNotesAutocomplete";
  const ACTIVE_TAB_KEY = "smartNotesActiveTab";
  const VIEW_MODE_KEY = "smartNotesViewMode";

  // Define categories
  const CATEGORIES = {
    book: { name: 'Books', listEl: booksList, sectionEl: document.getElementById('booksSection'), aliases: ['book', 'books'] },
    movie: { name: 'Movies', listEl: moviesList, sectionEl: document.getElementById('moviesSection'), aliases: ['movie', 'movies', 'film', 'films'] },
    show: { name: 'Shows', listEl: showsList, sectionEl: document.getElementById('showsSection'), aliases: ['show', 'shows', 'tv', 'series'] },
    restaurant: { name: 'Restaurants', listEl: restaurantsList, sectionEl: document.getElementById('restaurantsSection'), aliases: ['restaurant', 'restaurants'] },
    other: { name: 'Other', listEl: otherList, sectionEl: document.getElementById('otherSection'), aliases: [] }
  };

  // Load notes from localStorage
  let notesData = [];
  let currentEditIndex = -1;
  let searchQuery = "";
  let autocompleteData = { keys: {}, values: {} }; // Track field keys and their values
  let activeTab = 'book'; // Default to Books tab
  let viewMode = 'comfort'; // 'compact' or 'comfort'

  function loadNotes() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: convert old format to new format
        if (parsed.books || parsed.restaurants || parsed.projects) {
          // Old format - migrate to new format
          notesData = [];
          if (parsed.books) {
            parsed.books.forEach(note => {
              notesData.push({
                tags: ['book'],
                fields: {},
                title: note.title || '',
                notes: note.details || '',
                raw: note.raw || '',
                timestamp: Date.now()
              });
            });
          }
          if (parsed.restaurants) {
            parsed.restaurants.forEach(note => {
              notesData.push({
                tags: ['restaurant'],
                fields: {},
                title: note.title || '',
                notes: note.details || '',
                raw: note.raw || '',
                timestamp: Date.now()
              });
            });
          }
          if (parsed.projects) {
            parsed.projects.forEach(note => {
              notesData.push({
                tags: ['other'],
                fields: {},
                title: note.title || '',
                notes: note.details || '',
                raw: note.raw || '',
                timestamp: Date.now()
              });
            });
          }
          saveNotes(); // Save migrated data
        } else if (Array.isArray(parsed)) {
          // Handle migration from previous version without fields
          notesData = parsed.map(note => ({
            ...note,
            fields: note.fields || {},
            notes: note.notes || note.details || ''
          }));
        }
      } catch (e) {
        // corrupted or invalid data, ignore
        localStorage.removeItem(STORAGE_KEY);
      }
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

  // Save notes to localStorage
  function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notesData));
  }

  // Load active tab from localStorage
  function loadActiveTab() {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved && CATEGORIES[saved]) {
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
  function createListItem(note, index) {
    const li = document.createElement("li");

    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";

    if (note.title) {
      const titleEl = document.createElement("strong");
      titleEl.textContent = note.title;
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

    // Add tags
    if (note.tags && note.tags.length > 0) {
      const tagsDiv = document.createElement("div");
      tagsDiv.className = "tags";
      note.tags.forEach(tag => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "tag";
        tagSpan.textContent = tag;
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

    const query = searchQuery.toLowerCase();
    return notesData.filter(note => {
      const titleMatch = note.title && note.title.toLowerCase().includes(query);
      const notesMatch = note.notes && note.notes.toLowerCase().includes(query);
      const rawMatch = note.raw && note.raw.toLowerCase().includes(query);
      const tagsMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(query));
      const fieldsMatch = note.fields && Object.entries(note.fields).some(([key, value]) =>
        key.toLowerCase().includes(query) || value.toLowerCase().includes(query)
      );

      return titleMatch || notesMatch || rawMatch || tagsMatch || fieldsMatch;
    });
  }

  // Determine which category a note belongs to
  function getCategoryForNote(note) {
    if (!note.tags || note.tags.length === 0) return 'other';

    // Check if any tag matches a category alias
    for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
      if (categoryKey === 'other') continue; // Skip 'other', it's the default

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
    booksList.innerHTML = "";
    moviesList.innerHTML = "";
    showsList.innerHTML = "";
    restaurantsList.innerHTML = "";
    otherList.innerHTML = "";

    const filteredNotes = filterNotes();

    if (filteredNotes.length === 0) {
      const message = searchQuery ? "No notes found matching your search." : "No notes yet. Start adding some!";
      otherList.innerHTML = `<li><em>${message}</em></li>`;
      return;
    }

    // Group notes by category
    const notesByCategory = {
      book: [],
      movie: [],
      show: [],
      restaurant: [],
      other: []
    };

    filteredNotes.forEach(note => {
      const category = getCategoryForNote(note);
      notesByCategory[category].push(note);
    });

    // Render each category
    Object.entries(notesByCategory).forEach(([categoryKey, notes]) => {
      const category = CATEGORIES[categoryKey];

      if (notes.length === 0) {
        category.listEl.innerHTML = `<li><em>No ${category.name.toLowerCase()} yet.</em></li>`;
      } else {
        notes.forEach(note => {
          const originalIndex = notesData.indexOf(note);
          category.listEl.appendChild(createListItem(note, originalIndex));
        });
      }
    });
  }

  // Parse input string for tags, fields, and content
  // Format: "tag1, tag2: Title, key:value, key:value, free-form notes"
  function parseNoteInput(text) {
    const raw = text.trim();
    let tags = [];
    let fields = {};
    let title = "";
    let notes = "";
    let content = raw;

    // Check if there's a colon separating tags from content
    const colonIndex = raw.indexOf(':');
    if (colonIndex > 0) {
      const tagsPart = raw.substring(0, colonIndex).trim();
      content = raw.substring(colonIndex + 1).trim();

      // Split tags by comma
      tags = tagsPart.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    }

    // If no tags specified, add default 'note' tag
    if (tags.length === 0) {
      tags = ['note'];
    }

    // Parse content: split by comma
    const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length > 0) {
      // First part is always the title
      title = parts[0];

      // Process remaining parts
      let noteParts = [];
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
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
          // This is either a tag or notes
          noteParts.push(part);
        }
      }

      // Combine all non-field parts as notes
      if (noteParts.length > 0) {
        notes = noteParts.join(', ');
      }
    }

    saveAutocompleteData();

    return {
      tags,
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
  function addNote(note) {
    notesData.unshift(note);
    saveNotes();

    // Switch to the tab where this note belongs
    const category = getCategoryForNote(note);
    switchTab(category);

    renderNotes();
  }

  // Edit note
  function editNote(index) {
    currentEditIndex = index;
    const note = notesData[index];

    editTags.value = note.tags.join(', ');
    editTitle.value = note.title || '';
    editFields.value = Object.entries(note.fields || {}).map(([k, v]) => `${k}:${v}`).join(', ');
    editNotes.value = note.notes || '';

    editModal.classList.add('show');
    editTags.focus();
  }

  // Save edited note
  function saveEdit() {
    if (currentEditIndex < 0 || currentEditIndex >= notesData.length) return;

    const tags = editTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const title = editTitle.value.trim();
    const notes = editNotes.value.trim();

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
    if (notes) {
      raw += ', ' + notes;
    }

    notesData[currentEditIndex] = {
      ...notesData[currentEditIndex],
      tags,
      fields,
      title,
      notes,
      raw
    };

    saveNotes();
    rebuildAutocompleteData();
    renderNotes();
    closeEditModal();
  }

  // Close edit modal
  function closeEditModal() {
    editModal.classList.remove('show');
    currentEditIndex = -1;
    editTags.value = '';
    editTitle.value = '';
    editFields.value = '';
    editNotes.value = '';
  }

  // Delete note
  function deleteNote(index) {
    if (confirm('Are you sure you want to delete this note?')) {
      notesData.splice(index, 1);
      saveNotes();
      renderNotes();
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

  // Initialize app
  loadNotes();
  loadAutocompleteData();
  loadActiveTab();
  loadViewMode();
  switchTab(activeTab); // Set the active tab
  updateViewMode(); // Set the view mode
  renderNotes();
})();
