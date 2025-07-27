import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

// Regular expressions taken from the sparkscan SearchInput implementation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NO_HYPHENS_PATTERN = /^[0-9a-f]{32}$/i;
const TXID_64_CHAR_PATTERN = /^[0-9a-f]{64}$/i;

// Basic public key check (compressed secp256k1 key)
function looksLikePublicKey(key: string): boolean {
  if (!key) return false;
  return key.length === 66 && /^(02|03)[0-9a-fA-F]{64}$/.test(key);
}

// Very lightweight spark address heuristic – any bech32‐like string starting with "sp" followed by the "1" separator.
function looksLikeSparkAddress(address: string): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return lower.startsWith("sp") && address.includes("1") && address.length > 10;
}

type AddressType = "PUBLIC_KEY" | "SPARK_ADDRESS" | "TXID" | "UNKNOWN";

function classifyInput(input: string): AddressType {
  const trimmed = input.trim();
  if (!trimmed) return "UNKNOWN";

  if (looksLikePublicKey(trimmed)) return "PUBLIC_KEY";

  if (UUID_PATTERN.test(trimmed) || UUID_NO_HYPHENS_PATTERN.test(trimmed) || TXID_64_CHAR_PATTERN.test(trimmed)) {
    return "TXID";
  }

  if (looksLikeSparkAddress(trimmed)) return "SPARK_ADDRESS";

  return "UNKNOWN";
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [addressType, setAddressType] = useState<AddressType>("UNKNOWN");

  // Update address type whenever the search text changes
  useEffect(() => {
    setAddressType(classifyInput(searchText));
  }, [searchText]);

  const markdown = `# Detected Input Type\n\n**${addressType}**`;

  return (
    <List
      searchBarPlaceholder="Paste a Spark address, public key, or txid..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.trim() ? (
        <List.Item
          title={searchText}
          subtitle={`Type: ${addressType}`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown={markdown} />} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item title="Enter or paste a value to begin" icon={Icon.Info} />
      )}
    </List>
  );
}
