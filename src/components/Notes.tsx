"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
type Draft = Style & { text: string };
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

function sameDraft(a: Draft, b: Draft) {
  return (
    a.text === b.text &&
    a.font === b.font &&
    a.ink === b.ink &&
    a.paper === b.paper &&
    a.size === b.size
  );
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
    setNow(Date.now());
    setHydrated(true);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const sorted = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt), [notes]);
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (q ? sorted.filter((n) => matches(n, q)) : sorted), [sorted, q]);
  const saved = useMemo(() => notes.find((n) => n.id === current) ?? null, [notes, current]);
  const dirty = saved ? !sameDraft(saved, draft) : draft.text.trim().length > 0;

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

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

  function openNote(n: Note) {
    if (n.id === current) return;
    if (!confirmLeave()) return;
    setRestored(false);
    setCurrent(n.id);
    setDraft(n);
  }

  function newNote() {
    if (!confirmLeave()) return;
    setRestored(false);
    setCurrent(null);
    setDraft({ ...draft, text: "" });
  }

  function deleteNote() {
    if (!saved) return;
    if (!window.confirm(`Delete "${titleOf(saved.text)}"? This cannot be undone.`)) return;
    const next = notes.filter((n) => n.id !== saved.id);
    persist(next);
    setNotes(next);
    setRestored(false);
    const nextOpen = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    setCurrent(nextOpen?.id ?? null);
    setDraft(nextOpen ?? { ...draft, text: "" });
  }

  const set = (patch: Partial<Draft>) => {
    setRestored(false);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const family = FONTS.find((f) => f.id === draft.font)?.family ?? FONTS[0].family;

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

        <textarea
          className={s.pad}
          style={{
            fontFamily: family,
            fontSize: draft.size,
            color: draft.ink,
            background: draft.paper,
          }}
          value={draft.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Write anything…"
          aria-label="Note"
          spellCheck
          autoFocus
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
