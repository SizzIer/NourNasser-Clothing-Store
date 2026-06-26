import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const enginePath = join(
  serverRoot,
  "node_modules",
  ".prisma",
  "client",
  "query_engine-windows.dll.node"
);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: serverRoot,
      stdio: "inherit",
      shell: true,
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetries(command, args, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await run(command, args);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;

      console.warn(`[warn] ${args.join(" ")} failed (attempt ${attempt}/${retries}). Retrying in 2s...`);
      console.warn("[hint] If this keeps failing, close other Node terminals and try again.");
      await sleep(2000);
    }
  }

  throw lastError;
}

async function generateClient() {
  const engineExists = existsSync(enginePath);

  try {
    await runWithRetries("npx", ["prisma", "generate"]);
  } catch (error) {
    if (!engineExists) throw error;

    console.warn("[warn] prisma generate failed because a Prisma file is locked.");
    console.warn("[warn] Using the existing Prisma client and continuing.");
    console.warn("[warn] If you changed prisma/schema.prisma, stop all Node apps and run: npm run setup");
  }
}

async function main() {
  await generateClient();
  await run("npx", ["prisma", "migrate", "deploy"]);
  await run("npm", ["run", "db:seed"]);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
