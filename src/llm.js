import "dotenv/config";

export class OllamaLLMClient {
    constructor({ model = process.env.OLLAMA_MODEL || "mistral", baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434" } = {}) {
        this.model = model;
        this.baseUrl = baseUrl;
    }

    async complete({ systemPrompt, userMessage, forceJson = false }) {
        const payload = {
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            stream: false
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.statusText}`);
            }

            const result = await response.json();
            return result.message?.content || "";
        } catch (error) {
            console.error("Ollama request failed:", error.message);
            return "";
        }
    }
}