"use client";

import { useEffect, useState } from "react";
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

const STORAGE_KEY = "leverage.notes.v1";

type Saved = { text: string; font: FontId; ink: string; paper: string; size: number };

const DEFAULTS: Saved = { text: "", font: "display", ink: INKS[0], paper: PAPERS[0], size: 18 };

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function Notes() {
  const [note, setNote] = useState<Saved>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setNote(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(note));
    } catch {}
  }, [note, hydrated]);

  const set = (patch: Partial<Saved>) => setNote((n) => ({ ...n, ...patch }));
  const family = FONTS.find((f) => f.id === note.font)?.family ?? FONTS[0].family;

  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <label className={s.field}>
          <span className={s.label}>Font</span>
          <select
            className={s.select}
            value={note.font}
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
            value={note.size}
            onChange={(e) => set({ size: Number(e.target.value) })}
          >
            {[14, 16, 18, 22, 28].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <Swatches label="Text" colors={INKS} value={note.ink} onPick={(ink) => set({ ink })} />
        <Swatches
          label="Paper"
          colors={PAPERS}
          value={note.paper}
          onPick={(paper) => set({ paper })}
        />
      </div>

      <textarea
        className={s.pad}
        style={{
          fontFamily: family,
          fontSize: note.size,
          color: note.ink,
          background: note.paper,
        }}
        value={note.text}
        onChange={(e) => set({ text: e.target.value })}
        placeholder="Write anything…"
        aria-label="Notes"
        spellCheck
        autoFocus
      />
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
