# AI Intent Router

Simple Node.js app that:
- Classifies user intent (code, data, writing, career, unclear)
- Routes to the right AI persona
- Logs each request to route_log.jsonl

## Quick Start

1. Install dependencies

   npm install

2. Create .env file from .env.example and add your Groq API key

   GROQ_API_KEY=your_api_key_here

3. Start API server

   npm start

Server runs at http://127.0.0.1:8000

## API

- Health check

  GET /health

- Route request

  POST /route

  Body:
  {
    "message": "how do i sort a list in python?"
  }

## CLI

Run one message from terminal:

npm run cli -- "how do i sort a list in python?"

JSON output:

npm run cli -- --json "what is a pivot table"

## Test

npm test

## Notes

- Low-confidence or unclear input returns a clarifying question
- You can manually route with prefixes like @code, @data, @writing, @career
