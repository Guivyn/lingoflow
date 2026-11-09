import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../../", import.meta.url));
const extensionDir = path.join(root, "build", "chrome");

function chromeCandidates() {
  if (process.env.CHROME_PATH) return [process.env.CHROME_PATH];
  if (process.platform === "win32") {
    return [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
    ];
  }
  if (process.platform === "darwin") {
    return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
}

async function findChrome() {
  for (const candidate of chromeCandidates()) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error(
    "Chrome was not found. Set CHROME_PATH to the Chrome executable."
  );
}

async function waitFor(readiness, label, timeout = 20000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const value = await readiness();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`
  );
}

function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let commandId = 0;
    let opened = false;

    const session = {
      socket,
      send(method, params = {}) {
        const id = ++commandId;
        return new Promise((resolveCommand, rejectCommand) => {
          pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
          socket.send(JSON.stringify({ id, method, params }));
        });
      },
      async evaluate(expression) {
        const response = await session.send("Runtime.evaluate", {
          expression,
          awaitPromise: true,
          returnByValue: true,
          userGesture: true,
        });
        if (response.exceptionDetails) {
          throw new Error(
            response.exceptionDetails.exception?.description ||
              response.exceptionDetails.text
          );
        }
        return response.result?.value;
      },
      close() {
        if (socket.readyState === WebSocket.OPEN) socket.close();
      },
    };

    socket.addEventListener("open", () => {
      opened = true;
      resolve(session);
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id === undefined) return;
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result || {});
    });
    socket.addEventListener("error", () => {
      const error = new Error("Chrome DevTools WebSocket failed");
      if (!opened) reject(error);
      for (const entry of pending.values()) entry.reject(error);
      pending.clear();
    });
    socket.addEventListener("close", () => {
      const error = new Error("Chrome DevTools connection closed");
      for (const entry of pending.values()) entry.reject(error);
      pending.clear();
    });
  });
}

const records = [];
const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (requestUrl.pathname === "/echo") {
    const record = {
      from: requestUrl.searchParams.get("from"),
      origin: request.headers.origin || "",
      host: request.headers.host || "",
    };
    records.push(record);
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(record));
    return;
  }

  if (requestUrl.pathname === "/page") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(
      "<!doctype html><html><body><main>Local extension smoke page</main></body></html>"
    );
    return;
  }

  response.writeHead(404).end("Not found");
});

let tempRoot;
let chrome;
let chromeExit;
let backgroundSession;
let browserSession;
let extensionSession;

try {
  await access(path.join(extensionDir, "manifest.json"));
  const chromePath = await findChrome();
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "lingoflow-chrome-smoke-"));
  const profileDir = path.join(tempRoot, "profile");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, resolve);
  });
  const serverPort = server.address().port;

  const args = [
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-position=-32000,-32000",
    "--window-size=1280,800",
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    "about:blank",
  ];
  if (process.platform !== "win32") args.unshift("--no-sandbox");
  chrome = spawn(chromePath, args, {
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  let chromeStderr = "";
  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    chromeStderr = (chromeStderr + chunk).slice(-4000);
  });
  chrome.once("exit", (code, signal) => {
    chromeExit = { code, signal };
  });

  const activePortPath = path.join(profileDir, "DevToolsActivePort");
  const debugPort = await waitFor(
    async () => {
      if (chromeExit) {
        throw new Error(
          `Chrome exited ${JSON.stringify(chromeExit)}. ${chromeStderr}`
        );
      }
      try {
        const lines = (await readFile(activePortPath, "utf8")).split(/\r?\n/);
        const port = Number(lines[0]);
        if (!port) return undefined;
        const base = `http://127.0.0.1:${port}`;
        const versionResponse = await fetch(`${base}/json/version`);
        if (!versionResponse.ok) return undefined;
        return { port, base, version: await versionResponse.json() };
      } catch {
        return undefined;
      }
    },
    "Chrome DevTools endpoint",
    30000
  );

  const serviceWorkers = await waitFor(async () => {
    const targetsResponse = await fetch(`${debugPort.base}/json/list`);
    const targets = await targetsResponse.json();
    const workers = targets.filter(
      (target) =>
        target.type === "service_worker" &&
        target.url.endsWith("/background.js")
    );
    return workers.length ? workers : undefined;
  }, "extension service worker");

  browserSession = await connectCdp(debugPort.version.webSocketDebuggerUrl);
  let serviceWorker;
  let extensionInfo;
  const inspectedWorkers = [];
  for (const candidateWorker of serviceWorkers) {
    const candidateSession = await connectCdp(
      candidateWorker.webSocketDebuggerUrl
    );
    try {
      await candidateSession.send("Runtime.enable");
      const candidateInfo = await candidateSession.evaluate(`(() => {
        const manifest = chrome.runtime.getManifest();
        return {
          id: chrome.runtime.id,
          name: manifest.name,
          version: manifest.version,
          optionsPage: manifest.options_ui?.page || "",
          homepageUrl: manifest.homepage_url || "",
        };
      })()`);
      inspectedWorkers.push(candidateInfo);
      if (
        candidateInfo.optionsPage === "options.html" &&
        candidateInfo.homepageUrl === "https://github.com/Guivyn/lingoflow"
      ) {
        serviceWorker = candidateWorker;
        backgroundSession = candidateSession;
        extensionInfo = candidateInfo;
        break;
      }
      candidateSession.close();
    } catch {
      candidateSession.close();
    }
  }
  assert(
    serviceWorker && backgroundSession && extensionInfo,
    `LingoFlow service worker was not found. Inspected: ${JSON.stringify(inspectedWorkers)}`
  );
  const extensionId = extensionInfo.id;
  assert.equal(
    extensionInfo.version,
    JSON.parse(await readFile(path.join(extensionDir, "manifest.json"), "utf8"))
      .version
  );
  await backgroundSession.evaluate("chrome.runtime.openOptionsPage()");
  const optionsTarget = await waitFor(async () => {
    const targetsResponse = await fetch(`${debugPort.base}/json/list`);
    const targets = await targetsResponse.json();
    return targets.find(
      (target) =>
        target.type === "page" &&
        target.url.startsWith(`chrome-extension://${extensionId}/options.html`)
    );
  }, "Options page target");
  extensionSession = await connectCdp(optionsTarget.webSocketDebuggerUrl);
  await extensionSession.send("Page.enable");
  await extensionSession.send("Runtime.enable");

  await extensionSession.evaluate("location.hash = '#/rules'");
  try {
    await waitFor(
      () =>
        extensionSession.evaluate(
          "document.readyState === 'complete' && !!document.querySelector('#root')?.children.length"
        ),
      "Options page render"
    );
  } catch (error) {
    const state = await extensionSession.evaluate(
      "JSON.stringify({url: location.href, ready: document.readyState, title: document.title, body: document.body?.innerText, root: document.querySelector('#root')?.innerHTML?.slice(0, 1200)})"
    );
    throw new Error(`${error.message}; page state=${state}`);
  }
  await waitFor(
    () =>
      extensionSession.evaluate(
        "!!document.querySelector('a[href=\"#/providers\"]')"
      ),
    "Options navigation links"
  );
  const initialRoute = await extensionSession.evaluate("location.hash");
  const initialMainText = await extensionSession.evaluate(
    "document.querySelector('main')?.innerText || ''"
  );
  assert.equal(initialRoute, "#/rules", "Options did not open the rules route");
  assert(initialMainText.trim(), "Rules route did not render its main content");
  await extensionSession.evaluate(
    `window.__initialMainText = ${JSON.stringify(initialMainText)}`
  );

  await extensionSession.evaluate(
    "document.querySelector('a[href=\"#/providers\"]').click()"
  );
  await waitFor(
    () =>
      extensionSession.evaluate(
        "location.hash === '#/providers' && !!document.querySelector('main')?.innerText.trim() && document.querySelector('main')?.innerText !== window.__initialMainText"
      ),
    "React Router navigation to providers"
  );
  const providersMainText = await extensionSession.evaluate(
    "document.querySelector('main')?.innerText || ''"
  );
  assert.notEqual(
    providersMainText,
    initialMainText,
    "React Router navigation did not change the route view"
  );

  await extensionSession.evaluate(
    `chrome.runtime.sendMessage({action: "update_csp", args: {orilist: "http://localhost"}})`
  );
  const originRules = await waitFor(
    () =>
      extensionSession
        .evaluate(
          "chrome.declarativeNetRequest.getDynamicRules().then((rules) => rules.filter((rule) => rule.id >= 10000))"
        )
        .then((rules) => (rules.length ? rules : undefined)),
    "DNR Origin rule registration"
  );
  assert.equal(originRules.length, 1, "Expected one Origin rewrite rule");
  assert.deepEqual(
    originRules[0].condition.initiatorDomains,
    [extensionId],
    "Origin rule is not scoped to the extension initiator"
  );
  assert.deepEqual(originRules[0].condition.resourceTypes, ["xmlhttprequest"]);

  const extensionFetchUrl = `http://localhost:${serverPort}/echo?from=extension`;
  await extensionSession.evaluate(
    `fetch(${JSON.stringify(extensionFetchUrl)}).then((response) => response.text())`
  );
  const extensionRequest = await waitFor(
    () => records.find((record) => record.from === "extension"),
    "extension initiated request"
  );
  assert.equal(
    extensionRequest.origin,
    "http://localhost",
    "DNR did not rewrite the extension request Origin"
  );

  const pageUrl = `http://127.0.0.1:${serverPort}/page`;
  await extensionSession.send("Page.navigate", { url: pageUrl });
  await waitFor(
    () =>
      extensionSession.evaluate(
        "document.readyState === 'complete' && document.querySelector('main')?.textContent.includes('Local extension smoke page')"
      ),
    "ordinary web page load"
  );
  const contentScriptResponse = await waitFor(
    () =>
      backgroundSession.evaluate(`(async () => {
        const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
        if (!tab?.id) return null;
        try {
          return await chrome.tabs.sendMessage(tab.id, {action: "trans_getrule", args: {}});
        } catch {
          return null;
        }
      })()`),
    "content script rule response"
  );
  assert.equal(
    contentScriptResponse?.rule?.pattern,
    "*",
    "Content script did not return the active global rule"
  );
  const pageFetchUrl = `http://localhost:${serverPort}/echo?from=web`;
  await extensionSession.evaluate(
    `fetch(${JSON.stringify(pageFetchUrl)}).then((response) => response.text())`
  );
  const pageRequest = await waitFor(
    () => records.find((record) => record.from === "web"),
    "ordinary web initiated request"
  );
  assert.equal(
    pageRequest.origin,
    `http://127.0.0.1:${serverPort}`,
    "DNR changed the Origin header of an ordinary web request"
  );

  console.log(
    `Chrome smoke passed: ${debugPort.version.Browser}, extension ${extensionId}`
  );
  console.log(
    "Content script messaging, Options HashRouter navigation, and extension-only DNR Origin rewriting passed."
  );
} finally {
  extensionSession?.close();
  backgroundSession?.close();
  if (browserSession) {
    try {
      await browserSession.send("Browser.close");
    } catch {}
    browserSession.close();
  }
  if (chrome && !chromeExit) {
    chrome.kill();
    await Promise.race([
      new Promise((resolve) => chrome.once("exit", resolve)),
      delay(3000),
    ]);
  }
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
}
