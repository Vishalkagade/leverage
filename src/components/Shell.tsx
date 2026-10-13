"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import Notes from "./Notes";
import s from "./shell.module.css";

export default function Shell() {
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    );
  }, []);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          <div className={s.brandRow}>
            <Logo />
            <h1 className={s.wordmark}>Leverage</h1>
          </div>
          <p className={s.tagline}>Write it down. Keep it.</p>
        </div>
        <span className={s.date}>{today}</span>
      </header>
      <Notes />
    </div>
  );
}
