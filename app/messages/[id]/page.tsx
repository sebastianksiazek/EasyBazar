import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ChatThread from "./thread-client";

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const threadId = Number(id);
  if (!threadId) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // sprawdzamy, czy user należy do wątku (RLS też to pilnuje)
  const { data: thread, error: threadErr } = await supabase
    .from("threads")
    .select("id,buyer,seller,listing_id,created_at")
    .eq("id", threadId)
    .single();

  if (threadErr || !thread) notFound();

  const meId = user.id;
  const otherId = thread.buyer === meId ? thread.seller : thread.buyer;

  // pobierz wiadomości
  const { data: messages } = await supabase
    .from("messages")
    .select("id,thread_id,author,body,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", otherId)
    .single();

  const otherUsername = otherProfile?.full_name ?? "Użytkownik";

  return (
    <div className="container mx-auto px-4 py-6 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto">
        <ChatThread
          threadId={threadId}
          meId={meId}
          otherId={otherId}
          otherUsername={otherUsername}
          initialMessages={messages ?? []}
        />
      </div>
    </div>
  );
}
