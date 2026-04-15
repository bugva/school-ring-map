# Agents

## Cursor Cloud specific instructions

This is a static React SPA (school shuttle ring map) built with **Vite 8**, **React 19**, **TypeScript 6**, and **Leaflet**. There is no backend, database, or Docker dependency — all data is bundled as static JSON/CSV in `public/data/`.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite, default port 5173) |
| Lint | `npm run lint` (ESLint 9) |
| Type-check | `npx tsc -b` |
| Build | `npm run build` (runs tsc + vite build, outputs to `dist/`) |

See `README.md` for data-preparation scripts (OSRM routes, Excel time import).

### Notes

- **No test suite exists.** There are no unit/integration tests or test framework configured.
- ESLint currently produces 2 warnings (not errors) in `src/components/StopTimesSheet.tsx` related to `react-hooks/exhaustive-deps`.
- The stop-editor panel is enabled by default in dev mode. To toggle it off, set `VITE_STOP_EDITOR=false` or see `.env.example`.
- Node 22 is required (matches CI in `.github/workflows/deploy-pages.yml`).
