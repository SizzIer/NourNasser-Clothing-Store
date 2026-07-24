import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { get } from "node:http";

const preferredUrl = process.env.APP_URL ?? "http://localhost:5173";
const probeUrls = [...new Set([preferredUrl, "http://localhost:5173", "http://127.0.0.1:5173"])];
const timeoutMs = Number(process.env.APP_OPEN_TIMEOUT_MS ?? 180_000);
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
        const child = spawn(chrome, [target], {
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

      // Fallback: Windows "start" verb via cmd
      execFile(
        "cmd.exe",
        ["/c", "start", "", target],
        { windowsHide: true },
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log(`[ok] Opened default browser at ${target}`);
          resolve();
        }
      );
      return;
    }

    const opener = process.platform === "darwin" ? "open" : "xdg-open";
    execFile(opener, [target], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function probe(url) {
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

async function waitUntilReady() {
  console.log(`Waiting for app (up to ${timeoutMs / 1000}s)...`);
  console.log(`Probing: ${probeUrls.join(", ")}`);

  while (Date.now() < deadline) {
    for (const url of probeUrls) {
      if (await probe(url)) {
        return url;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

const readyUrl = await waitUntilReady();
if (!readyUrl) {
  console.warn(
    `[warn] App did not become ready. Open ${preferredUrl} manually in your browser.`
  );
  process.exit(0);
}

try {
  await openBrowser(readyUrl);
  process.exit(0);
} catch (err) {
  console.error(`[error] Could not open browser: ${err?.message || err}`);
  console.warn(`[warn] Open ${readyUrl} manually in your browser.`);
  process.exit(0);
}
