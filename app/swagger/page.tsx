"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Poprawne dynamic import z nazwanym eksportem default
const SwaggerUI = dynamic(() => import("swagger-ui-react").then((mod) => mod.default), {
  ssr: false,
});

export default function SwaggerPage() {
  return (
    <div className="min-h-screen p-6">
      <SwaggerUI url="/api/openapi" docExpansion="list" />
    </div>
  );
}
