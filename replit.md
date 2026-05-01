# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a PDF Tools web application and a shared API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### PDF Tools (`artifacts/pdf-tools`)
- **URL**: `/` (root)
- **Port**: 21070
- **Type**: React + Vite SPA
- **Description**: Full-featured browser-side PDF toolkit
- **Features**:
  - **Merge**: Combine multiple PDFs with drag-to-reorder
  - **Split**: Extract page ranges or individual pages
  - **Edit**: Add text, highlights, freehand drawings embedded into PDF
  - **Compress**: Reduce size via metadata stripping + object streams
  - **Rotate**: Per-page or bulk rotation
  - **Extract Pages**: Visual page picker, export selected pages
  - **PDF to Images**: Render pages to PNG, download individually or ZIP
- **Key libraries**: `pdf-lib`, `pdfjs-dist`, `react-dropzone`, `jszip`
- **All processing is client-side** — no files ever leave the user's device

### API Server (`artifacts/api-server`)
- **URL**: `/api`
- **Type**: Express 5

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Workflow

- **PDF Tools workflow**: `PORT=21070 BASE_PATH=/ pnpm --filter @workspace/pdf-tools run dev`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
