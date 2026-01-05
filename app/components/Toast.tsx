"use client";

import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message.id, onClose]);

  const bgColor = {
    success: "bg-green-100 border-green-400 text-green-800",
    error: "bg-red-100 border-red-400 text-red-800",
    info: "bg-blue-100 border-blue-400 text-blue-800",
  }[message.type];

  return (
    <div
      className={`${bgColor} border-l-4 p-4 mb-3 rounded shadow-lg animate-slide-in-right flex items-start justify-between`}
      role="alert"
    >
      <p className="flex-1">{message.message}</p>
      <button
        onClick={() => onClose(message.id)}
        className="ml-4 text-current opacity-70 hover:opacity-100"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ messages, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-full">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onClose={onClose} />
      ))}
    </div>
  );
}

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString();
    setMessages((prev) => [...prev, { id, message, type }]);
  };

  const closeToast = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  return { messages, showToast, closeToast };
}
