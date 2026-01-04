import { execa } from "execa";

export interface NotificationOptions {
  title: string;
  message: string;
  sound?: string;
}

export async function sendNotification(options: NotificationOptions): Promise<void> {
  const { title, message, sound } = options;

  const soundPart = sound ? `sound name "${sound}"` : "";
  const script = `display notification "${message}" with title "${title}" ${soundPart}`;

  try {
    await execa("osascript", ["-e", script]);
  } catch (error) {
    // Silently fail if notifications aren't available
    console.error("Failed to send notification:", error);
  }
}

export async function notifySpawnComplete(count: number): Promise<void> {
  await sendNotification({
    title: "claudectl",
    message: `Spawned ${count} Claude agent${count === 1 ? "" : "s"}`,
    sound: "Glass",
  });
}
