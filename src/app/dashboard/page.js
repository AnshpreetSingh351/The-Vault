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

const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

const C = {
  purple: "#A855F7",
  purpleDim: "#7C3AED",
  green: "#10F5A0",
  red: "#FF4B6E",
  gold: "#F5C542",
  bg: "#050508",
  panel: "rgba(10,10,18,0.92)",
  border: "rgba(168,85,247,0.15)",
  borderHover: "rgba(168,85,247,0.4)",
  text: "#E0E0F0",
  muted: "rgba(180,180,210,0.4)",
  dimmed: "rgba(120,120,160,0.25)",
};

function MessageTicks({ status }) {
  if (status === 'sending') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.4 }}>
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  if (status === 'delivered') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.55 }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5L9 8L16 1" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  if (status === 'seen') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5L9 8L16 1" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  return null;
}

function getTickStatus(msg, myHandle) {
  if (!msg._id || msg._id.startsWith('temp_')) return 'sending';
  if (!msg.seenBy || msg.seenBy.length <= 1) return 'delivered';
  return (msg.seenBy || []).filter(u => u !== myHandle).length > 0 ? 'seen' : 'delivered';
}

function Avatar({ name, size = 30 }) {
  const palette = ["#A855F7", "#10F5A0", "#F5C542", "#FF4B6E", "#60A5FA", "#F472B6"];
  const color = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`,
      border: `1px solid ${color}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO, fontWeight: 900, fontSize: size * 0.38,
      color, letterSpacing: '-0.05em',
      boxShadow: `0 0 10px ${color}22`,
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

// Terminal-style modal input
function ModalInput({ label, placeholder, type = "text", value, onChange, onKeyDown, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: focused ? 'rgba(168,85,247,0.8)' : C.muted, textTransform: 'uppercase', marginBottom: 6, transition: 'color 0.2s' }}>
        // {label}
      </p>
      <div style={{ position: 'relative' }}>
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange}
          onKeyDown={onKeyDown} autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 14px', boxSizing: 'border-box',
            background: focused ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${focused ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 4, color: C.text, fontSize: 14, fontWeight: 600,
            outline: 'none', fontFamily: MONO, transition: 'all 0.2s',
          }}
        />
        <motion.div animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.2 }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, transformOrigin: 'left', background: `linear-gradient(90deg, ${C.purple}, ${C.green}66)` }} />
      </div>
    </div>
  );
}

function Sidebar({ rooms, activeRoom, onJoin, onDelete, onCreateClick, onClose, onToggleTheme, isDarkMode, myHandle, onlineUsers, showClose, unreadRooms }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel, fontFamily: MONO }}>

      {/* Header */}
      <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(168,85,247,0.6)', textTransform: 'uppercase', marginBottom: 4 }}>// VAULT OS v2.0</p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>SPACES</h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onToggleTheme} style={{
              width: 28, height: 28, borderRadius: 4, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            }}>{isDarkMode ? "☀️" : "🌙"}</button>
            {showClose && (
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: 4, cursor: 'pointer',
                background: 'rgba(255,75,110,0.1)', border: '1px solid rgba(255,75,110,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.red, fontSize: 11, fontWeight: 700, fontFamily: MONO,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* User identity */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          background: 'rgba(168,85,247,0.05)', border: `1px solid ${C.border}`,
          borderRadius: 4, position: 'relative', overflow: 'hidden',
        }}>
          {/* Active indicator line */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, ${C.purple}, ${C.green})` }} />
          <Avatar name={myHandle} size={26} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 8, letterSpacing: '0.15em', color: C.muted, textTransform: 'uppercase', marginBottom: 2 }}>AUTHENTICATED AS</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{myHandle}</p>
          </div>
          <div style={{ marginLeft: 'auto', flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
        </div>
      </div>

      {/* Room list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <button onClick={() => { onCreateClick(); onClose(); }} style={{
          width: '100%', padding: '9px 12px', marginBottom: 14,
          background: 'transparent', border: `1px dashed rgba(168,85,247,0.3)`,
          borderRadius: 4, color: 'rgba(168,85,247,0.7)',
          fontFamily: MONO, fontWeight: 700, fontSize: 11,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'; e.currentTarget.style.color = C.purple; e.currentTarget.style.background = 'rgba(168,85,247,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; e.currentTarget.style.color = 'rgba(168,85,247,0.7)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> NEW_SPACE
        </button>

        <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>// CHANNELS</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rooms.map((room) => {
            const isActive = activeRoom.name === room.name;
            return (
              <div key={room.name} className="sidebar-room-group" style={{ position: 'relative' }}>
                <button onClick={() => onJoin(room)} style={{
                  width: '100%', padding: '9px 10px 9px 12px',
                  background: isActive ? 'rgba(168,85,247,0.1)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(168,85,247,0.3)' : 'transparent'}`,
                  borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  textAlign: 'left', position: 'relative', overflow: 'hidden',
                }}>
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.purple }} />}
                  <span style={{
                    fontFamily: MONO, fontSize: 12, fontWeight: isActive ? 700 : 500,
                    color: isActive ? C.purple : C.text, letterSpacing: '0.01em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6,
                  }}>
                    {isActive ? '> ' : '  '}{room.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {room.password && <span style={{ fontSize: 9, opacity: 0.4 }}>🔒</span>}
                    {unreadRooms.has(room.name) && !isActive && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'block', boxShadow: `0 0 8px ${C.red}` }} />
                    )}
                  </div>
                </button>
                {room.name !== "General Vibes #1" && (
                  <button className="room-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(room.name); }}
                    style={{
                      position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                      opacity: 0, width: 18, height: 18, borderRadius: '50%',
                      background: C.red, border: 'none', color: 'white',
                      fontSize: 8, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 0.15s', zIndex: 20,
                    }}>✕</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Online */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
            // ONLINE [{onlineUsers.length}]
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onlineUsers.map((user, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{typeof user === 'object' ? user.handle : user}
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
  const videoInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const myHandleRef = useRef("");
  const inputRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [myHandle, setMyHandle] = useState("");
  const [activeRoom, setActiveRoom] = useState({ name: "General Vibes #1" });
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingStatus, setTypingStatus] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadRooms, setUnreadRooms] = useState(new Set());
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("vault_user");
    if (!savedName) { router.replace('/'); return; }
    myHandleRef.current = savedName;
    setMyHandle(savedName);
    const savedTheme = localStorage.getItem("vault_theme");
    setIsDarkMode(savedTheme !== "light");
  }, [router]);

  useEffect(() => {
    if (!myHandle) return;
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(API, { forceNew: false });
    }
    const socket = socketRef.current;
    socket.on("online_users", (users) => setOnlineUsers(users));
    socket.on("message_delivered", ({ tempId, message: savedMsg }) => {
      setChatHistory(prev => prev.map(m => m._id === tempId ? savedMsg : m));
    });
    socket.on("message_seen_update", ({ _id, seenBy }) => {
      setChatHistory(prev => prev.map(m => m._id === _id ? { ...m, seenBy } : m));
    });
    socket.on("message_deleted", (id) => setChatHistory(prev => prev.filter(m => m._id !== id)));
    socket.on("message_edited", (updated) => setChatHistory(prev => prev.map(m => m._id === updated._id ? updated : m)));
    socket.on("room_created", (newRoom) => setRooms(prev => prev.find(r => r.name === newRoom.name) ? prev : [...prev, newRoom]));
    socket.on("room_deleted", (roomName) => {
      setRooms(prev => prev.filter(r => r.name !== roomName));
      setActiveRoom(cur => cur.name === roomName ? { name: "General Vibes #1", password: "" } : cur);
    });
    return () => {
      socket.off("online_users"); socket.off("message_delivered"); socket.off("message_seen_update");
      socket.off("message_deleted"); socket.off("message_edited");
      socket.off("room_created"); socket.off("room_deleted");
    };
  }, [myHandle]);

  useEffect(() => {
    if (!myHandle) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API}/api/messages/${encodeURIComponent(activeRoom.name)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setChatHistory(data);
      } catch {}
    };
    const loadRooms = async () => {
      try {
        const res = await fetch(`${API}/api/rooms`);
        const data = await res.json();
        const dbRooms = Array.isArray(data) ? data : [];
        setRooms([{ name: "General Vibes #1", password: "" }, ...dbRooms.filter(r => r.name !== "General Vibes #1")]);
      } catch { setRooms([{ name: "General Vibes #1", password: "" }]); }
    };
    loadHistory(); loadRooms();
    setUnreadRooms(prev => { const n = new Set(prev); n.delete(activeRoom.name); return n; });
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('join_vault', { handle: myHandle, room: activeRoom.name });
    socket.emit('mark_seen', { room: activeRoom.name, handle: myHandle });
    const handleReceive = (data) => {
      if (data.room === activeRoom.name) {
        setChatHistory(prev => prev.some(m => m._id === data._id) ? prev : [...prev, data]);
        socket.emit('mark_seen', { room: activeRoom.name, handle: myHandle });
        if (data.author !== myHandle) playNotification();
      } else {
        setUnreadRooms(prev => new Set([...prev, data.room]));
      }
    };
    const handleTypingEv = (data) => {
      if (data.room === activeRoom.name && data.handle !== myHandle) setTypingStatus(data.isTyping ? data.handle : null);
    };
    const handleCleared = (roomName) => { if (activeRoom.name === roomName) setChatHistory([]); };
    socket.on("receive_message", handleReceive);
    socket.on("user_typing", handleTypingEv);
    socket.on("room_cleared", handleCleared);
    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("user_typing", handleTypingEv);
      socket.off("room_cleared", handleCleared);
    };
  }, [myHandle, activeRoom.name]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const playNotification = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const playTone = (freq, t, dur, gain) => {
        const osc = ctx.createOscillator(), g = ctx.createGain(), comp = ctx.createDynamicsCompressor();
        osc.connect(g); g.connect(comp); comp.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur + 0.01);
      };
      const now = ctx.currentTime;
      playTone(520, now, 0.12, 0.8); playTone(780, now + 0.1, 0.18, 0.7);
    } catch {}
  };

  const handleExit = () => {
    localStorage.removeItem("vault_user");
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    router.push("/");
  };

  const handleTypingEmit = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: false });
    }, 2000);
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.name || !newRoomData.password) return alert("Fill all fields!");
    const res = await fetch(`${API}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRoomData) });
    if (res.ok) { setShowCreateModal(false); setNewRoomData({ name: "", password: "" }); }
    else alert("Error creating room.");
  };

  const confirmDeleteRoom = async () => {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(roomToDelete)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deletePassword })
    });
    if (res.ok) { setRoomToDelete(null); setDeletePassword(""); }
    else alert("Incorrect Room Key!");
  };

  const attemptJoin = (room) => {
    if (!room.password || room.name === "General Vibes #1") {
      setActiveRoom(room); setSidebarOpen(false);
      setUnreadRooms(prev => { const n = new Set(prev); n.delete(room.name); return n; });
    } else { setRoomToJoin(room); }
  };

  const verifyPassword = () => {
    if (joinPassword === roomToJoin.password) {
      setActiveRoom(roomToJoin);
      setUnreadRooms(prev => { const n = new Set(prev); n.delete(roomToJoin.name); return n; });
      setRoomToJoin(null); setJoinPassword(""); setSidebarOpen(false);
    } else alert("Wrong Password!");
  };

  const toggleTheme = () => {
    const n = !isDarkMode; setIsDarkMode(n);
    localStorage.setItem("vault_theme", n ? "dark" : "light");
  };

  const handleReaction = (messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit("react_message", { messageId, emoji, handle: myHandle, room: activeRoom.name });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    setUploadingImage(true);
    try {
      const compressed = await new Promise((resolve, reject) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
        img.onload = () => {
          const canvas = document.createElement('canvas'), maxW = 1200;
          const scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = Math.floor(img.width * scale); canvas.height = Math.floor(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', 0.75);
        };
        img.src = url;
      });
      const formData = new FormData(); formData.append('image', compressed, 'image.jpg');
      const res = await fetch(`${API}/api/upload/image`, { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      const { url } = json;
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, image: url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, image: url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
    } catch (err) { alert("Image upload failed: " + err.message); }
    finally { setUploadingImage(false); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) return alert("Video must be under 50MB!");
    setUploadingVideo(true);
    try {
      const formData = new FormData(); formData.append('video', file);
      const res = await fetch(`${API}/api/upload/video`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, video: url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, video: url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
    } catch { alert("Video upload failed."); }
    finally { setUploadingVideo(false); e.target.value = ""; }
  };

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current) return;
    const tempId = `temp_${Date.now()}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, text: message, time, seenBy: [myHandle] };
    setChatHistory(prev => [...prev, tempMsg]);
    socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, text: message, time, tempId });
    setMessage("");
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    fetch(`${API}/api/messages/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: editText }) });
    setEditingId(null);
  };

  const insertEmoji = (emoji) => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); };

  if (!mounted) return <div style={{ height: '100dvh', background: C.bg }} />;
  if (!myHandle) return <div style={{ height: '100dvh', background: C.bg }} />;

  const sidebarProps = {
    rooms, activeRoom, onJoin: attemptJoin,
    onDelete: (name) => setRoomToDelete(name),
    onCreateClick: () => setShowCreateModal(true),
    onClose: () => setSidebarOpen(false),
    onToggleTheme: toggleTheme,
    isDarkMode, myHandle, onlineUsers, unreadRooms,
  };

  const modalBtn = (label, onClick, color, textColor = 'white') => (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px', borderRadius: 4, marginTop: 4,
      background: color, border: 'none', color: textColor,
      fontFamily: MONO, fontWeight: 700, fontSize: 12,
      letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <main style={{
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      display: 'flex', background: C.bg,
      fontFamily: MONO, overflow: 'hidden',
    }}>

      {/* Subtle animated grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
              style={{
                background: 'rgba(8,8,14,0.97)', border: `1px solid ${C.border}`,
                borderRadius: 4, padding: '26px 22px', maxWidth: 360, width: '100%',
                boxShadow: `0 0 60px rgba(168,85,247,0.12), 0 24px 80px rgba(0,0,0,0.8)`,
                position: 'relative',
              }}>
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${C.purple}, transparent)` }} />

              {roomToDelete ? (<>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.red, textTransform: 'uppercase', marginBottom: 8 }}>// DANGER ZONE</p>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 4 }}>DELETE SPACE</h2>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Confirm key for <span style={{ color: C.text }}>{roomToDelete}</span></p>
                <ModalInput label="ROOM KEY" placeholder="enter key..." type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDeleteRoom()} autoFocus />
                {modalBtn("DESTROY SPACE", confirmDeleteRoom, `linear-gradient(135deg, ${C.red}, #FF6B8A)`)}
              </>) : showCreateModal ? (<>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.purple, textTransform: 'uppercase', marginBottom: 8 }}>// INITIALIZE</p>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 16 }}>NEW SPACE</h2>
                <ModalInput label="SPACE NAME" placeholder="channel-name..." value={newRoomData.name} onChange={e => setNewRoomData({ ...newRoomData, name: e.target.value })} />
                <ModalInput label="ACCESS KEY" placeholder="set password..." type="password" value={newRoomData.password} onChange={e => setNewRoomData({ ...newRoomData, password: e.target.value })} />
                {modalBtn("CREATE_SPACE()", handleCreateRoom, `linear-gradient(135deg, ${C.purple}, ${C.purpleDim})`)}
              </>) : (<>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.green, textTransform: 'uppercase', marginBottom: 8 }}>// ACCESS REQUEST</p>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 16 }}>{roomToJoin?.name}</h2>
                <ModalInput label="ACCESS KEY" placeholder="enter key..." type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPassword()} autoFocus />
                {modalBtn("GRANT_ACCESS()", verifyPassword, `linear-gradient(135deg, ${C.green}, #00D68F)`, '#050508')}
              </>)}
              <button onClick={() => { setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword(""); }}
                style={{ width: '100%', marginTop: 12, padding: '8px', background: 'transparent', border: 'none', color: C.muted, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                [ESC] CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            className="md:hidden" />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', top: 0, left: 0, width: 270, zIndex: 40, height: '100dvh', borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}
            className="md:hidden">
            <Sidebar {...sidebarProps} showClose={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div style={{ width: 260, borderRight: `1px solid ${C.border}`, flexShrink: 0, height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }}
        className="hidden md:block">
        <Sidebar {...sidebarProps} showClose={false} />
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
          background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {/* Mobile menu */}
            <button onClick={() => setSidebarOpen(true)} className="md:hidden" style={{
              width: 34, height: 34, borderRadius: 4, flexShrink: 0,
              background: 'rgba(168,85,247,0.08)', border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, cursor: 'pointer', color: C.text,
            }}>☰</button>

            {/* Radar dot */}
            <div style={{ flexShrink: 0, position: 'relative', width: 8, height: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
              <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `1px solid ${C.green}`, animation: 'radar 2s infinite', opacity: 0 }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 8, letterSpacing: '0.18em', color: C.muted, textTransform: 'uppercase', lineHeight: 1, marginBottom: 2 }}>// ACTIVE CHANNEL</p>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                &gt;_ {activeRoom.name}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10 }}>
            <button onClick={() => setSoundEnabled(p => !p)} style={{
              height: 30, padding: '0 8px', borderRadius: 4,
              background: soundEnabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,75,110,0.1)',
              border: `1px solid ${soundEnabled ? C.border : 'rgba(255,75,110,0.3)'}`,
              fontSize: 13, cursor: 'pointer',
            }}>{soundEnabled ? "🔔" : "🔕"}</button>

            <button onClick={() => { if (confirm("Wipe all messages?")) fetch(`${API}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, { method: 'DELETE' }); }} style={{
              height: 30, padding: '0 8px', borderRadius: 4,
              background: 'rgba(255,75,110,0.08)', border: '1px solid rgba(255,75,110,0.2)',
              color: C.red, fontFamily: MONO, fontWeight: 700, fontSize: 9,
              letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
            }}>WIPE</button>

            <button onClick={handleExit} style={{
              height: 30, padding: '0 10px', borderRadius: 4,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
              color: C.muted, fontFamily: MONO, fontWeight: 700, fontSize: 9,
              letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
            }}>EXIT</button>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px', background: 'transparent' }} className="sm:px-6">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => {
              const isMe = msg.author === myHandle;
              return (
                <motion.div key={msg._id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  style={{ display: 'flex', marginBottom: 14, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>

                  {/* Other user avatar */}
                  {!isMe && (
                    <div style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }}>
                      <Avatar name={msg.author} size={28} />
                    </div>
                  )}

                  <div className="msg-group" style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {/* Author label */}
                    {!isMe && (
                      <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase', marginBottom: 4, paddingLeft: 2 }}>
                        @{msg.author} · {msg.time}
                      </p>
                    )}

                    <div style={{ position: 'relative' }}>
                      {/* Bubble */}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMe
                          ? `linear-gradient(135deg, rgba(168,85,247,0.85), rgba(124,58,237,0.75))`
                          : 'rgba(14,14,22,0.9)',
                        border: isMe ? 'none' : `1px solid ${C.border}`,
                        borderLeft: !isMe ? `2px solid ${C.purple}55` : undefined,
                        boxShadow: isMe
                          ? `0 4px 24px rgba(168,85,247,0.25), inset 0 1px 0 rgba(255,255,255,0.1)`
                          : '0 2px 12px rgba(0,0,0,0.4)',
                        position: 'relative',
                      }}>
                        {/* Hover toolbar */}
                        <div className="msg-toolbar" style={{
                          position: 'absolute', top: -34,
                          right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0,
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: 'rgba(8,8,14,0.97)', border: `1px solid ${C.border}`,
                          borderRadius: 20, padding: '4px 8px',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                          opacity: 0, pointerEvents: 'none',
                          transition: 'opacity 0.15s', zIndex: 10, whiteSpace: 'nowrap',
                        }}>
                          {['👍', '❤️', '🔥', '😂'].map(emoji => (
                            <button key={emoji} onClick={() => handleReaction(msg._id, emoji)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '1px 2px', transition: 'transform 0.1s' }}
                              onMouseEnter={e => e.target.style.transform = 'scale(1.35)'}
                              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                            >{emoji}</button>
                          ))}
                          {isMe && !editingId && !msg._id?.startsWith('temp_') && (<>
                            <div style={{ width: 1, height: 12, background: C.border, margin: '0 2px' }} />
                            <button onClick={() => { setEditingId(msg._id); setEditText(msg.text || ''); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.muted, padding: '1px 3px', fontFamily: MONO }}>✎</button>
                            <button onClick={() => { if (confirm("Delete?")) fetch(`${API}/api/messages/${msg._id}`, { method: 'DELETE' }); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.red, padding: '1px 3px' }}>🗑</button>
                          </>)}
                        </div>

                        {msg.image && <img src={msg.image} alt="img" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 6, display: 'block' }} />}
                        {msg.video && <video src={msg.video} controls style={{ width: '100%', maxHeight: 220, borderRadius: 8, marginBottom: 6, display: 'block', background: '#000' }} />}

                        {editingId === msg._id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input style={{
                              padding: '8px 10px', borderRadius: 4,
                              background: 'rgba(5,5,8,0.9)', border: `1px solid ${C.border}`,
                              color: C.text, fontFamily: MONO, fontWeight: 600, fontSize: 13,
                              outline: 'none', width: '100%', boxSizing: 'border-box',
                            }}
                              value={editText} onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={saveEdit} style={{ padding: '4px 12px', borderRadius: 4, background: C.green, border: 'none', color: '#050508', fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em' }}>SAVE</button>
                              <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>ESC</button>
                            </div>
                          </div>
                        ) : (<>
                          {msg.text && (
                            <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: isMe ? 'rgba(255,255,255,0.95)' : C.text, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
                              {msg.text}
                              {isMe && <MessageTicks status={getTickStatus(msg, myHandle)} />}
                            </p>
                          )}
                          {(msg.image || msg.video) && isMe && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                              <MessageTicks status={getTickStatus(msg, myHandle)} />
                            </div>
                          )}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} style={{
                                  display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20,
                                  background: users.includes(myHandle) ? `rgba(16,245,160,0.12)` : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${users.includes(myHandle) ? 'rgba(16,245,160,0.4)' : C.border}`,
                                  cursor: 'pointer', fontSize: 12,
                                }}>
                                  <span>{emoji}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: users.includes(myHandle) ? C.green : C.muted, fontFamily: MONO }}>{users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>)}
                      </div>
                    </div>

                    {/* My message time */}
                    {isMe && (
                      <p style={{ fontFamily: MONO, fontSize: 9, color: C.muted, marginTop: 3, paddingRight: 2 }}>{msg.time}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {typingStatus && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 36 }}>
              <div style={{ display: 'flex', gap: 4, padding: '7px 12px', background: 'rgba(14,14,22,0.9)', border: `1px solid ${C.border}`, borderRadius: 12, borderLeft: `2px solid ${C.purple}55` }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.purple, animation: 'typingBounce 1s infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: '0.1em' }}>@{typingStatus} is typing_</span>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input bar */}
        <div style={{
          borderTop: `1px solid ${inputFocused ? 'rgba(168,85,247,0.3)' : C.border}`,
          background: 'rgba(5,5,8,0.95)', backdropFilter: 'blur(20px)',
          flexShrink: 0, transition: 'border-color 0.2s',
        }}>
          {/* Emoji picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div ref={emojiPickerRef}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                style={{
                  margin: '8px 10px 0',
                  padding: 10, background: 'rgba(8,8,14,0.98)',
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  boxShadow: `0 -8px 32px rgba(0,0,0,0.5)`,
                  display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 2, maxHeight: 130, overflowY: 'auto',
                }}>
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => insertEmoji(emoji)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 3, borderRadius: 4, transition: 'transform 0.1s',
                  }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload status */}
          {(uploadingVideo || uploadingImage) && (
            <div style={{ margin: '6px 10px 0', padding: '5px 12px', background: `rgba(168,85,247,0.08)`, border: `1px solid rgba(168,85,247,0.2)`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.purple, animation: 'pulse 0.8s infinite' }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.purple, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {uploadingImage ? "UPLOADING IMAGE..." : "UPLOADING VIDEO..."}
              </span>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 6 }}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />

            {/* Tool buttons */}
            {[
              { icon: '📷', action: () => fileInputRef.current.click(), disabled: uploadingImage, title: 'Image' },
              { icon: '🎥', action: () => videoInputRef.current.click(), disabled: uploadingVideo, title: 'Video' },
              { icon: '😊', action: () => setShowEmojiPicker(p => !p), active: showEmojiPicker, title: 'Emoji' },
            ].map(({ icon, action, disabled, active, title }) => (
              <button key={title} onClick={action} disabled={disabled} title={title} style={{
                width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                background: active ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(168,85,247,0.4)' : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, cursor: 'pointer', opacity: disabled ? 0.35 : 1, transition: 'all 0.15s',
              }}>{icon}</button>
            ))}

            {/* Message input */}
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: MONO, fontSize: 13, color: C.purple, pointerEvents: 'none', opacity: inputFocused || message ? 1 : 0.4, transition: 'opacity 0.2s' }}>›</span>
              <input
                ref={inputRef}
                type="text" value={message}
                onChange={e => { setMessage(e.target.value); handleTypingEmit(); }}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="type message..."
                style={{
                  width: '100%', padding: '10px 12px 10px 26px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${inputFocused ? 'rgba(168,85,247,0.4)' : C.border}`,
                  borderRadius: 4, color: C.text,
                  fontFamily: MONO, fontSize: 13, fontWeight: 500,
                  outline: 'none', transition: 'border-color 0.2s',
                }}
              />
            </div>

            {/* Send button */}
            <motion.button
              onClick={sendMessage}
              animate={{ boxShadow: message.trim() ? `0 0 16px rgba(168,85,247,0.4)` : '0 0 0px transparent' }}
              style={{
                width: 36, height: 36, borderRadius: 4, flexShrink: 0, border: 'none',
                background: message.trim()
                  ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDim})`
                  : 'rgba(255,255,255,0.04)',
                cursor: 'pointer', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={message.trim() ? "white" : C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={message.trim() ? "white" : C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        @keyframes radar {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 3px; }
        input::placeholder { color: rgba(180,180,210,0.25); font-family: ${MONO}; }
        .msg-group:hover .msg-toolbar { opacity: 1 !important; pointer-events: all !important; }
        .sidebar-room-group:hover .room-delete-btn { opacity: 1 !important; }
      `}</style>
    </main>
  );
}
