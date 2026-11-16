/** Keep microphone and camera failures independent, and stop capture if consent is revoked mid-request. */
export async function publishGuestMedia(
  controls: {
    microphone: (enabled: boolean) => Promise<unknown>;
    camera: (enabled: boolean) => Promise<unknown>;
    stop: () => Promise<unknown>;
  },
  settings: { microphone: boolean; camera: boolean },
  allowed: () => boolean,
) {
  const errors: string[] = [];
  let requested = 0;
  let published = 0;
  const check = async () => {
    if (!allowed()) {
      await controls.stop();
      throw new Error("Your guest spot is no longer available, or the app was backgrounded. Join again when ready.");
    }
  };
  for (const kind of ["microphone", "camera"] as const) {
    await check();
    if (settings[kind]) requested++;
    try {
      await controls[kind](settings[kind]);
      if (settings[kind]) published++;
    } catch (error) {
      errors.push(`${kind === "camera" ? "Camera" : "Microphone"}: ${error instanceof Error ? error.message : "Could not start. Check permissions."}`);
    }
    await check();
  }
  if (requested > 0 && published === 0) {
    await controls.stop();
    throw new Error(errors.join(". "));
  }
  return errors;
}
