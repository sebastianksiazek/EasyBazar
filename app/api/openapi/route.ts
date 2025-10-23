import { NextResponse } from "next/server";

// Minimalny dokument OpenAPI 3.0
const openapi = {
  openapi: "3.0.3",
  info: {
    title: "EasyBazar API",
    version: "1.0.0",
    description: "Dokumentacja API dla endpointów w /app/api/*",
  },
  servers: [{ url: "http://localhost:3000", description: "Dev" }],
  paths: {
    "/api/ping": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                },
                examples: {
                  ok: { value: { ok: true } },
                },
              },
            },
          },
        },
      },
    },
    // dopisuj kolejne ścieżki tu...
  },
};

export async function GET() {
  return NextResponse.json(openapi);
}
