import { NextResponse } from "next/server";

// OpenAPI 3.0.3 – Auth + Health + Listings (price in zł in request, price_cents in response)
const openapi = {
  openapi: "3.0.3",
  info: {
    title: "EasyBazar APIIII",
    version: "1.1.0",
    description:
      "Dokumentacja API dla endpointów w /app/api/* (Auth, Health, Listings).\n" +
      "Uwaga: przy tworzeniu/aktualizacji ogłoszeń klient podaje `price` w złotówkach, a API zwraca `price_cents` (grosze).",
  },
  servers: [{ url: "http://localhost:3000", description: "Dev" }],

  paths: {
    /* ===================== HEALTH ===================== */
    "/api/ping": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "object", properties: { ok: { type: "boolean" } } },
                examples: { ok: { value: { ok: true } } },
              },
            },
          },
        },
      },
    },

    /* ===================== AUTH ===================== */
    "/api/auth/sign-up": {
      post: {
        summary:
          "Rejestracja (email + hasło) i wysyłka kodu weryfikacyjnego; walidacja kolizji email/username",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SignUpRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Utworzono konto i wysłano kod weryfikacyjny",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthOkResponse" } },
            },
          },
          "409": { $ref: "#/components/responses/Error409Conflict" },
          "429": { $ref: "#/components/responses/Error429RateLimit" },
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
            "application/json": { schema: { $ref: "#/components/schemas/SignInRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Zalogowano pomyślnie",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthOkResponse" } },
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
            "application/json": { schema: { $ref: "#/components/schemas/ResendRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Wysłano ponownie kod weryfikacyjny",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GenericOk" } } },
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
                schema: { type: "object", properties: { session: { type: "object" } } },
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
                schema: { type: "object", properties: { user: { type: "object" } } },
              },
            },
          },
          "401": {
            description: "Brak autoryzacji",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { unauthorized: { value: { error: "Unauthorized" } } },
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
            content: { "application/json": { schema: { $ref: "#/components/schemas/GenericOk" } } },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    /* ===================== LISTINGS ===================== */
    "/api/listings": {
      get: {
        summary:
          "Lista ogłoszeń (paginacja, filtry). Publicznie widać tylko ACTIVE; właściciel widzi swoje (RLS).",
        tags: ["Listings"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Szukaj w tytule/opisie (ILIKE)",
          },
          { name: "country", in: "query", schema: { type: "string" } },
          { name: "region", in: "query", schema: { type: "string" } },
          { name: "city", in: "query", schema: { type: "string" } },
          {
            name: "owner",
            in: "query",
            schema: { type: "string", enum: ["me"] },
            description: "Filtruj do własnych ogłoszeń (wymaga zalogowania)",
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ListingListResponse" } },
            },
          },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
      post: {
        summary:
          "Utwórz ogłoszenie. Request przyjmuje `price` (zł), backend zapisuje `price_cents` (grosze). Jeśli brak lat/lon – backend dociąga współrzędne na podstawie country/region/city.",
        tags: ["Listings"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ListingCreateRequest" } },
          },
        },
        responses: {
          "201": {
            description: "Utworzono",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } },
          },
          "401": { $ref: "#/components/responses/Error401" },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },

    "/api/listings/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
      ],
      get: {
        summary:
          "Pobierz ogłoszenie po ID. Publicznie widać tylko ACTIVE; właściciel widzi swoje (RLS).",
        tags: ["Listings"],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } },
          },
          "404": { $ref: "#/components/responses/Error404" },
        },
      },
      put: {
        summary:
          "Aktualizuj ogłoszenie (właściciel). Request przyjmuje `price` w zł; backend zapisze `price_cents`. Zmiana city/region/country bez lat/lon → backend dociągnie współrzędne.",
        tags: ["Listings"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ListingUpdateRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Zaktualizowano",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } },
          },
          "401": { $ref: "#/components/responses/Error401" },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
      delete: {
        summary: "Usuń ogłoszenie (właściciel).",
        tags: ["Listings"],
        responses: {
          "200": {
            description: "Usunięto",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GenericOk" } } },
          },
          "401": { $ref: "#/components/responses/Error401" },
          "400": { $ref: "#/components/responses/Error400" },
        },
      },
    },
  },

  components: {
    /* ===== Schemas ===== */
    schemas: {
      // AUTH
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
      GenericOk: { type: "object", properties: { ok: { type: "boolean", example: true } } },
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string", example: "Error message" } },
      },

      // LISTINGS
      Listing: {
        type: "object",
        properties: {
          id: { type: "integer", example: 42 },
          owner: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          price_cents: { type: "integer", example: 349999, description: "Cena w groszach" },
          category_id: { type: "integer", nullable: true },
          status: { type: "string", enum: ["active", "draft", "archived"], nullable: true },
          created_at: { type: "string", format: "date-time" },
          country: { type: "string", nullable: true },
          region: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
        },
      },

      ListingCreateRequest: {
        type: "object",
        required: ["title", "description", "price", "country", "region", "city"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120 },
          description: { type: "string", minLength: 10, maxLength: 5000 },
          price: {
            type: "number",
            example: 3499.99,
            description: "Cena w złotówkach (UI → backend zamienia na grosze)",
          },
          category_id: { type: "integer", nullable: true },
          status: { type: "string", enum: ["active", "draft", "archived"] },
          country: { type: "string", example: "PL" },
          region: { type: "string", example: "Mazowieckie" },
          city: { type: "string", example: "Warszawa" },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
        },
      },

      ListingUpdateRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120 },
          description: { type: "string", minLength: 10, maxLength: 5000 },
          price: {
            type: "number",
            description: "Cena w złotówkach – backend zapisze do price_cents",
          },
          category_id: { type: "integer", nullable: true },
          status: { type: "string", enum: ["active", "draft", "archived"] },
          country: { type: "string" },
          region: { type: "string" },
          city: { type: "string" },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
        },
        additionalProperties: false,
      },

      ListingListResponse: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 123 },
          items: { type: "array", items: { $ref: "#/components/schemas/Listing" } },
        },
      },
    },

    /* ===== Predefiniowane odpowiedzi ===== */
    responses: {
      Error400: {
        description: "Błędne dane wejściowe lub inny błąd żądania",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: { badRequest: { value: { error: "Invalid request" } } },
          },
        },
      },
      Error401: {
        description: "Brak autoryzacji",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: { unauthorized: { value: { error: "Unauthorized" } } },
          },
        },
      },
      Error404: {
        description: "Nie znaleziono zasobu",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: { notFound: { value: { error: "Not found" } } },
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
            examples: { tooMany: { value: { error: "Email rate limit exceeded" } } },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openapi);
}
