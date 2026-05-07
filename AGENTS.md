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

- Run Deno tests with:
  ```bash
  deno test --allow-net --allow-import tests/
  ```
- Build with:
  ```bash
  npm run build
  ```

## Notes

- This is a Node package that uses Deno for tests.
- Build outputs to `dist/`.
