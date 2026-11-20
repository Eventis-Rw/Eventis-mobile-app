import { File } from "expo-file-system";
import { Platform } from "react-native";

// Extensions the API accepts for each image mime type (storage.service.ts's expectedExt map).
const ACCEPTABLE_IMAGE_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "image/bmp": ["bmp"],
  "image/x-ms-bmp": ["bmp"],
  "image/tiff": ["tiff", "tif"],
  "image/x-tiff": ["tiff", "tif"],
};
const PRIMARY_IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
  "image/x-ms-bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-tiff": "tiff",
};

/**
 * On web the caller's `name` is only ever a guess: it's built from the picker's
 * `uri`, which is usually a blob: URL carrying no extension at all. The browser
 * itself reports the file's real type as `blob.type`, and uses it (not `name`)
 * to set the multipart part's Content-Type the server actually validates
 * against — so the extension sent must follow that real type, not the guess.
 */
function withMimeMatchingExtension(name: string, mimeType: string): string {
  const type = mimeType.toLowerCase();
  const acceptable = ACCEPTABLE_IMAGE_EXTENSIONS[type];
  if (!acceptable) return name;
  const currentExt = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  if (currentExt && acceptable.includes(currentExt)) return name;
  return `${name.replace(/\.[a-z0-9]+$/i, "")}.${PRIMARY_IMAGE_EXTENSION[type]}`;
}

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
    const actualType = blob.type || type;
    form.append(field, blob, withMimeMatchingExtension(name, actualType));
    return;
  }
  const file = new File(uri);
  form.append(field, { name, type, bytes: () => file.bytes() } as unknown as Blob);
}
