export type RemoteArcMode = "safe" | "developer" | "full";

const parseMode = (value: string | undefined): RemoteArcMode => {
  if (value === "developer" || value === "full") return value;
  return "safe";
};

const env = (next: string, legacy: string) =>
  process.env[next] || process.env[legacy];

export const config = {
  mode: parseMode(env("REMOTE_ARC_MODE", "REMOTE_LINK_MODE")),
  desktopCommanderCommand:
    env(
      "REMOTE_ARC_DESKTOP_COMMANDER_COMMAND",
      "REMOTE_LINK_DESKTOP_COMMANDER_COMMAND",
    ) || null,
  desktopCommanderPackage:
    env(
      "REMOTE_ARC_DESKTOP_COMMANDER_PACKAGE",
      "REMOTE_LINK_DESKTOP_COMMANDER_PACKAGE",
    ) || "@wonderwhy-er/desktop-commander",
} as const;

export const canEditFiles = () =>
  config.mode === "developer" || config.mode === "full";

export const canUseTerminal = () => config.mode === "full";
