export type StorageMode = "postgresql" | "memory";

let mode: StorageMode = "postgresql";

export function getStorageMode(): StorageMode {
  return mode;
}

export function useMemoryStorage(): void {
  mode = "memory";
}

export function isMemoryStorage(): boolean {
  return mode === "memory";
}
