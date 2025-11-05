import { NextResponse } from "next/server";

// OpenAPI 3.0.3 – Auth + Health z rozszerzonymi błędami dla sign-up
const openapi = {
  openapi: "3.0.3",
  info: {
    title: "EasyBazar API",
    version: "1.0.1",
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
                examples: { ok: { value: { ok: true } } },
              },
            },
          },
        },
      },
    },

    // ---------- AUTH ----------
    "/api/auth/sign-up": {
      post: {
        summary:
          "Rejestracja (email + hasło) i wysyłka kodu weryfikacyjnego; walidacja kolizji email/username",
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
          "409": { $ref: "#/components/responses/Error409Conflict" }, // NEW
          "429": { $ref: "#/components/responses/Error429RateLimit" }, // NEW
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
                examples: {
                  unauthorized: {
                    value: { error: "Unauthorized" },
                  },
                },
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
        properties: { error: { type: "string", example: "Error message" } },
      },
    },
    responses: {
      Error400: {
        description: "Błędne dane wejściowe lub inny błąd żądania",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: {
              badRequest: { value: { error: "Invalid request" } },
            },
          },
        },
      },
      Error409Conflict: {
        description: "Kolizja danych (email lub username już istnieje)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: {
              emailTaken: { value: { error: "Email already registered" } },
              usernameTaken: { value: { error: "Username already taken" } },
            },
          },
        },
      },
      Error429RateLimit: {
        description: "Przekroczony limit wysyłek (rate limit)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: {
              tooMany: { value: { error: "Email rate limit exceeded" } },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openapi);
}
