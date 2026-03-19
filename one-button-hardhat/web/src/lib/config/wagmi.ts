import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalanche } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "One Button",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [avalanche],
  ssr: true,
});
