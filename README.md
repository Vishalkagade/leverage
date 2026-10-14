# Leverage

A small personal notes app. One screen: a list of saved notes on the left, the note you are
writing on the right.

- **Write** in a plain text pad. Pick a font (Bricolage, Lora, Mono, Handwritten), a size, a
  text colour and a paper colour per note.
- **Save** with the Save button or Ctrl/Cmd+S. Nothing is stored until you save, and the
  app warns you before you leave a note with unsaved changes.
- **Reopen** any saved note from the list. The first line of the note is its title.
- **Delete** a saved note from the toolbar.
- **Highlight** selected text from the toolbar or with Ctrl/Cmd+Shift+H. Press again inside a
  highlight to remove it.
- **Tables.** Insert one from the toolbar; Tab moves between cells and adds a row at the end.
  With the caret in a table you can add a row or column, or remove the table.
- **Search** the list by any text a note contains.
- **Never lose a draft.** What you are typing is kept in the browser as you go, and comes back
  on the next visit marked "Restored unsaved changes". It only becomes a saved note when you press Save.

Everything is stored in your browser's localStorage under a versioned key. There is no
backend and no account, so notes stay on the device and browser you wrote them in.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

```bash
npx vercel
```

Or push the repo to GitHub and import it at vercel.com/new. No environment variables are needed.
