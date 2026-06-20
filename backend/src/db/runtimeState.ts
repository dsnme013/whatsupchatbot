import type { DashboardScheduleSlot } from "../store.js";
import * as repo from "./repositories.js";

let schedule: DashboardScheduleSlot[] = [];
let openSlots: string[] = [];
let available = false;

export function getSchedule(): DashboardScheduleSlot[] {
  return schedule;
}

export function getOpenSlots(): string[] {
  return openSlots;
}

export function getAvailable(): boolean {
  return available;
}

export function setSchedule(next: DashboardScheduleSlot[]): void {
  schedule = next;
}

export function setOpenSlots(next: string[]): void {
  openSlots = next;
}

export function setAvailable(next: boolean): void {
  available = next;
}

export function replaceSchedule(mutator: (current: DashboardScheduleSlot[]) => DashboardScheduleSlot[]): void {
  schedule = mutator([...schedule]);
}

export function replaceOpenSlots(mutator: (current: string[]) => string[]): void {
  openSlots = mutator([...openSlots]);
}

export async function loadRuntimeState(): Promise<void> {
  const runtime = await repo.getDashboardRuntime();
  schedule = runtime.schedule;
  openSlots = runtime.openSlots;
  available = runtime.available;
}

export async function persistRuntimeState(): Promise<void> {
  await repo.saveDashboardRuntime({ available, schedule, openSlots });
}
