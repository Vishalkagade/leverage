# Leverage

A small personal board for deciding what to do next. Every task gets three things:

1. **Where it belongs** — Work or Home.
2. **How hard it is** — 1 (trivial) to 5 (brutal).
3. **How much it matters** — 1 (minor) to 5 (huge).

Tasks land on a difficulty × impact matrix, and the list below the matrix sorts them by
leverage (impact × 2 − difficulty) so the highest payoff for the least effort comes first.
Everything is stored in your browser's localStorage; there is no backend.

On top of that:

- **Today** — pick up to three tasks for the day. "What now?" suggests one based on your
  energy (low: easy things first; high: big bets in the morning, then whatever matters most).
- **Age** — tasks show how many days they have been open; after a week they fade on the matrix.
- **First step** — hard tasks (4 or 5) ask for a first small step, shown wherever the task appears.
- **This week** — what you finished in the last seven days, the Work/Home balance, and how many
  time sinks you dropped.

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
