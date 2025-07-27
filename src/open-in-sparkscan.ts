import { showHUD, Clipboard, open } from "@raycast/api";
import { addRaycastUTM } from "./lib/url";
import { SparkAddressMatch, TokenMatch, TransactionMatch, type Matchers } from "./lib/matchers";

const matchSearch = (search: string, network: "MAINNET" | "REGTEST"): Matchers => {
  const matchers = [
    new SparkAddressMatch(search, network),
    new TransactionMatch(search, network),
    new TokenMatch(search, network),
  ];
  const matchedMatchers = matchers.filter((matcher) => matcher.match());
  return matchedMatchers;
};

export default async function main() {
  const { text: clipboard } = await Clipboard.read();
  const addressType = matchSearch(clipboard, "MAINNET");

  if (addressType.length === 0) {
    await showHUD("Invalid input");
    return;
  }

  const path = addressType[0].path;
  await open(addRaycastUTM(path));
}
