import os from "node:os";
import { environment, getPreferenceValues } from "@raycast/api";

interface Input {
  /**
   * The network to get the stats for.
   */
  network?: "MAINNET" | "REGTEST";
}

interface Preferences {
  defaultNetwork: "MAINNET" | "REGTEST";
}

type Result =
  | {
      totalValueLockedSats: number;
      totalValueLockedUsd: number;
      activeAccounts: number;
      transactions24h: number;
      currentBtcPriceUsd: number;
    }
  | {
      detail: unknown[];
    };

export default async function tool(input: Input) {
  const preferences = getPreferenceValues<Preferences>();

  const network = input.network || preferences.defaultNetwork;

  const response = await fetch(
    `https://api.sparkscan.io/v1/stats/summary?${new URLSearchParams({ network: network.toUpperCase() })}`,
    {
      headers: {
        "User-Agent": `Sparkscan Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
      },
    },
  );
  if (!response.ok) {
    console.error("Failed to fetch statistics:", response.statusText);
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as Result;

  if ("detail" in data) {
    console.error("Failed to fetch statistics:", data.detail);
    throw new Error("Failed to fetch statistics");
  }

  return {
    totalValueLockedSats: data?.totalValueLockedSats,
    totalValueLockedUsd: data?.totalValueLockedUsd,
    activeAccounts: data?.activeAccounts,
    transactions24h: data?.transactions24h,
    currentBtcPriceUsd: data?.currentBtcPriceUsd,
  };
}
