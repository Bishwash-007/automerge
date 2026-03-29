# Automerge AI VS Code Extension

Automerge AI is a Visual Studio Code extension that leverages AI to resolve merge conflicts automatically, streamlining your development workflow.

## Features

- AI-powered merge conflict resolution (single or batch)
- Seamless integration with your local or remote Automerge Server
- Quick stats and audit logging for merge operations
- Configurable API endpoint for flexible deployment

## Requirements

- **VS Code** (latest recommended)
- **Automerge Server** running locally or remotely (see below)
- Node.js (for extension development)

## Installation

1. Clone this repository:
	```bash
	git clone https://github.com/Bishwash-007/automerge.git
	cd automerge/vscodeext
	```

2. Install dependencies:
	```bash
	npm install
	```

3. Launch the extension in VS Code:
	- Press `F5` in VS Code to open a new Extension Development Host.

## Configuration

Set the Automerge API endpoint in your VS Code settings:

- Open Command Palette (`Cmd/Ctrl + Shift + P`) → Preferences: Open Settings (UI)
- Search for `automerge apiBaseUrl`
- Set to your server URL, e.g.:
  ```
  http://localhost:8080/predictor/
  ```

## Usage

- Open a file with merge conflicts.
- Use the command palette (`Cmd/Ctrl + Shift + P`) and run:
  - `Automerge: Resolve Conflict` to resolve the current file’s conflicts using AI.
  - `Automerge: Quick Stats` to view recent merge results.
- The extension will contact the Automerge Server and apply AI-generated resolutions.

## Automerge Server

The extension requires the Automerge Server backend. See `curl.md` for full API documentation and cURL examples.

### Quick Start

1. Start the server:
	```bash
	# From the project directory
	python main.py
	# Or with uvicorn
	uvicorn main:app --reload --host 0.0.0.0 --port 8080
	```

2. Health check:
	```bash
	curl http://localhost:8080/predictor/health/
	```

3. Example resolve request:
	```bash
	curl -X POST http://localhost:8080/predictor/resolve/ \
	  -H "Content-Type: application/json" \
	  -d '{"conflict_text": "<<<<<<< HEAD\\nfoo()\\n=======\\nbar()\\n>>>>>>> feature", "language": "python"}'
	```

## API Endpoints

- `GET /predictor/health/` — Health check
- `POST /predictor/resolve/` — Resolve a single conflict
- `POST /predictor/resolve/batch/` — Resolve multiple conflicts

See [curl.md](curl.md) for detailed API usage and examples.

## Development

- Run `npm run watch` to build the extension in watch mode.
- Source code is in the `src/` directory.
- Backend API configuration is in `src/ui/apiService.ts`.

## License

MIT

