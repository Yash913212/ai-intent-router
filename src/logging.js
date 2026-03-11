import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function appendRouteLog({ logPath, userMessage, result }) {
    const targetPath = path.resolve(logPath);
    await mkdir(path.dirname(targetPath), { recursive: true });

    const payload = {
        timestamp: new Date().toISOString(),
        intent: result.intent,
        confidence: result.confidence,
        user_message: userMessage,
        final_response: result.finalResponse,
        route_source: result.routeSource
    };

    await appendFile(targetPath, `${JSON.stringify(payload)}\n`, "utf8");
}