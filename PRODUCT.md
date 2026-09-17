# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, a graduate student at Hochschule Ansbach who also runs a household. They use Leverage alone. The main moment is morning planning at the laptop: open the board, choose up to three tasks for the day, close it. Phone use is secondary and mostly for reading the list.

## Product Purpose

Leverage decides what to do next. Every task carries three facts: where it belongs (Work or Home), how hard it is (1 to 5), and how much it matters (1 to 5). The board places tasks on a difficulty-by-impact matrix and lists them in leverage order, so cheap high-payoff work surfaces first and hard low-payoff work is exposed as a time sink. Success is a short, honest daily list and fewer stale tasks.

## Positioning

Most to-do apps sort by date or by a single priority flag. Leverage refuses to store a due date or a priority. It forces two separate judgements, effort and payoff, and derives the order from them. The four quadrants (Quick wins, Big bets, Fill-ins, Time sinks) are the product's vocabulary, and the daily limit of three is a deliberate constraint, not a setting.

## Operating Context

- Used in the browser on a laptop in the morning, occasionally on a phone.
- No accounts, no server. Data lives in the browser's localStorage under a versioned key.
- Deployed on Vercel from the GitHub repository `Vishalkagade/leverage`, branch `main`. Vercel Analytics is enabled.
- Stack: Next.js 16 App Router, React 19, TypeScript, CSS Modules, no UI library.

## Capabilities and Constraints

Confirmed functionality:

- Add a task with domain, title, difficulty, impact. Hard tasks (4 or 5) ask for a first small step.
- Matrix view (5 by 5) with the four quadrants, chips coloured by domain, numbered chips on phone width.
- Ordered list by leverage score (impact times two minus difficulty), with age in days and a stale marker after seven days.
- Today: up to three chosen tasks, with a "What now?" suggester driven by a Low or High energy choice and the time of day.
- Done list, clear done, delete. Deleting an open time sink is recorded as "dropped".
- Weekly summary: done count and Work/Home split, quick wins and big bets finished, time sinks dropped.
- Filter by Everything, Work, Home.

Terminology to keep: Work, Home, Quick wins, Big bets, Fill-ins, Time sinks, Today, What now?, first step, leverage.

Constraints:

- Single device. Cross-device sync is an open decision, explicitly deferred. If added later it implies a database and a simple sign-in.
- No streaks, points, or badges. Rewarding volume works against the purpose.
- One screen. No modals or extra pages unless a feature genuinely needs them.
- Difficulty and impact stay on a 1 to 5 scale with the named levels (Trivial to Brutal, Minor to Huge).

## Brand Commitments

- Name: Leverage. Tagline in use: "What to do next, by effort and payoff."
- Voice: plain, second person, sentence case. Controls name their action ("Add task", "Do this today", "Clear done"). No motivational copy.
- Binding visual constraint volunteered by the owner: the current chalk-green world with Bricolage Grotesque, the yellow quick-wins quadrant, hatched time sinks, and solid cobalt and moss chips. A neutral white and grey restyle was tried and rejected as less liked. Future refinement preserves this world.

## Evidence on Hand

- The working application in `src/`, with the task model and scoring in `src/lib/tasks.ts`.
- No real user data beyond the owner's own board. No testimonials, metrics, or comparisons exist and none should be invented.

## Product Principles

1. Two judgements, one order. The user rates effort and payoff; the product decides the sequence. Never ask for a priority or a due date.
2. Three is the limit. The daily list holds at most three tasks. Fewer is better, and the interface says so.
3. Expose the sinks. Hard, low-payoff work is shown plainly so it can be dropped, and dropping counts as progress.
4. Capture fast, decide once. Adding a task takes seconds; the morning decision is the only ritual.
5. Owner's tool. Optimise for the one person who uses it every day, not for a hypothetical newcomer.

## Accessibility & Inclusion

Keyboard operable throughout, visible focus, text contrast at or above 4.5:1, reduced motion respected. No further product-specific requirement was established.
