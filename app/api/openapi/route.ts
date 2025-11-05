import { NextResponse } from "next/server";

// Dokumentacja OpenAPI 3.0 dla EasyBazar Auth API
const openapi = {
  openapi: "3.0.3",
  info: {
    title: "EasyBazar API",
    version: "1.0.0",
    description: "Dokumentacja API dla endpointów w /app/api/* (moduł Auth + Health check)",
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

    // ---------- AUTH ----------
    "/api/auth/sign-up": {
      post: {
        summary: "Rejestracja (email + hasło) i wysyłka kodu weryfikacyjnego",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignUpRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Utworzono konto i wysłano kod weryfikacyjny",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthOkResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    "/api/auth/verify-email": {
      post: {
        summary: "Weryfikacja konta kodem z e-maila",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Zweryfikowano e-mail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthOkResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    "/api/auth/sign-in": {
      post: {
        summary: "Logowanie e-mail + hasło (tylko po potwierdzeniu konta)",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignInRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Zalogowano pomyślnie",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthOkResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    "/api/auth/resend-verification": {
      post: {
        summary: "Ponowne wysłanie maila weryfikacyjnego",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResendRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Wysłano ponownie kod weryfikacyjny",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GenericOk" },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    "/api/auth/session": {
      get: {
        summary: "Pobierz bieżącą sesję (JWT, refresh itp.)",
        tags: ["Auth"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { session: { type: "object" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    "/api/auth/user": {
      get: {
        summary: "Pobierz dane zalogowanego użytkownika",
        tags: ["Auth"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { type: "object" } },
                },
              },
            },
          },
          "401": {
            description: "Brak autoryzacji",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/auth/sign-out": {
      post: {
        summary: "Wylogowanie użytkownika",
        tags: ["Auth"],
        responses: {
          "200": {
            description: "Wylogowano",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GenericOk" },
              },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },
  },

  components: {
    schemas: {
      SignUpRequest: {
        type: "object",
        required: ["email", "password", "profile"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          profile: {
            type: "object",
            required: ["username", "fullName"],
            properties: {
              username: { type: "string", minLength: 3 },
              fullName: { type: "string", minLength: 1 },
            },
          },
          redirectTo: { type: "string", format: "uri" },
        },
      },
      VerifyEmailRequest: {
        type: "object",
        required: ["email", "token"],
        properties: {
          email: { type: "string", format: "email" },
          token: { type: "string", minLength: 6, maxLength: 12 },
        },
      },
      SignInRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      ResendRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      AuthOkResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          user: { type: "object", nullable: true },
          userId: { type: "string", nullable: true },
        },
      },
      GenericOk: {
        type: "object",
        properties: { ok: { type: "boolean", example: true } },
      },
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
    responses: {
      Error400: {
        description: "Błędne dane wejściowe lub błąd serwera",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openapi);
}
