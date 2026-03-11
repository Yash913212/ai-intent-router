import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { CLARIFYING_QUESTION, SYSTEM_PROMPTS } from "../src/prompts.js";
import { classifyIntent, routeAndRespond, routeRequest } from "../src/router.js";

class FakeLLMClient {
    async complete({ systemPrompt, userMessage, forceJson = false }) {
        if (forceJson) {
            return this.classify(userMessage);
        }

        return this.respond(systemPrompt, userMessage);
    }

    classify(message) {
        const text = message.toLowerCase();

        let payload;
        if (text.includes("resume") && text.includes("function")) {
            payload = { intent: "unclear", confidence: 0.42 };
        } else if (["resume", "cover letter", "interview", "career"].some((term) => text.includes(term))) {
            payload = { intent: "career", confidence: 0.91 };
        } else if (["average", "pivot table", "sql", "numbers"].some((term) => text.includes(term))) {
            payload = { intent: "data", confidence: 0.89 };
        } else if (["paragraph", "writing", "professional", "verbose"].some((term) => text.includes(term))) {
            payload = { intent: "writing", confidence: 0.90 };
        } else if (["python", "function", "bug", "print(i)", "sort a list"].some((term) => text.includes(term))) {
            payload = { intent: "code", confidence: 0.94 };
        } else if (text.includes("poem") || ["hey", "help me make this better."].includes(text.trim())) {
            payload = { intent: "unclear", confidence: 0.31 };
        } else {
            payload = { intent: "unclear", confidence: 0.40 };
        }

        return JSON.stringify(payload);
    }

    respond(systemPrompt, message) {
        if (systemPrompt === SYSTEM_PROMPTS.code) {
            return `CODE: ${message}`;
        }
        if (systemPrompt === SYSTEM_PROMPTS.data) {
            return `DATA: ${message}`;
        }
        if (systemPrompt === SYSTEM_PROMPTS.writing) {
            return `WRITING: ${message}`;
        }
        if (systemPrompt === SYSTEM_PROMPTS.career) {
            return `CAREER: ${message}`;
        }
        return CLARIFYING_QUESTION;
    }
}

class MalformedClassifierClient extends FakeLLMClient {
    async complete({ systemPrompt, userMessage, forceJson = false }) {
        if (forceJson) {
            return "not valid json";
        }

        return super.complete({ systemPrompt, userMessage, forceJson });
    }
}

const SAMPLE_MESSAGES = [
    ["how do i sort a list of objects in python?", "code"],
    ["explain this sql query for me", "data"],
    ["This paragraph sounds awkward, can you help me fix it?", "writing"],
    ["I'm preparing for a job interview, any tips?", "career"],
    ["what's the average of these numbers: 12, 45, 23, 67, 34", "data"],
    ["Help me make this better.", "unclear"],
    ["I need to write a function that takes a user id and returns their profile, but also i need help with my resume.", "unclear"],
    ["hey", "unclear"],
    ["Can you write me a poem about clouds?", "unclear"],
    ["Rewrite this sentence to be more professional.", "writing"],
    ["I'm not sure what to do with my career.", "career"],
    ["what is a pivot table", "data"],
    ["fxi thsi bug pls: for i in range(10) print(i)", "code"],
    ["How do I structure a cover letter?", "career"],
    ["My boss says my writing is too verbose.", "writing"]
];

async function makeLogPath() {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-intent-router-"));
    return path.join(directory, "route_log.jsonl");
}

test("classifyIntent handles the required sample messages", async() => {
    for (const [message, expectedIntent] of SAMPLE_MESSAGES) {
        const classification = await classifyIntent(message, {
            llmClient: new FakeLLMClient(),
            confidenceThreshold: 0.7
        });

        assert.equal(classification.intent, expectedIntent);
        assert.ok(classification.confidence >= 0 && classification.confidence <= 1);
    }
});

test("routeAndRespond uses the selected persona", async() => {
    const logPath = await makeLogPath();
    const response = await routeAndRespond(
        "how do i sort a list of objects in python?", { intent: "code", confidence: 0.95 }, { llmClient: new FakeLLMClient(), logPath }
    );

    assert.match(response, /^CODE:/);
});

test("unclear requests trigger a clarifying question", async() => {
    const result = await routeRequest("hey", {
        llmClient: new FakeLLMClient(),
        logPath: await makeLogPath(),
        confidenceThreshold: 0.7
    });

    assert.equal(result.intent, "unclear");
    assert.equal(result.finalResponse, CLARIFYING_QUESTION);
    assert.match(result.finalResponse, /\?/);
});

test("malformed classifier output defaults to unclear", async() => {
    const result = await routeRequest("how do i sort a list of objects in python?", {
        llmClient: new MalformedClassifierClient(),
        logPath: await makeLogPath(),
        confidenceThreshold: 0.7
    });

    assert.equal(result.intent, "unclear");
    assert.equal(result.confidence, 0);
    assert.equal(result.finalResponse, CLARIFYING_QUESTION);
});

test("manual override bypasses classification", async() => {
    const result = await routeRequest("@code fix my loop", {
        llmClient: new MalformedClassifierClient(),
        logPath: await makeLogPath()
    });

    assert.equal(result.intent, "code");
    assert.equal(result.confidence, 1);
    assert.equal(result.finalResponse, "CODE: fix my loop");
    assert.equal(result.routeSource, "manual_override");
});

test("route_log.jsonl contains the required fields", async() => {
    const logPath = await makeLogPath();
    const result = await routeRequest("what is a pivot table", {
        llmClient: new FakeLLMClient(),
        logPath
    });

    assert.equal(result.intent, "data");

    const content = await readFile(logPath, "utf8");
    const entries = content.trim().split(/\r?\n/);
    assert.equal(entries.length, 1);

    const payload = JSON.parse(entries[0]);
    assert.deepEqual(
        ["intent", "confidence", "user_message", "final_response"].every((key) => key in payload),
        true
    );
    assert.equal(payload.intent, "data");
    assert.match(payload.final_response, /^DATA:/);
});