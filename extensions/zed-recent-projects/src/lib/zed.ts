import { closeMainWindow, getPreferenceValues, popToRoot } from "@raycast/api";
import { exec } from "child_process";
import { homedir } from "os";
import { promisify } from "util";
import type { Entry } from "./entry";

const execAsync = promisify(exec);

export type ZedBuild = Preferences["build"];
export type ZedBundleId = "dev.zed.Zed" | "dev.zed.Zed-Preview" | "dev.zed.Zed-Dev";

const ZedBundleIdBuildMapping: Record<ZedBuild, ZedBundleId> = {
  Zed: "dev.zed.Zed",
  "Zed Preview": "dev.zed.Zed-Preview",
  "Zed Dev": "dev.zed.Zed-Dev",
};

const ZedDbNameMapping: Record<ZedBuild, string> = {
  Zed: "0-stable",
  "Zed Preview": "0-preview",
  "Zed Dev": "0-dev",
};

const ZedCliMapping: Record<ZedBuild, string> = {
  Zed: "zed",
  "Zed Preview": "zed-preview",
  "Zed Dev": "zed-dev",
};

export function getZedBundleId(build: ZedBuild): ZedBundleId {
  return ZedBundleIdBuildMapping[build];
}

export function getZedDbName(build: ZedBuild): string {
  return ZedDbNameMapping[build];
}

export function getZedDbPath() {
  const preferences = getPreferenceValues<Preferences>();
  const zedBuild = preferences.build;
  return `${homedir()}/Library/Application Support/Zed/db/${getZedDbName(zedBuild)}/db.sqlite`;
}

export function getZedCli(build: ZedBuild): string {
  return ZedCliMapping[build];
}

export async function openInZed(entry: Entry, build: ZedBuild): Promise<void> {
  const cli = getZedCli(build);

  // Execute Zed command in background with & so it detaches
  if (entry.allPaths && entry.allPaths.length > 1) {
    const paths = entry.allPaths.map((p) => `"${p}"`).join(" ");
    execAsync(`${cli} ${paths} > /dev/null 2>&1 &`);
  } else {
    execAsync(`${cli} "${entry.path}" > /dev/null 2>&1 &`);
  }

  // Clear navigation stack and close Raycast window immediately
  await popToRoot();
  await closeMainWindow();
}
