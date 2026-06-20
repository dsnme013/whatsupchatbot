import { DEFAULT_PROFILE } from "./mappers.js";
import * as repo from "./repositories.js";
let profile = { ...DEFAULT_PROFILE };
export function getDashboardProfileSync() {
    return profile;
}
export async function loadProfileState() {
    profile = await repo.getDashboardProfile();
}
export async function saveProfileState(patch) {
    profile = await repo.updateDashboardProfile(patch);
    return profile;
}
