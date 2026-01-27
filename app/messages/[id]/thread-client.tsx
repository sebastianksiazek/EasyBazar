"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = {
  id: number;
  thread_id: number;
  author: string;
  body: string;
  created_at: string;
};

export default function ChatThread({
  threadId,
  meId,
  otherId,
  otherUsername,
  initialMessages,
}: {
  threadId: number;
  meId: string;
  otherId: string;
  otherUsername: string;
  initialMessages: Msg[];
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newMessage = payload.new;

          setMessages((prev) =>
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({ thread_id: threadId, author: meId, body })
        .select("id,thread_id,author,body,created_at")
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data as Msg]);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border rounded-xl bg-background overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Czat</div>
        <div className="text-xs text-muted-foreground">
          Wątek #{threadId} • rozmówca: {otherUsername}
        </div>
      </div>

      <div className="h-[60vh] overflow-y-auto px-3 py-4 space-y-2 bg-muted/30">
        {messages.map((m) => {
          const mine = m.author === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-background border",
                ].join(" ")}
              >
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className="mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleString("pl-PL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button onClick={send} disabled={sending || !text.trim()}>
          Wyślij
        </Button>
      </div>
    </div>
  );
}
