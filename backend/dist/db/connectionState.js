let mode = "postgresql";
export function getStorageMode() {
    return mode;
}
export function useMemoryStorage() {
    mode = "memory";
}
export function isMemoryStorage() {
    return mode === "memory";
}
