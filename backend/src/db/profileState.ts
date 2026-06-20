import type { DashboardProfile } from "../store.js";
import { DEFAULT_PROFILE } from "./mappers.js";
import * as repo from "./repositories.js";

let profile: DashboardProfile = { ...DEFAULT_PROFILE };

export function getDashboardProfileSync(): DashboardProfile {
  return profile;
}

export async function loadProfileState(): Promise<void> {
  profile = await repo.getDashboardProfile();
}

export async function saveProfileState(patch: Partial<DashboardProfile>): Promise<DashboardProfile> {
  profile = await repo.updateDashboardProfile(patch);
  return profile;
}
