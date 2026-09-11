/* To-do List Life Dashboard — app logic */
/* Feature: todo-life-dashboard */

(function () {
  'use strict';

  // ─── StorageService ────────────────────────────────────────────────────────
  // Centralises all localStorage access. Every read/write is wrapped in
  // try/catch so callers never crash on storage errors.

  var StorageService = {
    KEYS: {
      TASKS: 'tld_tasks',
      LINKS: 'tld_links',
      USER_NAME: 'tld_user_name'
    },

    /**
     * Read and JSON-parse the value stored at `key`.
     * Returns null when the key is missing, storage is unavailable, or the
     * stored value fails JSON parsing. Malformed entries are cleared before
     * returning null.
     * @param {string} key
     * @returns {any|null}
     */
    read: function (key) {
      try {
        var raw = localStorage.getItem(key);
        // Key not present
        if (raw === null) {
          return null;
        }
        return JSON.parse(raw);
      } catch (e) {
        // Either localStorage is unavailable or JSON.parse failed.
        // Clear the malformed entry if storage is reachable, then return null.
        try {
          localStorage.removeItem(key);
        } catch (_) {
          // Storage unavailable — nothing we can do
        }
        return null;
      }
    },

    /**
     * JSON-stringify `value` and write it to `key`.
     * Returns true on success, false when storage is unavailable or quota
     * is exceeded.
     * @param {string} key
     * @param {any} value
     * @returns {boolean}
     */
    write: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        // Covers QuotaExceededError and storage-unavailable scenarios
        return false;
      }
    },

    /**
     * Remove the entry at `key` from localStorage.
     * @param {string} key
     * @returns {void}
     */
    clear: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        // Storage unavailable — nothing to remove
      }
    }
  };

  // ─── generateId ────────────────────────────────────────────────────────────
  // Generates a unique string ID using crypto.randomUUID() when available,
  // falling back to a Date.now() + Math.random() combination.

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for environments where crypto.randomUUID is unavailable
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  // ─── GreetingPanel ─────────────────────────────────────────────────────────
  // Owns the #greeting-panel DOM node. Displays the current time, date, and a
  // time-based greeting message updated every second.

  var GreetingPanel = {
    _lastGreeting: '',
    _userName: '',

    /**
     * Build the panel's DOM subtree inside `container` and render initial values.
     * @param {HTMLElement} container
     * @returns {void}
     */
    init: function (container) {
      this._container = container;

      // Load saved name from localStorage (raw string, not JSON)
      try {
        var saved = localStorage.getItem(StorageService.KEYS.USER_NAME);
        this._userName = (saved && saved.trim()) ? saved.trim() : '';
      } catch (_) {
        this._userName = '';
      }

      // ── time ──
      var timeEl = document.createElement('div');
      timeEl.id = 'greeting-time';

      // ── date ──
      var dateEl = document.createElement('div');
      dateEl.id = 'greeting-date';

      // ── greeting message (time-based, no name here) ──
      var messageEl = document.createElement('div');
      messageEl.id = 'greeting-message';

      // ── name display: shown after saving, click to edit ──
      var nameDisplay = document.createElement('div');
      nameDisplay.id = 'greeting-name-display';
      nameDisplay.title = 'Click to change your name';

      // ── spacer pushes name area to the bottom ──
      var spacerEl = document.createElement('div');
      spacerEl.style.flex = '1';

      // ── name edit row: shown when editing ──
      var nameRow = document.createElement('div');
      nameRow.id = 'greeting-name-row';

      var nameLabel = document.createElement('label');
      nameLabel.setAttribute('for', 'greeting-name-input');
      nameLabel.id = 'greeting-name-label';

      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'greeting-name-input';
      nameInput.placeholder = 'What should we call you?';
      nameInput.maxLength = 50;
      nameInput.setAttribute('aria-label', 'Your name for the greeting');

      var nameSaveBtn = document.createElement('button');
      nameSaveBtn.id = 'greeting-name-save';
      nameSaveBtn.textContent = 'Save';

      nameRow.appendChild(nameLabel);
      nameRow.appendChild(nameInput);
      nameRow.appendChild(nameSaveBtn);

      container.appendChild(timeEl);
      container.appendChild(dateEl);
      container.appendChild(messageEl);
      container.appendChild(nameDisplay);
      container.appendChild(spacerEl);
      container.appendChild(nameRow);

      // Render the date once
      var now = new Date();
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      var self = this;

      // Set the initial UI state based on whether a name exists
      this._renderNameArea(nameDisplay, nameRow, nameInput);

      // Click the displayed name → switch to edit mode
      nameDisplay.addEventListener('click', function () {
        nameInput.value = self._userName;
        nameDisplay.style.display = 'none';
        nameRow.style.display = 'flex';
        nameInput.focus();
        nameInput.select();
      });

      function saveName() {
        var trimmed = nameInput.value.trim();
        self._userName = trimmed;
        try {
          if (trimmed) {
            localStorage.setItem(StorageService.KEYS.USER_NAME, trimmed);
          } else {
            localStorage.removeItem(StorageService.KEYS.USER_NAME);
          }
        } catch (_) {}
        // Switch back to display mode
        self._renderNameArea(nameDisplay, nameRow, nameInput);
        // Force greeting re-render
        self._lastGreeting = '';
        self._tick();
      }

      nameSaveBtn.addEventListener('click', saveName);
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveName(); }
        if (e.key === 'Escape') {
          e.preventDefault();
          // Cancel — revert to display mode without saving
          self._renderNameArea(nameDisplay, nameRow, nameInput);
        }
      });

      this._tick();
    },

    /**
     * Toggle between display mode and edit mode for the name area.
     * If a name is set: show the display div, hide the input row.
     * If no name: hide the display div, show the input row so the user
     * is prompted to enter one.
     * @param {HTMLElement} nameDisplay
     * @param {HTMLElement} nameRow
     * @param {HTMLInputElement} nameInput
     * @returns {void}
     */
    _renderNameArea: function (nameDisplay, nameRow, nameInput) {
      if (this._userName) {
        nameDisplay.textContent = this._userName;
        nameDisplay.style.display = 'block';
        nameRow.style.display = 'none';
      } else {
        nameDisplay.style.display = 'none';
        nameRow.style.display = 'flex';
        nameInput.value = '';
      }
    },

    /**
     * Start a 1-second interval that calls _tick().
     * @returns {void}
     */
    startClock: function () {
      var self = this;
      self._tick();
      setInterval(function () {
        self._tick();
      }, 1000);
    },

    /**
     * Update the time display and greeting message each second.
     * @returns {void}
     */
    _tick: function () {
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      var ss = String(now.getSeconds()).padStart(2, '0');

      var timeEl = document.getElementById('greeting-time');
      if (timeEl) {
        timeEl.textContent = hh + ':' + mm + ':' + ss;
      }

      var greeting = this._getGreeting(now.getHours());
      if (greeting !== this._lastGreeting) {
        var messageEl = document.getElementById('greeting-message');
        if (messageEl) {
          messageEl.textContent = greeting;
        }
        this._lastGreeting = greeting;
      }
    },

    /**
     * Return the time-based greeting string for the given hour (0-23).
     * The name is shown separately in the name display element.
     * @param {number} hour
     * @returns {string}
     */
    _getGreeting: function (hour) {
      if (hour >= 5 && hour <= 11) {
        return 'Good Morning 🌅';
      } else if (hour >= 12 && hour <= 17) {
        return 'Good Afternoon ☀️';
      } else if (hour >= 18 && hour <= 21) {
        return 'Good Evening 🌇';
      } else {
        return 'Good Night 🌙';
      }
    }
  };

  // ─── FocusTimer ────────────────────────────────────────────────────────────
  // Owns the #focus-timer DOM node. Implements a finite state machine for the
  // 25-minute Pomodoro countdown.
  // States: 'idle' | 'running' | 'paused' | 'finished'

  var FocusTimer = {
    state: 'idle',
    remaining: 1500, // 25 * 60 seconds
    _intervalId: null,

    /**
     * Build the timer DOM inside `container` and set initial button states.
     * @param {HTMLElement} container
     * @returns {void}
     */
    init: function (container) {
      this._container = container;

      var displayEl = document.createElement('div');
      displayEl.id = 'timer-display';

      var btnStart = document.createElement('button');
      btnStart.id = 'btn-start';
      btnStart.textContent = 'Start';

      var btnStop = document.createElement('button');
      btnStop.id = 'btn-stop';
      btnStop.textContent = 'Stop';

      var btnReset = document.createElement('button');
      btnReset.id = 'btn-reset';
      btnReset.textContent = 'Reset';

      var notificationEl = document.createElement('div');
      notificationEl.id = 'timer-notification';
      notificationEl.style.display = 'none';

      container.appendChild(displayEl);
      container.appendChild(btnStart);
      container.appendChild(btnStop);
      container.appendChild(btnReset);
      container.appendChild(notificationEl);

      var self = this;
      btnStart.addEventListener('click', function () { self.start(); });
      btnStop.addEventListener('click', function () { self.stop(); });
      btnReset.addEventListener('click', function () { self.reset(); });

      this._render();
      this._updateControls();
    },

    /**
     * Transition idle/paused → running; start the countdown interval.
     * @returns {void}
     */
    start: function () {
      if (this.state !== 'idle' && this.state !== 'paused') {
        return;
      }
      this.state = 'running';
      var self = this;
      this._intervalId = setInterval(function () {
        self._tick();
      }, 1000);
      this._updateControls();
    },

    /**
     * Transition running → paused; pause the countdown interval.
     * @returns {void}
     */
    stop: function () {
      if (this.state !== 'running') {
        return;
      }
      this.state = 'paused';
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._updateControls();
    },

    /**
     * Stop any active countdown and reset to 25:00 / idle state.
     * @returns {void}
     */
    reset: function () {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this.remaining = 1500;
      this.state = 'idle';
      var notificationEl = document.getElementById('timer-notification');
      if (notificationEl) {
        notificationEl.style.display = 'none';
      }
      this._render();
      this._updateControls();
    },

    /**
     * Called each second by setInterval. Decrements remaining and triggers
     * _onFinish() when it reaches zero.
     * @returns {void}
     */
    _tick: function () {
      this.remaining -= 1;
      this._render();
      if (this.remaining === 0) {
        this._onFinish();
      }
    },

    /**
     * Convert a seconds value to a zero-padded "MM:SS" string.
     * @param {number} seconds
     * @returns {string}
     */
    _formatTime: function (seconds) {
      var mm = Math.floor(seconds / 60);
      var ss = seconds % 60;
      return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    },

    /**
     * Update the timer display element with the current remaining time.
     * @returns {void}
     */
    _render: function () {
      var displayEl = document.getElementById('timer-display');
      if (displayEl) {
        displayEl.textContent = this._formatTime(this.remaining);
      }
    },

    /**
     * Enable/disable Start, Stop, and Reset buttons according to the current
     * state machine rules.
     * @returns {void}
     */
    _updateControls: function () {
      var btnStart = document.getElementById('btn-start');
      var btnStop  = document.getElementById('btn-stop');
      var btnReset = document.getElementById('btn-reset');

      if (!btnStart || !btnStop || !btnReset) {
        return;
      }

      // | State    | Start | Stop | Reset |
      // | idle     |  ✅   |  ❌  |  ❌   |
      // | running  |  ❌   |  ✅  |  ✅   |
      // | paused   |  ✅   |  ❌  |  ✅   |
      // | finished |  ❌   |  ❌  |  ✅   |
      switch (this.state) {
        case 'idle':
          btnStart.disabled = false;
          btnStop.disabled  = true;
          btnReset.disabled = true;
          break;
        case 'running':
          btnStart.disabled = true;
          btnStop.disabled  = false;
          btnReset.disabled = false;
          break;
        case 'paused':
          btnStart.disabled = false;
          btnStop.disabled  = true;
          btnReset.disabled = false;
          break;
        case 'finished':
          btnStart.disabled = true;
          btnStop.disabled  = true;
          btnReset.disabled = false;
          break;
      }
    },

    /**
     * Called when the countdown reaches zero. Shows a visual notification and
     * plays an audible beep via Web Audio API (with silent fallback).
     * @returns {void}
     */
    _onFinish: function () {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this.state = 'finished';
      this._updateControls();

      var notificationEl = document.getElementById('timer-notification');
      if (notificationEl) {
        notificationEl.textContent = "⏰ Time's up! Great work!";
        notificationEl.style.display = 'block';
      }

      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          var ctx = new AudioCtx();
          var oscillator = ctx.createOscillator();
          var gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 1.5);
        }
      } catch (e) {
        // Silent fallback — audio unavailable
      }
    }
  };

  // ─── TodoList ──────────────────────────────────────────────────────────────
  // Owns the #todo-list DOM node. Manages an in-memory array of Task objects
  // and syncs to storage on every mutation.

  var TodoList = {
    tasks: [],

    /**
     * Build the panel DOM inside `container` and render the provided
     * initial tasks.
     * @param {HTMLElement} container
     * @param {Array} initialTasks
     * @returns {void}
     */
    init: function (container, initialTasks) {
      this._container = container;
      this.tasks = Array.isArray(initialTasks) ? initialTasks : [];

      // --- Input row ---
      var inputRow = document.createElement('div');
      inputRow.id = 'todo-input-row';

      var input = document.createElement('input');
      input.type = 'text';
      input.id = 'todo-input';
      input.placeholder = 'New task…';
      input.maxLength = 255;
      input.setAttribute('aria-label', 'Task description');

      var addBtn = document.createElement('button');
      addBtn.id = 'todo-add-btn';
      addBtn.textContent = 'Add';

      inputRow.appendChild(input);
      inputRow.appendChild(addBtn);

      // --- Error message area ---
      var errorEl = document.createElement('div');
      errorEl.id = 'todo-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.style.display = 'none';

      // --- Task list container ---
      var listEl = document.createElement('ul');
      listEl.id = 'todo-task-list';

      container.appendChild(inputRow);
      container.appendChild(errorEl);
      container.appendChild(listEl);

      // Wire up Add button and Enter key
      var self = this;

      addBtn.addEventListener('click', function () {
        self.addTask(input.value);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          self.addTask(input.value);
        }
        // Clear error when user starts typing again
        self._clearError();
      });

      this._renderAll();
    },

    /**
     * Validate and append a new task with the given description.
     * @param {string} description
     * @returns {{ ok: boolean, error?: string }}
     */
    addTask: function (description) {
      var trimmed = (description || '').trim();

      if (trimmed.length === 0) {
        this._showError('Task description cannot be empty.');
        return { ok: false, error: 'Task description cannot be empty.' };
      }

      if (trimmed.length > 255) {
        this._showError('Task description cannot exceed 255 characters.');
        return { ok: false, error: 'Task description cannot exceed 255 characters.' };
      }

      var lowerTrimmed = trimmed.toLowerCase();
      var isDuplicate = false;
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].description.toLowerCase() === lowerTrimmed) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        this._showError('This task already exists.');
        return { ok: false, error: 'This task already exists.' };
      }

      var task = {
        id: generateId(),
        description: trimmed,
        completed: false,
        createdAt: Date.now()
      };

      this.tasks.push(task);

      var saved = this._persist();
      if (!saved) {
        this._showError('Could not save task — changes are kept for this session only.');
      } else {
        this._clearError();
      }

      // Clear the input field
      var input = document.getElementById('todo-input');
      if (input) {
        input.value = '';
      }

      this._renderAll();
      return { ok: true };
    },

    /**
     * Validate and update the description of the task identified by `id`.
     * @param {string} id
     * @param {string} newDescription
     * @returns {{ ok: boolean, error?: string }}
     */
    editTask: function (id, newDescription) {
      var trimmed = (newDescription || '').trim();

      if (trimmed.length === 0) {
        return { ok: false, error: 'Task description cannot be empty.' };
      }

      if (trimmed.length > 500) {
        return { ok: false, error: 'Task description cannot exceed 500 characters.' };
      }

      var task = null;
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          task = this.tasks[i];
          break;
        }
      }

      if (!task) {
        return { ok: false, error: 'Task not found.' };
      }

      task.description = trimmed;
      this._persist();
      this._renderAll();
      return { ok: true };
    },

    /**
     * Flip the completed status of the task identified by `id`.
     * @param {string} id
     * @returns {{ ok: boolean, error?: string }}
     */
    toggleComplete: function (id) {
      var task = null;
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          task = this.tasks[i];
          break;
        }
      }

      if (!task) {
        return { ok: false, error: 'Task not found.' };
      }

      task.completed = !task.completed;

      var saved = this._persist();
      if (!saved) {
        this._showError('Could not save change — status kept for this session only.');
      }

      this._renderAll();
      return { ok: true };
    },

    /**
     * Remove the task identified by `id` from the list.
     * @param {string} id
     * @returns {{ ok: boolean, error?: string }}
     */
    deleteTask: function (id) {
      var idx = -1;
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === id) {
          idx = i;
          break;
        }
      }

      if (idx === -1) {
        return { ok: false, error: 'Task not found.' };
      }

      var removed = this.tasks.splice(idx, 1)[0];

      var saved = this._persist();
      if (!saved) {
        // Restore the task at its original position
        this.tasks.splice(idx, 0, removed);
        this._showError('Could not delete task — changes could not be saved.');
        this._renderAll();
        return { ok: false, error: 'Storage write failed.' };
      }

      this._renderAll();
      return { ok: true };
    },

    /**
     * Write the current tasks array to StorageService. Returns the boolean
     * result from StorageService.write().
     * @returns {boolean}
     */
    _persist: function () {
      return StorageService.write(StorageService.KEYS.TASKS, this.tasks);
    },

    /**
     * Clear and re-render the task list container.
     * @returns {void}
     */
    _renderAll: function () {
      var listEl = document.getElementById('todo-task-list');
      if (!listEl) {
        return;
      }
      // Clear existing content
      while (listEl.firstChild) {
        listEl.removeChild(listEl.firstChild);
      }
      for (var i = 0; i < this.tasks.length; i++) {
        listEl.appendChild(this._renderTask(this.tasks[i]));
      }
    },

    /**
     * Build and return the DOM element for a single task row.
     * @param {Object} task
     * @returns {HTMLElement}
     */
    _renderTask: function (task) {
      var self = this;
      var li = document.createElement('li');
      li.className = 'todo-task-item';
      li.dataset.taskId = task.id;

      // --- Checkbox ---
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', function () {
        self.toggleComplete(task.id);
      });

      // --- Description span ---
      var span = document.createElement('span');
      span.className = 'todo-task-text';
      span.textContent = task.description;
      if (task.completed) {
        span.style.textDecoration = 'line-through';
      }

      // --- Edit button ---
      var editBtn = document.createElement('button');
      editBtn.className = 'todo-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task');

      editBtn.addEventListener('click', function () {
        self._startEdit(li, task);
      });

      // --- Delete button ---
      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'todo-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete task');

      deleteBtn.addEventListener('click', function () {
        self.deleteTask(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);

      return li;
    },

    /**
     * Replace the task row's text display with an inline edit input.
     * Binds Enter (confirm) and Escape (cancel).
     * @param {HTMLElement} li  — the task list item element
     * @param {Object} task     — the task object being edited
     * @returns {void}
     */
    _startEdit: function (li, task) {
      var self = this;

      // Find and hide the read-mode elements
      var span = li.querySelector('.todo-task-text');
      var editBtn = li.querySelector('.todo-edit-btn');
      var deleteBtn = li.querySelector('.todo-delete-btn');

      if (span) { span.style.display = 'none'; }
      if (editBtn) { editBtn.style.display = 'none'; }
      if (deleteBtn) { deleteBtn.style.display = 'none'; }

      // Create the edit input
      var editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'todo-edit-input';
      editInput.value = task.description;
      editInput.maxLength = 500;
      editInput.setAttribute('aria-label', 'Edit task description');

      // Inline error for edit validation
      var editError = document.createElement('span');
      editError.className = 'todo-edit-error';
      editError.style.display = 'none';

      // Save button
      var saveBtn = document.createElement('button');
      saveBtn.className = 'todo-save-btn';
      saveBtn.textContent = 'Save';

      li.appendChild(editInput);
      li.appendChild(editError);
      li.appendChild(saveBtn);
      editInput.focus();

      function confirmEdit() {
        var trimmed = editInput.value.trim();

        if (trimmed.length === 0) {
          // Cancel the edit first (restores original row), then surface the
          // error in the main panel error area where it remains visible.
          cancelEdit();
          self._showError('Task description cannot be empty.');
          return;
        }

        if (trimmed.length > 500) {
          editError.textContent = 'Task description cannot exceed 500 characters.';
          editError.style.display = 'inline';
          return;
        }

        // Clean up edit UI before calling editTask (which calls _renderAll)
        li.removeChild(editInput);
        li.removeChild(editError);
        li.removeChild(saveBtn);

        self.editTask(task.id, trimmed);
      }

      function cancelEdit() {
        // Remove edit controls
        if (editInput.parentNode === li) { li.removeChild(editInput); }
        if (editError.parentNode === li) { li.removeChild(editError); }
        if (saveBtn.parentNode === li) { li.removeChild(saveBtn); }

        // Restore read-mode elements
        if (span) { span.style.display = ''; }
        if (editBtn) { editBtn.style.display = ''; }
        if (deleteBtn) { deleteBtn.style.display = ''; }
      }

      editInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });

      saveBtn.addEventListener('click', function () {
        confirmEdit();
      });
    },

    /**
     * Display an inline error message in the error area.
     * @param {string} message
     * @returns {void}
     */
    _showError: function (message) {
      var errorEl = document.getElementById('todo-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    },

    /**
     * Clear the inline error message area.
     * @returns {void}
     */
    _clearError: function () {
      var errorEl = document.getElementById('todo-error');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    }
  };

  // ─── QuickLinks ────────────────────────────────────────────────────────────
  // Owns the #quick-links DOM node. Manages an in-memory array of Link objects
  // and syncs to storage on every mutation.

  var QuickLinks = {
    links: [],

    /**
     * Build the panel DOM inside `container` and render the provided
     * initial links.
     * @param {HTMLElement} container
     * @param {Array} initialLinks
     * @returns {void}
     */
    init: function (container, initialLinks) {
      this._container = container;
      this.links = Array.isArray(initialLinks) ? initialLinks : [];

      // --- Label input ---
      var labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.id = 'ql-label-input';
      labelInput.placeholder = 'Label';
      labelInput.maxLength = 50;
      labelInput.setAttribute('aria-label', 'Link label');

      // --- URL input ---
      var urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.id = 'ql-url-input';
      urlInput.placeholder = 'https://\u2026';
      urlInput.maxLength = 2048;
      urlInput.setAttribute('aria-label', 'Link URL');

      // --- Add Link button ---
      var addBtn = document.createElement('button');
      addBtn.id = 'ql-add-btn';
      addBtn.textContent = 'Add Link';

      // --- General error area ---
      var errorEl = document.createElement('div');
      errorEl.id = 'ql-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.style.display = 'none';

      // --- Label error area ---
      var labelErrorEl = document.createElement('div');
      labelErrorEl.id = 'ql-label-error';
      labelErrorEl.setAttribute('role', 'alert');
      labelErrorEl.setAttribute('aria-live', 'polite');
      labelErrorEl.style.display = 'none';

      // --- URL error area ---
      var urlErrorEl = document.createElement('div');
      urlErrorEl.id = 'ql-url-error';
      urlErrorEl.setAttribute('role', 'alert');
      urlErrorEl.setAttribute('aria-live', 'polite');
      urlErrorEl.style.display = 'none';

      // --- Links container ---
      var linksContainer = document.createElement('div');
      linksContainer.id = 'ql-links-container';

      container.appendChild(labelInput);
      container.appendChild(labelErrorEl);
      container.appendChild(urlInput);
      container.appendChild(urlErrorEl);
      container.appendChild(addBtn);
      container.appendChild(errorEl);
      container.appendChild(linksContainer);

      var self = this;

      addBtn.addEventListener('click', function () {
        self.addLink(labelInput.value, urlInput.value);
      });

      labelInput.addEventListener('input', function () {
        var el = document.getElementById('ql-label-error');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
        // Also clear the general storage-error area when the user retries
        var genEl = document.getElementById('ql-error');
        if (genEl) { genEl.textContent = ''; genEl.style.display = 'none'; }
      });

      urlInput.addEventListener('input', function () {
        var el = document.getElementById('ql-url-error');
        if (el) { el.textContent = ''; el.style.display = 'none'; }
        // Also clear the general storage-error area when the user retries
        var genEl = document.getElementById('ql-error');
        if (genEl) { genEl.textContent = ''; genEl.style.display = 'none'; }
      });

      this._renderAll();
    },

    /**
     * Validate and append a new link with the given label and URL.
     * @param {string} label
     * @param {string} url
     * @returns {{ ok: boolean, error?: string }}
     */
    addLink: function (label, url) {
      var trimmedLabel = (label || '').trim();
      var trimmedUrl   = (url   || '').trim();

      // Validate label
      if (trimmedLabel.length === 0) {
        var labelErrEl = document.getElementById('ql-label-error');
        if (labelErrEl) {
          labelErrEl.textContent = 'Label is required.';
          labelErrEl.style.display = 'block';
        }
        return { ok: false, error: 'Label is required.' };
      }

      if (trimmedLabel.length > 50) {
        var labelErrEl2 = document.getElementById('ql-label-error');
        if (labelErrEl2) {
          labelErrEl2.textContent = 'Label cannot exceed 50 characters.';
          labelErrEl2.style.display = 'block';
        }
        return { ok: false, error: 'Label cannot exceed 50 characters.' };
      }

      // Validate URL
      if (!this._validateUrl(trimmedUrl)) {
        var urlErrEl = document.getElementById('ql-url-error');
        if (urlErrEl) {
          urlErrEl.textContent = 'A valid URL starting with http:// or https:// is required.';
          urlErrEl.style.display = 'block';
        }
        return { ok: false, error: 'A valid URL starting with http:// or https:// is required.' };
      }

      var link = {
        id: generateId(),
        label: trimmedLabel,
        url: trimmedUrl
      };

      this.links.push(link);

      var saved = this._persist();
      if (!saved) {
        // Roll back the optimistic push
        this.links.splice(this.links.length - 1, 1);
        this._showError('Could not save link \u2014 please try again.');
        this._renderAll();
        return { ok: false, error: 'Could not save link \u2014 please try again.' };
      }

      // Success — clear inputs and errors
      var labelInput = document.getElementById('ql-label-input');
      if (labelInput) { labelInput.value = ''; }
      var urlInput = document.getElementById('ql-url-input');
      if (urlInput) { urlInput.value = ''; }
      this._clearError();
      this._renderAll();
      return { ok: true };
    },

    /**
     * Remove the link identified by `id` after user confirmation.
     * @param {string} id
     * @returns {{ ok: boolean, error?: string }}
     */
    deleteLink: function (id) {
      var idx = -1;
      for (var i = 0; i < this.links.length; i++) {
        if (this.links[i].id === id) {
          idx = i;
          break;
        }
      }

      if (idx === -1) {
        return { ok: false, error: 'Link not found.' };
      }

      var confirmed = window.confirm('Delete this link?');
      if (!confirmed) {
        return { ok: false, error: 'Cancelled.' };
      }

      var removed = this.links.splice(idx, 1)[0];

      var saved = this._persist();
      if (!saved) {
        // Rollback
        this.links.splice(idx, 0, removed);
        this._showError('Could not delete link \u2014 please try again.');
        this._renderAll();
        return { ok: false, error: 'Could not delete link \u2014 please try again.' };
      }

      // Clear general error on success
      var errorEl = document.getElementById('ql-error');
      if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

      this._renderAll();
      return { ok: true };
    },

    /**
     * Write the current links array to StorageService. Returns the boolean
     * result from StorageService.write().
     * @returns {boolean}
     */
    _persist: function () {
      return StorageService.write(StorageService.KEYS.LINKS, this.links);
    },

    /**
     * Clear and re-render the links container.
     * @returns {void}
     */
    _renderAll: function () {
      var linksContainer = document.getElementById('ql-links-container');
      if (!linksContainer) {
        return;
      }
      // Clear existing content
      while (linksContainer.firstChild) {
        linksContainer.removeChild(linksContainer.firstChild);
      }
      for (var i = 0; i < this.links.length; i++) {
        linksContainer.appendChild(this._renderLink(this.links[i]));
      }
    },

    /**
     * Build and return the DOM element for a single link button row.
     * @param {Object} link
     * @returns {HTMLElement}
     */
    _renderLink: function (link) {
      var self = this;
      var div = document.createElement('div');
      div.className = 'ql-link-item';
      div.dataset.linkId = link.id;

      // Link button
      var linkBtn = document.createElement('button');
      linkBtn.className = 'ql-link-btn';
      linkBtn.textContent = link.label;
      linkBtn.addEventListener('click', function () {
        window.open(link.url, '_blank');
      });

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'ql-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete link ' + link.label);
      deleteBtn.addEventListener('click', function () {
        self.deleteLink(link.id);
      });

      div.appendChild(linkBtn);
      div.appendChild(deleteBtn);

      return div;
    },

    /**
     * Return true if `url` begins with http:// or https:// and is within the
     * 2048-character limit.
     * @param {string} url
     * @returns {boolean}
     */
    _validateUrl: function (url) {
      if (!url || url.length > 2048) {
        return false;
      }
      return url.indexOf('http://') === 0 || url.indexOf('https://') === 0;
    },

    /**
     * Display an inline error message adjacent to the relevant input.
     * @param {string} message
     * @returns {void}
     */
    _showError: function (message) {
      var errorEl = document.getElementById('ql-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    },

    /**
     * Clear all error message areas.
     * @returns {void}
     */
    _clearError: function () {
      var ids = ['ql-error', 'ql-label-error', 'ql-url-error'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) {
          el.textContent = '';
          el.style.display = 'none';
        }
      }
    }
  };

  // ─── Loading Indicator ─────────────────────────────────────────────────────
  // Inserted immediately at script-parse time (before DOMContentLoaded).
  // A 500 ms timeout decides whether to make it visible; it is always removed
  // once App.init() finishes.

  var _loadingVisible = false;
  var _loadingTimeoutId = null;

  /**
   * Insert the #loading-indicator element into <body> as soon as the script
   * is parsed. Uses document.write-safe DOM insertion for early execution.
   * @returns {void}
   */
  function _insertLoadingIndicator() {
    if (document.getElementById('loading-indicator')) {
      return; // already present (e.g. added in HTML)
    }
    var indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    indicator.setAttribute('aria-label', 'Loading dashboard…');
    indicator.innerHTML =
      '<div class="loading-spinner" aria-hidden="true"></div>' +
      '<p class="loading-text">Loading…</p>';
    // Hide by default; reveal after 500 ms only if panels haven't rendered yet
    indicator.style.display = 'none';

    // Append to body if available, otherwise defer to DOMContentLoaded
    if (document.body) {
      document.body.appendChild(indicator);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        var el = document.getElementById('loading-indicator');
        if (!el) {
          document.body.appendChild(indicator);
        }
      });
    }
  }

  /**
   * Show the loading indicator after 500 ms if it is still present.
   * Called immediately after the indicator is inserted.
   * @returns {void}
   */
  function _scheduleLoadingIndicator() {
    _loadingTimeoutId = setTimeout(function () {
      var indicator = document.getElementById('loading-indicator');
      if (indicator) {
        indicator.style.display = 'flex';
        _loadingVisible = true;
      }
    }, 500);
  }

  /**
   * Hide and remove the loading indicator from the DOM.
   * Called by App.init() once all panels have been initialised.
   * @returns {void}
   */
  function _removeLoadingIndicator() {
    // Cancel the pending 500 ms reveal if panels loaded fast enough
    if (_loadingTimeoutId !== null) {
      clearTimeout(_loadingTimeoutId);
      _loadingTimeoutId = null;
    }
    var indicator = document.getElementById('loading-indicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
    _loadingVisible = false;
  }

  // Insert and arm the loading indicator immediately at parse time
  _insertLoadingIndicator();
  _scheduleLoadingIndicator();

  // ─── App ───────────────────────────────────────────────────────────────────
  // Top-level bootstrap: detects storage availability, reads persisted data,
  // initialises every panel, shows a global error banner when storage is
  // unavailable, and starts the clock.

  var App = {
    /**
     * Probe whether localStorage is genuinely accessible.
     * Returns true if we can write and read back a test value.
     * @returns {boolean}
     */
    _isStorageAvailable: function () {
      var probe = '__tld_probe__';
      try {
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Render a dismissible global error banner at the top of the page.
     * @param {string} message
     * @returns {void}
     */
    _showGlobalError: function (message) {
      var existing = document.getElementById('global-error-banner');
      if (existing) {
        return; // already shown
      }
      var banner = document.createElement('div');
      banner.id = 'global-error-banner';
      banner.setAttribute('role', 'alert');
      banner.setAttribute('aria-live', 'assertive');

      var text = document.createElement('span');
      text.textContent = message;

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Dismiss error');
      closeBtn.addEventListener('click', function () {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      });

      banner.appendChild(text);
      banner.appendChild(closeBtn);

      // Insert as the first child of <body> so it appears above all panels
      var firstChild = document.body.firstChild;
      if (firstChild) {
        document.body.insertBefore(banner, firstChild);
      } else {
        document.body.appendChild(banner);
      }
    },

    /**
     * Bootstrap the application:
     *  1. Check if localStorage is genuinely available.
     *  2. Read persisted tasks and links from StorageService.
     *  3. If storage is unavailable, display a global error banner.
     *  4. Initialise each panel with its container element and initial data.
     *  5. Start the GreetingPanel clock.
     *  6. Remove the loading indicator.
     * @returns {void}
     */
    init: function () {
      var storageAvailable = this._isStorageAvailable();

      // Read persisted data — returns null when the key is missing OR on error
      var savedTasks = StorageService.read(StorageService.KEYS.TASKS);
      var savedLinks = StorageService.read(StorageService.KEYS.LINKS);

      // Show the global error banner only when storage itself is unavailable
      // (null from a missing key is fine — it just means an empty first run)
      if (!storageAvailable) {
        this._showGlobalError(
          'Persisted data could not be loaded — localStorage is unavailable. ' +
          'Your tasks and links will not be saved this session.'
        );
      }

      // Resolve containers
      var greetingContainer = document.getElementById('greeting-panel');
      var timerContainer    = document.getElementById('focus-timer');
      var todoContainer     = document.getElementById('todo-list');
      var linksContainer    = document.getElementById('quick-links');

      // Initialise GreetingPanel (no persisted data needed)
      GreetingPanel.init(greetingContainer);

      // Initialise FocusTimer (stateless across sessions)
      FocusTimer.init(timerContainer);

      // Initialise TodoList with saved tasks (fall back to empty array)
      TodoList.init(todoContainer, Array.isArray(savedTasks) ? savedTasks : []);

      // Initialise QuickLinks with saved links (fall back to empty array)
      QuickLinks.init(linksContainer, Array.isArray(savedLinks) ? savedLinks : []);

      // Start the real-time clock after all panels are in the DOM
      GreetingPanel.startClock();

      // All panels rendered — remove the loading indicator
      _removeLoadingIndicator();
    }
  };

  // ─── ThemeManager ──────────────────────────────────────────────────────────
  // Persists the user's light/dark preference in localStorage and wires the
  // toggle button.

  var ThemeManager = {
    STORAGE_KEY: 'tld_theme',

    /**
     * Apply the stored theme (or system preference) and wire the toggle button.
     * @returns {void}
     */
    init: function () {
      var stored = null;
      try { stored = localStorage.getItem(this.STORAGE_KEY); } catch (_) {}

      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = stored ? stored === 'dark' : prefersDark;

      this._apply(isDark);

      var self = this;
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.addEventListener('click', function () {
          var currently = document.documentElement.getAttribute('data-theme') === 'dark';
          self._apply(!currently);
          try { localStorage.setItem(self.STORAGE_KEY, !currently ? 'dark' : 'light'); } catch (_) {}
        });
      }
    },

    /**
     * Set the theme on <html> and update the toggle button label.
     * @param {boolean} dark
     * @returns {void}
     */
    _apply: function (dark) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      }
    }
  };

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  // Wire App.init() to DOMContentLoaded so the DOM is ready before we query it.

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
    ThemeManager.init();
  });

}());
