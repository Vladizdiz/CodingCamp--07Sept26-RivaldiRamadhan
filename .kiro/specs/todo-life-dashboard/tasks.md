# Implementation Plan: To-do List Life Dashboard

## Overview

Implement a single-page, client-side web application using HTML, CSS, and vanilla JavaScript only. The app is organized into one HTML entry point (`index.html`), one stylesheet (`css/style.css`), and one JavaScript file (`js/app.js`) structured as an IIFE with five logical modules: `StorageService`, `GreetingPanel`, `FocusTimer`, `TodoList`, and `QuickLinks`. All data is persisted to `localStorage`. No frameworks, no external dependencies.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - [x] 1.1 Create project file structure and `index.html` entry point
    - Create `index.html` at the project root with standard HTML5 boilerplate
    - Add `<link>` to `css/style.css` and `<script>` to `js/app.js` (no other external resources)
    - Define four panel containers in the `<body>`: `#greeting-panel`, `#focus-timer`, `#todo-list`, `#quick-links`
    - Add a `<meta name="viewport">` tag for responsive behavior
    - Create empty placeholder files `css/style.css` and `js/app.js`
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 1.2 Create the IIFE wrapper and module stubs in `js/app.js`
    - Wrap all JS in a single IIFE to avoid global namespace pollution
    - Declare empty stub objects for `StorageService`, `GreetingPanel`, `FocusTimer`, `TodoList`, `QuickLinks`, and a top-level `App.init()` function
    - Wire `App.init()` to the `DOMContentLoaded` event
    - _Requirements: 1.1, 1.2_

- [x] 2. Implement `StorageService`
  - [x] 2.1 Implement `StorageService` read, write, and clear methods
    - Define `KEYS = { TASKS: 'tld_tasks', LINKS: 'tld_links' }`
    - Implement `read(key)`: wrap `localStorage.getItem` + `JSON.parse` in try/catch; return `null` on missing key, parse error, or unavailable storage; clear the malformed key before returning `null`
    - Implement `write(key, value)`: wrap `JSON.stringify` + `localStorage.setItem` in try/catch; return `true` on success, `false` on failure (quota exceeded or storage unavailable)
    - Implement `clear(key)`: wrap `localStorage.removeItem` in try/catch
    - _Requirements: 1.2, 1.6, 7.2, 7.4, 7.5, 10.2, 10.4_

  - [ ]* 2.2 Write unit tests for `StorageService`
    - Use Jest + jsdom; mock `localStorage` to simulate missing keys, malformed JSON, and quota errors
    - Test: `read` returns `null` for missing key
    - Test: `read` returns `null` and clears key for malformed JSON
    - Test: `write` returns `false` when `setItem` throws a quota error
    - Test: `write` returns `true` on success
    - _Requirements: 1.6, 7.4, 7.5_

- [x] 3. Implement `GreetingPanel`
  - [x] 3.1 Implement `GreetingPanel.init()`, `_getGreeting()`, and `startClock()`
    - Implement `_getGreeting(hour)`: return the correct greeting string for the four hour ranges (05–11, 12–17, 18–21, 22–04)
    - Implement `init(container)`: build the panel's DOM subtree with separate elements for time (`#greeting-time`), date (`#greeting-date`), and greeting message (`#greeting-message`); render initial values
    - Implement `_tick()`: get current time; update only `#greeting-time`; re-evaluate `_getGreeting` and update `#greeting-message` only if the value changed
    - Implement `startClock()`: call `_tick()` immediately, then set `setInterval(_tick, 1000)`
    - Format time as `HH:MM:SS`; format date as human-readable (e.g., "Wednesday, September 10, 2026") using `Date` locale methods
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 3.2 Write unit tests for `GreetingPanel._getGreeting()`
    - Test all eight boundary hours: 4 → "Good Night 🌙", 5 → "Good Morning 🌅", 11 → "Good Morning 🌅", 12 → "Good Afternoon ☀️", 17 → "Good Afternoon ☀️", 18 → "Good Evening 🌇", 21 → "Good Evening 🌇", 22 → "Good Night 🌙"
    - Test that `_tick()` updates only the time element when the hour has not changed (spy on DOM element `textContent`)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.3 Write property test for `GreetingPanel._getGreeting()` (Property 8)
    - **Property 8: Greeting function covers all 24 hours without gaps**
    - Generator: `fc.integer({ min: 0, max: 23 })`
    - Assert result is one of exactly the four defined greeting strings; same input always returns same result
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**

- [x] 4. Implement `FocusTimer`
  - [x] 4.1 Implement `FocusTimer` state machine, controls, and display
    - Define states: `'idle' | 'running' | 'paused' | 'finished'`; initialize `state = 'idle'`, `remaining = 1500`
    - Implement `init(container)`: build DOM with a time display (`#timer-display`) and three buttons (`#btn-start`, `#btn-stop`, `#btn-reset`); call `_render()` and `_updateControls()`
    - Implement `start()`: transition `idle/paused → running`; start `setInterval(_tick, 1000)`
    - Implement `stop()`: transition `running → paused`; clear interval
    - Implement `reset()`: clear interval; set `remaining = 1500`, `state = 'idle'`; call `_render()` and `_updateControls()`
    - Implement `_tick()`: decrement `remaining`; call `_render()`; if `remaining === 0` call `_onFinish()`
    - Implement `_formatTime(seconds)`: return zero-padded `MM:SS` string
    - Implement `_render()`: update `#timer-display` text to `_formatTime(remaining)`
    - Implement `_updateControls()`: enable/disable Start, Stop, Reset per the state machine rules
    - Implement `_onFinish()`: set `state = 'finished'`; call `_updateControls()`; show a visible notification within the timer view; play an audio beep via `Web Audio API` (`AudioContext`) with graceful silent fallback if unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [ ]* 4.2 Write unit tests for `FocusTimer`
    - Test initial state: `state === 'idle'`, `remaining === 1500`
    - Test state transitions: idle→running on `start()`, running→paused on `stop()`, paused→running on `start()`, running→idle on `reset()`, running→finished when `remaining` hits 0
    - Test control disable rules for each state
    - Test `_formatTime(0)` → "00:00", `_formatTime(1500)` → "25:00", `_formatTime(90)` → "01:30"
    - _Requirements: 3.1–3.11_

  - [ ]* 4.3 Write property test for `FocusTimer._formatTime()` (Property 11)
    - **Property 11: Timer format function produces valid MM:SS for all valid inputs**
    - Generator: `fc.integer({ min: 0, max: 1500 })`
    - Assert output matches `/^\d{2}:\d{2}$/`; parsed `MM * 60 + SS === input`; MM in 00–25; SS in 00–59
    - **Validates: Requirements 3.3**

- [x] 5. Implement `TodoList` — core CRUD and persistence
  - [x] 5.1 Implement `generateId()` helper and `Task` data model
    - Implement `generateId()`: use `crypto.randomUUID()` with `Date.now() + Math.random()` fallback
    - Define `Task` shape: `{ id, description, completed, createdAt }`
    - _Requirements: 7.1, 7.2_

  - [x] 5.2 Implement `TodoList.init()`, `_persist()`, and `_renderAll()`
    - Implement `init(container, initialTasks)`: store `initialTasks` in `this.tasks`; build panel DOM with a text input, an "Add" button, an error message area, and a task list container; call `_renderAll()`
    - Implement `_persist()`: call `StorageService.write(KEYS.TASKS, this.tasks)`; return the boolean result
    - Implement `_renderAll()`: clear and re-render the task list container by calling `_renderTask()` for each task
    - _Requirements: 4.1, 7.1, 7.2_

  - [x] 5.3 Implement `TodoList.addTask()` with validation
    - Trim the input description; reject empty/whitespace-only with message "Task description cannot be empty."; reject length > 255 with message "Task description cannot exceed 255 characters."
    - On valid input: create a new `Task` object; push to `this.tasks`; call `_persist()`; if persist fails, display save-failed error and keep task in memory; clear the input field; call `_renderAll()`
    - Support both "Add" button click and Enter-key press in the text input
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 7.5_

  - [ ]* 5.4 Write unit tests for `TodoList.addTask()`
    - Test: 255-character description succeeds
    - Test: 256-character description fails with correct error message
    - Test: whitespace-only description fails with correct error message
    - Test: storage failure on add — task present in memory, not in storage mock
    - _Requirements: 4.2, 4.4, 4.5, 7.5_

  - [ ]* 5.5 Write property test for `TodoList.addTask()` — Task addition round-trip (Property 1)
    - **Property 1: Task addition round-trip**
    - Generator: `fc.string({ minLength: 1, maxLength: 255 })` filtered to exclude whitespace-only strings
    - Assert: after `addTask(desc)`, `StorageService.read(KEYS.TASKS)` contains a task with matching `description` and `completed === false`
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 5.6 Write property test for `TodoList.addTask()` — Whitespace rejection (Property 2)
    - **Property 2: Whitespace-only task descriptions are always rejected**
    - Generator: `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1 })`
    - Assert: `addTask(ws)` returns a failure result; list length unchanged; storage unchanged
    - **Validates: Requirements 4.4**

  - [x] 5.7 Implement `TodoList.editTask()` with validation and cancel support
    - Implement `_renderTask(task)`: build task row with text display, checkbox/toggle, Edit button, Delete button
    - On Edit button: replace text display with a pre-filled `<input>`, focus it; bind Enter to confirm, Escape to cancel
    - On confirm: trim value; reject empty/whitespace-only (restore original, message "Task description cannot be empty."); reject > 500 chars (message "Task description cannot exceed 500 characters."); on valid input, update `description`, call `_persist()`, call `_renderAll()`
    - On cancel (Escape): restore original task display, leave storage unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 5.8 Write unit tests for `TodoList.editTask()`
    - Test: 500-character description succeeds
    - Test: whitespace-only edit restores original description
    - Test: Escape key cancels edit without storage change
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 5.9 Write property test for `TodoList.editTask()` — Edit preserves identity (Property 9)
    - **Property 9: Task edit preserves identity and trims whitespace**
    - Generator: `taskArbitrary` + `fc.string({ minLength: 1, maxLength: 500 })` filtered so trimmed length ≥ 1
    - Assert: after `editTask(id, input)`, task `id`, `completed`, `createdAt` unchanged; `description === input.trim()`
    - **Validates: Requirements 5.3**

  - [ ]* 5.10 Write property test for `TodoList.editTask()` — Whitespace edit leaves task unchanged (Property 10)
    - **Property 10: Whitespace-only edit leaves task unchanged**
    - Generator: `taskArbitrary` + `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1 })`
    - Assert: `editTask(id, ws)` returns failure; `description` unchanged; storage unchanged
    - **Validates: Requirements 5.4**

  - [x] 5.11 Implement `TodoList.toggleComplete()` and `TodoList.deleteTask()`
    - `toggleComplete(id)`: flip `completed` on the matching task; call `_persist()`; if persist fails, keep updated status in memory and show error; call `_renderAll()`; apply strikethrough style to completed tasks
    - `deleteTask(id)`: remove the task from `this.tasks`; call `_persist()`; if persist fails, restore the task and show error; call `_renderAll()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 5.12 Write property test for `TodoList.toggleComplete()` — Toggle is its own inverse (Property 3)
    - **Property 3: Task toggle is its own inverse (round-trip)**
    - Generator: `fc.array(taskArbitrary, { minLength: 1 })` + `fc.integer` index into the array
    - Assert: after `toggleComplete(id)` twice, `tasks[i].completed === original`; list length unchanged throughout
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 5.13 Write property test for `TodoList.deleteTask()` — Deletion shrinks list by exactly one (Property 4)
    - **Property 4: Task deletion shrinks the list by exactly one**
    - Generator: `fc.array(taskArbitrary, { minLength: 1 })` + valid index
    - Assert: after `deleteTask(id)`, list length is `original.length - 1`; no remaining task shares the deleted `id`
    - **Validates: Requirements 6.7**

  - [ ]* 5.14 Write property test for Task serialization round-trip (Property 5)
    - **Property 5: Task serialization round-trip**
    - Generator: `fc.array(taskArbitrary)`
    - Assert: `JSON.parse(JSON.stringify(tasks))` produces tasks with identical `id`, `description`, `completed`, `createdAt`; order preserved
    - **Validates: Requirements 7.1, 7.2**

- [x] 6. Checkpoint — Todo List complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement `QuickLinks` — core CRUD and persistence
  - [x] 7.1 Implement `QuickLinks.init()`, `_validateUrl()`, `_persist()`, and `_renderAll()`
    - Implement `init(container, initialLinks)`: store `initialLinks` in `this.links`; build panel DOM with label input (max 50 chars), URL input (max 2048 chars), "Add Link" button, error area, and links container; call `_renderAll()`
    - Implement `_validateUrl(url)`: return `true` if `url` begins with `http://` or `https://` and has length ≤ 2048; return `false` otherwise
    - Implement `_persist()`: call `StorageService.write(KEYS.LINKS, this.links)`; return the boolean result
    - Implement `_renderAll()`: clear and re-render the links container by calling `_renderLink()` for each link
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 10.1, 10.2, 10.3_

  - [x] 7.2 Implement `QuickLinks.addLink()` and link button behavior
    - Validate label (non-empty, max 50 chars); validate URL via `_validateUrl()`; show per-field error messages on rejection
    - On valid input: create `Link` object `{ id, label, url }`; push to `this.links`; call `_persist()`; if persist fails, remove the link from the panel and show error; call `_renderAll()`
    - `_renderLink(link)`: create a button that opens `link.url` in a new tab (`window.open(url, '_blank')`), plus a Delete button
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 7.3 Write unit tests for `QuickLinks._validateUrl()`
    - Test: `"http://example.com"` → `true`
    - Test: `"https://example.com"` → `true`
    - Test: `"ftp://example.com"` → `false`
    - Test: `""` → `false`
    - Test: `"example.com"` → `false`
    - Test: storage failure on add removes link from panel
    - _Requirements: 8.2, 8.6, 8.7_

  - [ ]* 7.4 Write property test for `QuickLinks._validateUrl()` — URL validation is total (Property 7)
    - **Property 7: URL validation is total and consistent**
    - Generator A: `fc.string()` filtered to NOT start with `http://` or `https://` → must return `false`
    - Generator B: `fc.oneof(fc.constant('http://'), fc.constant('https://'))` + `fc.string({ minLength: 1, maxLength: 2040 })` → must return `true`
    - **Validates: Requirements 8.2, 8.6**

  - [x] 7.5 Implement `QuickLinks.deleteLink()` with confirmation and rollback
    - Show `window.confirm()` dialog before removal (Requirement 9.4)
    - If user cancels: retain link, do nothing
    - If user confirms: remove link from `this.links`; call `_persist()`; if persist fails, restore link to its previous position and show error; call `_renderAll()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 7.6 Write property test for Link serialization round-trip (Property 6)
    - **Property 6: Link serialization round-trip**
    - Generator: `fc.array(linkArbitrary)`
    - Assert: `JSON.parse(JSON.stringify(links))` produces links with identical `id`, `label`, `url`; order preserved
    - **Validates: Requirements 10.1, 10.2**

- [x] 8. Implement `App.init()` — bootstrap and wiring
  - [x] 8.1 Implement `App.init()` to bootstrap all panels
    - In `App.init()` (called on `DOMContentLoaded`): call `StorageService.read()` for both `KEYS.TASKS` and `KEYS.LINKS`
    - Handle storage unavailability: if reads fail, render all panels in their default empty state and display a global error banner
    - Pass resolved data to each panel's `init(container, data)` function
    - Call `GreetingPanel.startClock()` after init
    - Ensure all panels are rendered before the first paint (target < 200 ms)
    - _Requirements: 1.1, 1.2, 1.6, 7.1, 7.3, 10.3_

  - [x] 8.2 Implement loading indicator for slow initial loads
    - Insert a visible loading indicator into the DOM immediately on script parse
    - Remove it once all four panels have been initialized by `App.init()`
    - If `DOMContentLoaded` has not fired within 500 ms of page load start, keep the indicator visible until panels render
    - _Requirements: 11.5_

- [x] 9. Implement `css/style.css` — layout, panel styles, and responsive design
  - [x] 9.1 Implement base reset, typography, and panel shared styles
    - CSS reset / normalize for consistent cross-browser rendering
    - Base `font-size` of at least 14 px; `line-height` and `font-family` defaults
    - Panel shared styles: card appearance, uniform padding of at least 8 px, color variables
    - Ensure all text meets a minimum contrast ratio of 4.5:1 against its background
    - _Requirements: 1.5, 11.3_

  - [x] 9.2 Implement dashboard grid layout and per-panel styles
    - Dashboard layout: CSS Grid or Flexbox placing all four panels on one page; desktop layout uses at least two columns
    - Greeting Panel: prominent time display, secondary date and greeting text
    - Focus Timer: large countdown display, clearly spaced Start / Stop / Reset buttons; disabled-state visual styles
    - Todo List: scrollable task list area; strikethrough style for completed tasks; inline error message placement
    - Quick Links: wrapping grid or flex row of link buttons; inline error message placement
    - Loading indicator: centered spinner or progress bar overlaying the dashboard
    - _Requirements: 1.1, 1.5, 6.2, 6.3, 3.7, 3.8, 11.3_

  - [x] 9.3 Implement responsive breakpoints
    - Below 768 px viewport width: stack all four panels in a single column with no horizontal overflow
    - Ensure all controls remain reachable and readable (minimum 12 px font) at 320 px wide
    - Test layout at 320 px, 768 px, 1440 px, and 2560 px
    - _Requirements: 1.7, 11.3_

- [x] 10. Final integration checkpoint and error-handling pass
  - [x] 10.1 Wire error message display and dismissal across all panels
    - Implement `_showError(message)` in `TodoList` and `QuickLinks`: render inline error adjacent to the relevant input; clear the message when the user begins a new interaction with that input
    - Implement global error banner for storage-unavailable-on-load scenario (Requirement 1.6)
    - Confirm all error messages match the exact strings specified in the design error-handling table
    - _Requirements: 1.6, 4.4, 4.5, 5.4, 5.6, 5.7, 6.5, 6.8, 8.5, 8.6, 8.7, 9.3_

  - [x] 10.2 Validate cross-panel wiring and end-to-end data flow
    - Verify `App.init()` passes correct initial data to each panel
    - Verify that after a page reload all persisted tasks and links are restored in their saved order
    - Confirm no external fonts, scripts, or stylesheets are loaded (only `css/style.css` and `js/app.js`)
    - _Requirements: 1.3, 1.4, 7.1, 10.1, 11.4_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all automated tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** v3 with a minimum of 100 runs per property; annotate each test file with `// Feature: todo-life-dashboard, Property N: <property_text>`
- Unit tests use **Jest** v29 with **jsdom**; mock `localStorage` via a custom in-memory implementation
- Checkpoints at Tasks 6 and 11 ensure incremental validation before moving to the next phase
- The app must function as both a standalone HTML file and a browser extension — no server-dependent APIs (e.g., no `fetch`, no service workers required)
- `window.confirm()` is used for link deletion confirmation; this is acceptable for the extension context

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.3", "7.1"] },
    { "id": 5, "tasks": ["5.4", "5.5", "5.6", "5.7", "7.2"] },
    { "id": 6, "tasks": ["5.8", "5.9", "5.10", "5.11", "7.3", "7.4", "7.5"] },
    { "id": 7, "tasks": ["5.12", "5.13", "5.14", "7.6", "8.1"] },
    { "id": 8, "tasks": ["8.2", "9.1"] },
    { "id": 9, "tasks": ["9.2"] },
    { "id": 10, "tasks": ["9.3", "10.1"] },
    { "id": 11, "tasks": ["10.2"] }
  ]
}
```
