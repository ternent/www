import manifest from "../../../package.json";

export const packageVersions = {
  identity: manifest.dependencies["@ternent/identity"],
  armour: manifest.dependencies["@ternent/armour"],
  ledger: manifest.dependencies["@ternent/ledger"],
  concord: manifest.dependencies["@ternent/concord"],
  seal: manifest.dependencies["@ternent/seal"],
} as const;
