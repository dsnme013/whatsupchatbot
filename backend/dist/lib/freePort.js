import { execSync } from "node:child_process";
/** Kill any process listening on `port` (dev-only port cleanup). */
export function freePort(port) {
    const self = process.pid;
    if (process.platform === "win32") {
        try {
            const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: "utf8" });
            const pids = new Set();
            for (const line of out.split("\n")) {
                if (!line.includes("LISTENING"))
                    continue;
                const pid = Number(line.trim().split(/\s+/).pop());
                if (Number.isFinite(pid) && pid > 0 && pid !== self)
                    pids.add(pid);
            }
            for (const pid of pids) {
                try {
                    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
                }
                catch {
                    /* already gone */
                }
            }
        }
        catch {
            /* port not in use */
        }
        return;
    }
    try {
        execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, {
            stdio: "ignore",
            shell: "/bin/sh"
        });
    }
    catch {
        /* port not in use */
    }
}
export function isAddrInUse(err) {
    return (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "EADDRINUSE");
}
