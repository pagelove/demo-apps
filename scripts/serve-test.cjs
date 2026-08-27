#!/usr/bin/env node
// Serve a prepared bundle for local browser checks.

const { createReadStream } = require("node:fs");
const { stat } = require("node:fs/promises");
const { createServer } = require("node:http");
const path = require("node:path");


const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};


function startStaticServer(rootDirectory, port = 4173) {
  const root = path.resolve(rootDirectory);
  const server = createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch (_) {
      response.writeHead(400).end("Bad request");
      return;
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const candidate = path.resolve(root, `.${pathname}`);
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const details = await stat(candidate);
      if (!details.isFile()) throw new Error("Not a file");
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": details.size,
        "Content-Type": contentTypes[path.extname(candidate).toLowerCase()] ||
          "application/octet-stream",
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(candidate).pipe(response);
    } catch (_) {
      response.writeHead(404).end("Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      console.log(`Serving ${root} at http://127.0.0.1:${actualPort}`);
      resolve(server);
    });
  });
}


module.exports = { startStaticServer };

if (require.main === module) {
  const port = Number.parseInt(process.argv[2] || "4173", 10);
  const root = process.argv[3] || ".deploy-ci";
  startStaticServer(root, port).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
