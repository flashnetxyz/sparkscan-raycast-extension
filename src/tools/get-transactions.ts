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

type Tx = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  amountSats: number;
  tokenAmount: number;
  tokenMetadata: {
    tokenIdentifier: string;
    tokenAddress: string;
    name: string;
    ticker: string;
    decimals: number;
    issuerPublicKey: string;
    maxSupply: number;
    isFreezable: true;
  };
  multiIoDetails: {
    inputs: [
      {
        address: string;
        pubkey: string;
        amount: number;
      },
    ];
    outputs: [
      {
        address: string;
        pubkey: string;
        amount: number;
      },
    ];
    totalInputAmount: number;
    totalOutputAmount: number;
  };
  from: {
    type: string;
    identifier: string;
    pubkey: string;
  };
  to: {
    type: string;
    identifier: string;
    pubkey: string;
  };
  bitcoinTxid: string;
  valueUsd: number;
};

type Result =
  | Array<Tx>
  | {
      detail: unknown[];
    };

export default async function tool(input: Input) {
  const preferences = getPreferenceValues<Preferences>();

  const network = input.network || preferences.defaultNetwork;

  const response = await fetch(
    `https://api.sparkscan.io/v1/tx/latest?${new URLSearchParams({ network: network.toUpperCase() })}`,
    {
      headers: {
        "User-Agent": `Sparkscan Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
      },
    },
  );
  if (!response.ok) {
    console.error("Failed to fetch transactions:", response.statusText);
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as Result;

  if ("detail" in data) {
    console.error("Failed to fetch transactions:", data.detail);
    throw new Error("Failed to fetch transactions");
  }
  const transactions = data as Array<Tx>;

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    status: tx.status,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  }));
}
