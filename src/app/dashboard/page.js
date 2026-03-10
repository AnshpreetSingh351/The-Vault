"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤔","😅","😭","😡","🥱",
  "👍","👎","👏","🙌","🤝","🙏","💪","✌️","🤞","👀",
  "❤️","🔥","💯","✨","🎉","🎊","💀","👻","🤡","💩",
  "🍕","🍔","🍟","🌮","🍜","🍣","🍦","🍩","🧁","🍺",
  "😏","🫡","🫠","😤","🤯","🥳","😇","🤩","😴","🫶",
  "💬","📢","🚀","🌈","⚡","💥","🎯","🏆","💎","🕹️",
];

// ─── THEMES ──────────────────────────────────────────────────────────────────
const DARK = {
  bg: '#050508',
  panelBg: 'rgba(10,10,20,0.88)',
  border: 'rgba(168,85,247,0.2)',
  borderBright: 'rgba(168,85,247,0.5)',
  text: '#E8E8F0',
  muted: 'rgba(255,255,255,0.28)',
  accent: '#A855F7',
  accentDim: '#7C3AED',
  green: '#10F5A0',
  red: '#FF4B6E',
  ringColor: 'rgba(168,85,247,',
  scanColor: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), rgba(16,245,160,0.2), transparent)',
  cornerColor: 'rgba(168,85,247,0.4)',
  myBubble: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(109,40,217,0.85))',
  myBubbleShadow: '0 4px 24px rgba(168,85,247,0.35)',
  otherBubble: 'rgba(12,12,22,0.95)',
  otherBorder: 'rgba(168,85,247,0.2)',
  inputBg: 'rgba(255,255,255,0.03)',
  labelColor: 'rgba(168,85,247,0.7)',
  noiseOpacity: 0.4,
};

const LIGHT = {
  bg: '#F5F0FF',
  panelBg: 'rgba(250,247,255,0.9)',
  border: 'rgba(139,92,246,0.25)',
  borderBright: 'rgba(139,92,246,0.6)',
  text: '#1A0A2E',
  muted: 'rgba(80,40,120,0.45)',
  accent: '#7C3AED',
  accentDim: '#5B21B6',
  green: '#059669',
  red: '#DC2626',
  ringColor: 'rgba(139,92,246,',
  scanColor: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(5,150,105,0.15), transparent)',
  cornerColor: 'rgba(139,92,246,0.5)',
  myBubble: 'linear-gradient(135deg, rgba(124,58,237,0.92), rgba(91,33,182,0.88))',
  myBubbleShadow: '0 4px 24px rgba(124,58,237,0.3)',
  otherBubble: 'rgba(255,255,255,0.92)',
  otherBorder: 'rgba(139,92,246,0.2)',
  inputBg: 'rgba(255,255,255,0.6)',
  labelColor: 'rgba(109,40,217,0.75)',
  noiseOpacity: 0.2,
};

// ─── GLITCH HOOK ─────────────────────────────────────────────────────────────
function useGlitchText(text, active) {
  const [display, setDisplay] = useState(text);
  const chars = "█▓▒░$@#&!?/\\|<>[]{}~^*";
  useEffect(() => {
    if (!active) { setDisplay(text); return; }
    let iter = 0;
    const iv = setInterval(() => {
      setDisplay(text.split("").map((c, i) => {
        if (i < iter) return text[i];
        if (c === " ") return " ";
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      iter += 0.5;
      if (iter >= text.length) clearInterval(iv);
    }, 35);
    return () => clearInterval(iv);
  }, [active, text]);
  return display;
}

// ─── VAULT RINGS ─────────────────────────────────────────────────────────────
function VaultRings({ T, reduced }) {
  const sizes = reduced ? [400, 300, 200] : [700, 560, 420, 300];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
      {sizes.map((size, i) => (
        <motion.div key={size}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 35 + i * 12, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute', width: size, height: size, borderRadius: '50%',
            border: `1px solid ${T.ringColor}${0.04 + i * 0.02})`,
            boxShadow: `inset 0 0 ${25 + i * 12}px ${T.ringColor}${0.02 + i * 0.01})`,
          }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <div key={deg} style={{
              position: 'absolute', width: 3, height: 3, borderRadius: '50%',
              background: `${T.ringColor}${0.25 + i * 0.1})`,
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateX(${size / 2 - 2}px) translateY(-50%)`,
              boxShadow: `0 0 5px ${T.accent}88`,
            }} />
          ))}
        </motion.div>
      ))}
      <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${T.ringColor}0.12) 0%, transparent 70%)` }} />
    </div>
  );
}

// ─── SCANLINE ─────────────────────────────────────────────────────────────────
function ScanLine({ T }) {
  return (
    <motion.div
      animate={{ y: ['0%', '100%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
      style={{ position: 'absolute', left: 0, right: 0, height: 2, pointerEvents: 'none', background: T.scanColor, zIndex: 4 }}
    />
  );
}

// ─── CORNER BRACKETS ─────────────────────────────────────────────────────────
function CornerBrackets({ T }) {
  return (
    <>
      {[
        { top: 12, left: 12, rotate: 0 },
        { top: 12, right: 12, rotate: 90 },
        { bottom: 12, right: 12, rotate: 180 },
        { bottom: 12, left: 12, rotate: 270 },
      ].map((pos, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.08 }}
          style={{
            position: 'absolute', ...pos, width: 24, height: 24,
            pointerEvents: 'none', zIndex: 5,
            transform: `rotate(${pos.rotate}deg)`,
            borderTop: `1px solid ${T.cornerColor}`,
            borderLeft: `1px solid ${T.cornerColor}`,
          }} />
      ))}
    </>
  );
}

// ─── NOISE ────────────────────────────────────────────────────────────────────
function Noise({ T }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      opacity: T.noiseOpacity,
    }} />
  );
}

// ─── TICKS ───────────────────────────────────────────────────────────────────
function MessageTicks({ status, T }) {
  if (status === 'sending') return <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.4 }}><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4 8L11 1" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  if (status === 'delivered') return <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.55 }}><svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5L4 8L11 1" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 5L9 8L16 1" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  if (status === 'seen') return <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}><svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5L4 8L11 1" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 5L9 8L16 1" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  return null;
}

function getTickStatus(msg, myHandle) {
  if (!msg._id || msg._id.startsWith('temp_')) return 'sending';
  if (!msg.seenBy || msg.seenBy.length <= 1) return 'delivered';
  return (msg.seenBy || []).filter(u => u !== myHandle).length > 0 ? 'seen' : 'delivered';
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28, T }) {
  const colors = ['#A855F7','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`,
      border: `1px solid ${color}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO, fontWeight: 900, fontSize: size * 0.38, color,
      boxShadow: `0 0 10px ${color}22`,
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

// ─── PANEL LABEL (floating on border like login page) ────────────────────────
function PanelLabel({ label, T, bg }) {
  return (
    <div style={{
      position: 'absolute', top: -10, left: 16,
      background: bg || T.bg, padding: '0 8px',
      fontSize: 9, letterSpacing: '0.2em', color: T.labelColor,
      textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO, zIndex: 2,
    }}>{label}</div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ rooms, activeRoom, onJoin, onDelete, onCreateClick, onClose, onToggleTheme, isDark, myHandle, onlineUsers, showClose, unreadRooms }) {
  const T = isDark ? DARK : LIGHT;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.panelBg, backdropFilter: 'blur(20px)', fontFamily: MONO, position: 'relative', overflow: 'hidden' }}>
      <VaultRings T={T} reduced />
      <ScanLine T={T} />
      <Noise T={T} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${T.border}`, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.22em', color: T.labelColor, textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>// VAULT OS v2.0</p>
              <motion.h2
                style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.08em', margin: 0, lineHeight: 1, background: `linear-gradient(180deg, ${T.text} 0%, ${T.accent}CC 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SPACES
              </motion.h2>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={onToggleTheme} style={{
                width: 30, height: 30, borderRadius: 4, cursor: 'pointer',
                background: T.inputBg, border: `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>{isDark ? "☀️" : "🌙"}</motion.button>
              {showClose && (
                <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} style={{
                  width: 30, height: 30, borderRadius: 4, cursor: 'pointer',
                  background: `${T.red}18`, border: `1px solid ${T.red}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.red, fontSize: 11, fontWeight: 700,
                }}>✕</motion.button>
              )}
            </div>
          </div>

          {/* Identity box */}
          <div style={{
            padding: '8px 10px', border: `1px solid ${T.border}`,
            background: T.inputBg, position: 'relative',
          }}>
            <PanelLabel label="AUTHENTICATED" T={T} bg={T.panelBg} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Avatar name={myHandle} size={24} T={T} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{myHandle}</span>
              <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}`, flexShrink: 0 }} />
            </div>
          </div>
        </div>

        {/* Rooms */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onCreateClick(); onClose(); }} style={{
            width: '100%', padding: '9px 12px', marginBottom: 14,
            background: 'transparent', border: `1px dashed ${T.accent}55`,
            color: T.accent, fontFamily: MONO, fontWeight: 700, fontSize: 11,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${T.accent}12`; e.currentTarget.style.borderColor = `${T.accent}88`; e.currentTarget.style.boxShadow = `0 0 12px ${T.accent}22`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${T.accent}55`; e.currentTarget.style.boxShadow = 'none'; }}
          >+ NEW_SPACE</motion.button>

          <p style={{ fontSize: 9, letterSpacing: '0.22em', color: T.muted, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2, fontWeight: 700 }}>// CHANNELS</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rooms.map((room) => {
              const isActive = activeRoom.name === room.name;
              return (
                <div key={room.name} className="sidebar-room-group" style={{ position: 'relative' }}>
                  <button onClick={() => onJoin(room)} style={{
                    width: '100%', padding: '9px 10px 9px 12px',
                    background: isActive ? `${T.accent}14` : 'transparent',
                    border: `1px solid ${isActive ? T.accent + '44' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    textAlign: 'left', position: 'relative', overflow: 'hidden',
                    boxShadow: isActive ? `0 0 12px ${T.accent}18` : 'none',
                  }}>
                    {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, ${T.accent}, ${T.green})` }} />}
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? T.accent : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>
                      {isActive ? '▶ ' : '  '}{room.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {room.password && <span style={{ fontSize: 9, opacity: 0.4 }}>🔒</span>}
                      {unreadRooms.has(room.name) && !isActive && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.red, display: 'block', boxShadow: `0 0 8px ${T.red}` }} />
                      )}
                    </div>
                  </button>
                  {room.name !== "General Vibes #1" && (
                    <button className="room-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(room.name); }}
                      style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', opacity: 0, width: 18, height: 18, borderRadius: '50%', background: T.red, border: 'none', color: 'white', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', zIndex: 20 }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Online */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.border}`, position: 'relative' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.22em', color: T.muted, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>// ONLINE [{onlineUsers.length}]</p>
            {onlineUsers.map((user, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 7px ${T.green}`, flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{typeof user === 'object' ? user.handle : user}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom status bar */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '8px 14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          {['SECURE', 'E2E', 'LIVE'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.green, opacity: 0.7 }} />
              <span style={{ fontSize: 8, letterSpacing: '0.15em', color: T.muted, fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
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
  const [roomGlitch, setRoomGlitch] = useState(false);

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const T = isDark ? DARK : LIGHT;
  const roomDisplay = useGlitchText(activeRoom.name.toUpperCase(), roomGlitch);

  useEffect(() => {
    const handler = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedName = localStorage.getItem("vault_user");
    if (!savedName) { router.replace('/'); return; }
    myHandleRef.current = savedName;
    setMyHandle(savedName);
    setIsDark(localStorage.getItem("vault_theme") !== "light");
  }, [router]);

  useEffect(() => {
    if (!myHandle) return;
    if (!socketRef.current || !socketRef.current.connected) socketRef.current = io(API, { forceNew: false });
    const socket = socketRef.current;
    socket.on("online_users", setOnlineUsers);
    socket.on("message_delivered", ({ tempId, message: m }) => setChatHistory(prev => prev.map(x => x._id === tempId ? m : x)));
    socket.on("message_seen_update", ({ _id, seenBy }) => setChatHistory(prev => prev.map(x => x._id === _id ? { ...x, seenBy } : x)));
    socket.on("message_deleted", id => setChatHistory(prev => prev.filter(x => x._id !== id)));
    socket.on("message_edited", u => setChatHistory(prev => prev.map(x => x._id === u._id ? u : x)));
    socket.on("room_created", r => setRooms(prev => prev.find(x => x.name === r.name) ? prev : [...prev, r]));
    socket.on("room_deleted", name => {
      setRooms(prev => prev.filter(r => r.name !== name));
      setActiveRoom(cur => cur.name === name ? { name: "General Vibes #1", password: "" } : cur);
    });
    return () => ['online_users','message_delivered','message_seen_update','message_deleted','message_edited','room_created','room_deleted'].forEach(e => socket.off(e));
  }, [myHandle]);

  useEffect(() => {
    if (!myHandle) return;
    // Glitch room name on switch
    setRoomGlitch(true);
    setTimeout(() => setRoomGlitch(false), 900);

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
        const db = Array.isArray(data) ? data : [];
        setRooms([{ name: "General Vibes #1", password: "" }, ...db.filter(r => r.name !== "General Vibes #1")]);
      } catch { setRooms([{ name: "General Vibes #1", password: "" }]); }
    };
    loadHistory(); loadRooms();
    setUnreadRooms(prev => { const n = new Set(prev); n.delete(activeRoom.name); return n; });
    const socket = socketRef.current; if (!socket) return;
    socket.emit('join_vault', { handle: myHandle, room: activeRoom.name });
    socket.emit('mark_seen', { room: activeRoom.name, handle: myHandle });
    const onReceive = (data) => {
      if (data.room === activeRoom.name) {
        setChatHistory(prev => prev.some(m => m._id === data._id) ? prev : [...prev, data]);
        socket.emit('mark_seen', { room: activeRoom.name, handle: myHandle });
        if (data.author !== myHandle) playNotification();
      } else setUnreadRooms(prev => new Set([...prev, data.room]));
    };
    const onTyping = (data) => { if (data.room === activeRoom.name && data.handle !== myHandle) setTypingStatus(data.isTyping ? data.handle : null); };
    const onCleared = (name) => { if (activeRoom.name === name) setChatHistory([]); };
    socket.on("receive_message", onReceive);
    socket.on("user_typing", onTyping);
    socket.on("room_cleared", onCleared);
    return () => { socket.off("receive_message", onReceive); socket.off("user_typing", onTyping); socket.off("room_cleared", onCleared); };
  }, [myHandle, activeRoom.name]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const playNotification = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const tone = (freq, t, dur, gain) => {
        const osc = ctx.createOscillator(), g = ctx.createGain(), c = ctx.createDynamicsCompressor();
        osc.connect(g); g.connect(c); c.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur + 0.01);
      };
      const now = ctx.currentTime;
      tone(520, now, 0.12, 0.8); tone(780, now + 0.1, 0.18, 0.7);
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
    typingTimeoutRef.current = setTimeout(() => socketRef.current?.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: false }), 2000);
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.name || !newRoomData.password) return alert("Fill all fields!");
    const res = await fetch(`${API}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRoomData) });
    if (res.ok) { setShowCreateModal(false); setNewRoomData({ name: "", password: "" }); } else alert("Error creating room.");
  };

  const confirmDeleteRoom = async () => {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(roomToDelete)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deletePassword }) });
    if (res.ok) { setRoomToDelete(null); setDeletePassword(""); } else alert("Incorrect Room Key!");
  };

  const attemptJoin = (room) => {
    if (!room.password || room.name === "General Vibes #1") { setActiveRoom(room); setSidebarOpen(false); setUnreadRooms(prev => { const n = new Set(prev); n.delete(room.name); return n; }); }
    else setRoomToJoin(room);
  };

  const verifyPassword = () => {
    if (joinPassword === roomToJoin.password) { setActiveRoom(roomToJoin); setUnreadRooms(prev => { const n = new Set(prev); n.delete(roomToJoin.name); return n; }); setRoomToJoin(null); setJoinPassword(""); setSidebarOpen(false); }
    else alert("Wrong Password!");
  };

  const toggleTheme = () => { const n = !isDark; setIsDark(n); localStorage.setItem("vault_theme", n ? "dark" : "light"); };
  const handleReaction = (messageId, emoji) => { if (socketRef.current) socketRef.current.emit("react_message", { messageId, emoji, handle: myHandle, room: activeRoom.name }); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = ""; setUploadingImage(true);
    try {
      const compressed = await new Promise((resolve, reject) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
        img.onload = () => {
          const canvas = document.createElement('canvas'), maxW = 1200, scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = Math.floor(img.width * scale); canvas.height = Math.floor(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', 0.75);
        };
        img.src = url;
      });
      const fd = new FormData(); fd.append('image', compressed, 'image.jpg');
      const res = await fetch(`${API}/api/upload/image`, { method: 'POST', body: fd });
      const json = await res.json(); if (!res.ok) throw new Error(json.error);
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, image: json.url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, image: json.url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
    } catch (err) { alert("Image upload failed: " + err.message); } finally { setUploadingImage(false); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) return alert("Video must be under 50MB!");
    setUploadingVideo(true);
    try {
      const fd = new FormData(); fd.append('video', file);
      const res = await fetch(`${API}/api/upload/video`, { method: 'POST', body: fd }); if (!res.ok) throw new Error('Failed');
      const { url } = await res.json();
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, video: url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, video: url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
    } catch { alert("Video upload failed."); } finally { setUploadingVideo(false); e.target.value = ""; }
  };

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current) return;
    const tempId = `temp_${Date.now()}`, time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { _id: tempId, room: activeRoom.name, author: myHandle, text: message, time, seenBy: [myHandle] }]);
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

  const sidebarProps = { rooms, activeRoom, onJoin: attemptJoin, onDelete: name => setRoomToDelete(name), onCreateClick: () => setShowCreateModal(true), onClose: () => setSidebarOpen(false), onToggleTheme: toggleTheme, isDark, myHandle, onlineUsers, unreadRooms };

  // ─── MODAL INPUT ──────────────────────────────────────────────────────────
  const ModalField = ({ label, placeholder, type = "text", value, onChange, onKeyDown, autoFocus }) => {
    const [focused, setFocused] = useState(false);
    return (
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, color: focused ? T.accent : T.muted, textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO, transition: 'color 0.2s' }}>{label}</p>
        <div style={{ position: 'relative' }}>
          <input type={type} placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} autoFocus={autoFocus}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ width: '100%', padding: '12px 14px', background: focused ? `${T.accent}08` : T.inputBg, border: `1px solid ${focused ? T.borderBright : T.border}`, color: T.text, fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: MONO, transition: 'all 0.2s', boxSizing: 'border-box' }}
          />
          <motion.div animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.2 }}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, transformOrigin: 'left', background: `linear-gradient(90deg, ${T.accent}, ${T.green}66)` }} />
        </div>
      </div>
    );
  };

  return (
    <main style={{
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      display: 'flex', background: T.bg, fontFamily: MONO, overflow: 'hidden', transition: 'background 0.4s',
    }}>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{
                background: T.panelBg, border: `1px solid ${T.border}`, padding: '28px 22px',
                maxWidth: 360, width: '100%', position: 'relative', overflow: 'hidden',
                boxShadow: `0 0 60px ${T.accent}18, 0 24px 80px rgba(0,0,0,0.7)`,
                backdropFilter: 'blur(20px)',
              }}>
              {/* Accent top line */}
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)` }} />
              <VaultRings T={T} reduced />
              <Noise T={T} />
              <div style={{ position: 'relative', zIndex: 5 }}>
                {roomToDelete ? (<>
                  <p style={{ fontSize: 9, letterSpacing: '0.2em', color: T.red, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>// DANGER ZONE</p>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 4, letterSpacing: '0.05em' }}>DELETE SPACE</h2>
                  <p style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>Confirm key for <span style={{ color: T.text }}>{roomToDelete}</span></p>
                  <ModalField label="// ROOM KEY" placeholder="enter key..." type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDeleteRoom()} autoFocus />
                  <button onClick={confirmDeleteRoom} style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${T.red}, #FF6B8A)`, border: 'none', color: 'white', fontFamily: MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 0 20px ${T.red}44` }}>DESTROY SPACE</button>
                </>) : showCreateModal ? (<>
                  <p style={{ fontSize: 9, letterSpacing: '0.2em', color: T.accent, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>// INITIALIZE</p>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 18, letterSpacing: '0.05em' }}>NEW SPACE</h2>
                  <ModalField label="// SPACE NAME" placeholder="channel-name..." value={newRoomData.name} onChange={e => setNewRoomData({ ...newRoomData, name: e.target.value })} />
                  <ModalField label="// ACCESS KEY" placeholder="set password..." type="password" value={newRoomData.password} onChange={e => setNewRoomData({ ...newRoomData, password: e.target.value })} />
                  <button onClick={handleCreateRoom} style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, border: 'none', color: 'white', fontFamily: MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 0 20px ${T.accent}44` }}>CREATE_SPACE()</button>
                </>) : (<>
                  <p style={{ fontSize: 9, letterSpacing: '0.2em', color: T.green, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>// ACCESS REQUEST</p>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 18, letterSpacing: '0.05em' }}>{roomToJoin?.name}</h2>
                  <ModalField label="// ACCESS KEY" placeholder="enter key..." type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPassword()} autoFocus />
                  <button onClick={verifyPassword} style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${T.green}, #059669)`, border: `1px solid ${T.green}44`, color: isDark ? '#050508' : 'white', fontFamily: MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 0 20px ${T.green}33` }}>GRANT_ACCESS()</button>
                </>)}
                <button onClick={() => { setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword(""); }}
                  style={{ width: '100%', marginTop: 12, padding: '8px', background: 'transparent', border: 'none', color: T.muted, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  [ESC] CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE BACKDROP ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            className="md:hidden" />
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR ── */}
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

      {/* ── DESKTOP SIDEBAR ── */}
      <div style={{ width: 260, borderRight: `1px solid ${T.border}`, flexShrink: 0, height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }} className="hidden md:block">
        <Sidebar {...sidebarProps} showClose={false} />
      </div>

      {/* ── MAIN CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, position: 'relative' }}>

        {/* Background for chat area */}
        <div style={{ position: 'absolute', inset: 0, background: T.bg, zIndex: 0 }}>
          <VaultRings T={T} />
          <ScanLine T={T} />
          <Noise T={T} />
          {/* Corner brackets on main area */}
          <CornerBrackets T={T} />
          {/* Animated grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${T.ringColor}0.03) 1px, transparent 1px), linear-gradient(90deg, ${T.ringColor}0.03) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        </div>

        {/* ── HEADER ── */}
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
          background: T.panelBg, backdropFilter: 'blur(20px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          position: 'relative', zIndex: 10,
        }}>
          {/* Status bar inside header */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: '100%', width: 1, background: `linear-gradient(180deg, ${T.accent}44, transparent)` }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSidebarOpen(true)} className="md:hidden" style={{
              width: 34, height: 34, flexShrink: 0,
              background: T.inputBg, border: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', color: T.text,
            }}>☰</motion.button>

            {/* Radar dot */}
            <div style={{ flexShrink: 0, position: 'relative', width: 10, height: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}`, position: 'absolute', top: 1, left: 1 }} />
              <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${T.green}`, animation: 'radar 2s infinite' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 8, letterSpacing: '0.2em', color: T.muted, textTransform: 'uppercase', lineHeight: 1, marginBottom: 2, fontWeight: 700 }}>// ACTIVE CHANNEL</p>
              <h1 style={{
                fontSize: 14, fontWeight: 900, letterSpacing: '0.06em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                background: `linear-gradient(90deg, ${T.text}, ${T.accent}CC)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: roomGlitch ? 'blur(0.3px)' : 'none',
              }}>▶ {roomDisplay}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
            {[
              { label: soundEnabled ? '🔔' : '🔕', onClick: () => setSoundEnabled(p => !p), danger: !soundEnabled },
              { label: 'WIPE', onClick: () => { if (confirm("Wipe all messages?")) fetch(`${API}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, { method: 'DELETE' }); }, danger: true },
              { label: 'EXIT', onClick: handleExit },
            ].map(({ label, onClick, danger }) => (
              <motion.button key={label} whileTap={{ scale: 0.9 }} onClick={onClick} style={{
                height: 30, padding: '0 8px', cursor: 'pointer',
                background: danger ? `${T.red}12` : T.inputBg,
                border: `1px solid ${danger ? T.red + '33' : T.border}`,
                color: danger ? T.red : T.muted,
                fontFamily: MONO, fontWeight: 700, fontSize: label.length > 2 ? 9 : 14,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>{label}</motion.button>
            ))}
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px', position: 'relative', zIndex: 5 }} className="sm:px-5">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => {
              const isMe = msg.author === myHandle;
              return (
                <motion.div key={msg._id} layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  style={{ display: 'flex', marginBottom: 14, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>

                  {!isMe && <div style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }}><Avatar name={msg.author} size={28} T={T} /></div>}

                  <div className="msg-group" style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', color: T.muted, textTransform: 'uppercase', marginBottom: 4, paddingLeft: 2, fontWeight: 700 }}>
                        @{msg.author} · {msg.time}
                      </p>
                    )}

                    <div style={{ position: 'relative' }}>
                      <div style={{
                        padding: '10px 14px',
                        background: isMe ? T.myBubble : T.otherBubble,
                        border: isMe ? `1px solid ${T.accent}55` : `1px solid ${T.otherBorder}`,
                        borderLeft: !isMe ? `2px solid ${T.accent}66` : undefined,
                        boxShadow: isMe ? T.myBubbleShadow : `0 2px 16px rgba(0,0,0,${isDark ? 0.4 : 0.08})`,
                        backdropFilter: 'blur(8px)',
                        position: 'relative',
                      }}>
                        {/* Hover toolbar */}
                        <div className="msg-toolbar" style={{
                          position: 'absolute', top: -36, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0,
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: T.panelBg, border: `1px solid ${T.border}`,
                          padding: '4px 8px', backdropFilter: 'blur(16px)',
                          boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 12px ${T.accent}18`,
                          opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s', zIndex: 10,
                        }}>
                          {['👍','❤️','🔥','😂'].map(emoji => (
                            <button key={emoji} onClick={() => handleReaction(msg._id, emoji)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '1px 2px', transition: 'transform 0.1s' }}
                              onMouseEnter={e => e.target.style.transform = 'scale(1.35)'}
                              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                            >{emoji}</button>
                          ))}
                          {isMe && !editingId && !msg._id?.startsWith('temp_') && (<>
                            <div style={{ width: 1, height: 12, background: T.border, margin: '0 2px' }} />
                            <button onClick={() => { setEditingId(msg._id); setEditText(msg.text || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.muted, padding: '1px 3px' }}>✎</button>
                            <button onClick={() => { if (confirm("Delete?")) fetch(`${API}/api/messages/${msg._id}`, { method: 'DELETE' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.red, padding: '1px 3px' }}>🗑</button>
                          </>)}
                        </div>

                        {msg.image && <img src={msg.image} alt="img" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', marginBottom: 6, display: 'block', border: `1px solid ${T.border}` }} />}
                        {msg.video && <video src={msg.video} controls style={{ width: '100%', maxHeight: 220, marginBottom: 6, display: 'block', background: '#000', border: `1px solid ${T.border}` }} />}

                        {editingId === msg._id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input style={{ padding: '8px 10px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: MONO, fontWeight: 600, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                              value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={saveEdit} style={{ padding: '4px 12px', background: T.green, border: 'none', color: isDark ? '#050508' : 'white', fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em' }}>SAVE</button>
                              <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>ESC</button>
                            </div>
                          </div>
                        ) : (<>
                          {msg.text && (
                            <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: isMe ? 'rgba(255,255,255,0.96)' : T.text, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
                              {msg.text}{isMe && <MessageTicks status={getTickStatus(msg, myHandle)} T={T} />}
                            </p>
                          )}
                          {(msg.image || msg.video) && isMe && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}><MessageTicks status={getTickStatus(msg, myHandle)} T={T} /></div>}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} style={{
                                  display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px',
                                  background: users.includes(myHandle) ? `${T.green}18` : T.inputBg,
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
                    {isMe && <p style={{ fontFamily: MONO, fontSize: 9, color: T.muted, marginTop: 3, paddingRight: 2 }}>{msg.time}</p>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing */}
          {typingStatus && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 36 }}>
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: T.otherBubble, border: `1px solid ${T.border}`, borderLeft: `2px solid ${T.accent}55`, backdropFilter: 'blur(8px)' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, animation: 'typingBounce 1s infinite', animationDelay: `${i*0.15}s` }} />)}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted, letterSpacing: '0.1em' }}>@{typingStatus} is typing_</span>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* ── INPUT BAR ── */}
        <div style={{
          borderTop: `1px solid ${inputFocused ? T.borderBright : T.border}`,
          background: T.panelBg, backdropFilter: 'blur(20px)', flexShrink: 0,
          position: 'relative', zIndex: 10, transition: 'border-color 0.2s',
        }}>
          {/* Panel label */}
          <div style={{ position: 'absolute', top: -10, left: 16, background: T.panelBg, padding: '0 8px', fontSize: 9, letterSpacing: '0.2em', color: T.labelColor, textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO }}>
            TRANSMIT
          </div>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div ref={emojiPickerRef}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                style={{
                  margin: '10px 10px 0', padding: 10, background: T.panelBg,
                  border: `1px solid ${T.border}`, backdropFilter: 'blur(20px)',
                  boxShadow: `0 -8px 32px rgba(0,0,0,0.4), 0 0 20px ${T.accent}12`,
                  display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, maxHeight: 130, overflowY: 'auto',
                }}>
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => insertEmoji(emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 3, transition: 'transform 0.1s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {(uploadingVideo || uploadingImage) && (
            <div style={{ margin: '6px 10px 0', padding: '5px 12px', background: `${T.accent}10`, border: `1px solid ${T.accent}25`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, animation: 'pulse 0.8s infinite' }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                {uploadingImage ? 'UPLOADING IMAGE...' : 'UPLOADING VIDEO...'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 10px', gap: 6 }}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />

            {[
              { icon: '📷', action: () => fileInputRef.current.click(), disabled: uploadingImage },
              { icon: '🎥', action: () => videoInputRef.current.click(), disabled: uploadingVideo },
              { icon: '😊', action: () => setShowEmojiPicker(p => !p), active: showEmojiPicker },
            ].map(({ icon, action, disabled, active }) => (
              <motion.button key={icon} whileTap={{ scale: 0.88 }} onClick={action} disabled={disabled} style={{
                width: 36, height: 36, flexShrink: 0,
                background: active ? `${T.accent}18` : T.inputBg,
                border: `1px solid ${active ? T.accent + '55' : T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, cursor: 'pointer', opacity: disabled ? 0.35 : 1, transition: 'all 0.15s',
                boxShadow: active ? `0 0 10px ${T.accent}22` : 'none',
              }}>{icon}</motion.button>
            ))}

            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: MONO, fontSize: 13, color: T.accent, pointerEvents: 'none', opacity: inputFocused || message ? 1 : 0.35, transition: 'opacity 0.2s', zIndex: 1 }}>›</span>
              <input type="text" value={message}
                onChange={e => { setMessage(e.target.value); handleTypingEmit(); }}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="type message..."
                style={{
                  width: '100%', padding: '10px 12px 10px 26px', boxSizing: 'border-box',
                  background: T.inputBg, border: `1px solid ${inputFocused ? T.borderBright : T.border}`,
                  color: T.text, fontFamily: MONO, fontSize: 13, fontWeight: 500,
                  outline: 'none', transition: 'border-color 0.2s',
                  boxShadow: inputFocused ? `0 0 12px ${T.accent}18` : 'none',
                }}
              />
            </div>

            <motion.button whileTap={{ scale: 0.88 }} onClick={sendMessage} style={{
              width: 36, height: 36, flexShrink: 0, border: `1px solid ${message.trim() ? T.accent + '55' : T.border}`,
              background: message.trim() ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})` : T.inputBg,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: message.trim() ? `0 0 16px ${T.accent}44` : 'none',
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
        @keyframes radar { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.8);opacity:0} }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.accent}33; border-radius: 2px; }
        input::placeholder { color: ${T.muted}; font-family: ${MONO}; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px ${T.bg} inset !important; -webkit-text-fill-color: ${T.text} !important; }
        .msg-group:hover .msg-toolbar { opacity: 1 !important; pointer-events: all !important; }
        .sidebar-room-group:hover .room-delete-btn { opacity: 1 !important; }
      `}</style>
    </main>
  );
}