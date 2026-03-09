"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤔","😅","😭","😡","🥱",
  "👍","👎","👏","🙌","🤝","🙏","💪","✌️","🤞","👀",
  "❤️","🔥","💯","✨","🎉","🎊","💀","👻","🤡","💩",
  "🍕","🍔","🍟","🌮","🍜","🍣","🍦","🍩","🧁","🍺",
  "😏","🫡","🫠","😤","🤯","🥳","😇","🤩","😴","🫶",
  "💬","📢","🚀","🌈","⚡","💥","🎯","🏆","💎","🕹️",
];

function Sidebar({ rooms, activeRoom, onJoin, onDelete, onCreateClick, onClose, onToggleTheme, isDarkMode, myHandle, onlineUsers, showClose, unreadRooms }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2 border-b-[4px] border-black pb-2">
        <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter">Spaces</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-full border-2 border-black transition-all hover:scale-110 active:scale-95 ${isDarkMode ? "bg-[#FFD700]" : "bg-[#2D3436]"}`}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          {showClose && (
            <button onClick={onClose} className="p-1.5 border-2 border-black font-black text-xs leading-none">✕</button>
          )}
        </div>
      </div>

      <p className="mb-3 text-[10px] font-bold p-1 border-2 border-black bg-[#05FFA1] text-black uppercase text-center truncate">
        ID: {myHandle}
      </p>

      <button
        onClick={() => { onCreateClick(); onClose(); }}
        className="mb-4 w-full border-[3px] border-black p-2 font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#B967FF] hover:text-white transition-all"
      >
        + Build New Space
      </button>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {rooms.map((room) => (
          <div key={room.name} className="group relative">
            <button
              onClick={() => onJoin(room)}
              className={`w-full border-[3px] border-black p-3 font-bold transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center text-sm ${
                activeRoom.name === room.name
                  ? "bg-[#B967FF] text-white"
                  : (isDarkMode ? "bg-[#222] text-white" : "bg-white text-black")
              }`}
            >
              <span className="truncate mr-2">{room.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {room.password && <span className="text-[10px]">🔒</span>}
                {/* Notification dot */}
                {unreadRooms.has(room.name) && activeRoom.name !== room.name && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF4B4B] border-2 border-black animate-pulse shrink-0" />
                )}
              </div>
            </button>
            {room.name !== "General Vibes #1" && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(room.name); }}
                className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 bg-[#FF4B4B] text-white border-2 border-black rounded-full w-5 h-5 flex items-center justify-center text-[8px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-all z-20"
              >🗑️</button>
            )}
          </div>
        ))}

        <div className="mt-6 pt-4 border-t-4 border-black border-dashed">
          <h3 className={`text-[10px] font-black uppercase mb-3 ${isDarkMode ? "text-[#05FFA1]" : "opacity-60"}`}>
            Live ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((user, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#05FFA1] animate-pulse border border-black shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider truncate">
                  {typeof user === 'object' ? user.handle : user}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatDashboard() {
  const router = useRouter();
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [myHandle, setMyHandle] = useState("");
  const [activeRoom, setActiveRoom] = useState({ name: "General Vibes #1" });
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingStatus, setTypingStatus] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadRooms, setUnreadRooms] = useState(new Set()); // rooms with unread messages

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Mount + auth
  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("vault_user");
    if (!savedName) { router.replace('/'); return; }
    setMyHandle(savedName);
    const savedTheme = localStorage.getItem("vault_theme");
    if (savedTheme === "dark") setIsDarkMode(true);
  }, [router]);

  // Data + socket
  useEffect(() => {
    if (!myHandle) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`${API}/api/messages/${encodeURIComponent(activeRoom.name)}`);
        const data = await res.json();
        setChatHistory(Array.isArray(data) ? data : []);
      } catch (err) { console.error("History fetch failed"); }
    };

    const loadRooms = async () => {
      try {
        const res = await fetch(`${API}/api/rooms`);
        const data = await res.json();
        const defaults = [{ name: "General Vibes #1", password: "" }];
        const dbRooms = Array.isArray(data) ? data : [];
        setRooms([...defaults, ...dbRooms.filter(r => r.name !== "General Vibes #1")]);
      } catch (err) {
        setRooms([{ name: "General Vibes #1", password: "" }]);
      }
    };

    loadHistory();
    loadRooms();

    // Clear unread for current room when switching into it
    setUnreadRooms(prev => {
      const next = new Set(prev);
      next.delete(activeRoom.name);
      return next;
    });

    if (!socketRef.current) socketRef.current = io(API);
    const socket = socketRef.current;
    socket.emit('join_vault', { handle: myHandle, room: activeRoom.name });

    socket.on("online_users", (users) => setOnlineUsers(users));
    socket.on("receive_message", (data) => {
      if (data.room === activeRoom.name) {
        setChatHistory(prev => [...prev, data]);
      } else {
        // Message in another room — mark as unread
        setUnreadRooms(prev => new Set([...prev, data.room]));
      }
    });
    socket.on("message_deleted", (id) => setChatHistory(prev => prev.filter(m => m._id !== id)));
    socket.on("message_edited", (updated) => setChatHistory(prev => prev.map(m => m._id === updated._id ? updated : m)));
    socket.on("user_typing", (data) => {
      if (data.room === activeRoom.name && data.handle !== myHandle) setTypingStatus(data.isTyping ? data.handle : null);
    });
    socket.on("room_cleared", (roomName) => {
      if (activeRoom.name === roomName) setChatHistory([]);
    });
    socket.on("room_created", (newRoom) => {
      setRooms(prev => (prev.find(r => r.name === newRoom.name) ? prev : [...prev, newRoom]));
    });
    socket.on("room_deleted", (roomName) => {
      setRooms(prev => prev.filter(r => r.name !== roomName));
      setActiveRoom(current => current.name === roomName ? { name: "General Vibes #1", password: "" } : current);
    });

    return () => {
      socket.off("online_users"); socket.off("receive_message"); socket.off("message_deleted");
      socket.off("user_typing"); socket.off("message_edited"); socket.off("room_created");
      socket.off("room_deleted"); socket.off("room_cleared");
    };
  }, [myHandle, activeRoom.name]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const handleExit = () => {
    localStorage.removeItem("vault_user");
    router.push("/");
  };

  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: false });
    }, 2000);
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.name || !newRoomData.password) return alert("Fill all fields!");
    const res = await fetch(`${API}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRoomData) });
    if (res.ok) setShowCreateModal(false);
    else alert("Error creating room.");
  };

  const confirmDeleteRoom = async () => {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(roomToDelete)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword })
    });
    if (res.ok) { setRoomToDelete(null); setDeletePassword(""); }
    else alert("Incorrect Room Key! ❌");
  };

  const attemptJoin = (room) => {
    if (!room.password || room.name === "General Vibes #1") {
      setActiveRoom(room);
      setSidebarOpen(false);
      // Clear unread when joining
      setUnreadRooms(prev => {
        const next = new Set(prev);
        next.delete(room.name);
        return next;
      });
    } else {
      setRoomToJoin(room);
    }
  };

  const verifyPassword = () => {
    if (joinPassword === roomToJoin.password) {
      setActiveRoom(roomToJoin);
      setUnreadRooms(prev => {
        const next = new Set(prev);
        next.delete(roomToJoin.name);
        return next;
      });
      setRoomToJoin(null);
      setJoinPassword("");
      setSidebarOpen(false);
    } else alert("Wrong Password! ❌");
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("vault_theme", newTheme ? "dark" : "light");
  };

  const handleReaction = (messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit("react_message", { messageId, emoji, handle: myHandle, room: activeRoom.name });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      socketRef.current.emit("send_message", {
        room: activeRoom.name, author: myHandle, image: reader.result,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = () => {
    if (message.trim() !== "" && socketRef.current) {
      socketRef.current.emit("send_message", {
        room: activeRoom.name, author: myHandle, text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setMessage("");
    }
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    fetch(`${API}/api/messages/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText })
    });
    setEditingId(null);
  };

  const insertEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (!mounted) return <div className="h-screen bg-[#FFFBEB]" />;
  if (!myHandle) return <div className="h-screen bg-[#FFFBEB]" />;

  const sidebarProps = {
    rooms, activeRoom, onJoin: attemptJoin,
    onDelete: (name) => setRoomToDelete(name),
    onCreateClick: () => setShowCreateModal(true),
    onClose: () => setSidebarOpen(false),
    onToggleTheme: toggleTheme,
    isDarkMode, myHandle, onlineUsers, unreadRooms,
  };

  return (
    <main className={`h-screen flex font-mono overflow-hidden transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D] text-white" : "bg-[#FFFBEB] text-black"}`}>

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className={`border-[4px] border-black p-6 sm:p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
              {roomToDelete ? (
                <>
                  <h2 className="text-lg sm:text-xl font-black uppercase mb-2 italic text-[#FF4B4B]">Confirm Destruction</h2>
                  <p className="text-[10px] font-bold uppercase mb-4 opacity-60">Enter the Room Key for {roomToDelete} to destroy it.</p>
                  <input placeholder="Room Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmDeleteRoom()} autoFocus />
                  <button onClick={confirmDeleteRoom} className="w-full bg-[#FF4B4B] text-white border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all">Destroy Space 💣</button>
                </>
              ) : showCreateModal ? (
                <>
                  <h2 className="text-lg sm:text-xl font-black uppercase mb-4 italic">New Space</h2>
                  <input placeholder="Name" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={newRoomData.name} onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })} />
                  <input placeholder="Set Password" type="password" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={newRoomData.password} onChange={(e) => setNewRoomData({ ...newRoomData, password: e.target.value })} />
                  <button onClick={handleCreateRoom} className="w-full bg-[#B967FF] text-white border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all">Build Space</button>
                </>
              ) : (
                <>
                  <h2 className="text-lg sm:text-xl font-black uppercase mb-4 italic tracking-tighter">Join {roomToJoin?.name}</h2>
                  <input placeholder="Enter Room Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyPassword()} autoFocus />
                  <button onClick={verifyPassword} className="w-full bg-[#05FFA1] text-black border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all">Enter Vault</button>
                </>
              )}
              <button onClick={() => { setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword(""); }} className="w-full mt-4 text-[10px] font-black uppercase opacity-60">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed top-0 left-0 h-full w-72 z-40 border-r-[4px] border-black p-4 md:hidden ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}
          >
            <Sidebar {...sidebarProps} showClose={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex w-72 lg:w-80 border-r-[4px] border-black p-5 lg:p-6 flex-col z-20 h-full shrink-0 transition-colors duration-500 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
        <Sidebar {...sidebarProps} showClose={false} />
      </div>

      {/* Main chat */}
      <div className={`flex-1 flex flex-col h-full min-w-0 transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D]" : "bg-white"}`}>

        {/* Header */}
        <div className={`border-b-[4px] border-black px-3 py-3 sm:px-5 sm:py-4 flex justify-between items-center shrink-0 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden shrink-0 border-[3px] border-black px-2 py-1.5 font-black text-base leading-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all ${isDarkMode ? "bg-[#222] text-white" : "bg-white"}`}
            >☰</button>
            <h1 className={`text-sm sm:text-xl lg:text-2xl font-black uppercase italic tracking-tighter truncate ${isDarkMode ? "text-[#B967FF]" : "text-black"}`}>
              {activeRoom.name}
            </h1>
          </div>
          <div className="flex gap-2 shrink-0 ml-2">
            <button
              onClick={() => { if (confirm("Clear all messages?")) fetch(`${API}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, { method: 'DELETE' }); }}
              className="text-[8px] font-black bg-[#FF4B4B] text-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >WIPE</button>
            <button onClick={handleExit} className="text-[8px] font-black bg-black text-white border-2 border-black px-2 py-1 hover:bg-[#FF4B4B] transition-all">EXIT</button>
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 px-3 py-4 sm:p-6 lg:p-8 overflow-y-auto transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D]" : "bg-[#f9f9f9]"}`}>
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => (
              <motion.div
                key={msg._id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`group flex flex-col mb-4 sm:mb-6 ${msg.author === myHandle ? "items-end" : "items-start"}`}
              >
                <div className={`relative border-[3px] border-black p-3 sm:p-4 max-w-[85%] sm:max-w-sm lg:max-w-md transition-all duration-300 ${
                  msg.author === myHandle
                    ? "bg-[#B967FF] text-white shadow-[4px_4px_0px_0px_rgba(185,103,255,0.3)]"
                    : (isDarkMode ? "bg-[#1F1F1F] text-white shadow-[4px_4px_0px_0px_rgba(5,255,161,0.2)]" : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")
                }`}>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <div className={`flex gap-1 border-2 border-black rounded-full px-2 py-0.5 mr-1 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
                      {['👍', '❤️', '🔥', '😂'].map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} className="hover:scale-125 transition-transform text-xs active:scale-90">{emoji}</button>
                      ))}
                    </div>
                    {msg.author === myHandle && !editingId && (
                      <>
                        <button onClick={() => { setEditingId(msg._id); setEditText(msg.text); }} className="bg-white border-2 border-black rounded p-0.5 text-[8px] text-black hover:bg-[#05FFA1]">✎</button>
                        <button onClick={() => { if (confirm("Delete?")) fetch(`${API}/api/messages/${msg._id}`, { method: 'DELETE' }); }} className="bg-white border-2 border-black rounded p-0.5 text-[8px] text-black hover:bg-[#FF4B4B]">🗑️</button>
                      </>
                    )}
                  </div>

                  <p className={`text-[9px] sm:text-[10px] font-black uppercase mb-1 ${isDarkMode ? "text-[#05FFA1]" : "opacity-50"}`}>
                    {msg.author} • {msg.time}
                  </p>
                  {msg.image && <img src={msg.image} className="mb-2 border-2 border-black max-h-48 sm:max-h-64 object-cover w-full rounded-sm" />}

                  {editingId === msg._id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        className={`p-2 sm:p-3 border-[3px] border-black font-bold w-full text-sm ${isDarkMode ? "bg-[#333] text-white" : "bg-white text-black"}`}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="text-[8px] font-black uppercase bg-[#05FFA1] border-2 border-black px-2 py-1">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-[8px] font-black uppercase opacity-60">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-sm sm:text-base lg:text-lg break-words whitespace-pre-wrap leading-tight pr-8 sm:pr-10">{msg.text}</p>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <div key={emoji} onClick={() => handleReaction(msg._id, emoji)}
                              className={`flex items-center gap-1 border-2 border-black rounded-md px-1.5 py-0.5 text-[10px] cursor-pointer active:scale-95 ${
                                users.includes(myHandle) ? "bg-[#05FFA1] text-black" : (isDarkMode ? "bg-[#333] text-white" : "bg-gray-100 text-black")
                              }`}>
                              <span>{emoji}</span><span className="font-black">{users.length}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {typingStatus && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-4">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? "bg-[#05FFA1]" : "bg-black"}`} style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <span className={`text-[10px] font-black uppercase italic ${isDarkMode ? "text-[#05FFA1]" : "text-black"}`}>{typingStatus} is typing...</span>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input bar */}
        <div className={`px-3 py-2 sm:p-4 lg:p-6 border-t-[4px] border-black shrink-0 transition-colors duration-500 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
          
          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                ref={emojiPickerRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`mb-2 p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-10 sm:grid-cols-12 gap-1 max-h-36 overflow-y-auto ${isDarkMode ? "bg-[#222]" : "bg-white"}`}
              >
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="text-lg sm:text-xl hover:scale-125 active:scale-95 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 items-center">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            
            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current.click()}
              className={`shrink-0 border-[3px] border-black p-2 sm:p-3 text-base hover:bg-[#01CDFE] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 ${isDarkMode ? "bg-[#222] text-white" : "bg-white"}`}
            >📷</button>

            {/* Emoji picker toggle */}
            <button
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className={`shrink-0 border-[3px] border-black p-2 sm:p-3 text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 ${showEmojiPicker ? "bg-[#FFD700]" : (isDarkMode ? "bg-[#222] text-white hover:bg-[#333]" : "bg-white hover:bg-[#FFD700]")}`}
            >😊</button>

            <input
              type="text"
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className={`flex-1 min-w-0 border-[3px] border-black p-2.5 sm:p-4 text-sm sm:text-base font-bold outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${isDarkMode ? "bg-[#222] text-white placeholder-gray-500" : "bg-white text-black"}`}
            />

            <button
              onClick={sendMessage}
              className="shrink-0 bg-[#05FFA1] text-black border-[3px] border-black px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-0.5 transition-all"
            >Send</button>
          </div>
        </div>
      </div>
    </main>
  );
}
