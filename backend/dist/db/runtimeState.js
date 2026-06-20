import * as repo from "./repositories.js";
let schedule = [];
let openSlots = [];
let available = false;
export function getSchedule() {
    return schedule;
}
export function getOpenSlots() {
    return openSlots;
}
export function getAvailable() {
    return available;
}
export function setSchedule(next) {
    schedule = next;
}
export function setOpenSlots(next) {
    openSlots = next;
}
export function setAvailable(next) {
    available = next;
}
export function replaceSchedule(mutator) {
    schedule = mutator([...schedule]);
}
export function replaceOpenSlots(mutator) {
    openSlots = mutator([...openSlots]);
}
export async function loadRuntimeState() {
    const runtime = await repo.getDashboardRuntime();
    schedule = runtime.schedule;
    openSlots = runtime.openSlots;
    available = runtime.available;
}
export async function persistRuntimeState() {
    await repo.saveDashboardRuntime({ available, schedule, openSlots });
}
