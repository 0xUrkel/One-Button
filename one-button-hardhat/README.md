<h1 align="center">One Button</h1>

<p align="center">
  <img src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2d1YzQ1cnJwcDR4OTR1NWppYjlrZnM2ZjZteGp4Z25iZjJjZjN5eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/GwRBmXyEOvFtK/giphy.gif" width="600"/>
</p>

<p align="center">
  <a href="https://one-button-mu.vercel.app">
    <img src="https://img.shields.io/badge/PLAY%20LIVE-FF3B3B?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
</p>

<p align="center">
  A real-time, on-chain social game where <b>anyone can press the button</b> — but only one player wins the pot.
</p>

---

## ⚡ Core Concept

- Press the button → become the leader
- Timer resets
- Next press costs more
- If no one presses before time runs out...
- 🏆 **Leader wins the pot**

---

## 🧠 Game Loop

1.  Player presses button (pays AVAX)
2.  Becomes current leader
3.  Timer resets
4.  Others try to steal the lead
5.  Last player standing when timer hits 0 wins

---

## 🎮 Features

- 🔥 Real-time countdown pressure
- 💀 "Sniped" feedback when you lose the lead
- 🏆 Live leaderboard
- 💰 Increasing press cost
- 📊 Pot grows with each press
- ⚡ Fast wallet-based gameplay (no signup)

---

## 🧱 Tech Stack

### Frontend

- Next.js (App Router)
- React
- Wagmi + Viem
- RainbowKit

### Backend

- Next.js API Routes
- Lightweight JSON storage (MVP)

### Smart Contracts

- Solidity (Foundry)
- Avalanche Fuji Testnet

---

## 📁 Project Structure

    one-button-hardhat/
    ├── contracts/        # Solidity contracts
    ├── script/           # Deployment scripts
    ├── test/             # Contract tests
    ├── web/              # Next.js frontend
    │   ├── src/
    │   └── app/
    └── README.md

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Set environment variables

Create `.env.local`:

    NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

### 3. Run locally

```bash
npm run dev
```

---

## 🧪 Smart Contracts (Foundry)

```bash
forge build
forge test
```

---

## 🌐 Deployment

### Vercel

- Import repo
- Set root directory to `/web`
- Add env vars
- Deploy

---

## 🎯 Roadmap

- [ ] Persistent leaderboard (DB)
- [ ] Multi-round seasons
- [ ] Mobile UX polish
- [ ] Social identity layer (optional)
- [ ] Prize distribution UI

---

## ⚠️ Notes

- Current leaderboard uses local JSON storage (non-persistent in
  serverless)
- Built for speed and experimentation
- Designed to evolve based on real player behavior

---

## 🧠 Vision

Turn simple mechanics into **high-stakes social tension**

> The longer you wait, the more it costs.\
> The closer it gets, the more it hurts.

---

## 👤 Author

**0xUrkel**\
Builder. Engineer. Game designer.

---

## 🪪 License

MIT
