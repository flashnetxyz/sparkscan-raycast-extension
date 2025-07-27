export abstract class Match {
  public readonly search: string;
  public network: "MAINNET" | "REGTEST";

  protected $matched = false;

  public constructor(search: string, network: "MAINNET" | "REGTEST") {
    this.search = search;
    this.network = network;
  }

  public abstract match(): boolean;
  public get matched(): boolean {
    return this.$matched;
  }
  public abstract get matchedNetwork(): "MAINNET" | "REGTEST" | null;

  public abstract get path(): string;
}

export type Matchers = Match[];
