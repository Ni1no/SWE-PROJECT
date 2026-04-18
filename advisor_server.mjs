/**
 * Minimal HTTP bridge: Expo app -> POST JSON -> Python advisor_cli.py (REQ doc: app + backend).
 * From SWE-PROJECT-ui-frontend: npm run advisor-server
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ADVISOR_PORT || 3847);
const PYTHON = process.env.PYTHON || "python";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/advisor/next-maintenance") {
    let bodyText = "";
    try {
      bodyText = await readBody(req);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: "bad_request" }));
      return;
    }
    const cli = path.join(__dirname, "advisor_cli.py");
    const child = spawn(PYTHON, [cli], {
      cwd: __dirname,
      env: { ...process.env, PYTHONUTF8: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.stdin.write(bodyText);
    child.stdin.end();
    const code = await new Promise((resolve) => child.on("close", resolve));
    if (code !== 0) {
      res.writeHead(500, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ error: "python_failed", detail: stderr || String(code) }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json", ...cors });
    res.end(stdout || "null");
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json", ...cors });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.error(`advisor_server http://0.0.0.0:${PORT}`);
});
