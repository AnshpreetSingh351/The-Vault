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
const SANS = "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif";

// Theme tokens
function theme(dark) {
  if (dark) return {
    bg: "#050508",
    panel: "rgba(10,10,18,0.95)",
    panelSolid: "#0A0A12",
    border: "rgba(168,85,247,0.15)",
    borderActive: "rgba(168,85,247,0.45)",
    text: "#E0E0F0",
    textSoft: "rgba(220,220,240,0.7)",
    muted: "rgba(180,180,210,0.38)",
    inputBg: "rgba(255,255,255,0.03)",
    inputBorder: "rgba(168,85,247,0.2)",
    myBubble: "linear-gradient(135deg, rgba(168,85,247,0.9), rgba(109,40,217,0.85))",
    myBubbleShadow: "0 4px 20px rgba(168,85,247,0.3)",
    otherBubble: "rgba(14,14,24,0.92)",
    otherBubbleBorder: "rgba(168,85,247,0.18)",
    otherBubbleAccent: "rgba(168,85,247,0.5)",
    scrollThumb: "rgba(168,85,247,0.2)",
    gridColor: "rgba(168,85,247,0.025)",
    headerBg: "rgba(5,5,8,0.9)",
    purple: "#A855F7",
    purpleDim: "#7C3AED",
    green: "#10F5A0",
    red: "#FF4B6E",
    accentLabel: "rgba(168,85,247,0.7)",
  };
  return {
    bg: "#F0EDFF",
    panel: "rgba(255,255,255,0.75)",
    panelSolid: "#FFFFFF",
    border: "rgba(139,92,246,0.18)",
    borderActive: "rgba(139,92,246,0.5)",
    text: "#1A1035",
    textSoft: "rgba(30,15,60,0.75)",
    muted: "rgba(100,80,160,0.5)",
    inputBg: "rgba(255,255,255,0.8)",
    inputBorder: "rgba(139,92,246,0.25)",
    myBubble: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    myBubbleShadow: "0 4px 20px rgba(139,92,246,0.3)",
    otherBubble: "rgba(255,255,255,0.9)",
    otherBubbleBorder: "rgba(139,92,246,0.2)",
    otherBubbleAccent: "#8B5CF6",
    scrollThumb: "rgba(139,92,246,0.25)",
    gridColor: "rgba(139,92,246,0.04)",
    headerBg: "rgba(240,237,255,0.85)",
    purple: "#7C3AED",
    purpleDim: "#5B21B6",
    green: "#059669",
    red: "#E11D48",
    accentLabel: "rgba(109,40,217,0.7)",
  };
}

function MessageTicks({ status, T }) {
  const grey = T.muted;
  if (status === 'sending') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.45 }}>
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={grey} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  if (status === 'delivered') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.55 }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={grey} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5L9 8L16 1" stroke={grey} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  if (status === 'seen') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5L9 8L16 1" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function Avatar({ name, size = 30, isDark }) {
  const palette = ["#A855F7", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];
  const color = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: isDark
        ? `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`
        : `linear-gradient(135deg, ${color}33, ${color}66)`,
      border: `1.5px solid ${color}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO, fontWeight: 900, fontSize: size * 0.38,
      color, boxShadow: `0 0 10px ${color}22`,
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function ModalInput({ label, placeholder, type = "text", value, onChange, onKeyDown, autoFocus, isDark, T }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontFamily: isDark ? MONO : SANS, fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.12em', color: focused ? T.purple : T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700, transition: 'color 0.2s' }}>
        {isDark ? `// ${label}` : label}
      </p>
      <div style={{ position: 'relative' }}>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
          onKeyDown={onKeyDown} autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 14px', boxSizing: 'border-box',
            background: focused ? (isDark ? 'rgba(168,85,247,0.06)' : 'rgba(139,92,246,0.06)') : T.inputBg,
            border: `1px solid ${focused ? T.borderActive : T.border}`,
            borderRadius: isDark ? 4 : 10,
            color: T.text, fontSize: 14, fontWeight: 600, outline: 'none',
            fontFamily: isDark ? MONO : SANS, transition: 'all 0.2s',
          }}
        />
        <motion.div animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.2 }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, transformOrigin: 'left', borderRadius: 1, background: `linear-gradient(90deg, ${T.purple}, ${T.green}66)` }} />
      </div>
    </div>
  );
}

function DarkBackground() {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', top: -100, left: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,245,160,0.04) 0%, transparent 70%)', bottom: 0, right: 0, pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function LightBackground() {
  return (
    <>
      {/* Aurora blobs */}
      <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: 'fixed', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 65%)', top: -200, left: -200, pointerEvents: 'none', zIndex: 0 }} />
      <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 65%)', bottom: -150, right: -150, pointerEvents: 'none', zIndex: 0 }} />
      <motion.div animate={{ x: [0, 20, 0], y: [0, 20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{ position: 'fixed', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 65%)', top: '40%', left: '40%', pointerEvents: 'none', zIndex: 0 }} />
      {/* Noise texture */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")", opacity: 0.5 }} />
    </>
  );
}

function Sidebar({ rooms, activeRoom, onJoin, onDelete, onCreateClick, onClose, onToggleTheme, isDark, myHandle, onlineUsers, showClose, unreadRooms }) {
  const T = theme(isDark);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.panel, backdropFilter: 'blur(20px)', fontFamily: isDark ? MONO : SANS }}>

      {/* Header */}
      <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.12em', color: T.accentLabel, textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>
              {isDark ? '// VAULT OS v2.0' : 'The Vault'}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: isDark ? '-0.02em' : '-0.03em', lineHeight: 1 }}>
              {isDark ? 'SPACES' : 'Spaces'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onToggleTheme} style={{
              width: 30, height: 30, borderRadius: isDark ? 4 : 8, cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(139,92,246,0.1)',
              border: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>{isDark ? "☀️" : "🌙"}</motion.button>
            {showClose && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} style={{
                width: 30, height: 30, borderRadius: isDark ? 4 : 8, cursor: 'pointer',
                background: `${T.red}18`, border: `1px solid ${T.red}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.red, fontSize: 11, fontWeight: 700,
              }}>✕</motion.button>
            )}
          </div>
        </div>

        {/* Identity pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          background: isDark ? 'rgba(168,85,247,0.06)' : 'rgba(139,92,246,0.06)',
          border: `1px solid ${T.border}`,
          borderRadius: isDark ? 4 : 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, ${T.purple}, ${T.green})`, borderRadius: 1 }} />
          <Avatar name={myHandle} size={26} isDark={isDark} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: isDark ? 8 : 9, letterSpacing: isDark ? '0.15em' : '0.1em', color: T.muted, textTransform: 'uppercase', marginBottom: 1, fontWeight: 700 }}>
              {isDark ? 'AUTHENTICATED AS' : 'Signed in as'}
            </p>
            <p style={{ fontSize: 12, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isDark ? `@${myHandle}` : myHandle}
            </p>
          </div>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}`, flexShrink: 0 }} />
        </div>
      </div>

      {/* Rooms */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onCreateClick(); onClose(); }} style={{
          width: '100%', padding: '9px 12px', marginBottom: 14,
          background: 'transparent',
          border: `1px ${isDark ? 'dashed' : 'solid'} ${T.border}`,
          borderRadius: isDark ? 4 : 10,
          color: T.purple, fontFamily: 'inherit', fontWeight: 700, fontSize: isDark ? 11 : 12,
          letterSpacing: isDark ? '0.12em' : '0.02em', textTransform: isDark ? 'uppercase' : 'none',
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = `${T.purple}12`; e.currentTarget.style.borderColor = `${T.purple}55`; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.border; }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          {isDark ? 'NEW_SPACE' : 'New Space'}
        </motion.button>

        <p style={{ fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.08em', color: T.muted, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2, fontWeight: 700 }}>
          {isDark ? '// CHANNELS' : 'Channels'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {rooms.map((room) => {
            const isActive = activeRoom.name === room.name;
            return (
              <div key={room.name} className="sidebar-room-group" style={{ position: 'relative' }}>
                <button onClick={() => onJoin(room)} style={{
                  width: '100%', padding: '9px 10px 9px 12px',
                  background: isActive ? (isDark ? 'rgba(168,85,247,0.1)' : 'rgba(139,92,246,0.1)') : 'transparent',
                  border: `1px solid ${isActive ? T.border : 'transparent'}`,
                  borderRadius: isDark ? 4 : 10, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  textAlign: 'left', position: 'relative', overflow: 'hidden',
                }}>
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: T.purple, borderRadius: 1 }} />}
                  <span style={{
                    fontFamily: 'inherit', fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? T.purple : T.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6,
                  }}>
                    {isDark ? (isActive ? '> ' : '  ') : ''}{room.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {room.password && <span style={{ fontSize: 9, opacity: 0.4 }}>🔒</span>}
                    {unreadRooms.has(room.name) && !isActive && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.red, display: 'block', boxShadow: `0 0 7px ${T.red}` }} />
                    )}
                  </div>
                </button>
                {room.name !== "General Vibes #1" && (
                  <button className="room-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(room.name); }}
                    style={{
                      position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                      opacity: 0, width: 18, height: 18, borderRadius: '50%',
                      background: T.red, border: 'none', color: 'white',
                      fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 0.15s', zIndex: 20,
                    }}>✕</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Online users */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.08em', color: T.muted, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
            {isDark ? `// ONLINE [${onlineUsers.length}]` : `Online · ${onlineUsers.length}`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onlineUsers.map((user, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 6px ${T.green}`, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isDark ? '@' : ''}{typeof user === 'object' ? user.handle : user}
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

  const [mounted, setMounted] = useState(false);
  const [myHandle, setMyHandle] = useState("");
  const [activeRoom, setActiveRoom] = useState({ name: "General Vibes #1" });
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingStatus, setTypingStatus] = useState(null);
  const [isDark, setIsDark] = useState(true);
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

  const T = theme(isDark);

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
    setIsDark(savedTheme !== "light");
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
        osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
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
    const n = !isDark; setIsDark(n);
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
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, image: json.url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, image: json.url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
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

  if (!mounted) return <div style={{ height: '100dvh', background: '#050508' }} />;
  if (!myHandle) return <div style={{ height: '100dvh', background: '#050508' }} />;

  const sidebarProps = { rooms, activeRoom, onJoin: attemptJoin, onDelete: (name) => setRoomToDelete(name), onCreateClick: () => setShowCreateModal(true), onClose: () => setSidebarOpen(false), onToggleTheme: toggleTheme, isDark, myHandle, onlineUsers, unreadRooms };

  const BR = isDark ? 4 : 12; // border radius style

  return (
    <main style={{
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      display: 'flex', background: T.bg,
      fontFamily: isDark ? MONO : SANS,
      overflow: 'hidden', transition: 'background 0.5s',
    }}>

      {/* Background layers */}
      {isDark ? <DarkBackground /> : <LightBackground />}

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(14px)' }}>
            <motion.div initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
              style={{
                background: isDark ? 'rgba(7,7,12,0.98)' : 'rgba(255,255,255,0.92)',
                border: `1px solid ${T.border}`,
                borderRadius: isDark ? 6 : 20, padding: '26px 22px', maxWidth: 360, width: '100%',
                boxShadow: isDark ? `0 0 60px rgba(168,85,247,0.12), 0 24px 80px rgba(0,0,0,0.8)` : '0 24px 80px rgba(139,92,246,0.15), 0 4px 20px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: isDark ? 1 : 2, background: `linear-gradient(90deg, transparent, ${T.purple}, transparent)` }} />

              {roomToDelete ? (<>
                <p style={{ fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.1em', color: T.red, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>{isDark ? '// DANGER ZONE' : 'Danger Zone'}</p>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 4 }}>{isDark ? 'DELETE SPACE' : 'Delete Space'}</h2>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Confirm key for <span style={{ color: T.text, fontWeight: 700 }}>{roomToDelete}</span></p>
                <ModalInput label="ROOM KEY" placeholder="enter key..." type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDeleteRoom()} autoFocus isDark={isDark} T={T} />
                <button onClick={confirmDeleteRoom} style={{ width: '100%', padding: '12px', borderRadius: BR, background: `linear-gradient(135deg, ${T.red}, #FF6B8A)`, border: 'none', color: 'white', fontFamily: 'inherit', fontWeight: 800, fontSize: isDark ? 11 : 14, letterSpacing: isDark ? '0.15em' : '0', textTransform: isDark ? 'uppercase' : 'none', cursor: 'pointer' }}>
                  {isDark ? 'DESTROY SPACE' : 'Delete Forever'}
                </button>
              </>) : showCreateModal ? (<>
                <p style={{ fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.1em', color: T.purple, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>{isDark ? '// INITIALIZE' : 'Create'}</p>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 16 }}>{isDark ? 'NEW SPACE' : 'New Space'}</h2>
                <ModalInput label="SPACE NAME" placeholder={isDark ? "channel-name..." : "Space name"} value={newRoomData.name} onChange={e => setNewRoomData({ ...newRoomData, name: e.target.value })} isDark={isDark} T={T} />
                <ModalInput label="ACCESS KEY" placeholder={isDark ? "set password..." : "Set a password"} type="password" value={newRoomData.password} onChange={e => setNewRoomData({ ...newRoomData, password: e.target.value })} isDark={isDark} T={T} />
                <button onClick={handleCreateRoom} style={{ width: '100%', padding: '12px', borderRadius: BR, background: `linear-gradient(135deg, ${T.purple}, ${T.purpleDim})`, border: 'none', color: 'white', fontFamily: 'inherit', fontWeight: 800, fontSize: isDark ? 11 : 14, letterSpacing: isDark ? '0.15em' : '0', textTransform: isDark ? 'uppercase' : 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${T.purple}33` }}>
                  {isDark ? 'CREATE_SPACE()' : 'Create Space'}
                </button>
              </>) : (<>
                <p style={{ fontSize: isDark ? 9 : 10, letterSpacing: isDark ? '0.2em' : '0.1em', color: T.green, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>{isDark ? '// ACCESS REQUEST' : 'Join Space'}</p>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 16 }}>{roomToJoin?.name}</h2>
                <ModalInput label="ACCESS KEY" placeholder={isDark ? "enter key..." : "Room password"} type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPassword()} autoFocus isDark={isDark} T={T} />
                <button onClick={verifyPassword} style={{ width: '100%', padding: '12px', borderRadius: BR, background: `linear-gradient(135deg, ${T.green}, #059669)`, border: 'none', color: isDark ? '#050508' : 'white', fontFamily: 'inherit', fontWeight: 800, fontSize: isDark ? 11 : 14, letterSpacing: isDark ? '0.15em' : '0', textTransform: isDark ? 'uppercase' : 'none', cursor: 'pointer' }}>
                  {isDark ? 'GRANT_ACCESS()' : 'Enter Space'}
                </button>
              </>)}
              <button onClick={() => { setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword(""); }}
                style={{ width: '100%', marginTop: 12, padding: '8px', background: 'transparent', border: 'none', color: T.muted, fontFamily: 'inherit', fontWeight: 700, fontSize: isDark ? 10 : 12, cursor: 'pointer', letterSpacing: isDark ? '0.15em' : '0.02em', textTransform: isDark ? 'uppercase' : 'none' }}>
                {isDark ? '[ESC] CANCEL' : 'Cancel'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            className="md:hidden" />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', top: 0, left: 0, width: 270, zIndex: 40, height: '100dvh', borderRight: `1px solid ${T.border}`, overflow: 'hidden' }}
            className="md:hidden">
            <Sidebar {...sidebarProps} showClose={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div style={{ width: 260, borderRight: `1px solid ${T.border}`, flexShrink: 0, height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }}
        className="hidden md:block">
        <Sidebar {...sidebarProps} showClose={false} />
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
          background: T.headerBg, backdropFilter: 'blur(20px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          transition: 'background 0.5s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setSidebarOpen(true)} className="md:hidden" style={{
              width: 34, height: 34, borderRadius: isDark ? 4 : 10, flexShrink: 0,
              background: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(139,92,246,0.08)',
              border: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, cursor: 'pointer', color: T.text,
            }}>☰</motion.button>

            {/* Live dot with radar */}
            <div style={{ flexShrink: 0, position: 'relative', width: 10, height: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}`, position: 'absolute', top: 1, left: 1 }} />
              <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${T.green}`, animation: 'radar 2s infinite' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: isDark ? 8 : 9, letterSpacing: isDark ? '0.18em' : '0.1em', color: T.muted, textTransform: 'uppercase', lineHeight: 1, marginBottom: 2, fontWeight: 700 }}>
                {isDark ? '// ACTIVE CHANNEL' : 'Active Space'}
              </p>
              <h1 style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: isDark ? '0.02em' : '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isDark ? `>_ ${activeRoom.name}` : activeRoom.name}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setSoundEnabled(p => !p)} style={{
              height: 30, width: 30, borderRadius: isDark ? 4 : 8,
              background: soundEnabled ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.06)') : `${T.red}18`,
              border: `1px solid ${soundEnabled ? T.border : T.red + '33'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, cursor: 'pointer',
            }}>{soundEnabled ? "🔔" : "🔕"}</motion.button>

            <motion.button whileTap={{ scale: 0.92 }} onClick={() => { if (confirm("Wipe all messages?")) fetch(`${API}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, { method: 'DELETE' }); }} style={{
              height: 30, padding: '0 8px', borderRadius: isDark ? 4 : 8,
              background: `${T.red}12`, border: `1px solid ${T.red}25`,
              color: T.red, fontFamily: 'inherit', fontWeight: 700, fontSize: isDark ? 9 : 10,
              letterSpacing: isDark ? '0.15em' : '0.05em', textTransform: 'uppercase', cursor: 'pointer',
            }}>{isDark ? 'WIPE' : 'Wipe'}</motion.button>

            <motion.button whileTap={{ scale: 0.92 }} onClick={handleExit} style={{
              height: 30, padding: '0 10px', borderRadius: isDark ? 4 : 8,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.06)',
              border: `1px solid ${T.border}`,
              color: T.muted, fontFamily: 'inherit', fontWeight: 700, fontSize: isDark ? 9 : 10,
              letterSpacing: isDark ? '0.15em' : '0.05em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Exit</motion.button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 12px', background: 'transparent' }} className="sm:px-5">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => {
              const isMe = msg.author === myHandle;
              return (
                <motion.div key={msg._id} layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  style={{ display: 'flex', marginBottom: 14, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>

                  {!isMe && <div style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }}><Avatar name={msg.author} size={28} isDark={isDark} /></div>}

                  <div className="msg-group" style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <p style={{ fontFamily: isDark ? MONO : SANS, fontSize: isDark ? 9 : 11, letterSpacing: isDark ? '0.12em' : '0.02em', color: T.muted, textTransform: isDark ? 'uppercase' : 'none', marginBottom: 4, paddingLeft: 2, fontWeight: isDark ? 700 : 600 }}>
                        {isDark ? `@${msg.author}` : msg.author} · {msg.time}
                      </p>
                    )}

                    <div style={{ position: 'relative' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isMe
                          ? (isDark ? '12px 12px 2px 12px' : '18px 18px 4px 18px')
                          : (isDark ? '12px 12px 12px 2px' : '18px 18px 18px 4px'),
                        background: isMe ? T.myBubble : T.otherBubble,
                        border: isMe ? 'none' : `1px solid ${T.otherBubbleBorder}`,
                        borderLeft: (!isMe && isDark) ? `2px solid ${T.otherBubbleAccent}55` : (!isMe && !isDark) ? undefined : undefined,
                        boxShadow: isMe ? T.myBubbleShadow : (isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 16px rgba(139,92,246,0.08)'),
                        backdropFilter: !isMe && !isDark ? 'blur(12px)' : undefined,
                        position: 'relative',
                      }}>
                        {/* Hover toolbar */}
                        <div className="msg-toolbar" style={{
                          position: 'absolute', top: -36,
                          right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0,
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: isDark ? 'rgba(8,8,14,0.97)' : 'rgba(255,255,255,0.95)',
                          border: `1px solid ${T.border}`,
                          borderRadius: 20, padding: '4px 8px',
                          backdropFilter: 'blur(16px)',
                          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(139,92,246,0.12)',
                          opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s', zIndex: 10,
                        }}>
                          {['👍', '❤️', '🔥', '😂'].map(emoji => (
                            <button key={emoji} onClick={() => handleReaction(msg._id, emoji)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '1px 2px', transition: 'transform 0.1s' }}
                              onMouseEnter={e => e.target.style.transform = 'scale(1.35)'}
                              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                            >{emoji}</button>
                          ))}
                          {isMe && !editingId && !msg._id?.startsWith('temp_') && (<>
                            <div style={{ width: 1, height: 12, background: T.border, margin: '0 2px' }} />
                            <button onClick={() => { setEditingId(msg._id); setEditText(msg.text || ''); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.muted, padding: '1px 3px' }}>✎</button>
                            <button onClick={() => { if (confirm("Delete?")) fetch(`${API}/api/messages/${msg._id}`, { method: 'DELETE' }); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.red, padding: '1px 3px' }}>🗑</button>
                          </>)}
                        </div>

                        {msg.image && <img src={msg.image} alt="img" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: isDark ? 8 : 12, marginBottom: 6, display: 'block' }} />}
                        {msg.video && <video src={msg.video} controls style={{ width: '100%', maxHeight: 220, borderRadius: isDark ? 8 : 12, marginBottom: 6, display: 'block', background: '#000' }} />}

                        {editingId === msg._id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input style={{
                              padding: '8px 10px', borderRadius: isDark ? 4 : 8,
                              background: isDark ? 'rgba(5,5,8,0.9)' : 'rgba(255,255,255,0.9)',
                              border: `1px solid ${T.border}`, color: T.text,
                              fontFamily: isDark ? MONO : SANS, fontWeight: 600, fontSize: 13,
                              outline: 'none', width: '100%', boxSizing: 'border-box',
                            }}
                              value={editText} onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={saveEdit} style={{ padding: '4px 12px', borderRadius: isDark ? 4 : 8, background: T.green, border: 'none', color: isDark ? '#050508' : 'white', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', borderRadius: isDark ? 4 : 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (<>
                          {msg.text && (
                            <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: isMe ? 'rgba(255,255,255,0.95)' : T.text, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0, fontFamily: SANS }}>
                              {msg.text}
                              {isMe && <MessageTicks status={getTickStatus(msg, myHandle)} T={T} />}
                            </p>
                          )}
                          {(msg.image || msg.video) && isMe && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                              <MessageTicks status={getTickStatus(msg, myHandle)} T={T} />
                            </div>
                          )}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} style={{
                                  display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20,
                                  background: users.includes(myHandle) ? `${T.green}18` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.08)'),
                                  border: `1px solid ${users.includes(myHandle) ? T.green + '44' : T.border}`,
                                  cursor: 'pointer', fontSize: 12,
                                }}>
                                  <span>{emoji}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: users.includes(myHandle) ? T.green : T.muted, fontFamily: MONO }}>{users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>)}
                      </div>
                    </div>

                    {isMe && (
                      <p style={{ fontFamily: isDark ? MONO : SANS, fontSize: 10, color: T.muted, marginTop: 3, paddingRight: 2 }}>{msg.time}</p>
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
              <div style={{
                display: 'flex', gap: 4, padding: '8px 12px',
                background: isDark ? 'rgba(14,14,24,0.9)' : 'rgba(255,255,255,0.85)',
                border: `1px solid ${T.border}`,
                borderRadius: isDark ? '12px 12px 12px 2px' : '18px 18px 18px 4px',
                borderLeft: isDark ? `2px solid ${T.otherBubbleAccent}55` : undefined,
                backdropFilter: !isDark ? 'blur(12px)' : undefined,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: T.purple, animation: 'typingBounce 1s infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span style={{ fontFamily: isDark ? MONO : SANS, fontSize: isDark ? 10 : 11, color: T.muted, letterSpacing: isDark ? '0.1em' : '0' }}>
                {isDark ? `@${typingStatus} is typing_` : `${typingStatus} is typing...`}
              </span>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input bar */}
        <div style={{
          borderTop: `1px solid ${inputFocused ? T.borderActive : T.border}`,
          background: isDark ? 'rgba(5,5,8,0.95)' : 'rgba(240,237,255,0.85)',
          backdropFilter: 'blur(20px)', flexShrink: 0, transition: 'border-color 0.2s, background 0.5s',
        }}>
          {/* Emoji picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div ref={emojiPickerRef}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                style={{
                  margin: '8px 10px 0', padding: 10,
                  background: isDark ? 'rgba(8,8,14,0.98)' : 'rgba(255,255,255,0.95)',
                  border: `1px solid ${T.border}`, borderRadius: isDark ? 8 : 16,
                  boxShadow: isDark ? '0 -8px 32px rgba(0,0,0,0.5)' : '0 -8px 32px rgba(139,92,246,0.12)',
                  backdropFilter: 'blur(20px)',
                  display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 2, maxHeight: 130, overflowY: 'auto',
                }}>
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => insertEmoji(emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 3, borderRadius: 6, transition: 'transform 0.1s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload status */}
          {(uploadingVideo || uploadingImage) && (
            <div style={{ margin: '6px 10px 0', padding: '5px 12px', background: `${T.purple}10`, border: `1px solid ${T.purple}25`, borderRadius: isDark ? 4 : 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.purple, animation: 'pulse 0.8s infinite' }} />
              <span style={{ fontFamily: isDark ? MONO : SANS, fontSize: isDark ? 10 : 11, color: T.purple, letterSpacing: isDark ? '0.12em' : '0', textTransform: isDark ? 'uppercase' : 'none', fontWeight: 700 }}>
                {uploadingImage ? (isDark ? 'UPLOADING IMAGE...' : 'Uploading image...') : (isDark ? 'UPLOADING VIDEO...' : 'Uploading video...')}
              </span>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 6 }}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />

            {[
              { icon: '📷', action: () => fileInputRef.current.click(), disabled: uploadingImage },
              { icon: '🎥', action: () => videoInputRef.current.click(), disabled: uploadingVideo },
              { icon: '😊', action: () => setShowEmojiPicker(p => !p), active: showEmojiPicker },
            ].map(({ icon, action, disabled, active }) => (
              <motion.button key={icon} whileTap={{ scale: 0.9 }} onClick={action} disabled={disabled} style={{
                width: 36, height: 36, borderRadius: isDark ? 4 : 10, flexShrink: 0,
                background: active ? `${T.purple}18` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.07)'),
                border: `1px solid ${active ? T.purple + '44' : T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, cursor: 'pointer', opacity: disabled ? 0.35 : 1, transition: 'all 0.15s',
              }}>{icon}</motion.button>
            ))}

            {/* Input with terminal cursor (dark) or clean (light) */}
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              {isDark && (
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: MONO, fontSize: 13, color: T.purple, pointerEvents: 'none', opacity: inputFocused || message ? 1 : 0.4, transition: 'opacity 0.2s', zIndex: 1 }}>›</span>
              )}
              <input type="text" value={message}
                onChange={e => { setMessage(e.target.value); handleTypingEmit(); }}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={isDark ? "type message..." : "Message..."}
                style={{
                  width: '100%', padding: isDark ? '10px 12px 10px 26px' : '10px 16px',
                  boxSizing: 'border-box',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.75)',
                  border: `1px solid ${inputFocused ? T.borderActive : T.border}`,
                  borderRadius: isDark ? 4 : 20,
                  color: T.text, fontFamily: isDark ? MONO : SANS, fontSize: 13, fontWeight: 500,
                  outline: 'none', transition: 'border-color 0.2s',
                  backdropFilter: !isDark ? 'blur(8px)' : undefined,
                }}
              />
            </div>

            {/* Send */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage} style={{
              width: 36, height: 36, borderRadius: isDark ? 4 : 10, flexShrink: 0, border: 'none',
              background: message.trim() ? `linear-gradient(135deg, ${T.purple}, ${T.purpleDim})` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(139,92,246,0.08)'),
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: message.trim() ? `0 0 16px ${T.purple}44` : 'none',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={message.trim() ? "white" : T.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={message.trim() ? "white" : T.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes radar { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.6);opacity:0} }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 3px; }
        input::placeholder { color: ${T.muted}; }
        .msg-group:hover .msg-toolbar { opacity: 1 !important; pointer-events: all !important; }
        .sidebar-room-group:hover .room-delete-btn { opacity: 1 !important; }
      `}</style>
    </main>
  );
}
