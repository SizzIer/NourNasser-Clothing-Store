import { execSync } from "node:child_process";

function killPort(port) {
  if (process.platform !== "win32") return;

  try {
    const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: "utf8",
    });

    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const pid = trimmed.split(/\s+/).at(-1);
      if (pid && /^\d+$/.test(pid) && pid !== "0") {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`[ok] Stopped process ${pid} using port ${port}`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No listener on this port.
  }
}

console.log("Checking for existing dev servers...");
killPort(5173);
killPort(4000);
