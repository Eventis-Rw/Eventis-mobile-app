import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import type { PublishedStory } from "@/services/storyService";

const PREFIX = "eventis-media:";
const urls = new Map<string, string>();
async function mediaStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("eventis-story-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("media");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("media", mode);
    const request = action(transaction.objectStore("media"));
    transaction.oncomplete = () => { resolve(request.result); db.close(); };
    transaction.onerror = () => { reject(transaction.error); db.close(); };
    transaction.onabort = () => { reject(transaction.error); db.close(); };
  });
}
/** Picker cache files/blob URLs aren't durable. Save media before committing story metadata. */
export async function persistStoryMedia(uri: string): Promise<string> {
  if (/^https?:/.test(uri) || uri.startsWith(PREFIX)) return uri;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    await mediaStore("readwrite", (store) => store.put(blob, id));
    return PREFIX + id;
  }
  const directory = new Directory(Paths.document, "stories");
  directory.create({ intermediates: true, idempotent: true });
  if (uri.startsWith(directory.uri)) return uri;
  const source = new File(uri);
  const destination = new File(directory, id + (source.extension || ".media"));
  source.copy(destination);
  return destination.uri;
}
async function resolveMedia(uri: string) {
  if (!uri.startsWith(PREFIX)) return uri;
  if (urls.has(uri)) return urls.get(uri)!;
  const blob = await mediaStore<Blob | undefined>("readonly", (store) => store.get(uri.slice(PREFIX.length)));
  if (!blob) return "";
  const url = URL.createObjectURL(blob);
  urls.set(uri, url);
  return url;
}
export async function resolveStoryMedia(items: PublishedStory[]) {
  return Promise.all(items.map(async (story) => {
    const imageUri = typeof story.storyImage === "object" && !Array.isArray(story.storyImage) ? story.storyImage?.uri : undefined;
    const uri = story.mediaUrl || imageUri;
    if (!uri?.startsWith(PREFIX)) return story;
    const resolved = await resolveMedia(uri);
    return { ...story, mediaUrl: resolved, storyImage: story.mediaType === "video" || !resolved ? undefined : { uri: resolved } };
  }));
}

