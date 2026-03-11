#!/usr/bin/env node

import http from "node:http";

import { routeRequest } from "./router.js";

const port = Number.parseInt(process.env.PORT || "8000", 10);

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
    const chunks = [];

    for await (const chunk of request) {
        chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) {
        return {};
    }

    return JSON.parse(raw);
}

const server = http.createServer(async(request, response) => {
    if (request.method === "GET" && request.url === "/health") {
        sendJson(response, 200, { status: "ok" });
        return;
    }

    if (request.method === "POST" && request.url === "/route") {
        try {
            const body = await readJsonBody(request);
            const message = typeof body.message === "string" ? body.message.trim() : "";

            if (!message) {
                sendJson(response, 400, { error: "Request body must include a non-empty 'message' string." });
                return;
            }

            const result = await routeRequest(message);
            sendJson(response, 200, {
                intent: result.intent,
                confidence: result.confidence,
                final_response: result.finalResponse,
                route_source: result.routeSource
            });
        } catch (error) {
            sendJson(response, 500, { error: error instanceof Error ? error.message : "Unexpected server error." });
        }
        return;
    }

    sendJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
    console.log(`AI Intent Router API listening on http://127.0.0.1:${port}`);
});