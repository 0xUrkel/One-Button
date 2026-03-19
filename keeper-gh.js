import "dotenv/config";
import { createPublicClient, createWalletClient, getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji, avalanche } from "viem/chains";

const rawContractAddress = process.env.CONTRACT_ADDRESS || "";
const rawPrivateKey = process.env.PRIVATE_KEY || "";
const networkName = process.env.NETWORK || "fuji";

if (!rawContractAddress) {
  throw new Error("Missing CONTRACT_ADDRESS");
}
if (!rawPrivateKey) {
  throw new Error("Missing PRIVATE_KEY");
}

const CONTRACT_ADDRESS = getAddress(rawContractAddress);
const PRIVATE_KEY = rawPrivateKey.startsWith("0x")
  ? rawPrivateKey
  : `0x${rawPrivateKey}`;

const USE_MAINNET = networkName === "mainnet";
const chain = USE_MAINNET ? avalanche : avalancheFuji;
const rpcUrl = USE_MAINNET
  ? process.env.MAINNET_RPC_URL
  : process.env.FUJI_RPC_URL;

if (!rpcUrl) {
  throw new Error(
    `Missing ${USE_MAINNET ? "MAINNET_RPC_URL" : "FUJI_RPC_URL"}`,
  );
}

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl),
});

const ABI = [
  {
    type: "function",
    name: "currentRoundId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "rounds",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "seasonId", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "totalPot", type: "uint256" },
      { name: "winnerPayout", type: "uint256" },
      { name: "dividendPool", type: "uint256" },
      { name: "treasuryAmount", type: "uint256" },
      { name: "totalPresses", type: "uint32" },
      { name: "uniquePlayers", type: "uint32" },
      { name: "lastPresser", type: "address" },
      { name: "settled", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "settleRound",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "rollRoundIfExpiredWithoutPresses",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EXPIRY_BUFFER_SECONDS = 3n;

function getRoundField(round, index, label) {
  const value = round?.[index];
  if (value === undefined) {
    throw new Error(`Round field "${label}" missing at index ${index}`);
  }
  return value;
}

async function main() {
  console.log(`Keeper run started for ${USE_MAINNET ? "mainnet" : "fuji"}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Keeper wallet: ${account.address}`);

  const currentRoundId = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "currentRoundId",
  });

  const round = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "rounds",
    args: [currentRoundId],
  });

  const endTime = BigInt(getRoundField(round, 3, "endTime"));
  const lastPresser = String(getRoundField(round, 10, "lastPresser"));
  const settled = Boolean(getRoundField(round, 11, "settled"));
  const totalPot = BigInt(getRoundField(round, 4, "totalPot"));

  const now = BigInt(Math.floor(Date.now() / 1000));
  const expired = now >= endTime + EXPIRY_BUFFER_SECONDS;

  console.log(
    `[${new Date().toISOString()}] round=${currentRoundId} expired=${expired} settled=${settled} pot=${totalPot} lastPresser=${lastPresser}`,
  );

  if (!expired || settled) {
    console.log("No action needed.");
    return;
  }

  if (lastPresser.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
    console.log("Expired round with leader detected. Calling settleRound()...");

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "settleRound",
      account,
      chain,
    });

    console.log(`settleRound tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`settleRound confirmed in block ${receipt.blockNumber}`);
  } else {
    console.log(
      "Expired round with no presses detected. Calling rollRoundIfExpiredWithoutPresses()...",
    );

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "rollRoundIfExpiredWithoutPresses",
      account,
      chain,
    });

    console.log(`rollRoundIfExpiredWithoutPresses tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(
      `rollRoundIfExpiredWithoutPresses confirmed in block ${receipt.blockNumber}`,
    );
  }
}

main().catch((error) => {
  console.error("Keeper run failed:");
  console.error(error);
  process.exit(1);
});
