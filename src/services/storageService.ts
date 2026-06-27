import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/firebase/config";

export interface UploadResult {
  url: string;
  path: string;
}

export function uploadFile(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress?.(Math.round(pct));
      },
      (err) => {
        // If storage upload fails (e.g. rules), reject so caller can fall back
        reject(err);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path: task.snapshot.ref.fullPath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function deleteFile(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // ignore
  }
}

// Convenience helpers
export const uploadAvatar = (file: File, uid: string, onProgress?: (p: number) => void) =>
  uploadFile(file, `avatars/${uid}`, onProgress);

export const uploadThumbnail = (file: File, type: "movies" | "series", onProgress?: (p: number) => void) =>
  uploadFile(file, `thumbnails/${type}`, onProgress);

export const uploadBanner = (file: File, type: "movies" | "series", onProgress?: (p: number) => void) =>
  uploadFile(file, `banners/${type}`, onProgress);

export const uploadVideo = (file: File, type: "movies" | "episodes", onProgress?: (p: number) => void) =>
  uploadFile(file, `videos/${type}`, onProgress);
