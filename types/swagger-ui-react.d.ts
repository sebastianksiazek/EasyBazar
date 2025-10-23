// src/types/swagger-ui-react.d.ts
declare module "swagger-ui-react" {
  import * as React from "react";

  // Minimalne typy – wystarczy, żeby TS przestał marudzić
  interface SwaggerUIProps {
    url?: string;
    spec?: unkown;
    docExpansion?: "none" | "list" | "full";
    [key: string]: unkown;
  }

  const SwaggerUI: React.ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
