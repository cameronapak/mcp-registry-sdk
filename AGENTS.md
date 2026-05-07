# AGENTS.md

## Project

TypeScript SDK for the official Model Context Protocol Registry API.

## Guidelines

- Keep changes small and direct.
- Prefer TypeScript.
- Use `type` over `interface`.
- Do not add dependencies without asking first.
- Do not commit unless explicitly told.
- Do not modify `node_modules/`, `dist/`, or generated output.
- Never bake secrets into code.
- Add comments only where code is not self-explanatory.

## Testing

- Run Bun tests with:
  ```bash
  bun run test
  ```
- Build with:
  ```bash
  bun run build
  ```

## Notes

- This is a Node-compatible package that uses Bun for development and tests.
- Build outputs to `dist/`.
