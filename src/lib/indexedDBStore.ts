// IndexedDB Binary Storage Manager for 1 GB video files and thumbnail files.
// Bypasses size limitations by keeping binary content locally.

const DB_NAME = "QPStudioStorageDB";
const STORE_NAME = "files";
const DB_VERSION = 1;

export interface StoredFile {
  id: string; // key: <docId>_<type> (e.g. "5AQ83bPoK363rPBuV9ls_video")
  blob: Blob;
  name: string;
  type: string;
  createdAt: number;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB initialization failed.");
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveFile(id: string, type: "video" | "thumbnail", file: File | Blob): Promise<string> {
  const db = await initDB();
  const key = `${id}_${type}`;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    const record: StoredFile = {
      id: key,
      blob: file instanceof File ? file : file,
      name: file instanceof File ? file.name : `${type}_file`,
      type: file.type,
      createdAt: Date.now()
    };
    
    const request = store.put(record);
    
    request.onsuccess = () => {
      resolve(`localdb://${key}`);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getFile(key: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.blob);
      } else {
        resolve(null);
      }
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteFile(key: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Convert localdb:// url to browser Blob object URL
export async function resolveMediaUrl(url: string, fallbackUrl: string): Promise<string> {
  if (!url) {
    return fallbackUrl;
  }

  if (url.startsWith("localdb://")) {
    try {
      const key = url.replace("localdb://", "");
      const blob = await getFile(key);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn("Failed to resolve localdb URL:", url, err);
    }
  }
  
  return url || fallbackUrl;
}

// Compress thumbnail image helper using HTML Canvas
export function compressImage(file: File, maxWidth = 800, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Image compression returned empty blob"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
