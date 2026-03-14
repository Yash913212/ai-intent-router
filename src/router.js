import path from "node:path";

import { OllamaLLMClient } from "./llm.js";
import { appendRouteLog } from "./logging.js";
import { CLASSIFIER_PROMPT, CLARIFYING_QUESTION, SUPPORTED_INTENTS, SYSTEM_PROMPTS } from "./prompts.js";

export const DEFAULT_THRESHOLD = Number.parseFloat(process.env.AI_INTENT_ROUTER_CONFIDENCE_THRESHOLD || "0.70");
export const DEFAULT_LOG_PATH = process.env.AI_INTENT_ROUTER_LOG_PATH || path.resolve("route_log.jsonl");

const OVERRIDE_PATTERN = /^@(code|data|writing|career|unclear)\b\s*(.*)$/is;

export function safeDefaultClassification() {
    return { intent: "unclear", confidence: 0.0 };
}

export function extractOverride(message) {
    const match = OVERRIDE_PATTERN.exec(message.trim());
    if (!match) {
        return null;
    }

    return {
        intent: match[1].toLowerCase(),
        cleanedMessage: match[2].trim() || "Please help with this request."
    };
}

export function parseClassifierResponse(rawResponse) {
    let parsed;

    try {
        parsed = JSON.parse(rawResponse);
    } catch {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return safeDefaultClassification();
        }

        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch {
            return safeDefaultClassification();
        }
    }

    const rawIntent = parsed && typeof parsed.intent === "string" ? parsed.intent.toLowerCase() : "unclear";
    const confidence = Number(parsed && Object.prototype.hasOwnProperty.call(parsed, "confidence") ? parsed.confidence : Number.NaN);
    const intent = rawIntent;

    if (!SUPPORTED_INTENTS.includes(intent)) {
        return safeDefaultClassification();
    }

    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        return safeDefaultClassification();
    }

    return { intent, confidence };
}

export async function classifyIntent(message, { llmClient, confidenceThreshold = DEFAULT_THRESHOLD } = {}) {
    const override = extractOverride(message);
    if (override) {
        return { intent: override.intent, confidence: 1.0 };
    }

    const client = llmClient || new OllamaLLMClient();
    const rawResponse = await client.complete({
        systemPrompt: CLASSIFIER_PROMPT,
        userMessage: message,
        forceJson: true
    });

    const classification = parseClassifierResponse(rawResponse);
    if (classification.intent !== "unclear" && classification.confidence < confidenceThreshold) {
        return safeDefaultClassification();
    }

    return classification;
}

export async function routeRequest(message, options = {}) {
    const {
        intent = null,
            llmClient,
            logPath = DEFAULT_LOG_PATH,
            confidenceThreshold = DEFAULT_THRESHOLD
    } = options;

    const override = extractOverride(message);
    const effectiveMessage = override ? override.cleanedMessage : message;
    const client = llmClient || new OllamaLLMClient();

    let classification;
    if (intent && typeof intent === "object") {
        classification = parseClassifierResponse(JSON.stringify(intent));
    } else {
        classification = await classifyIntent(message, {
            llmClient: client,
            confidenceThreshold
        });
    }

    let routeSource = "classifier";
    if (override) {
        classification = { intent: override.intent, confidence: 1.0 };
        routeSource = "manual_override";
    } else if (classification.intent === "unclear") {
        routeSource = "clarification";
    }

    let finalResponse;
    if (classification.intent === "unclear") {
        finalResponse = CLARIFYING_QUESTION;
    } else {
        finalResponse = await client.complete({
            systemPrompt: SYSTEM_PROMPTS[classification.intent],
            userMessage: effectiveMessage
        });
    }

    const result = {
        intent: classification.intent,
        confidence: classification.confidence,
        finalResponse,
        routeSource
    };

    await appendRouteLog({ logPath, userMessage: message, result });
    return result;
}

export async function routeAndRespond(message, intent = null, options = {}) {
    const result = await routeRequest(message, {...options, intent });
    return result.finalResponse;
}