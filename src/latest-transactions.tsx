import { Action, ActionPanel, List, open, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { capitalize, formatTimestamp, getTypeLabel, truncateKey } from "./lib/utils";

interface Preferences {
  transactionLimit: string;
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

// Produce a human-readable label for either the sender (isSender = true)
// or recipient (isSender = false) based on transaction details. Mirrors
// the logic used in the Sparkscan web app but simplified for Raycast.
const getAddressLabel = (tx: Tx, isSender: boolean): string => {
  // Handle token_multi_transfer separately – potentially many inputs/outputs
  if (tx.type === "token_multi_transfer" && tx.multiIoDetails) {
    const { inputs = [], outputs = [] } = tx.multiIoDetails as {
      inputs: Array<{ address?: string }>;
      outputs: Array<{ address?: string }>;
    };

    // Extract unique sender / recipient addresses
    const uniqueSenders = Array.from(new Set(inputs.map((i) => i.address).filter(Boolean)));
    const uniqueRecipients = Array.from(new Set(outputs.map((o) => o.address).filter(Boolean)));

    // Filter out change outputs (outputs that go back to one of the senders)
    const actualRecipients = uniqueRecipients.filter((addr) => !uniqueSenders.includes(addr));

    if (isSender) {
      if (uniqueSenders.length > 1) return `${uniqueSenders.length} Senders`;
      return uniqueSenders[0] ? truncateKey(uniqueSenders[0]) : "Unknown";
    }

    if (actualRecipients.length > 1) return `${actualRecipients.length} Recipients`;
    if (actualRecipients[0]) return truncateKey(actualRecipients[0]);

    // All outputs went back to sender – self-transfer
    if (actualRecipients.length === 0 && uniqueSenders.length === 1) {
      return `${truncateKey(uniqueSenders[0])} (self)`;
    }

    return "Unknown";
  }

  // Special-case mint / burn semantics similar to web app
  if (isSender && tx.type === "token_mint") return "Issuer";
  if (!isSender && tx.type === "token_burn") return "Burn";

  const party = isSender ? tx.from : tx.to;
  if (!party) return "Unknown";

  switch (party.type) {
    case "spark":
      return party.identifier ? truncateKey(party.identifier) : "Spark";
    case "bitcoin":
      return party.identifier ? truncateKey(party.identifier) : "Bitcoin";
    case "lightning":
      return "Lightning";
    default:
      return party.identifier ? truncateKey(party.identifier) : "Unknown";
  }
};
// Define a minimal transaction type required for URL construction
interface TxItem {
  id: string;
  type: string;
  bitcoinTxid?: string;
}

// Determine the correct mempool base URL based on the current network
const getMempoolBaseUrl = (network: string) => {
  return network.toUpperCase() === "REGTEST" ? "https://mempool.regtest.flashnet.xyz" : "https://mempool.space";
};

// Remove hyphens from Spark transaction IDs so they match Sparkscan routing
const removeHyphens = (id: string) => id.replace(/-/g, "");

// Build the URL that should be opened when the user selects a transaction
const getTransactionUrl = (tx: TxItem, network: string) => {
  // For on-chain Bitcoin transactions we want to open Mempool
  if (tx.type === "bitcoin_deposit" || tx.type === "bitcoin_withdrawal") {
    // Fallback to Sparkscan if, for some reason, there is no Bitcoin txid
    if (!tx.bitcoinTxid) {
      return `https://sparkscan.io/tx/${removeHyphens(tx.id)}`;
    }
    return `${getMempoolBaseUrl(network)}/tx/${tx.bitcoinTxid}`;
  }

  // For every other transaction type we open Sparkscan itself
  return `https://sparkscan.io/tx/${removeHyphens(tx.id)}`;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [network, setNetwork] = useState<"MAINNET" | "REGTEST">(preferences.defaultNetwork);

  const { data, pagination } = useFetch(
    (options) =>
      `https://api.sparkscan.io/v1/tx/latest?${new URLSearchParams({
        network: network.toUpperCase(),
        offset: String(options.page * Number(preferences.transactionLimit)),
        limit: preferences.transactionLimit,
      })}`,
    {
      headers: {
        "User-Agent": "sparkscan-raycast-extension",
      },
      mapResult(res: Result) {
        // If the API returns an error shape, surface it immediately
        if ("detail" in res) throw new Error("Failed to fetch latest transactions");

        // Expose the raw array through the `data` field expected by Raycast's `useFetch`
        return {
          data: res,
          hasMore: res.length === Number(preferences.transactionLimit),
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(network) => {
            setNetwork(network as "MAINNET" | "REGTEST");
          }}
        >
          <List.Dropdown.Item title="Mainnet" value={"MAINNET"} />
          <List.Dropdown.Item title="Regtest" value={"REGTEST"} />
        </List.Dropdown>
      }
      pagination={pagination}
    >
      {(data || []).map((item) => {
        const txItem = item as unknown as Tx; // lax typing for UI purposes
        const txForUrl = item as unknown as TxItem;
        return (
          <List.Item
            key={txItem.id}
            title={getAddressLabel(txItem, true)}
            accessories={[
              {
                text: getAddressLabel(txItem, false),
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open in Browser" onAction={() => open(getTransactionUrl(txForUrl, network.toUpperCase()))} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Type" text={getTypeLabel(txItem.type)} />
                    <List.Item.Detail.Metadata.Label title="Status" text={capitalize(txItem.status)} />
                    <List.Item.Detail.Metadata.Label title="Timestamp" text={formatTimestamp(txItem.createdAt)} />
                    <List.Item.Detail.Metadata.Label title="Value" text={`$${txItem.valueUsd.toLocaleString()} USD`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
