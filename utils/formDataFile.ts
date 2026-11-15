import { File } from "expo-file-system";
import { Platform } from "react-native";

/**
 * Appends a local file (camera / image picker URI) to a FormData body.
 *
 * Expo's built-in fetch (expo/winter) rejects the old React Native part shape
 * `{ uri, name, type }` with "Unsupported FormDataPart implementation". It
 * accepts strings, Blobs, or any object with `bytes()`, so on native we hand it
 * one that reads the file from disk, with the name and type we choose (the
 * server checks that the type matches the file).
 */
export async function appendLocalFile(form: FormData, field: string, uri: string, name: string, type: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, name);
    return;
  }
  const file = new File(uri);
  form.append(field, { name, type, bytes: () => file.bytes() } as unknown as Blob);
}
