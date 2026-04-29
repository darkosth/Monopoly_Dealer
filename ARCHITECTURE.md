# Family Arcade Architecture

## 1. Overview
The **Family Arcade** is a centralized, full-stack real-time multiplayer platform designed for local/party games. It serves as a hub containing multiple game modes, currently featuring two distinct games:
1. **Monopoly-dealer** (First implementation)
2. **The Chameleon** (Second implementation)

The platform is built on **Next.js 16 (App Router)**, utilizing **Supabase** for Postgres database management and Realtime WebSockets, and **Prisma** as the ORM.

## 2. Tech Stack
* **Frontend:** React 19, Tailwind CSS, Lucide-React, Shadcn/UI.
* **Backend:** Next.js Route Handlers (`/api/...`).
* **Database:** PostgreSQL (hosted on Supabase).
* **ORM:** Prisma.
* **Real-time Engine:** Supabase WebSockets (`postgres_changes`).

## 3. App Routing Structure (Next.js App Router)
The application is structured to separate the hub from the individual game logic, keeping components and APIs modular.

* `src/app/page.jsx` -> The Arcade Hub (Game selection menu).
* `src/app/monopoly/` -> Monopoly game frontend.
    * `/room/[roomCode]/page.jsx` -> The active Monopoly board/room.
* `src/app/chameleon/` -> The Chameleon game frontend.
    * `/room/[roomCode]/page.jsx` -> The active Chameleon session.
* `src/app/api/` -> Backend operations.
    * `/monopoly/...` -> Property management, money transfers, room state.
    * `/chameleon/...` -> Game engine, voting math, player roles.

## 4. Data Model (Prisma Schema)
The database is strictly separated by game to prevent logical overlapping. All relations feature `onDelete: Cascade` to ensure clean room deletions.

### Chameleon Ecosystem
* `ChameleonSession`: Manages the round phases (`status`: lobby, playing, voting, results), `secretWord`, `category`, `chameleonId`, and the strike system (`votesUsed`, `maxVotesAllowed`).
* `ChameleonPlayer`: Stores player data, `score`, and referee toggles (`isParticipating`).
* `ChameleonVote`: Ephemeral records tracking who voted for whom during a specific session.

## 5. The Real-Time Synchronization Engine
Both games rely on the exact same synchronization philosophy, which is the most critical part of the architecture:

1. **The Single Source of Truth:** The Postgres Database. The frontend never updates its own state directly.
2. **Action Dispatch:** A user clicks a button (e.g., "Pay Rent" in Monopoly or "Cast Vote" in Chameleon).
3. **Backend Processing:** The Next.js API processes the math and writes to Prisma.
4. **Supabase Broadcast:** Supabase detects the row update and broadcasts a WebSocket payload to the specific `roomCode` channel.
5. **Frontend Reaction:** The `useEffect` listener in `page.jsx` hears the broadcast, triggers `fetchRoomData()`, and re-renders the DOM.

## 7. Game Mechanics: The Chameleon (Voting & Scoring)

The Chameleon game relies on a specific set of mathematical rules to determine the outcome of a round. All calculations strictly ignore players marked as non-participating (Referee Mode).

### 7.1 Voting Math (Absolute Majority)
To successfully catch the Chameleon, the group must reach an **Absolute Majority**. The system calculates the required votes using the active player count:
* `votesNeeded = Math.floor(activePlayerCount / 2) + 1`

**Outcomes:**
* **Chameleon Caught:** The Chameleon receives `>= votesNeeded`.
* **Chameleon Escaped:** An innocent player receives `>= votesNeeded`, OR the vote results in a tie (no one reaches the required threshold).

### 7.2 The Scoring System
Points are awarded automatically by the backend (`api/chameleon/game/vote`) immediately after the final player casts their vote.
* **If Chameleon is CAUGHT:** Every participating innocent player receives **+1 Point**. The Chameleon receives 0.
* **If Chameleon ESCAPES:** The Chameleon outsmarted the group and receives **+2 Points**. The innocent players receive 0.

### 7.3 The "Strikes" System (Multiple Voting Rounds)
To balance the game and reward a highly skilled Chameleon, the Host can configure "Strikes" (`maxVotesAllowed`: 1, 2, or 3) before a round starts.

1. **First Vote:** The group votes. If they catch the Chameleon, the round ends immediately.
2. **Wrong Vote (Strike Used):** If the group votes for an innocent person, the Chameleon is awarded +2 Points, and the `votesUsed` counter increments by 1.
3. **Continue Round:** If `votesUsed < maxVotesAllowed`, the Chameleon's identity remains hidden. The Host clicks "Continue Round", resetting the votes but keeping the same secret word and roles. The group must debate and vote again.
4. **Game Over:** The loop continues until either the Chameleon is caught, or the group runs out of strikes (`votesUsed == maxVotesAllowed`). At that point, the round definitively ends, the Chameleon's identity is revealed, and the Host must start a new round with a new word.