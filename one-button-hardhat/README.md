# One Button Game

A decentralized, on-chain social experiment built on **Avalanche**.

Inspired by Reddit's famous **"The Button"**, this smart contract game
turns a simple mechanic into an economic game of timing, strategy, and
risk.

Every press increases the pot. Every press resets the clock. When the
timer hits zero, **the last player to press wins**.

---

# Game Mechanics

## Timer

Each round begins with a **12 hour timer**.

## Pressing the Button

Players can press the button by sending AVAX. Each player's press cost
**increases exponentially**.

Initial press cost:

0.1 AVAX

Each additional press by the same wallet:

cost = previous_cost \* 1.35

Example:

Press Cost

---

1 0.10 AVAX
2 0.135 AVAX
3 0.18225 AVAX
4 0.246 AVAX

---

# Timer Extensions

## Normal Mode

Remaining time \> 1 hour

Press effect: Timer resets to 12 hours

## Late Mode

Remaining time \< 1 hour

Press effect: +10 minutes

## Sudden Death

Remaining time \< 10 minutes

Press effect: +30 seconds

This creates intense end-game battles.

---

# Cooldown Protection

same wallet cooldown = 10 seconds

---

# Pot Distribution

When the timer reaches zero:

Winner: 80% Dividend Pool: 10% Treasury: 10%

---

# Dividend System

Players who pressed the button share **10% of the pot**.

Dividend payout is proportional to how much AVAX they contributed.

Example:

Player A contributed 2 AVAX\
Total pot contributions = 10 AVAX

Player A receives:

(2 / 10) \* dividend_pool

Dividends are claimed via:

claimDividend(roundId)

---

# Rounds and Seasons

## Rounds

A round ends when the timer reaches zero.

Immediately after settlement: a new round begins

## Seasons

Seasons last:

14 days

Season statistics track: - total rounds - total presses - total pot
volume - unique players

When a season ends: a new season automatically starts

---

# Dead Round Recovery

If nobody presses during a round and 12 hours pass:

rollRoundIfExpiredWithoutPresses()

This rolls the game forward safely.

---

# Smart Contract Architecture

Key structures: - Round - Season - Player press counts - Player
contributions - Dividend claims

Security primitives from **OpenZeppelin**.

---

# Contract Functions

## Game Actions

press()\
settleRound()\
claimDividend(roundId)\
rollRoundIfExpiredWithoutPresses()

## Read Functions

getCurrentPressCost(address)\
getTimeRemaining()\
getCurrentPhase()

---

# Tech Stack

- Solidity 0.8.24
- Hardhat
- Avalanche C-Chain
- OpenZeppelin Contracts
- TypeScript tests
- Mocha / Chai

---

# Running the Project

Install dependencies:

npm install

Compile:

npm run compile

Run tests:

npm test

---

# Project Structure

contracts/ OneButtonGame.sol

test/ OneButtonGame.ts

scripts/

ignition/ modules/

hardhat.config.ts package.json

---

# Deployment

Example deployment:

npx hardhat ignition deploy ignition/modules/OneButtonGame.ts --network
fuji

---

# Future Features

- On‑chain leaderboard
- Wallet → Twitter identity linking
- Web frontend (Next.js + wagmi)
- Real‑time activity feed
- Season champion rewards
- Analytics dashboard

---

# License

MIT

---

# Inspiration

Inspired by Reddit's **The Button**, reimagined as a fully on‑chain game
economy.
