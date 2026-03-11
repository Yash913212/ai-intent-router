#!/usr/bin/env node

import { routeRequest } from "./router.js";

async function main() {
    const args = process.argv.slice(2);
    const wantsJson = args.includes("--json");
    const filteredArgs = args.filter((arg) => arg !== "--json");
    const message = filteredArgs.join(" ").trim();

    if (!message) {
        console.error("Usage: ai-intent-router [--json] \"your message\"");
        process.exitCode = 1;
        return;
    }

    try {
        const result = await routeRequest(message);

        if (wantsJson) {
            console.log(JSON.stringify({
                intent: result.intent,
                confidence: result.confidence,
                final_response: result.finalResponse,
                route_source: result.routeSource
            }, null, 2));
            return;
        }

        console.log(`Intent: ${result.intent}`);
        console.log(`Confidence: ${result.confidence.toFixed(2)}`);
        console.log("");
        console.log(result.finalResponse);
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

main();