AI Intent Router

Simple Node.js app that:
- Classifies user intent (code, data, writing, career, unclear)
- Routes to the right AI persona
- Logs each request to route_log.jsonl
- Uses **Ollama** for local LLM inference (no API keys required)

## Quick Start

Prerequisites
- Node.js >= 20
- Docker & Docker Compose
- Ollama installed and running locally

1. Install dependencies

```bash
npm install
```

2. Set up .env file

Create `.env` from `.env.example` and configure:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
AI_INTENT_ROUTER_CONFIDENCE_THRESHOLD=0.70
AI_INTENT_ROUTER_LOG_PATH=route_log.jsonl
```

3. Ensure Ollama is running

```bash
ollama serve
```

In another terminal, pull a model:
```bash
ollama pull mistral
```

4. Start API server

```bash
npm start
```

Server runs at **http://127.0.0.1:8000**

Or with Docker:
```bash
docker-compose up --build
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| AI Intent Router API | 8000 | http://127.0.0.1:8000 |
| Ollama | 11434 | http://localhost:11434 |

## API Endpoints

Health Check
```bash
GET /health
```

Route Request
```bash
POST /route

Body:
{
  "message": "how do i sort a list in python?"
}

Response:
{
  "intent": "code",
  "confidence": 0.95,
  "user_message": "how do i sort a list in python?",
  "final_response": "..."
}
```

## CLI

Run one message from terminal:

```bash
npm run cli -- "how do i sort a list in python?"
```

JSON output:

```bash
npm run cli -- --json "what is a pivot table"
```

## Testing

```bash
npm test
```

Available Ollama Models

- `mistral` (default) - Fast, 7.2B parameters
- `llama2` - Well-rounded performance
- `neural-chat` - Optimized for conversations

Install with:
```bash
ollama pull <model-name>
```

## Features

- **No API keys required** - Uses local Ollama for inference
- **Fast responses** - Runs on your machine
- **Intent classification** - Categorizes user requests
- **Manual routing** - Use prefixes like @code, @data, @writing, @career
- **Intent confidence** - Returns confidence scores for classifications
- **Logging** - Tracks all requests in route_log.jsonl

## Notes

- Low-confidence or unclear input returns a clarifying question
- You can manually route with prefixes like @code, @data, @writing, @career
- Container connects to host Ollama via `host.docker.internal:11434`
- Route logs are saved to `route_log.jsonl`