import { useState } from "react";
import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

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

export default function Command() {
  const [network, setNetwork] = useState("MAINNET");

  const { data, isLoading } = useFetch(`https://api.sparkscan.io/v1/stats/summary?network=${network}`, {
    headers: {
      "User-Agent": "sparkscan-raycast-extension",
    },
    mapResult(res: Result) {
      if ("detail" in res) throw new Error("Failed to fetch statistics");

      return {
        data: res,
      };
    },
  });

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setNetwork(newValue);
          }}
        >
          <List.Dropdown.Item title="Mainnet" value={"MAINNET"} />
          <List.Dropdown.Item title="Regtest" value={"REGTEST"} />
        </List.Dropdown>
      }
    >
      {!isLoading && data && (
        <>
          <List.Item
            title="Total Value Locked (USD)"
            accessories={[{ text: `$${data.totalValueLockedUsd.toLocaleString()}`, icon: Icon.Coins }]}
          />
          <List.Item
            title="Active Accounts"
            accessories={[{ text: data.activeAccounts.toLocaleString(), icon: Icon.Person }]}
          />
          <List.Item
            title="Transactions (24h)"
            accessories={[{ text: data.transactions24h.toLocaleString(), icon: Icon.ArrowsExpand }]}
          />
          <List.Item
            title="Current BTC Price (USD)"
            accessories={[{ text: `$${data.currentBtcPriceUsd.toLocaleString()}`, icon: Icon.Coins }]}
          />
        </>
      )}
    </List>
  );
}
