# One Button (Hardhat)

Starter Hardhat project for the AVAX game.

## Install

```bash
npm install
cp .env.example .env
```

## Compile

```bash
npm run compile
```

## Test

```bash
npm test
```

## Run local chain

```bash
npm run node
```

## Deploy locally

In a second terminal:

```bash
npm run deploy:local
```

## Deploy to Avalanche Fuji

Set these in `.env`:

- `FUJI_RPC_URL`
- `PRIVATE_KEY`
- `TREASURY_ADDRESS`

Then run:

```bash
npm run deploy:fuji
```

## Current contract features

- 12 hour round timer
- per-player escalating press cost
- normal / late / sudden death timer logic
- 80 / 10 / 10 split for winner / dividends / treasury
- claimable dividends
- automatic next-round creation
- 14 day seasons
