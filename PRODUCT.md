# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, a graduate student at Hochschule Ansbach who also runs a household. They use Leverage alone, mostly at the laptop, to write things down and come back to them later. Phone use is secondary and mostly for reading a saved note.

## Product Purpose

Leverage is a place to write notes and keep them. One screen: saved notes on the left, the note being written on the right. Each note carries its own font, size, text colour and paper colour. Saving is explicit (Save button or Ctrl/Cmd+S); the app never writes a note to storage until the owner asks, and warns before unsaved changes are lost. Success is that the owner trusts the app with a thought and finds it again later.

## Positioning

The productivity board, task matrix and tracker that Leverage started as were removed in October 2026. What remains is deliberately small: no tags, folders, sync, or rich text. The name Leverage stays.

## Operating Context

- Used in the browser on a laptop in the morning, occasionally on a phone.
- No accounts, no server. Data lives in the browser's localStorage under a versioned key.
- Deployed on Vercel from the GitHub repository `Vishalkagade/leverage`, branch `main`. Vercel Analytics is enabled.
- Stack: Next.js 16 App Router, React 19, TypeScript, CSS Modules, no UI library.

## Capabilities and Constraints

Confirmed functionality:

- Write a note in a plain text pad. Choose font (Bricolage, Lora, Mono, Handwritten), size, text colour and paper colour, including a custom colour.
- Save explicitly with the Save button or Ctrl/Cmd+S. Status text shows "Unsaved changes", "Saved", or when the note was last saved.
- Saved notes list, newest first, titled by the first line of the note. Open, create new, delete.
- Search box above the list filters notes by any text they contain. Escape clears it.
- Unsaved work is mirrored to a separate draft key on every change and restored on the next load, marked "Restored unsaved changes". Saving still happens only on request.
- Warning before leaving a note (switching, creating new, closing the tab) with unsaved changes.
- Notes from the earlier single-note version are carried over on first load.

Terminology to keep: Notes, Save, New note, Unsaved changes.

Constraints:

- Single device. Data lives in the browser's localStorage under a versioned key. Cross-device sync is deferred; if added later it implies a database and a simple sign-in.
- One screen. No modals or extra pages unless a feature genuinely needs them.
- No task lists, trackers, streaks, or reminders. Those were removed on purpose.

## Brand Commitments

- Name: Leverage. Tagline in use: "Write it down. Keep it."
- Voice: plain, second person, sentence case. Controls name their action ("Save", "New note", "Delete"). No motivational copy.
- Binding visual constraint volunteered by the owner: the current chalk-green world with Bricolage Grotesque, the yellow-filled cell in the logo mark, and the cobalt and moss accent colours. A neutral white and grey restyle was tried and rejected as less liked. Future refinement preserves this world.

## Evidence on Hand

- The working application in `src/`, with note storage in `src/components/Notes.tsx`.
- No real user data beyond the owner's own notes. No testimonials, metrics, or comparisons exist and none should be invented.

## Product Principles

1. Nothing is saved until you say so. Saving is a deliberate act, and the interface always says whether the open note is saved.
2. The note owns its look. Font and colours belong to each note, not to the app, so a note looks the way it did when it was written.
3. One screen, no ceremony. Open the app and start typing. No folders, tags, or setup.
4. Owner's tool. Optimise for the one person who uses it every day, not for a hypothetical newcomer.

## Accessibility & Inclusion

Keyboard operable throughout, visible focus, text contrast at or above 4.5:1, reduced motion respected. No further product-specific requirement was established.
