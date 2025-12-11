import { closeMainWindow, getPreferenceValues, popToRoot, showToast, Toast, open } from "@raycast/api";
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

export async function openMultiFolderInZed(entry: Entry, build: ZedBuild): Promise<void> {
  if (!entry.allPaths || entry.allPaths.length <= 1) {
    throw new Error("Not a multi-folder workspace");
  }

  const cli = getZedCli(build);
  const paths = entry.allPaths.map((p) => `"${p}"`).join(" ");

  try {
    // Try to execute Zed CLI command in background
    await execAsync(`command -v ${cli} > /dev/null 2>&1`);
    execAsync(`${cli} ${paths} > /dev/null 2>&1 &`);

    // Clear navigation stack and close Raycast window immediately
    await popToRoot();
    await closeMainWindow();
  } catch {
    // CLI not found - show error and fall back to opening first folder
    await showToast({
      style: Toast.Style.Failure,
      title: "Zed CLI not found",
      message: "Opening first folder only. Install CLI via Zed > Install CLI",
    });

    // Fall back to opening first folder with native method
    const bundleId = getZedBundleId(build);
    await open(entry.uri, bundleId);
    await popToRoot();
    await closeMainWindow();
  }
}
