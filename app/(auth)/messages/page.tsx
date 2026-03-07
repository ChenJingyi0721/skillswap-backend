"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Send, MessageSquare } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";

export default function MessagesPage() {
  const [selectedContact, setSelectedContact] = useState<Id<"users"> | null>(null);
  const [msgInput, setMsgInput] = useState("");

  const contacts = useQuery(api.contacts.list);
  const messages = useQuery(
    api.messages.listByContact,
    selectedContact ? { contactId: selectedContact } : "skip"
  );
  const sendMessage = useMutation(api.messages.send);
  const markRead = useMutation(api.messages.markRead);

  const handleSelectContact = (contactUserId: Id<"users">) => {
    setSelectedContact(contactUserId);
    markRead({ contactId: contactUserId });
  };

  const handleSend = async () => {
    if (!msgInput.trim() || !selectedContact) return;
    await sendMessage({ contactId: selectedContact, text: msgInput.trim() });
    setMsgInput("");
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Contact list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">消息</h2>
        </div>
        <div className="overflow-y-auto">
          {contacts === undefined ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="mx-auto mb-2 h-8 w-8" />
              <p className="text-sm">还没有联系人</p>
            </div>
          ) : (
            contacts.map((c) => (
              <button
                key={c._id}
                onClick={() => handleSelectContact(c.contactUserId)}
                className={clsx(
                  "flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition hover:bg-gray-50",
                  selectedContact === c.contactUserId && "bg-primary-50"
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    c.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-medium text-gray-900">{c.name}</p>
                    {(c.unread ?? 0) > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">{c.lastMsg || "暂无消息"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {!selectedContact ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-12 w-12" />
              <p>选择一个联系人开始聊天</p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages?.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === "me"
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="输入消息..."
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
                <button
                  onClick={handleSend}
                  disabled={!msgInput.trim()}
                  className="btn-primary rounded-xl px-4"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
