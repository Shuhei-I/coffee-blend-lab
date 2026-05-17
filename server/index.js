import { createServer } from "node:http";
import {
  getState,
  saveBeans,
  saveBrewMethods,
  saveRecipes,
  setSetting,
} from "./db.js";

const port = Number(process.env.PORT || 4174);

const server = createServer(async (request, response) => {
  try {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/api/state") {
      sendJson(response, 200, getState());
      return;
    }

    if (request.method === "PUT" && request.url === "/api/beans") {
      const body = await readJson(request);
      saveBeans(body.beans || []);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "PUT" && request.url === "/api/brew-methods") {
      const body = await readJson(request);
      saveBrewMethods(body.brewMethods || []);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "PUT" && request.url === "/api/recipes") {
      const body = await readJson(request);
      saveRecipes(body.recipeSeries || body.recipes || []);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "PUT" && request.url === "/api/settings/selected-brew-method") {
      const body = await readJson(request);
      setSetting("selectedBrewMethodId", body.selectedBrewMethodId || "");
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SQLite API server listening at http://127.0.0.1:${port}`);
});

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
