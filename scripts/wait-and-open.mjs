import { exec, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { get } from "node:http";

const url = process.env.APP_URL ?? "http://127.0.0.1:5173";
const timeoutMs = Number(process.env.APP_OPEN_TIMEOUT_MS ?? 120_000);
const deadline = Date.now() + timeoutMs;

const CHROME_PATHS = [
  join(process.env.ProgramFiles || "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
  join(
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    "Google\\Chrome\\Application\\chrome.exe"
  ),
  join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
];

function findChrome() {
  return CHROME_PATHS.find((path) => path && existsSync(path)) ?? null;
}

function openBrowser(target) {
  return new Promise((resolve, reject) => {
    if (process.platform === "win32") {
      const chrome = findChrome();
      if (chrome) {
        const child = spawn(chrome, [target, "--new-window"], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        });
        child.on("error", reject);
        child.unref();
        console.log(`[ok] Opened Chrome at ${target}`);
        resolve();
        return;
      }

      exec(`cmd /c start chrome "${target}"`, { windowsHide: true }, (chromeErr) => {
        if (!chromeErr) {
          console.log(`[ok] Opened Chrome at ${target}`);
          resolve();
          return;
        }

        exec(`cmd /c start "" "${target}"`, { windowsHide: true }, (fallbackErr) => {
          if (fallbackErr) {
            reject(fallbackErr);
            return;
          }
          console.log(`[ok] Opened default browser at ${target}`);
          resolve();
        });
      });
      return;
    }

    const command =
      process.platform === "darwin" ? `open "${target}"` : `xdg-open "${target}"`;
    exec(command, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function probe() {
  return new Promise((resolve) => {
    const req = get(url, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

console.log(`Waiting for ${url} (up to ${timeoutMs / 1000}s)...`);

while (Date.now() < deadline) {
  if (await probe()) {
    try {
      await openBrowser(url);
      process.exit(0);
    } catch (err) {
      console.error(`[error] Could not open browser: ${err?.message || err}`);
      process.exit(1);
    }
  }
  await new Promise((r) => setTimeout(r, 1000));
}

console.warn(`[warn] App did not become ready at ${url}. Open it manually in your browser.`);
