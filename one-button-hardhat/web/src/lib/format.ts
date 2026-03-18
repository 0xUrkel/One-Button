import { formatEther } from "viem";

export function formatAvax(value?: bigint, digits = 4) {
  if (value === undefined) return "-";
  return Number(formatEther(value)).toFixed(digits);
}

export function shortenAddress(address?: string) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatSeconds(total?: bigint | number) {
  if (total === undefined) return "00:00:00";
  const value = Number(total);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
