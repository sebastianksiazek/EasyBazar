import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // ten sam URL
  process.env.SUPABASE_SERVICE_ROLE_KEY! // UWAGA: service role, tylko na backendzie
);
