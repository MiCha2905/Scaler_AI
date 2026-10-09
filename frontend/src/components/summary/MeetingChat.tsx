"use client";

import React, { useState } from "react";
import { Bot, Send, Sparkles, Loader2, Play } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface MeetingChatProps {
  meetingId: number;
  onSeekToSegment?: (sec: number) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  relevant_segments?: number[];
}

function parseTimestampToSeconds(ts: string): number | null {
  const clean = ts.replace(/[\[\]\(\)\*]/g, "").trim();
  if (clean.endsWith("s")) {
    const num = parseFloat(clean.slice(0, -1));
    return isNaN(num) ? null : num;
  }
  const parts = clean.split(":").map((p) => parseFloat(p));
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function ChatMessageContent({
  text,
  onSeek,
}: {
  text: string;
  onSeek?: (sec: number) => void;
}) {
  // Parse inline elements (timestamps & bold)
  const renderInline = (str: string) => {
    // Matches [00:07] or [7s] or (00:07) or [01:23]
    const tokenRegex = /(\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?|\[\d+s\]|\*\*[^*]+\*\*)/g;
    const parts = str.split(tokenRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // Check for timestamp
      const isTimestamp =
        /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(part) || /^\[\d+s\]$/.test(part);

      if (isTimestamp) {
        const sec = parseTimestampToSeconds(part);
        if (sec !== null && onSeek) {
          const displayLabel = part.replace(/[\[\]]/g, "");
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(sec)}
              title={`Jump to ${displayLabel}`}
              className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-brand-100 hover:bg-brand-200 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-mono text-[11px] font-bold border border-brand-300/60 dark:border-brand-700/60 transition-colors align-middle shadow-2xs"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{displayLabel}</span>
            </button>
          );
        }
      }

      // Check for bold
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("• ");
        const cleanLine = isBullet ? line.trim().replace(/^[-*•]\s+/, "") : line;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
              <div className="flex-1">{renderInline(cleanLine)}</div>
            </div>
          );
        }

        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

export function MeetingChat({ meetingId, onSeekToSegment }: MeetingChatProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "bot",
      text: "Hi! I am your AI meeting assistant. Ask me anything about what was discussed, decisions made, or key milestones.",
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const sampleQuestions = [
    "What were the main decisions?",
    "What are the next steps & deadlines?",
    "Who is responsible for what?",
  ];

  const handleSend = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: question.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setLoading(true);

    try {
      const response = await api.chatWithMeeting(meetingId, question.trim());
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "bot",
        text: response.answer,
        relevant_segments: response.relevant_segments,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      showToast(err.message || "Failed to get AI answer", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[480px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            {msg.sender === "bot" ? (
              <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                You
              </div>
            )}

            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-brand-500 text-white rounded-tr-xs"
                  : "bg-muted/50 text-foreground border border-border/70 rounded-tl-xs shadow-2xs"
              }`}
            >
              {msg.sender === "user" ? (
                <p>{msg.text}</p>
              ) : (
                <ChatMessageContent text={msg.text} onSeek={onSeekToSegment} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Analyzing transcript...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Questions */}
      {messages.length <= 2 && (
        <div className="p-2 border-t border-border/40 bg-muted/20 flex flex-wrap gap-1.5">
          {sampleQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-muted hover:bg-brand-50 dark:hover:bg-brand-950/60 hover:text-brand-600 border border-border/60 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputQuestion);
        }}
        className="p-3 border-t border-border flex gap-2 bg-card"
      >
        <input
          type="text"
          placeholder="Ask a question about this meeting..."
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={loading || !inputQuestion.trim()}
          className="p-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
