"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

/* ------------------------------------ */
/* BACKEND URL (WORKS LOCAL + PRODUCTION) */
/* ------------------------------------ */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function ChatDashboard() {
  const router = useRouter();

  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const [myHandle, setMyHandle] = useState("");
  const [activeRoom, setActiveRoom] = useState({ name: "General Vibes #1" });
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingStatus, setTypingStatus] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [rooms, setRooms] = useState([]);

  /* ------------------------------------ */
  /* INITIAL LOAD                         */
  /* ------------------------------------ */

  useEffect(() => {
    const savedName = localStorage.getItem("vault_user");

    if (!savedName) {
      router.replace("/");
      return;
    }

    setMyHandle(savedName);

    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL);
    }

    const socket = socketRef.current;

    socket.emit("join_vault", {
      handle: savedName,
      room: activeRoom.name,
    });

    socket.on("online_users", (users) => setOnlineUsers(users));

    socket.on("receive_message", (data) => {
      if (data.room === activeRoom.name) {
        setChatHistory((prev) => [...prev, data]);

        if (data.author !== savedName) {
          socket.emit("mark_read", {
            messageId: data._id,
            handle: savedName,
          });
        }
      }
    });

    socket.on("message_deleted", (id) =>
      setChatHistory((prev) => prev.filter((m) => m._id !== id))
    );

    socket.on("message_edited", (updated) =>
      setChatHistory((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      )
    );

    socket.on("user_typing", (data) => {
      if (data.room === activeRoom.name && data.handle !== savedName) {
        setTypingStatus(data.isTyping ? data.handle : null);
      }
    });

    loadHistory();
    loadRooms();

    return () => {
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("message_deleted");
      socket.off("message_edited");
      socket.off("user_typing");
    };
  }, [router, activeRoom.name]);

  /* ------------------------------------ */
  /* LOAD CHAT HISTORY                    */
  /* ------------------------------------ */

  const loadHistory = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/messages/${encodeURIComponent(activeRoom.name)}`
      );

      const data = await res.json();

      setChatHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History fetch failed");
    }
  };

  /* ------------------------------------ */
  /* LOAD ROOMS                           */
  /* ------------------------------------ */

  const loadRooms = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`);
      const data = await res.json();

      const defaults = [{ name: "General Vibes #1", password: "" }];

      setRooms([...defaults, ...(Array.isArray(data) ? data : [])]);
    } catch {
      setRooms([{ name: "General Vibes #1" }]);
    }
  };

  /* ------------------------------------ */
  /* SEND MESSAGE                         */
  /* ------------------------------------ */

  const sendMessage = () => {
    if (!message.trim()) return;

    socketRef.current.emit("send_message", {
      room: activeRoom.name,
      author: myHandle,
      text: message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    setMessage("");
  };

  /* ------------------------------------ */
  /* TYPING EVENT                         */
  /* ------------------------------------ */

  const handleTyping = () => {
    const socket = socketRef.current;

    socket.emit("typing", {
      room: activeRoom.name,
      handle: myHandle,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        room: activeRoom.name,
        handle: myHandle,
        isTyping: false,
      });
    }, 2000);
  };

  /* ------------------------------------ */
  /* IMAGE UPLOAD                         */
  /* ------------------------------------ */

  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      socketRef.current.emit("send_message", {
        room: activeRoom.name,
        author: myHandle,
        image: reader.result,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    };

    reader.readAsDataURL(file);
  };

  /* ------------------------------------ */
  /* UI                                   */
  /* ------------------------------------ */

  if (!myHandle) return null;

  return (
    <main className="h-screen flex flex-col bg-black text-white">

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {chatHistory.map((msg) => (
          <div
            key={msg._id}
            className={`p-3 border ${
              msg.author === myHandle ? "bg-purple-600 ml-auto" : "bg-gray-800"
            } max-w-md`}
          >
            <p className="text-xs opacity-70">
              {msg.author} • {msg.time}
            </p>

            {msg.image && (
              <img src={msg.image} className="mt-2 max-h-60 rounded" />
            )}

            <p className="font-bold">{msg.text}</p>
          </div>
        ))}

        {typingStatus && (
          <div className="text-xs opacity-60">
            {typingStatus} is typing...
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <div className="border-t border-gray-700 p-4 flex gap-3">

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current.click()}
          className="px-3 py-2 bg-gray-700"
        >
          📷
        </button>

        <input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-gray-900 p-3"
          placeholder="Type message..."
        />

        <button
          onClick={sendMessage}
          className="bg-green-400 text-black px-6"
        >
          Send
        </button>

      </div>
    </main>
  );
}