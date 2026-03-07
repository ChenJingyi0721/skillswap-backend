"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Send, Sparkles, Bot, User } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AiMatchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  const matchChat = useAction(api.ai.matchChat);
  const saveConversation = useMutation(api.ai.saveConversation);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const result = await matchChat({ messages: updated });
      const assistantMsg: Message = {
        role: "assistant",
        content: result.reply,
      };
      const allMessages = [...updated, assistantMsg];
      setMessages(allMessages);

      if (result.matchSuggestion) {
        setSuggestion(result.matchSuggestion);
      }

      await saveConversation({
        type: "match",
        messages: allMessages.map((m) => ({ ...m, role: m.role as any })),
      });
    } catch {
      setMessages([
        ...updated,
        { role: "assistant", content: "抱歉，AI 暂时无法响应，请稍后再试。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">AI 配对助手</h1>
        <p className="mt-1 text-gray-500">
          告诉我你想学什么或想教什么，我帮你找到最佳交换伙伴
        </p>
      </div>

      {/* Chat area */}
      <div className="card mb-4 h-[50vh] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <Bot className="mb-3 h-10 w-10" />
            <p>发送消息开始对话</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["我想学吉他", "我擅长 React", "帮我找 Python 伙伴"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user"
                      ? "bg-primary-100 text-primary-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match suggestion */}
      {suggestion && (
        <div className="card mb-4 border-primary-200 bg-primary-50">
          <div className="flex items-center gap-2 text-primary-700">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold">AI 推荐匹配</span>
          </div>
          <p className="mt-2 text-sm text-primary-600">
            技能：{suggestion.skillTag} · 级别：{suggestion.level}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="描述你想学习或教授的技能..."
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="btn-primary rounded-xl px-4"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
