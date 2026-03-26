"use client";

export const dynamic = 'force-dynamic';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MONO = "'SF Mono','Fira Code','Cascadia Code',monospace";

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤔","😅","😭","😡","🥱",
  "👍","👎","👏","🙌","🤝","🙏","💪","✌️","🤞","👀",
  "❤️","🔥","💯","✨","🎉","🎊","💀","👻","🤡","💩",
  "🍕","🍔","🍟","🌮","🍜","🍣","🍦","🍩","🧁","🍺",
  "😏","🫡","🫠","😤","🤯","🥳","😇","🤩","😴","🫶",
  "💬","📢","🚀","🌈","⚡","💥","🎯","🏆","💎","🕹️",
];

// ─── THEMES ───────────────────────────────────────────────────────────────────
const DARK = {
  bg: '#050508',
  cardBg: 'rgba(10,10,20,0.85)',
  border: 'rgba(168,85,247,0.2)',
  borderFocus: 'rgba(168,85,247,0.5)',
  text: '#E8E8F0',
  textDim: 'rgba(255,255,255,0.25)',
  accent: 'rgba(168,85,247,1)',
  accentRaw: '168,85,247',
  accentGrad: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(124,58,237,0.9))',
  titleGrad: 'linear-gradient(180deg, #FFFFFF 0%, rgba(168,85,247,0.9) 100%)',
  green: '#10F5A0',
  greenRaw: '16,245,160',
  red: '#FF4B6E',
  redRaw: '255,75,110',
  inputBg: 'rgba(255,255,255,0.02)',
  inputBgFocus: 'rgba(168,85,247,0.06)',
  scanLine: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), rgba(16,245,160,0.2), transparent)',
  corner: 'rgba(168,85,247,0.4)',
  myBubble: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(109,40,217,0.85))',
  myBubbleShadow: '0 4px 20px rgba(168,85,247,0.3)',
  otherBubble: 'rgba(10,10,20,0.9)',
  otherBorder: 'rgba(168,85,247,0.18)',
  otherAccent: 'rgba(168,85,247,0.5)',
  labelBg: '#050508',
};

const LIGHT = {
  bg: '#0A0A14',
  cardBg: 'rgba(15,10,35,0.92)',
  border: 'rgba(245,197,66,0.2)',
  borderFocus: 'rgba(245,197,66,0.55)',
  text: '#F0EAD6',
  textDim: 'rgba(240,234,214,0.28)',
  accent: 'rgba(245,197,66,1)',
  accentRaw: '245,197,66',
  accentGrad: 'linear-gradient(135deg, rgba(245,197,66,0.9), rgba(217,119,6,0.9))',
  titleGrad: 'linear-gradient(180deg, #FFFFFF 0%, rgba(245,197,66,0.9) 100%)',
  green: '#00E5CC',
  greenRaw: '0,229,204',
  red: '#FF4B6E',
  redRaw: '255,75,110',
  inputBg: 'rgba(255,255,255,0.02)',
  inputBgFocus: 'rgba(245,197,66,0.06)',
  scanLine: 'linear-gradient(90deg, transparent, rgba(245,197,66,0.35), rgba(0,229,204,0.2), transparent)',
  corner: 'rgba(245,197,66,0.45)',
  myBubble: 'linear-gradient(135deg, rgba(245,197,66,0.85), rgba(217,119,6,0.8))',
  myBubbleShadow: '0 4px 20px rgba(245,197,66,0.25)',
  otherBubble: 'rgba(10,8,25,0.9)',
  otherBorder: 'rgba(245,197,66,0.18)',
  otherAccent: 'rgba(245,197,66,0.5)',
  labelBg: '#0A0A14',
};

// ─── GLITCH HOOK ──────────────────────────────────────────────────────────────
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
      iter += 0.4;
      if (iter >= text.length) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [active, text]);
  return display;
}

// ─── VAULT RINGS ──────────────────────────────────────────────────────────────
function VaultRings({ T }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
      {[700, 560, 420, 300].map((size, i) => (
        <motion.div key={size}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute', width: size, height: size, borderRadius: '50%',
            border: `1px solid rgba(${T.accentRaw},${0.03 + i * 0.02})`,
            boxShadow: `inset 0 0 ${20 + i * 10}px rgba(${T.accentRaw},${0.02 + i * 0.01})`,
          }}>
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <div key={deg} style={{
              position: 'absolute', width: 4, height: 4, borderRadius: '50%',
              background: `rgba(${T.accentRaw},${0.2 + i * 0.1})`,
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateX(${size / 2 - 2}px) translateY(-50%)`,
              boxShadow: `0 0 6px rgba(${T.accentRaw},0.5)`,
            }} />
          ))}
        </motion.div>
      ))}
      <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, rgba(${T.accentRaw},0.12) 0%, transparent 70%)` }} />
    </div>
  );
}

// ─── SCANLINE ─────────────────────────────────────────────────────────────────
function ScanLine({ T }) {
  return (
    <motion.div
      animate={{ y: ['0%', '100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
      style={{ position: 'absolute', left: 0, right: 0, height: 2, pointerEvents: 'none', background: T.scanLine, zIndex: 5 }}
    />
  );
}

// ─── NOISE ────────────────────────────────────────────────────────────────────
function Noise() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      opacity: 0.4,
    }} />
  );
}

// ─── CORNER BRACKETS ──────────────────────────────────────────────────────────
function Corners({ T, size = 40, offset = 20 }) {
  return (
    <>
      {[
        { top: offset, left: offset, rotate: 0 },
        { top: offset, right: offset, rotate: 90 },
        { bottom: offset, right: offset, rotate: 180 },
        { bottom: offset, left: offset, rotate: 270 },
      ].map((pos, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
          style={{
            position: 'absolute', ...pos, width: size, height: size,
            pointerEvents: 'none', zIndex: 6,
            transform: `rotate(${pos.rotate}deg)`,
            borderTop: `1px solid ${T.corner}`,
            borderLeft: `1px solid ${T.corner}`,
          }} />
      ))}
    </>
  );
}

// ─── PANEL LABEL ──────────────────────────────────────────────────────────────
function PanelLabel({ text, T }) {
  return (
    <div style={{
      position: 'absolute', top: -10, left: 16,
      background: T.labelBg, padding: '0 8px',
      fontSize: 9, letterSpacing: '0.2em',
      color: `rgba(${T.accentRaw},0.7)`,
      textTransform: 'uppercase', fontWeight: 700,
      fontFamily: MONO, zIndex: 2,
    }}>{text}</div>
  );
}

// ─── TICKS ────────────────────────────────────────────────────────────────────
function MessageTicks({ status, T }) {
  if (status === 'sending') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.4 }}>
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={T.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  if (status === 'delivered') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.55 }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={T.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5L9 8L16 1" stroke={T.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  const palette = ['rgba(168,85,247,1)', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];
  const color = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`,
      border: `1px solid ${color}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO, fontWeight: 900, fontSize: size * 0.38, color,
      boxShadow: `0 0 10px ${color}33`,
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ rooms, activeRoom, onJoin, onDelete, onCreateClick, onClose, onToggleTheme, isDark, myHandle, onlineUsers, showClose, unreadRooms, T }) {
  const [titleGlitch, setTitleGlitch] = useState(false);
  const sidebarTitle = useGlitchText("THE VAULT", titleGlitch);

  useEffect(() => {
    setTimeout(() => setTitleGlitch(true), 400);
    setTimeout(() => setTitleGlitch(false), 2000);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, fontFamily: MONO, position: 'relative', overflow: 'hidden' }}>
      <VaultRings T={T} />
      <ScanLine T={T} />
      <Noise />
      <Corners T={T} size={20} offset={10} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ padding: '14px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: T.textDim, textTransform: 'uppercase' }}>VAULT OS · LIVE</span>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
        </motion.div>

        <div style={{ textAlign: 'center', padding: '10px 14px 14px' }}>
          <motion.h1 style={{
            fontSize: 'clamp(26px, 5vw, 32px)', fontWeight: 900, letterSpacing: '0.12em', margin: 0, lineHeight: 1,
            fontFamily: MONO, background: T.titleGrad,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: titleGlitch ? 'blur(0.5px)' : 'none',
          }}>{sidebarTitle}</motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ flex: 1, maxWidth: 30, height: 1, background: `linear-gradient(90deg, transparent, rgba(${T.accentRaw},0.5))` }} />
            <span style={{ fontSize: 8, letterSpacing: '0.2em', color: `rgba(${T.accentRaw},0.7)`, textTransform: 'uppercase', fontWeight: 700 }}>COMMAND CENTER</span>
            <div style={{ flex: 1, maxWidth: 30, height: 1, background: `linear-gradient(90deg, rgba(${T.accentRaw},0.5), transparent)` }} />
          </motion.div>
        </div>

        <div style={{ padding: '0 14px 14px' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 4, padding: '16px 14px 14px', position: 'relative', boxShadow: `0 0 30px rgba(${T.accentRaw},0.06), inset 0 1px 0 rgba(255,255,255,0.04)`, backdropFilter: 'blur(12px)' }}>
            <PanelLabel text="AUTHENTICATED" T={T} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={myHandle} size={30} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 9, letterSpacing: '0.15em', color: T.textDim, textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>// HANDLE</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{myHandle}</p>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, boxShadow: `0 0 10px ${T.green}`, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={onToggleTheme}
                style={{ flex: 1, padding: '7px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, color: T.textDim, fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderFocus; e.currentTarget.style.color = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim; }}
              >{isDark ? '☀ LIGHT MODE' : '🌙 DARK MODE'}</button>
              {showClose && (
                <button onClick={onClose} style={{ padding: '7px 10px', background: `rgba(${T.redRaw},0.08)`, border: `1px solid rgba(${T.redRaw},0.3)`, borderRadius: 4, color: T.red, fontFamily: MONO, fontWeight: 700, fontSize: 9, cursor: 'pointer' }}>✕</button>
              )}
            </div>
          </motion.div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onCreateClick(); onClose?.(); }}
            style={{ width: '100%', padding: '10px 12px', marginBottom: 12, background: 'transparent', border: `1px dashed rgba(${T.accentRaw},0.35)`, borderRadius: 4, color: T.accent, fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = `rgba(${T.accentRaw},0.08)`; e.currentTarget.style.borderColor = `rgba(${T.accentRaw},0.6)`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `rgba(${T.accentRaw},0.35)`; }}
          >+ NEW_SPACE</motion.button>

          <p style={{ fontSize: 9, letterSpacing: '0.22em', color: T.textDim, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2, fontWeight: 700 }}>// CHANNELS</p>

          {rooms.map((room) => {
            const isActive = activeRoom.name === room.name;
            return (
              <div key={room.name} className="sidebar-room-group" style={{ position: 'relative', marginBottom: 3 }}>
                <button onClick={() => onJoin(room)} style={{
                  width: '100%', padding: '9px 10px 9px 12px',
                  background: isActive ? `rgba(${T.accentRaw},0.1)` : 'transparent',
                  border: `1px solid ${isActive ? `rgba(${T.accentRaw},0.35)` : 'transparent'}`,
                  borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  textAlign: 'left', position: 'relative', overflow: 'hidden',
                  boxShadow: isActive ? `0 0 14px rgba(${T.accentRaw},0.15)` : 'none',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `rgba(${T.accentRaw},0.05)`; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, ${T.accent}, ${T.green})` }} />}
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: isActive ? 700 : 400, color: isActive ? T.accent : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>
                    {isActive ? '▶ ' : '  '}{room.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {room.password && <span style={{ fontSize: 9, opacity: 0.35 }}>🔒</span>}
                    {unreadRooms.has(room.name) && !isActive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.red, display: 'block', boxShadow: `0 0 8px ${T.red}` }} />}
                  </div>
                </button>
                {room.name !== "General Vibes #1" && (
                  <button className="room-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(room.name); }}
                    style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', opacity: 0, width: 18, height: 18, borderRadius: '50%', background: T.red, border: 'none', color: 'white', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', zIndex: 20 }}>✕</button>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 9, letterSpacing: '0.22em', color: T.textDim, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>// ONLINE [{onlineUsers.length}]</p>
            {onlineUsers.map((user, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, boxShadow: `0 0 7px ${T.green}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{typeof user === 'object' ? user.handle : user}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          {['SECURE', 'E2E', 'PRIVATE'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: `rgba(${T.greenRaw},0.6)` }} />
              <span style={{ fontSize: 8, letterSpacing: '0.15em', color: T.textDim, fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function ChatDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pendingJoinRoom = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const audioCtxRef = useRef(null);

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
  const [headerGlitch, setHeaderGlitch] = useState(false);

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const T = isDark ? DARK : LIGHT;
  const roomTitle = useGlitchText(activeRoom.name.toUpperCase(), headerGlitch);

  // Close emoji picker on outside click
  useEffect(() => {
    const h = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Mount: load user from localStorage
  useEffect(() => {
    setMounted(true);
    const name = localStorage.getItem("vault_user");
    if (!name) { router.replace('/'); return; }
    setMyHandle(name);
    setIsDark(localStorage.getItem("vault_theme") !== "light");
    const roomFromNotification = searchParams.get('room');
    if (roomFromNotification) pendingJoinRoom.current = roomFromNotification;
  }, [router, searchParams]);

  // ─── PUSH NOTIFICATION REGISTRATION ───────────────────────────────────────
  useEffect(() => {
    if (!myHandle || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
    };

    const registerPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const res = await fetch(`${API}/api/vapid-public-key`);
        const { publicKey } = await res.json();
        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        await fetch(`${API}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: myHandle, subscription }),
        });
      } catch (err) {
        console.error('Push registration failed:', err);
      }
    };

    registerPush();
  }, [myHandle]);

  // Socket: persistent event listeners
  useEffect(() => {
    if (!myHandle) return;
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(API, { forceNew: false });
    }
    const s = socketRef.current;
    s.on("online_users", setOnlineUsers);
    s.on("message_delivered", ({ tempId, message: m }) => {
      setChatHistory(p => p.map(x => x._id === tempId ? m : x));
    });
    s.on("message_seen_update", ({ _id, seenBy }) => {
      setChatHistory(p => p.map(x => x._id === _id ? { ...x, seenBy } : x));
    });
    s.on("message_deleted", id => setChatHistory(p => p.filter(x => x._id !== id)));
    s.on("message_edited", u => setChatHistory(p => p.map(x => x._id === u._id ? u : x)));
    s.on("room_created", r => setRooms(p => p.find(x => x.name === r.name) ? p : [...p, r]));
    s.on("room_deleted", n => {
      setRooms(p => p.filter(r => r.name !== n));
      setActiveRoom(c => c.name === n ? { name: "General Vibes #1" } : c);
    });
    return () => {
      ['online_users','message_delivered','message_seen_update','message_deleted','message_edited','room_created','room_deleted']
        .forEach(e => s.off(e));
    };
  }, [myHandle]);

  // Room change: load history + join socket room
  useEffect(() => {
    if (!myHandle) return;

    setHeaderGlitch(true);
    setTimeout(() => setHeaderGlitch(false), 900);

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
        const allRooms = [
          { name: "General Vibes #1", password: "" },
          ...(Array.isArray(data) ? data : []).filter(r => r.name !== "General Vibes #1")
        ];
        setRooms(allRooms);
        if (pendingJoinRoom.current) {
          const target = allRooms.find(r => r.name === pendingJoinRoom.current);
          pendingJoinRoom.current = null;
          if (target) attemptJoin(target);
        }
      } catch {
        setRooms([{ name: "General Vibes #1", password: "" }]);
      }
    };

    loadHistory();
    loadRooms();
    setUnreadRooms(p => { const n = new Set(p); n.delete(activeRoom.name); return n; });

    const s = socketRef.current;
    if (!s) return;

    s.emit('join_vault', { handle: myHandle, room: activeRoom.name });
    s.emit('mark_seen', { room: activeRoom.name, handle: myHandle });

    const onMsg = (data) => {
      if (data.room === activeRoom.name) {
        setChatHistory(p => p.some(m => m._id === data._id) ? p : [...p, data]);
        s.emit('mark_seen', { room: activeRoom.name, handle: myHandle });
        if (data.author !== myHandle) playNotification();
      } else {
        setUnreadRooms(p => new Set([...p, data.room]));
      }
    };
    const onTyping = (d) => {
      if (d.room === activeRoom.name && d.handle !== myHandle)
        setTypingStatus(d.isTyping ? d.handle : null);
    };
    const onClear = (n) => { if (activeRoom.name === n) setChatHistory([]); };

    s.on("receive_message", onMsg);
    s.on("user_typing", onTyping);
    s.on("room_cleared", onClear);

    return () => {
      s.off("receive_message", onMsg);
      s.off("user_typing", onTyping);
      s.off("room_cleared", onClear);
    };
  }, [myHandle, activeRoom.name]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const playNotification = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const tone = (freq, t, dur, gain) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), c = ctx.createDynamicsCompressor();
        o.connect(g); g.connect(c); c.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.start(t); o.stop(t + dur + 0.01);
      };
      const n = ctx.currentTime;
      tone(520, n, 0.12, 0.8);
      tone(780, n + 0.1, 0.18, 0.7);
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
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: false });
    }, 2000);
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.name || !newRoomData.password) return alert("Fill all fields!");
    const res = await fetch(`${API}/api/rooms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoomData),
    });
    if (res.ok) { setShowCreateModal(false); setNewRoomData({ name: "", password: "" }); }
    else alert("Error creating room.");
  };

  const confirmDeleteRoom = async () => {
    const res = await fetch(`${API}/api/rooms/${encodeURIComponent(roomToDelete)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (res.ok) { setRoomToDelete(null); setDeletePassword(""); }
    else alert("Incorrect Room Key!");
  };

  const attemptJoin = (room) => {
    if (!room.password || room.name === "General Vibes #1") {
      setActiveRoom(room);
      setSidebarOpen(false);
      setUnreadRooms(p => { const n = new Set(p); n.delete(room.name); return n; });
    } else {
      setRoomToJoin(room);
    }
  };

  const verifyPassword = () => {
    if (joinPassword === roomToJoin.password) {
      setActiveRoom(roomToJoin);
      setUnreadRooms(p => { const n = new Set(p); n.delete(roomToJoin.name); return n; });
      setRoomToJoin(null); setJoinPassword(""); setSidebarOpen(false);
    } else alert("Wrong Password!");
  };

  const toggleTheme = () => {
    const n = !isDark; setIsDark(n);
    localStorage.setItem("vault_theme", n ? "dark" : "light");
  };

  const handleReaction = (id, emoji) => {
    socketRef.current?.emit("react_message", { messageId: id, emoji, handle: myHandle, room: activeRoom.name });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploadingImage(true);
    try {
      const blob = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 1200;
          const scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed')), 'image/jpeg', 0.75);
        };
        img.src = url;
      });

      const fd = new FormData();
      fd.append('image', blob, 'image.jpg');
      const res = await fetch(`${API}/api/upload/image`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tempId = `temp_${Date.now()}`;

      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, image: json.url, time, seenBy: [myHandle] };
      setChatHistory(p => [...p, tempMsg]);

      socketRef.current.emit("send_message", {
        room: activeRoom.name, author: myHandle, image: json.url, time, seenBy: [myHandle], tempId,
      });
    } catch (err) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return alert("Video must be under 50MB!");
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      const res = await fetch(`${API}/api/upload/video`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tempId = `temp_${Date.now()}`;

      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, video: url, time, seenBy: [myHandle] };
      setChatHistory(p => [...p, tempMsg]);

      socketRef.current.emit("send_message", {
        room: activeRoom.name, author: myHandle, video: url, time, seenBy: [myHandle], tempId,
      });
    } catch {
      alert("Video upload failed.");
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current) return;
    const tempId = `temp_${Date.now()}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(p => [...p, { _id: tempId, room: activeRoom.name, author: myHandle, text: message, time, seenBy: [myHandle] }]);
    socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, text: message, time, tempId });
    setMessage("");
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    fetch(`${API}/api/messages/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText }),
    });
    setEditingId(null);
  };

  if (!mounted) return <div style={{ height: '100dvh', background: '#050508' }} />;
  if (!myHandle) return <div style={{ height: '100dvh', background: '#050508' }} />;

  const sidebarProps = {
    rooms, activeRoom,
    onJoin: attemptJoin,
    onDelete: n => setRoomToDelete(n),
    onCreateClick: () => setShowCreateModal(true),
    onClose: () => setSidebarOpen(false),
    onToggleTheme: toggleTheme,
    isDark, myHandle, onlineUsers, unreadRooms, T,
  };

  const ModalField = ({ label, placeholder, type = "text", value, onChange, onKeyDown, autoFocus }) => {
    const [foc, setFoc] = useState(false);
    return (
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, color: foc ? T.accent : T.textDim, textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO, transition: 'color 0.2s' }}>{label}</p>
        <div style={{ position: 'relative' }}>
          <input type={type} placeholder={placeholder} value={value} onChange={onChange}
            onKeyDown={onKeyDown} autoFocus={autoFocus}
            onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
            style={{ width: '100%', padding: '12px 14px', background: foc ? T.inputBgFocus : T.inputBg, border: `1px solid ${foc ? T.borderFocus : T.border}`, borderRadius: 4, color: T.text, fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: MONO, transition: 'all 0.2s', boxSizing: 'border-box', letterSpacing: type === 'password' ? '0.1em' : '0.02em' }}
          />
          <motion.div animate={{ scaleX: foc ? 1 : 0 }} transition={{ duration: 0.2 }}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, transformOrigin: 'left', background: `linear-gradient(90deg, ${T.accent}, rgba(${T.greenRaw},0.4))` }} />
        </div>
      </div>
    );
  };

  return (
    <main style={{
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      display: 'flex', background: T.bg, fontFamily: MONO, overflow: 'hidden',
    }}>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              style={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 20px' }}>
              <VaultRings T={T} />
              <ScanLine T={T} />
              <Noise />
              <Corners T={T} size={24} offset={14} />
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <motion.h1 style={{
                    fontSize: 'clamp(28px, 8vw, 42px)', fontWeight: 900, letterSpacing: '0.12em', margin: 0, lineHeight: 1, fontFamily: MONO,
                    background: roomToDelete ? `linear-gradient(180deg, #FFFFFF 0%, ${T.red} 100%)` : T.titleGrad,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {roomToDelete ? 'DELETE SPACE' : showCreateModal ? 'NEW SPACE' : roomToJoin?.name?.toUpperCase()}
                  </motion.h1>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ flex: 1, maxWidth: 50, height: 1, background: `linear-gradient(90deg, transparent, rgba(${T.accentRaw},0.5))` }} />
                    <span style={{ fontSize: 9, letterSpacing: '0.2em', color: roomToDelete ? T.red : `rgba(${T.accentRaw},0.7)`, textTransform: 'uppercase', fontWeight: 700 }}>
                      {roomToDelete ? '// DANGER ZONE' : showCreateModal ? '// INITIALIZE' : '// ACCESS REQUEST'}
                    </span>
                    <div style={{ flex: 1, maxWidth: 50, height: 1, background: `linear-gradient(90deg, rgba(${T.accentRaw},0.5), transparent)` }} />
                  </div>
                </div>
                <div style={{ background: T.cardBg, border: `1px solid ${roomToDelete ? `rgba(${T.redRaw},0.3)` : T.border}`, borderRadius: 4, padding: '28px 24px', backdropFilter: 'blur(20px)', position: 'relative', boxShadow: `0 0 60px rgba(${T.accentRaw},0.08), inset 0 1px 0 rgba(255,255,255,0.05)` }}>
                  <div style={{ position: 'absolute', top: -10, left: 16, background: T.bg, padding: '0 8px', fontSize: 9, letterSpacing: '0.2em', color: roomToDelete ? T.red : `rgba(${T.accentRaw},0.7)`, textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO }}>
                    {roomToDelete ? 'CONFIRM DESTRUCTION' : showCreateModal ? 'SPACE CONFIGURATION' : 'IDENTITY VERIFICATION'}
                  </div>
                  {showCreateModal && (
                    <ModalField label="// SPACE NAME" placeholder="channel-name..."
                      value={newRoomData.name} onChange={e => setNewRoomData({ ...newRoomData, name: e.target.value })} />
                  )}
                  <ModalField
                    label={roomToDelete ? "// ROOM KEY" : "// ACCESS KEY"}
                    placeholder={roomToDelete ? "enter key to confirm..." : showCreateModal ? "set secret key..." : "enter secret key..."}
                    type="password"
                    value={roomToDelete ? deletePassword : showCreateModal ? newRoomData.password : joinPassword}
                    onChange={e => roomToDelete ? setDeletePassword(e.target.value) : showCreateModal ? setNewRoomData({ ...newRoomData, password: e.target.value }) : setJoinPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (roomToDelete ? confirmDeleteRoom() : showCreateModal ? handleCreateRoom() : verifyPassword())}
                    autoFocus={!showCreateModal}
                  />
                  <motion.button whileTap={{ scale: 0.98 }}
                    onClick={roomToDelete ? confirmDeleteRoom : showCreateModal ? handleCreateRoom : verifyPassword}
                    style={{ width: '100%', padding: '13px', background: roomToDelete ? `linear-gradient(135deg, rgba(${T.redRaw},0.9), rgba(${T.redRaw},0.7))` : T.accentGrad, border: `1px solid ${roomToDelete ? `rgba(${T.redRaw},0.5)` : `rgba(${T.accentRaw},0.5)`}`, borderRadius: 4, color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: MONO, boxShadow: `0 0 20px rgba(${roomToDelete ? T.redRaw : T.accentRaw},0.2)` }}>
                    {roomToDelete ? 'DESTROY SPACE' : showCreateModal ? 'CREATE_SPACE()' : 'GRANT_ACCESS()'}
                  </motion.button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    <button onClick={() => { setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword(""); }}
                      style={{ background: 'transparent', border: 'none', color: T.textDim, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0 8px' }}>
                      [ESC] CANCEL
                    </button>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                  {['E2E ENCRYPTED', 'NO LOGS', 'PRIVATE'].map((label, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: `rgba(${T.greenRaw},0.6)` }} />
                      <span style={{ fontSize: 8, letterSpacing: '0.15em', color: T.textDim, fontWeight: 700 }}>{label}</span>
                    </div>
                  ))}
                </div>
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
            style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            className="md:hidden" />
        )}
      </AnimatePresence>

      {/* ── MOBILE SIDEBAR ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', top: 0, left: 0, width: 280, zIndex: 40, height: '100dvh', borderRight: `1px solid ${T.border}`, overflow: 'hidden' }}
            className="md:hidden">
            <Sidebar {...sidebarProps} showClose={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DESKTOP SIDEBAR ── */}
      <div style={{ width: 265, borderRight: `1px solid ${T.border}`, flexShrink: 0, height: '100%', overflow: 'hidden' }}
        className="hidden md:block">
        <Sidebar {...sidebarProps} showClose={false} />
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, position: 'relative' }}>

        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VaultRings T={T} />
          <ScanLine T={T} />
          <Noise />
          <Corners T={T} />
        </div>

        {/* ── HEADER ── */}
        <div style={{
          padding: '0 14px', height: 56,
          borderBottom: `1px solid ${T.border}`,
          background: T.cardBg, backdropFilter: 'blur(20px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, position: 'relative', zIndex: 10,
          boxShadow: `inset 0 -1px 0 rgba(${T.accentRaw},0.1)`,
        }}>
          <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: T.cardBg, padding: '0 8px', fontSize: 9, letterSpacing: '0.2em', color: `rgba(${T.accentRaw},0.5)`, textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: MONO }}>
            TRANSMISSION CHANNEL
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSidebarOpen(true)} className="md:hidden"
              style={{ width: 34, height: 34, flexShrink: 0, background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', color: T.text }}>☰</motion.button>

            <div style={{ flexShrink: 0, position: 'relative', width: 10, height: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}`, position: 'absolute', top: 1, left: 1 }} />
              <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${T.green}`, animation: 'radar 2s infinite' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 8, letterSpacing: '0.22em', color: T.textDim, textTransform: 'uppercase', lineHeight: 1, marginBottom: 3, fontWeight: 700 }}>// ACTIVE CHANNEL</p>
              <h1 style={{
                fontSize: 15, fontWeight: 900, letterSpacing: '0.08em', margin: 0, lineHeight: 1,
                background: T.titleGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: headerGlitch ? 'blur(0.4px)' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: MONO,
              }}>{roomTitle}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setSoundEnabled(p => !p)}
              style={{ height: 30, width: 30, background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer' }}>
              {soundEnabled ? "🔔" : "🔕"}
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => { if (confirm("Wipe all messages?")) fetch(`${API}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, { method: 'DELETE' }); }}
              style={{ height: 30, padding: '0 10px', background: `rgba(${T.redRaw},0.08)`, border: `1px solid rgba(${T.redRaw},0.25)`, borderRadius: 4, color: T.red, fontFamily: MONO, fontWeight: 800, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
              WIPE
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleExit}
              style={{ height: 30, padding: '0 10px', background: T.accentGrad, border: `1px solid rgba(${T.accentRaw},0.4)`, borderRadius: 4, color: 'white', fontFamily: MONO, fontWeight: 800, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 0 14px rgba(${T.accentRaw},0.2)` }}>
              EXIT VAULT
            </motion.button>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 14px 14px', position: 'relative', zIndex: 5 }}
          className="sm:px-6">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => {
              const isMe = msg.author === myHandle;
              return (
                <motion.div key={msg._id} layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  style={{ display: 'flex', marginBottom: 16, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>

                  {!isMe && <div style={{ marginRight: 8, marginTop: 2 }}><Avatar name={msg.author} size={28} /></div>}

                  <div className="msg-group" style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <p style={{ fontSize: 9, letterSpacing: '0.14em', color: T.textDim, textTransform: 'uppercase', marginBottom: 4, paddingLeft: 2, fontWeight: 700, fontFamily: MONO }}>
                        @{msg.author} · {msg.time}
                      </p>
                    )}

                    <div style={{ position: 'relative' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: 4,
                        background: isMe ? T.myBubble : T.otherBubble,
                        border: `1px solid ${isMe ? `rgba(${T.accentRaw},0.4)` : T.otherBorder}`,
                        borderLeft: !isMe ? `2px solid ${T.otherAccent}` : undefined,
                        boxShadow: isMe ? T.myBubbleShadow : '0 2px 16px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {isMe && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'rgba(255,255,255,0.2)' }} />}

                        <div className="msg-toolbar" style={{
                          position: 'absolute', top: -38, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0,
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: T.cardBg, border: `1px solid ${T.border}`,
                          borderRadius: 4, padding: '5px 8px', backdropFilter: 'blur(20px)',
                          boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
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
                            <button onClick={() => { setEditingId(msg._id); setEditText(msg.text || ''); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.textDim, padding: '1px 3px' }}>✎</button>
                            <button onClick={() => { if (confirm("Delete?")) fetch(`${API}/api/messages/${msg._id}`, { method: 'DELETE' }); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.red, padding: '1px 3px' }}>🗑</button>
                          </>)}
                        </div>

                        {msg.image && (
                          <img src={msg.image} alt="img" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 4, marginBottom: msg.text ? 8 : 0, display: 'block', border: `1px solid rgba(${T.accentRaw},0.2)` }} />
                        )}
                        {msg.video && (
                          <video src={msg.video} controls style={{ width: '100%', maxHeight: 220, borderRadius: 4, marginBottom: msg.text ? 8 : 0, display: 'block', background: '#000' }} />
                        )}

                        {editingId === msg._id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                              style={{ padding: '8px 10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontFamily: MONO, fontWeight: 600, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                              value={editText} onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={saveEdit} style={{ padding: '4px 12px', background: `linear-gradient(135deg, rgba(${T.greenRaw},0.85), rgba(${T.greenRaw},0.65))`, border: 'none', borderRadius: 4, color: T.bg, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SAVE</button>
                              <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, color: T.textDim, fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>[ESC]</button>
                            </div>
                          </div>
                        ) : (<>
                          {msg.text && (
                            <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: isMe ? 'rgba(255,255,255,0.95)' : T.text, wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'SF Pro Display',-apple-system,sans-serif" }}>
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
                                <button key={emoji} onClick={() => handleReaction(msg._id, emoji)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: users.includes(myHandle) ? `rgba(${T.greenRaw},0.15)` : T.inputBg, border: `1px solid ${users.includes(myHandle) ? `rgba(${T.greenRaw},0.4)` : T.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                                  <span>{emoji}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: users.includes(myHandle) ? T.green : T.textDim, fontFamily: MONO }}>{users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>)}
                      </div>
                    </div>
                    {isMe && <p style={{ fontFamily: MONO, fontSize: 9, color: T.textDim, marginTop: 3, paddingRight: 2 }}>{msg.time}</p>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {typingStatus && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 36 }}>
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: T.otherBubble, border: `1px solid ${T.border}`, borderLeft: `2px solid ${T.otherAccent}`, borderRadius: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, animation: 'typingBounce 1s infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.textDim, letterSpacing: '0.12em' }}>@{typingStatus} is typing_</span>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* ── INPUT BAR ── */}
        <div style={{
          borderTop: `1px solid ${inputFocused ? T.borderFocus : T.border}`,
          background: T.cardBg, backdropFilter: 'blur(20px)',
          flexShrink: 0, position: 'relative', zIndex: 10,
          transition: 'border-color 0.2s',
          boxShadow: `0 0 40px rgba(${T.accentRaw},0.05)`,
        }}>
          <div style={{ position: 'absolute', top: -10, left: 16, background: T.cardBg, padding: '0 8px', fontSize: 9, letterSpacing: '0.2em', color: `rgba(${T.accentRaw},0.6)`, textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO }}>
            TRANSMIT
          </div>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div ref={emojiPickerRef}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                style={{ margin: '10px 10px 0', padding: 10, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 4, backdropFilter: 'blur(20px)', boxShadow: `0 -8px 32px rgba(0,0,0,0.5)`, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, maxHeight: 130, overflowY: 'auto' }}>
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => { setMessage(p => p + emoji); setShowEmojiPicker(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 3, transition: 'transform 0.1s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {(uploadingVideo || uploadingImage) && (
            <div style={{ margin: '8px 10px 0', padding: '6px 12px', background: `rgba(${T.accentRaw},0.08)`, border: `1px solid rgba(${T.accentRaw},0.2)`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                style={{ fontSize: 11, color: T.accent }}>▋</motion.span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.accent, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                {uploadingImage ? 'UPLOADING IMAGE...' : 'UPLOADING VIDEO...'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 10px', gap: 6 }}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />

            {[
              { icon: '📷', action: () => fileInputRef.current?.click(), disabled: uploadingImage },
              { icon: '🎥', action: () => videoInputRef.current?.click(), disabled: uploadingVideo },
              { icon: '😊', action: () => setShowEmojiPicker(p => !p), active: showEmojiPicker },
            ].map(({ icon, action, disabled, active }) => (
              <motion.button key={icon} whileTap={{ scale: 0.88 }} onClick={action} disabled={disabled}
                style={{ width: 36, height: 36, flexShrink: 0, background: active ? `rgba(${T.accentRaw},0.12)` : T.inputBg, border: `1px solid ${active ? `rgba(${T.accentRaw},0.45)` : T.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', opacity: disabled ? 0.35 : 1, transition: 'all 0.15s', boxShadow: active ? `0 0 10px rgba(${T.accentRaw},0.2)` : 'none' }}>
                {icon}
              </motion.button>
            ))}

            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: MONO, fontSize: 13, color: T.accent, pointerEvents: 'none', opacity: inputFocused || message ? 1 : 0.3, transition: 'opacity 0.2s', zIndex: 1 }}>›</span>
              <input type="text" value={message}
                onChange={e => { setMessage(e.target.value); handleTypingEmit(); }}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="type message..."
                style={{ width: '100%', padding: '10px 12px 10px 26px', boxSizing: 'border-box', background: inputFocused ? T.inputBgFocus : T.inputBg, border: `1px solid ${inputFocused ? T.borderFocus : T.border}`, borderRadius: 4, color: T.text, fontFamily: MONO, fontSize: 13, fontWeight: 500, outline: 'none', transition: 'all 0.2s', boxShadow: inputFocused ? `0 0 14px rgba(${T.accentRaw},0.12)` : 'none' }}
              />
              <motion.div animate={{ scaleX: inputFocused ? 1 : 0 }} transition={{ duration: 0.2 }}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, transformOrigin: 'left', background: `linear-gradient(90deg, ${T.accent}, rgba(${T.greenRaw},0.4))` }} />
            </div>

            <motion.button whileTap={{ scale: 0.88 }} onClick={sendMessage}
              style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s', background: message.trim() ? T.accentGrad : T.inputBg, border: `1px solid ${message.trim() ? `rgba(${T.accentRaw},0.5)` : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: message.trim() ? `0 0 16px rgba(${T.accentRaw},0.3)` : 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={message.trim() ? "white" : T.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={message.trim() ? "white" : T.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes radar { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.8);opacity:0} }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(${T.accentRaw},0.2); border-radius: 2px; }
        input::placeholder { color: rgba(255,255,255,0.15); font-family: ${MONO}; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px ${T.bg} inset !important;
          -webkit-text-fill-color: ${T.text} !important;
        }
        .msg-group:hover .msg-toolbar { opacity: 1 !important; pointer-events: all !important; }
        .sidebar-room-group:hover .room-delete-btn { opacity: 1 !important; }
      `}</style>
    </main>
  );
}

export default function ChatDashboard() {
  return (
    <Suspense fallback={<div style={{ height: '100dvh', background: '#050508' }} />}>
      <ChatDashboardInner />
    </Suspense>
  );
}