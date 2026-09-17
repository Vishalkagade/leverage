export type Domain = "work" | "home";
export type Level = 1 | 2 | 3 | 4 | 5;

export type Task = {
  id: string;
  title: string;
  domain: Domain;
  difficulty: Level;
  impact: Level;
  done: boolean;
  createdAt: number;
  completedAt?: number;
  /** Chosen for today's focus (max 3). */
  today?: boolean;
  /** First concrete step, mainly for hard tasks. */
  firstStep?: string;
};

export type Dropped = { at: number; quadrant: Quadrant; domain: Domain };

export const TODAY_LIMIT = 3;
export const DAY = 86_400_000;
export const STALE_AFTER_DAYS = 7;

export type Quadrant = "win" | "bet" | "fill" | "sink";

export const LEVELS: Level[] = [1, 2, 3, 4, 5];

export const DIFFICULTY_WORDS: Record<Level, string> = {
  1: "Trivial",
  2: "Easy",
  3: "Moderate",
  4: "Hard",
  5: "Brutal",
};

export const IMPACT_WORDS: Record<Level, string> = {
  1: "Minor",
  2: "Small",
  3: "Solid",
  4: "Big",
  5: "Huge",
};

export const QUADRANT_META: Record<
  Quadrant,
  { name: string; hint: string }
> = {
  win: { name: "Quick wins", hint: "Easy and worth it. Do these first." },
  bet: { name: "Big bets", hint: "Hard but worth it. Block time for one." },
  fill: { name: "Fill-ins", hint: "Easy, low stakes. Good for dead minutes." },
  sink: { name: "Time sinks", hint: "Hard and low payoff. Drop or shrink." },
};

export function quadrantOf(difficulty: Level, impact: Level): Quadrant {
  const easy = difficulty <= 2;
  const worth = impact >= 3;
  if (easy && worth) return "win";
  if (!easy && worth) return "bet";
  if (easy && !worth) return "fill";
  return "sink";
}

/** Higher is better. Impact counts double so a huge, hard task still beats a trivial, minor one. */
export function leverage(task: Pick<Task, "difficulty" | "impact">): number {
  return task.impact * 2 - task.difficulty;
}

export function sortByLeverage(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const d = leverage(b) - leverage(a);
    if (d !== 0) return d;
    if (b.impact !== a.impact) return b.impact - a.impact;
    return a.createdAt - b.createdAt;
  });
}

export function ageInDays(task: Pick<Task, "createdAt">, now: number): number {
  return Math.floor((now - task.createdAt) / DAY);
}

export type Energy = "low" | "high";

/**
 * Ranked suggestions for right now.
 * Low energy: easy things, best payoff first.
 * High energy before mid-afternoon: big bets first, then anything that matters.
 */
export function suggestions(open: Task[], energy: Energy, now: number): Task[] {
  const hour = new Date(now).getHours();
  if (energy === "low") {
    const easy = open.filter((t) => t.difficulty <= 2);
    return sortByLeverage(easy.length ? easy : open);
  }
  const worth = open.filter((t) => t.impact >= 3);
  const pool = worth.length ? worth : open;
  if (hour < 14) {
    const bets = pool.filter((t) => quadrantOf(t.difficulty, t.impact) === "bet");
    const rest = pool.filter((t) => quadrantOf(t.difficulty, t.impact) !== "bet");
    return [...sortByLeverage(bets), ...sortByLeverage(rest)];
  }
  return sortByLeverage(pool);
}

const STORAGE_KEY = "leverage.tasks.v1";
const DROPPED_KEY = "leverage.dropped.v1";

export function loadDropped(): Dropped[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DROPPED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Dropped[]) : [];
  } catch {
    return [];
  }
}

export function saveDropped(list: Dropped[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep a month of history; the review only looks at the last week.
    const cutoff = Date.now() - 31 * DAY;
    window.localStorage.setItem(DROPPED_KEY, JSON.stringify(list.filter((d) => d.at >= cutoff)));
  } catch {
    // ignore
  }
}

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage may be unavailable (private mode). The board still works for the session.
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
