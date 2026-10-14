"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Caveat, JetBrains_Mono, Lora } from "next/font/google";
import s from "./notes.module.css";

const lora = Lora({ subsets: ["latin"] });
const mono = JetBrains_Mono({ subsets: ["latin"] });
const caveat = Caveat({ subsets: ["latin"] });

const FONTS = [
  { id: "display", label: "Bricolage", family: "var(--font)" },
  { id: "serif", label: "Lora", family: lora.style.fontFamily },
  { id: "mono", label: "Mono", family: mono.style.fontFamily },
  { id: "hand", label: "Handwritten", family: caveat.style.fontFamily },
] as const;

type FontId = (typeof FONTS)[number]["id"];

const INKS = ["#1f2a24", "#2f4bc9", "#2b724a", "#b23a2e", "#7a4fb5"];
const PAPERS = ["#f7f8f4", "#fbf0c8", "#dfe4fa", "#dcefe3", "#1f2a24"];

const STORAGE_KEY = "leverage.notes.v2";
const LEGACY_KEY = "leverage.notes.v1";
// Work in progress, written on every change so a closed tab or crash loses nothing.
// The real save (Save button, Ctrl/Cmd+S) still writes to STORAGE_KEY only.
const DRAFT_KEY = "leverage.draft.v1";

type Style = { font: FontId; ink: string; paper: string; size: number };
// `text` is the plain-text mirror of `html`, used for titles and search.
// Notes written before highlights and tables existed have no `html`.
type Draft = Style & { text: string; html?: string };
type Note = Draft & { id: string; createdAt: number; updatedAt: number };

const DEFAULT_STYLE: Style = { font: "display", ink: INKS[0], paper: PAPERS[0], size: 18 };
const EMPTY: Draft = { ...DEFAULT_STYLE, text: "" };

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function loadNotes(): Note[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Note[];
    // Carry over the single note from the previous version, if there was one.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = { ...EMPTY, ...JSON.parse(legacy) } as Draft;
      if (old.text.trim()) {
        const t = Date.now();
        return [{ ...old, id: newId(), createdAt: t, updatedAt: t }];
      }
    }
  } catch {}
  return [];
}

function persist(notes: Note[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

type StoredDraft = { current: string | null; draft: Draft };

function loadDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!parsed.draft || typeof parsed.draft.text !== "string") return null;
    return { current: parsed.current ?? null, draft: { ...EMPTY, ...parsed.draft } };
  } catch {
    return null;
  }
}

function persistDraft(value: StoredDraft | null) {
  try {
    if (value) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

function matches(n: Note, q: string) {
  return n.text.toLowerCase().includes(q);
}

function titleOf(text: string) {
  const line = text.split("\n").find((l) => l.trim());
  return line ? line.trim().slice(0, 60) : "Untitled";
}

// ---------- note markup ----------
// A note is a small, fixed set of HTML: lines, highlights and tables. Everything
// else is stripped when the editor reports a change, so the stored shape stays
// predictable whatever the browser or a paste produces.

const KEEP = new Set(["P", "DIV", "BR", "MARK", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlOf(d: Draft) {
  return d.html ?? escapeHtml(d.text).split("\n").join("<br>");
}

function clean(el: Element) {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const c = child as HTMLElement;
    const bg = c.style?.backgroundColor;
    if (c.tagName === "SPAN" && bg && bg !== "transparent") {
      // Browsers express a highlight as a styled span; keep it as <mark>.
      const m = c.ownerDocument.createElement("mark");
      m.append(...Array.from(c.childNodes));
      c.replaceWith(m);
      clean(m);
      continue;
    }
    if (!KEEP.has(c.tagName)) {
      clean(c);
      c.replaceWith(...Array.from(c.childNodes));
      continue;
    }
    for (const a of Array.from(c.attributes)) c.removeAttribute(a.name);
    clean(c);
  }
}

function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html");
  const root = doc.getElementById("r")!;
  clean(root);
  return root.innerHTML;
}

function isBlank(d: Draft) {
  return d.text.trim() === "" && !(d.html ?? "").includes("<table");
}

function sameDraft(a: Draft, b: Draft) {
  return (
    htmlOf(a) === htmlOf(b) &&
    a.font === b.font &&
    a.ink === b.ink &&
    a.paper === b.paper &&
    a.size === b.size
  );
}

function serialize(frag: DocumentFragment) {
  const d = document.createElement("div");
  d.append(frag);
  return d.innerHTML;
}

function isDark(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

function tableHtml(cols = 3, rows = 3) {
  const cell = (tag: string) => `<${tag}><br></${tag}>`;
  const row = (tag: string) => `<tr>${Array.from({ length: cols }, () => cell(tag)).join("")}</tr>`;
  const body = Array.from({ length: rows - 1 }, () => row("td")).join("");
  return `<table><thead>${row("th")}</thead><tbody>${body}</tbody></table><div><br></div>`;
}

type Pen = "mark" | "erase" | null;

function unwrap(el: Element) {
  el.replaceWith(...Array.from(el.childNodes));
}

// Split a highlight so that `t` is its only child, moving the siblings before
// and after `t` into their own highlights.
function isolate(m: Element, t: Node) {
  const before = document.createElement("mark");
  const after = document.createElement("mark");
  let n = m.firstChild;
  while (n && n !== t) {
    const next = n.nextSibling;
    before.append(n);
    n = next;
  }
  n = t.nextSibling;
  while (n) {
    const next = n.nextSibling;
    after.append(n);
    n = next;
  }
  if (before.hasChildNodes()) m.before(before);
  if (after.hasChildNodes()) m.after(after);
}

// Pass the marker (or eraser) over a range. Marking wraps bare text and leaves
// text that is already highlighted alone; erasing removes highlights.
function strokeRange(pad: HTMLElement, range: Range, pen: Pen) {
  const sc = range.startContainer, so = range.startOffset;
  const ec = range.endContainer, eo = range.endOffset;
  if (ec.nodeType === Node.TEXT_NODE && eo < (ec as Text).length) (ec as Text).splitText(eo);
  if (sc.nodeType === Node.TEXT_NODE && so > 0) {
    const rest = (sc as Text).splitText(so);
    range.setStart(rest, 0);
    if (ec === sc) range.setEnd(rest, rest.length);
  }
  const walker = document.createTreeWalker(pad, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (n.length > 0 && range.intersectsNode(n)) texts.push(n);
  }
  for (const text of texts) {
    const m = text.parentElement?.closest("mark");
    const marked = !!m && pad.contains(m);
    if (pen === "mark" && !marked) {
      const mark = document.createElement("mark");
      text.replaceWith(mark);
      mark.append(text);
    } else if (pen === "erase" && marked) {
      if (text.parentNode === m && m.childNodes.length > 1) isolate(m, text);
      if (text.parentNode === m) unwrap(m);
    }
  }
  // Merge touching highlights so runs stay seamless.
  for (const m of Array.from(pad.querySelectorAll("mark"))) {
    let next = m.nextSibling;
    while (next && next.nodeType === Node.ELEMENT_NODE && (next as Element).tagName === "MARK") {
      m.append(...Array.from(next.childNodes));
      const gone = next as Element;
      next = next.nextSibling;
      gone.remove();
    }
    if (!m.hasChildNodes()) m.remove();
  }
  pad.normalize();
}

function when(ts: number, now: number) {
  const mins = Math.round((now - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const d = new Date(ts);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [flash, setFlash] = useState(false);
  const [restored, setRestored] = useState(false);
  const [query, setQuery] = useState("");
  // Bumped whenever a different note (or a restored draft) is loaded into the pad.
  const [loadKey, setLoadKey] = useState(0);
  const [inTable, setInTable] = useState(false);
  // Highlighter or eraser mode: while on, any text you drag over is marked or cleared.
  const [pen, setPen] = useState<Pen>(null);

  const padRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    const kept = loadDraft();
    const target = kept && (kept.current === null || loaded.some((n) => n.id === kept.current)) ? kept : null;
    if (target) {
      // Pick up where the last session left off, unsaved.
      setCurrent(target.current);
      setDraft(target.draft);
      setRestored(true);
    } else if (loaded[0]) {
      setCurrent(loaded[0].id);
      setDraft(loaded[0]);
    }
    setLoadKey((k) => k + 1);
    setNow(Date.now());
    setHydrated(true);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  // The pad is uncontrolled: React never re-renders its contents while typing,
  // which keeps the caret and native undo intact. Content is set only on load.
  useEffect(() => {
    const pad = padRef.current;
    if (!pad || loadKey === 0) return;
    pad.innerHTML = htmlOf(draftRef.current);
  }, [loadKey]);

  const sorted = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt), [notes]);
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? sorted.filter((n) => matches(n, q)) : sorted), [sorted, q]);
  const saved = useMemo(() => notes.find((n) => n.id === current) ?? null, [notes, current]);
  const dirty = saved ? !sameDraft(saved, draft) : !isBlank(draft);

  // Mirror unsaved work to its own key; drop it once the note matches what is saved.
  useEffect(() => {
    if (!hydrated) return;
    persistDraft(dirty ? { current, draft } : null);
  }, [hydrated, dirty, current, draft]);

  const save = useCallback(() => {
    if (!dirty) return;
    const t = Date.now();
    setNotes((prev) => {
      let next: Note[];
      if (saved) {
        next = prev.map((n) => (n.id === saved.id ? { ...n, ...draft, updatedAt: t } : n));
      } else {
        const id = newId();
        next = [{ ...draft, id, createdAt: t, updatedAt: t }, ...prev];
        setCurrent(id);
      }
      persist(next);
      return next;
    });
    setNow(t);
    setFlash(true);
    setRestored(false);
  }, [dirty, saved, draft]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(false), 1200);
    return () => window.clearTimeout(t);
  }, [flash]);

  // Read the pad back into the draft after any change.
  const commit = useCallback(() => {
    const pad = padRef.current;
    if (!pad) return;
    setRestored(false);
    setDraft((d) => ({ ...d, html: sanitize(pad.innerHTML), text: pad.innerText }));
  }, []);

  const inPad = useCallback((node: Node | null) => {
    const pad = padRef.current;
    return !!(pad && node && pad.contains(node));
  }, []);

  const elementAt = useCallback(
    (node: Node | null) => (node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement) ?? null,
    [],
  );

  // Track whether the caret sits in a table, for the toolbar.
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const node = sel?.anchorNode ?? null;
      if (!inPad(node)) return setInTable(false);
      setInTable(!!elementAt(node)?.closest("table"));
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [inPad, elementAt]);

  // Apply the pen to whatever is selected in the pad, then drop the selection.
  const stroke = useCallback(
    (mode: Pen) => {
      const pad = padRef.current;
      const sel = window.getSelection();
      if (!mode || !pad || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!inPad(range.startContainer) || !inPad(range.endContainer)) return;
      strokeRange(pad, range, mode);
      sel.collapseToEnd();
      commit();
    },
    [inPad, commit],
  );

  // Called when a drag or shift-selection ends while a pen is on.
  const strokeEnd = useCallback(() => stroke(pen), [stroke, pen]);

  // Switching a pen on also applies it to anything already selected.
  const togglePen = useCallback(
    (mode: Exclude<Pen, null>) => {
      const next = pen === mode ? null : mode;
      setPen(next);
      stroke(next);
    },
    [pen, stroke],
  );

  const insertTable = useCallback(() => {
    const pad = padRef.current;
    if (!pad) return;
    pad.focus();
    const sel = window.getSelection();
    if (!sel || !inPad(sel.anchorNode)) {
      const r = document.createRange();
      r.selectNodeContents(pad);
      r.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    document.execCommand("insertHTML", false, tableHtml());
    commit();
  }, [inPad, commit]);

  const currentCell = useCallback(() => {
    const sel = window.getSelection();
    const el = inPad(sel?.anchorNode ?? null) ? elementAt(sel!.anchorNode) : null;
    return (el?.closest("td,th") as HTMLTableCellElement | null) ?? null;
  }, [inPad, elementAt]);

  const focusCell = (cell: Element) => {
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(cell);
    r.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const addRow = useCallback(() => {
    const cell = currentCell();
    const table = cell?.closest("table");
    if (!cell || !table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    const last = rows[rows.length - 1];
    const tr = document.createElement("tr");
    for (let i = 0; i < last.cells.length; i++) {
      const td = document.createElement("td");
      td.innerHTML = "<br>";
      tr.append(td);
    }
    (table.tBodies[0] ?? table).append(tr);
    focusCell(tr.cells[0]);
    commit();
  }, [currentCell, commit]);

  const addColumn = useCallback(() => {
    const cell = currentCell();
    const table = cell?.closest("table");
    if (!cell || !table) return;
    for (const tr of Array.from(table.querySelectorAll("tr"))) {
      const c = document.createElement(tr.parentElement?.tagName === "THEAD" ? "th" : "td");
      c.innerHTML = "<br>";
      tr.append(c);
    }
    commit();
  }, [currentCell, commit]);

  const removeTable = useCallback(() => {
    const table = currentCell()?.closest("table");
    if (!table) return;
    if (!window.confirm("Remove this table and everything in it?")) return;
    const after = document.createElement("div");
    after.innerHTML = "<br>";
    table.replaceWith(after);
    focusCell(after);
    commit();
  }, [currentCell, commit]);

  const onPadKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const cell = currentCell();
    if (!cell) return;
    e.preventDefault();
    const table = cell.closest("table")!;
    const cells = Array.from(table.querySelectorAll("td,th"));
    const i = cells.indexOf(cell);
    if (e.shiftKey) {
      if (i > 0) focusCell(cells[i - 1]);
    } else if (i < cells.length - 1) {
      focusCell(cells[i + 1]);
    } else {
      addRow();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Paste as plain text so outside formatting never lands in a note.
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        save();
      } else if (k === "h" && e.shiftKey) {
        e.preventDefault();
        togglePen("mark");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, togglePen]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function confirmLeave() {
    return !dirty || window.confirm("You have unsaved changes. Leave this note without saving?");
  }

  function load(d: Draft, id: string | null) {
    setRestored(false);
    setCurrent(id);
    setDraft(d);
    setLoadKey((k) => k + 1);
  }

  function openNote(n: Note) {
    if (n.id === current) return;
    if (!confirmLeave()) return;
    load(n, n.id);
  }

  function newNote() {
    if (!confirmLeave()) return;
    load({ ...draft, text: "", html: "" }, null);
  }

  function deleteNote() {
    if (!saved) return;
    if (!window.confirm(`Delete "${titleOf(saved.text)}"? This cannot be undone.`)) return;
    const next = notes.filter((n) => n.id !== saved.id);
    persist(next);
    setNotes(next);
    const nextOpen = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    load(nextOpen ?? { ...draft, text: "", html: "" }, nextOpen?.id ?? null);
  }

  const set = (patch: Partial<Draft>) => {
    setRestored(false);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const family = FONTS.find((f) => f.id === draft.font)?.family ?? FONTS[0].family;
  const highlight = isDark(draft.paper) ? "rgba(255, 221, 87, 0.42)" : "rgba(255, 221, 87, 0.85)";

  const status = !hydrated
    ? ""
    : flash
      ? "Saved"
      : dirty
        ? restored
          ? "Restored unsaved changes"
          : saved
            ? "Unsaved changes"
            : "Not saved yet"
        : saved
          ? `Saved ${when(saved.updatedAt, now)}`
          : "New note";

  return (
    <div className={s.layout}>
      <aside className={s.side} aria-label="Saved notes">
        <div className={s.sideHead}>
          <h2 className={s.sideTitle}>Notes</h2>
          <button className={s.newBtn} onClick={newNote}>
            New note
          </button>
        </div>
        {hydrated && sorted.length > 0 && (
          <input
            type="search"
            className={s.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Search notes"
            aria-label="Search notes"
          />
        )}
        {hydrated && sorted.length === 0 ? (
          <p className={s.empty}>Nothing saved yet. Write something and press Save.</p>
        ) : hydrated && visible.length === 0 ? (
          <p className={s.empty}>No notes match “{query.trim()}”.</p>
        ) : (
          <ul className={s.list}>
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  className={`${s.item} ${n.id === current ? s.itemOn : ""}`}
                  aria-current={n.id === current ? "true" : undefined}
                  onClick={() => openNote(n)}
                >
                  <span className={s.itemDot} style={{ background: n.paper, borderColor: n.ink }} />
                  <span className={s.itemText}>
                    <span className={s.itemTitle}>{titleOf(n.text)}</span>
                    <span className={s.itemWhen}>{now ? when(n.updatedAt, now) : ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className={s.editor}>
        <div className={s.toolbar}>
          <label className={s.field}>
            <span className={s.label}>Font</span>
            <select
              className={s.select}
              value={draft.font}
              onChange={(e) => set({ font: e.target.value as FontId })}
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className={s.field}>
            <span className={s.label}>Size</span>
            <select
              className={s.select}
              value={draft.size}
              onChange={(e) => set({ size: Number(e.target.value) })}
            >
              {[14, 16, 18, 22, 28].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <Swatches label="Text" colors={INKS} value={draft.ink} onPick={(ink) => set({ ink })} />
          <Swatches
            label="Paper"
            colors={PAPERS}
            value={draft.paper}
            onPick={(paper) => set({ paper })}
          />

          <div className={s.field} role="group" aria-label="Insert">
            <span className={s.label}>Insert</span>
            <div className={s.tools}>
              <button
                className={`${s.tool} ${pen === "mark" ? s.toolOn : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => togglePen("mark")}
                aria-pressed={pen === "mark"}
                title="Highlighter: drag over text to mark it (Ctrl+Shift+H)"
              >
                <mark className={s.toolMark}>Highlighter</mark>
              </button>
              <button
                className={`${s.tool} ${pen === "erase" ? s.toolOn : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => togglePen("erase")}
                aria-pressed={pen === "erase"}
                title="Eraser: drag over highlighted text to clear it"
              >
                Eraser
              </button>
              {inTable ? (
                <>
                  <button className={s.tool} onMouseDown={(e) => e.preventDefault()} onClick={addRow}>
                    + Row
                  </button>
                  <button className={s.tool} onMouseDown={(e) => e.preventDefault()} onClick={addColumn}>
                    + Column
                  </button>
                  <button className={s.tool} onMouseDown={(e) => e.preventDefault()} onClick={removeTable}>
                    Remove table
                  </button>
                </>
              ) : (
                <button className={s.tool} onMouseDown={(e) => e.preventDefault()} onClick={insertTable}>
                  Table
                </button>
              )}
            </div>
          </div>

          <div className={s.actions}>
            <span className={`${s.status} ${dirty && !flash ? s.statusDirty : ""}`} aria-live="polite">
              {status}
            </span>
            {saved && (
              <button className={s.deleteBtn} onClick={deleteNote}>
                Delete
              </button>
            )}
            <button className={s.saveBtn} onClick={save} disabled={!dirty} title="Ctrl+S">
              Save
            </button>
          </div>
        </div>

        <div
          ref={padRef}
          className={`${s.pad} ${hydrated && isBlank(draft) ? s.padEmpty : ""} ${pen ? s.padPen : ""}`}
          style={{
            fontFamily: family,
            fontSize: draft.size,
            color: draft.ink,
            background: draft.paper,
            ["--hl" as string]: highlight,
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={commit}
          onKeyDown={onPadKey}
          onKeyUp={(e) => {
            if (e.key === "Shift") strokeEnd();
          }}
          onPointerUp={strokeEnd}
          onDragStart={(e) => {
            // With a pen on, dragging over selected text must mark it, not move it.
            if (pen) e.preventDefault();
          }}
          onPaste={onPaste}
          data-placeholder="Write anything…"
          role="textbox"
          aria-multiline="true"
          aria-label="Note"
          spellCheck
        />
      </div>
    </div>
  );
}

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className={s.field} role="group" aria-label={`${label} colour`}>
      <span className={s.label}>{label}</span>
      <div className={s.swatches}>
        {colors.map((c) => (
          <button
            key={c}
            className={`${s.swatch} ${value === c ? s.swatchOn : ""}`}
            style={{ background: c }}
            aria-label={c}
            aria-pressed={value === c}
            onClick={() => onPick(c)}
          />
        ))}
        <input
          type="color"
          className={s.custom}
          value={value}
          onChange={(e) => onPick(e.target.value)}
          aria-label={`Custom ${label.toLowerCase()} colour`}
        />
      </div>
    </div>
  );
}
