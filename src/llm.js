import "dotenv/config";
import OpenAI from "openai";

export class OpenAILLMClient {
    constructor({ model = process.env.OPENAI_MODEL || "gpt-4.1-mini", apiKey = process.env.OPENAI_API_KEY } = {}) {
        this.model = model;
        this.client = new OpenAI({ apiKey });
    }

    async complete({ systemPrompt, userMessage, forceJson = false }) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            response_format: forceJson ? { type: "json_object" } : undefined,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: forceJson ? 0.1 : 0.4
        });

        if (!response || !Array.isArray(response.choices) || response.choices.length === 0) {
            return "";
        }

        const firstChoice = response.choices[0];
        if (!firstChoice || !firstChoice.message || typeof firstChoice.message.content !== "string") {
            return "";
        }

        return firstChoice.message.content;
    }
}