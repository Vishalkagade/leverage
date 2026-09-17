"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DAY,
  DIFFICULTY_WORDS,
  IMPACT_WORDS,
  LEVELS,
  QUADRANT_META,
  STALE_AFTER_DAYS,
  TODAY_LIMIT,
  ageInDays,
  loadDropped,
  loadTasks,
  newId,
  quadrantOf,
  saveDropped,
  saveTasks,
  sortByLeverage,
  suggestions,
  type Domain,
  type Dropped,
  type Energy,
  type Level,
  type Quadrant,
  type Task,
} from "@/lib/tasks";
import s from "./board.module.css";

type Filter = "all" | Domain;

const DOMAIN_WORD: Record<Domain, string> = { work: "Work", home: "Home" };

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dropped, setDropped] = useState<Dropped[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [domain, setDomain] = useState<Domain>("work");
  const [title, setTitle] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [difficulty, setDifficulty] = useState<Level>(2);
  const [impact, setImpact] = useState<Level>(4);

  useEffect(() => {
    setTasks(loadTasks());
    setDropped(loadDropped());
    setNow(Date.now());
    setHydrated(true);
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (hydrated) saveTasks(tasks);
  }, [tasks, hydrated]);

  useEffect(() => {
    if (hydrated) saveDropped(dropped);
  }, [dropped, hydrated]);

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(null), 700);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const visible = useMemo(
    () => tasks.filter((t) => filter === "all" || t.domain === filter),
    [tasks, filter],
  );
  const open = useMemo(() => sortByLeverage(visible.filter((t) => !t.done)), [visible]);
  const done = useMemo(
    () =>
      visible
        .filter((t) => t.done)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [visible],
  );
  const allOpen = useMemo(() => sortByLeverage(tasks.filter((t) => !t.done)), [tasks]);
  const todayTasks = useMemo(() => allOpen.filter((t) => t.today), [allOpen]);

  const counts = useMemo(
    () => ({
      all: tasks.filter((t) => !t.done).length,
      work: tasks.filter((t) => !t.done && t.domain === "work").length,
      home: tasks.filter((t) => !t.done && t.domain === "home").length,
    }),
    [tasks],
  );

  const previewQuadrant = quadrantOf(difficulty, impact);
  const askFirstStep = difficulty >= 4;

  function addTask(e: FormEvent) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    const step = firstStep.trim();
    const task: Task = {
      id: newId(),
      title: clean,
      domain,
      difficulty,
      impact,
      done: false,
      createdAt: Date.now(),
      ...(askFirstStep && step ? { firstStep: step } : {}),
    };
    setTasks((prev) => [task, ...prev]);
    setJustAdded(task.id);
    setTitle("");
    setFirstStep("");
    if (filter !== "all" && filter !== domain) setFilter("all");
  }

  function toggleDone(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? t.done
            ? { ...t, done: false, completedAt: undefined }
            : { ...t, done: true, completedAt: Date.now(), today: false }
          : t,
      ),
    );
  }

  function toggleToday(id: string) {
    setTasks((prev) => {
      const chosen = prev.filter((t) => t.today && !t.done).length;
      return prev.map((t) => {
        if (t.id !== id) return t;
        if (t.today) return { ...t, today: false };
        if (chosen >= TODAY_LIMIT) return t;
        return { ...t, today: true };
      });
    });
  }

  function setStep(id: string, step: string) {
    const clean = step.trim();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, firstStep: clean || undefined } : t)),
    );
  }

  function remove(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (task && !task.done) {
      setDropped((prev) => [
        ...prev,
        { at: Date.now(), quadrant: quadrantOf(task.difficulty, task.impact), domain: task.domain },
      ]);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function clearDone() {
    setTasks((prev) => prev.filter((t) => !t.done));
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          <h1 className={s.wordmark}>Leverage</h1>
          <p className={s.tagline}>What to do next, by effort and payoff.</p>
        </div>
        <div className={s.headerRight}>
          <span className={s.date}>{today}</span>
          <div className={s.segment} role="tablist" aria-label="Show tasks from">
            {(["all", "work", "home"] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={`${s.segmentBtn} ${filter === f ? s.segmentOn : ""} ${
                  f !== "all" ? s[`seg_${f}`] : ""
                }`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Everything" : DOMAIN_WORD[f]}
                <span className={s.count}>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {hydrated && (
        <TodayStrip
          chosen={todayTasks}
          open={allOpen}
          now={now}
          onToggleDone={toggleDone}
          onToggleToday={toggleToday}
        />
      )}

      <main className={s.main}>
        <form className={s.form} onSubmit={addTask}>
          <h2 className={s.formTitle}>Add a task</h2>

          <div className={s.field}>
            <span className={s.fieldName}>Where does it belong?</span>
            <div className={s.domainRow} role="radiogroup" aria-label="Domain">
              {(["work", "home"] as Domain[]).map((d) => (
                <button
                  type="button"
                  key={d}
                  role="radio"
                  aria-checked={domain === d}
                  className={`${s.domainBtn} ${s[`dom_${d}`]} ${
                    domain === d ? s.domainOn : ""
                  }`}
                  onClick={() => setDomain(d)}
                >
                  {DOMAIN_WORD[d]}
                </button>
              ))}
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldName} htmlFor="task-title">
              What is it?
            </label>
            <input
              id="task-title"
              className={s.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={domain === "work" ? "Reply to the review comments" : "Book the dentist"}
              maxLength={120}
              autoComplete="off"
            />
          </div>

          <LevelPicker
            name="How hard is it?"
            value={difficulty}
            words={DIFFICULTY_WORDS}
            onChange={setDifficulty}
          />
          <LevelPicker
            name="How much does it matter?"
            value={impact}
            words={IMPACT_WORDS}
            onChange={setImpact}
          />

          {askFirstStep && (
            <div className={s.field}>
              <label className={s.fieldName} htmlFor="task-step">
                What is the first small step?
              </label>
              <input
                id="task-step"
                className={s.input}
                value={firstStep}
                onChange={(e) => setFirstStep(e.target.value)}
                placeholder="Open the doc and write the outline"
                maxLength={120}
                autoComplete="off"
              />
              <span className={s.levelWord}>Hard tasks start easier with a first step written down.</span>
            </div>
          )}

          <p className={`${s.preview} ${s[`q_${previewQuadrant}`]}`}>
            <strong>{QUADRANT_META[previewQuadrant].name}.</strong>{" "}
            {QUADRANT_META[previewQuadrant].hint}
          </p>

          <button type="submit" className={s.submit} disabled={!title.trim()}>
            Add task
          </button>
        </form>

        <section className={s.matrixWrap} aria-label="Task matrix">
          <Matrix tasks={open} now={now} justAdded={justAdded} onToggle={toggleDone} />
        </section>
      </main>

      <section className={s.list} aria-labelledby="order-heading">
        <div className={s.listHead}>
          <h2 id="order-heading" className={s.listTitle}>
            Do in this order
          </h2>
          <span className={s.listNote}>Highest payoff for the least effort first.</span>
        </div>

        {!hydrated ? null : open.length === 0 ? (
          <p className={s.empty}>
            {tasks.length === 0
              ? "The board is empty. Add your first task above."
              : filter === "all"
                ? "Everything is done. Add the next thing when it comes to mind."
                : `No open ${DOMAIN_WORD[filter].toLowerCase()} tasks. Switch to Everything or add one.`}
          </p>
        ) : (
          <ol className={s.rows}>
            {open.map((t, i) => (
              <Row
                key={t.id}
                task={t}
                rank={i + 1}
                now={now}
                todayFull={todayTasks.length >= TODAY_LIMIT}
                onToggle={toggleDone}
                onToggleToday={toggleToday}
                onSetStep={setStep}
                onRemove={remove}
              />
            ))}
          </ol>
        )}

        {done.length > 0 && (
          <div className={s.doneBlock}>
            <div className={s.doneHead}>
              <button
                className={s.doneToggle}
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
              >
                {showDone ? "Hide" : "Show"} done ({done.length})
              </button>
              <button className={s.clear} onClick={clearDone}>
                Clear done
              </button>
            </div>
            {showDone && (
              <ol className={s.rows}>
                {done.map((t) => (
                  <Row
                    key={t.id}
                    task={t}
                    now={now}
                    todayFull
                    onToggle={toggleDone}
                    onToggleToday={toggleToday}
                    onSetStep={setStep}
                    onRemove={remove}
                  />
                ))}
              </ol>
            )}
          </div>
        )}
      </section>

      {hydrated && <WeekReview tasks={tasks} dropped={dropped} now={now} />}
    </div>
  );
}

/* ---------- Today strip + suggestion ---------- */

function TodayStrip({
  chosen,
  open,
  now,
  onToggleDone,
  onToggleToday,
}: {
  chosen: Task[];
  open: Task[];
  now: number;
  onToggleDone: (id: string) => void;
  onToggleToday: (id: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [energy, setEnergy] = useState<Energy>("high");
  const [skip, setSkip] = useState(0);

  const pool = useMemo(
    () => suggestions(open.filter((t) => !t.today), energy, now),
    [open, energy, now],
  );
  const pick = pool.length ? pool[skip % pool.length] : undefined;
  const full = chosen.length >= TODAY_LIMIT;

  function takePick() {
    if (!pick) return;
    onToggleToday(pick.id);
    setSkip(0);
    if (chosen.length + 1 >= TODAY_LIMIT) setAsking(false);
  }

  return (
    <section className={s.today} aria-labelledby="today-heading">
      <div className={s.todayHead}>
        <h2 id="today-heading" className={s.todayTitle}>
          Today
        </h2>
        <span className={s.todayNote}>
          {chosen.length === 0
            ? `Pick up to ${TODAY_LIMIT} tasks. Fewer is better.`
            : `${chosen.length} of ${TODAY_LIMIT} chosen.`}
        </span>
        {!full && open.length > 0 && (
          <button
            className={`${s.whatNow} ${asking ? s.whatNowOn : ""}`}
            onClick={() => {
              setAsking((v) => !v);
              setSkip(0);
            }}
            aria-expanded={asking}
          >
            What now?
          </button>
        )}
      </div>

      {asking && !full && (
        <div className={s.suggest}>
          <div className={s.energy} role="radiogroup" aria-label="Energy right now">
            <span className={s.energyLabel}>Energy</span>
            {(["low", "high"] as Energy[]).map((e) => (
              <button
                key={e}
                role="radio"
                aria-checked={energy === e}
                className={`${s.energyBtn} ${energy === e ? s.energyOn : ""}`}
                onClick={() => {
                  setEnergy(e);
                  setSkip(0);
                }}
              >
                {e === "low" ? "Low" : "High"}
              </button>
            ))}
          </div>
          {pick ? (
            <>
              <p className={s.suggestText}>
                <span className={`${s.dot} ${s[`dot_${pick.domain}`]}`} aria-hidden />
                <strong>{pick.title}</strong>
                <span className={s.suggestWhy}>
                  {QUADRANT_META[quadrantOf(pick.difficulty, pick.impact)].name}.{" "}
                  {pick.firstStep ? `Start with: ${pick.firstStep}` : ""}
                </span>
              </p>
              <div className={s.suggestActions}>
                <button className={s.smallPrimary} onClick={takePick}>
                  Do this today
                </button>
                {pool.length > 1 && (
                  <button className={s.smallGhost} onClick={() => setSkip((n) => n + 1)}>
                    Another one
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className={s.suggestText}>Everything open is already on today's list.</p>
          )}
        </div>
      )}

      {chosen.length > 0 && (
        <ol className={s.todayList}>
          {chosen.map((t) => (
            <li key={t.id} className={`${s.todayItem} ${s[`todayItem_${t.domain}`]}`}>
              <button
                className={s.check}
                onClick={() => onToggleDone(t.id)}
                aria-label={`Mark ${t.title} done`}
              />
              <span className={s.todayText}>
                <span className={s.todayItemTitle}>{t.title}</span>
                {t.firstStep && <span className={s.todayStep}>{t.firstStep}</span>}
              </span>
              <button
                className={s.todayRemove}
                onClick={() => onToggleToday(t.id)}
                aria-label={`Remove ${t.title} from today`}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ---------- Week review ---------- */

function WeekReview({ tasks, dropped, now }: { tasks: Task[]; dropped: Dropped[]; now: number }) {
  const since = now - 7 * DAY;
  const doneWeek = tasks.filter((t) => t.done && (t.completedAt ?? 0) >= since);
  const work = doneWeek.filter((t) => t.domain === "work").length;
  const home = doneWeek.length - work;
  const byQ = (q: Quadrant) =>
    doneWeek.filter((t) => quadrantOf(t.difficulty, t.impact) === q).length;
  const sinksDropped = dropped.filter((d) => d.at >= since && d.quadrant === "sink").length;
  const total = doneWeek.length;
  const workPct = total ? Math.round((work / total) * 100) : 50;

  return (
    <section className={s.week} aria-labelledby="week-heading">
      <div className={s.listHead}>
        <h2 id="week-heading" className={s.listTitle}>
          This week
        </h2>
        <span className={s.listNote}>The last seven days.</span>
      </div>

      {total === 0 && sinksDropped === 0 ? (
        <p className={s.empty}>Nothing finished yet this week. Ticking a task adds it here.</p>
      ) : (
        <div className={s.weekBody}>
          <div className={s.balance} aria-label={`Work ${work}, Home ${home}`}>
            <span className={s.balanceWork} style={{ width: `${workPct}%` }} />
            <span className={s.balanceHome} style={{ width: `${100 - workPct}%` }} />
          </div>
          <ul className={s.weekFacts}>
            <li>
              <strong>{total}</strong> done. {work} work, {home} home.
            </li>
            <li>
              <strong>{byQ("win")}</strong> {plural(byQ("win"), "quick win")} and{" "}
              <strong>{byQ("bet")}</strong> {plural(byQ("bet"), "big bet")} finished.
            </li>
            <li>
              <strong>{sinksDropped}</strong> {plural(sinksDropped, "time sink")} dropped.
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

/* ---------- pieces ---------- */

function LevelPicker({
  name,
  value,
  words,
  onChange,
}: {
  name: string;
  value: Level;
  words: Record<Level, string>;
  onChange: (l: Level) => void;
}) {
  return (
    <div className={s.field}>
      <span className={s.fieldName}>{name}</span>
      <div className={s.levels} role="radiogroup" aria-label={name}>
        {LEVELS.map((l) => (
          <button
            type="button"
            key={l}
            role="radio"
            aria-checked={value === l}
            aria-label={`${l}, ${words[l]}`}
            className={`${s.level} ${value === l ? s.levelOn : ""} ${
              l < value ? s.levelBelow : ""
            }`}
            onClick={() => onChange(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <span className={s.levelWord}>{words[value]}</span>
    </div>
  );
}

function Matrix({
  tasks,
  now,
  justAdded,
  onToggle,
}: {
  tasks: Task[];
  now: number;
  justAdded: string | null;
  onToggle: (id: string) => void;
}) {
  const byCell = useMemo(() => {
    const m = new Map<string, { task: Task; rank: number }[]>();
    tasks.forEach((task, i) => {
      const k = `${task.difficulty}-${task.impact}`;
      m.set(k, [...(m.get(k) ?? []), { task, rank: i + 1 }]);
    });
    return m;
  }, [tasks]);

  const impactRows = [...LEVELS].reverse();

  return (
    <div className={s.matrix}>
      <span className={s.axisY}>
        More impact <Arrow />
      </span>
      <span className={s.axisX}>
        Harder <Arrow />
      </span>

      <div className={s.yLabels} aria-hidden>
        {impactRows.map((l) => (
          <span key={l} className={s.tick}>
            {IMPACT_WORDS[l]}
          </span>
        ))}
      </div>

      <div className={s.grid}>
        {impactRows.map((imp) =>
          LEVELS.map((dif) => {
            const q = quadrantOf(dif, imp);
            const cell = byCell.get(`${dif}-${imp}`) ?? [];
            return (
              <div
                key={`${dif}-${imp}`}
                className={`${s.cell} ${s[`cell_${q}`]}`}
                data-dif={dif}
                data-imp={imp}
              >
                {cell.map(({ task: t, rank }) => {
                  const stale = now > 0 && ageInDays(t, now) >= STALE_AFTER_DAYS;
                  return (
                    <button
                      key={t.id}
                      className={`${s.chip} ${s[`chip_${t.domain}`]} ${
                        t.id === justAdded ? s.chipNew : ""
                      } ${stale ? s.chipStale : ""} ${t.today ? s.chipToday : ""}`}
                      title={`${rank}. ${t.title} (${DOMAIN_WORD[t.domain]}${
                        stale ? `, ${ageInDays(t, now)} days old` : ""
                      }). Click to mark done.`}
                      onClick={() => onToggle(t.id)}
                    >
                      <span className={s.chipRank} aria-hidden>
                        {rank}
                      </span>
                      <span className={s.chipTitle}>{t.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          }),
        )}

        {(Object.keys(QUADRANT_META) as Quadrant[]).map((q) => (
          <span key={q} className={`${s.qLabel} ${s[`qLabel_${q}`]}`} aria-hidden>
            {QUADRANT_META[q].name}
          </span>
        ))}

        {tasks.length === 0 && (
          <p className={s.matrixEmpty}>Tasks land here once you add them.</p>
        )}
      </div>

      <div className={s.xLabels} aria-hidden>
        {LEVELS.map((l) => (
          <span key={l} className={s.tick}>
            {DIFFICULTY_WORDS[l]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({
  task,
  rank,
  now,
  todayFull,
  onToggle,
  onToggleToday,
  onSetStep,
  onRemove,
}: {
  task: Task;
  rank?: number;
  now: number;
  todayFull: boolean;
  onToggle: (id: string) => void;
  onToggleToday: (id: string) => void;
  onSetStep: (id: string, step: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editingStep, setEditingStep] = useState(false);
  const [draft, setDraft] = useState(task.firstStep ?? "");
  const q = quadrantOf(task.difficulty, task.impact);
  const age = now > 0 ? ageInDays(task, now) : 0;
  const stale = age >= STALE_AFTER_DAYS;
  const hard = task.difficulty >= 4;

  function commitStep() {
    onSetStep(task.id, draft);
    setEditingStep(false);
  }

  return (
    <li className={`${s.row} ${task.done ? s.rowDone : ""}`}>
      <span className={s.rank}>{rank ?? ""}</span>
      <button
        className={`${s.check} ${task.done ? s.checkOn : ""}`}
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
      >
        {task.done && (
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={s.rowMain}>
        <span className={s.rowTitleLine}>
          <span className={s.rowTitle}>{task.title}</span>
          {!task.done && age >= 1 && (
            <span className={`${s.age} ${stale ? s.ageStale : ""}`} title={`Added ${age} days ago`}>
              {age}d
            </span>
          )}
        </span>
        {!task.done && (editingStep ? (
          <span className={s.stepEdit}>
            <input
              className={s.stepInput}
              value={draft}
              autoFocus
              maxLength={120}
              placeholder="The first small step"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitStep();
                if (e.key === "Escape") setEditingStep(false);
              }}
              onBlur={commitStep}
            />
          </span>
        ) : task.firstStep ? (
          <button className={s.step} onClick={() => setEditingStep(true)} title="Edit the first step">
            Start with: {task.firstStep}
          </button>
        ) : hard ? (
          <button className={s.stepAdd} onClick={() => setEditingStep(true)}>
            Add a first step
          </button>
        ) : null)}
      </span>
      {!task.done ? (
        <button
          className={`${s.todayBtn} ${task.today ? s.todayBtnOn : ""}`}
          onClick={() => onToggleToday(task.id)}
          disabled={!task.today && todayFull}
          title={!task.today && todayFull ? `Today already has ${TODAY_LIMIT} tasks` : undefined}
          aria-pressed={!!task.today}
        >
          Today
        </button>
      ) : (
        <span />
      )}
      <span className={`${s.pill} ${s[`pill_${task.domain}`]}`}>{DOMAIN_WORD[task.domain]}</span>
      <span className={s.meters}>
        <span title={`Difficulty: ${DIFFICULTY_WORDS[task.difficulty]}`}>
          Effort {task.difficulty}
        </span>
        <span title={`Impact: ${IMPACT_WORDS[task.impact]}`}>Impact {task.impact}</span>
      </span>
      <span className={`${s.qTag} ${s[`q_${q}`]}`}>{QUADRANT_META[q].name}</span>
      <button className={s.remove} onClick={() => onRemove(task.id)} aria-label={`Delete ${task.title}`}>
        ×
      </button>
    </li>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 32 10" width="32" height="10" aria-hidden>
      <path d="M0 5h29M24 1l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

