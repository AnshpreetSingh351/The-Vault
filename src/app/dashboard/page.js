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

// Premium color palette
const C = {
  purple: "#A855F7",
  purpleDim: "#7C3AED",
  green: "#10F5A0",
  red: "#FF4B6E",
  gold: "#F5C542",
  darkBg: "#0A0A0F",
  darkCard: "#111118",
  darkBorder: "#1E1E2E",
  darkHover: "#1A1A28",
  lightBg: "#F7F5FF",
  lightCard: "#FFFFFF",
  lightBorder: "#E2E0F0",
};

function MessageTicks({ status }) {
  if (status === 'sending') return (
    <span className="inline-flex items-center ml-1" style={{opacity: 0.5}}>
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  if (status === 'delivered') return (
    <span className="inline-flex items-center ml-1" style={{opacity: 0.6}}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 5L9 8L16 1" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  if (status === 'seen') return (
    <span className="inline-flex items-center ml-1">
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path d="M1 5L4 8L11 1" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 5L9 8L16 1" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  return null;
}

function getTickStatus(msg, myHandle) {
  if (!msg._id || msg._id.startsWith('temp_')) return 'sending';
  if (!msg.seenBy || msg.seenBy.length <= 1) return 'delivered';
  const othersWhoSaw = (msg.seenBy || []).filter(u => u !== myHandle);
  return othersWhoSaw.length > 0 ? 'seen' : 'delivered';
}

function Avatar({ name, size = 32 }) {
  const colors = ["#A855F7","#10F5A0","#F5C542","#FF4B6E","#60A5FA","#F472B6"];
  const color = colors[name?.charCodeAt(0) % colors.length] || C.purple;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}33, ${color}66)`,
      border: `1.5px solid ${color}88`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 900, color, flexShrink: 0,
      backdropFilter: 'blur(4px)',
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function Sidebar({ rooms, activeRoom, onJoin, onDelete, onCreateClick, onClose, onToggleTheme, isDarkMode, myHandle, onlineUsers, showClose, unreadRooms }) {
  const bg = isDarkMode ? C.darkCard : C.lightCard;
  const border = isDarkMode ? C.darkBorder : C.lightBorder;
  const text = isDarkMode ? '#E8E8F0' : '#1A1A2E';
  const mutedText = isDarkMode ? '#666680' : '#9090A8';

  return (
    <div className="flex flex-col h-full" style={{background: bg}}>
      {/* Header */}
      <div style={{padding: '20px 20px 16px', borderBottom: `1px solid ${border}`}}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 style={{fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: mutedText, textTransform: 'uppercase', marginBottom: 4}}>THE VAULT</h2>
            <p style={{fontSize: 18, fontWeight: 900, color: text, letterSpacing: '-0.03em'}}>Spaces</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onToggleTheme} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isDarkMode ? '#1E1E2E' : '#F0EEF8',
              border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
            }}>{isDarkMode ? "☀️" : "🌙"}</button>
            {showClose && (
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isDarkMode ? '#1E1E2E' : '#F0EEF8',
                border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, cursor: 'pointer', color: mutedText, fontWeight: 700,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* User pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 12,
          background: isDarkMode ? '#0A0A0F' : '#F7F5FF',
          border: `1px solid ${border}`,
        }}>
          <Avatar name={myHandle} size={28} />
          <div style={{minWidth: 0}}>
            <p style={{fontSize: 10, color: mutedText, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase'}}>Logged in as</p>
            <p style={{fontSize: 13, fontWeight: 800, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{myHandle}</p>
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div style={{flex: 1, overflowY: 'auto', padding: '12px 16px'}}>
        <button onClick={() => { onCreateClick(); onClose(); }} style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: `linear-gradient(135deg, ${C.purple}22, ${C.purple}11)`,
          border: `1px solid ${C.purple}44`,
          color: C.purple, fontWeight: 800, fontSize: 12,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{fontSize: 16}}>+</span> New Space
        </button>

        <p style={{fontSize: 10, fontWeight: 700, color: mutedText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4}}>Rooms</p>

        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          {rooms.map((room) => {
            const isActive = activeRoom.name === room.name;
            return (
              <div key={room.name} className="group" style={{position: 'relative'}}>
                <button onClick={() => onJoin(room)} style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: isActive
                    ? `linear-gradient(135deg, ${C.purple}33, ${C.purpleDim}22)`
                    : 'transparent',
                  border: isActive ? `1px solid ${C.purple}55` : `1px solid transparent`,
                  color: isActive ? C.purple : text,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  textAlign: 'left',
                }}>
                  <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8}}>{room.name}</span>
                  <div style={{display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0}}>
                    {room.password && <span style={{fontSize: 10, opacity: 0.5}}>🔒</span>}
                    {unreadRooms.has(room.name) && !isActive && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: C.red, display: 'block',
                        boxShadow: `0 0 6px ${C.red}`,
                      }} />
                    )}
                  </div>
                </button>
                {room.name !== "General Vibes #1" && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(room.name); }}
                    className="group-hover:opacity-100"
                    style={{
                      position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)',
                      opacity: 0, width: 20, height: 20, borderRadius: '50%',
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

        {/* Online users */}
        <div style={{marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}`}}>
          <p style={{fontSize: 10, fontWeight: 700, color: mutedText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4}}>
            Online · {onlineUsers.length}
          </p>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            {onlineUsers.map((user, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0'}}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: C.green, flexShrink: 0,
                  boxShadow: `0 0 6px ${C.green}`,
                }} />
                <span style={{fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadRooms, setUnreadRooms] = useState(new Set());
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const bg = isDarkMode ? C.darkBg : C.lightBg;
  const cardBg = isDarkMode ? C.darkCard : C.lightCard;
  const border = isDarkMode ? C.darkBorder : C.lightBorder;
  const text = isDarkMode ? '#E8E8F0' : '#1A1A2E';
  const mutedText = isDarkMode ? '#666680' : '#9090A8';
  const inputBg = isDarkMode ? '#111118' : '#FFFFFF';

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
    if (savedTheme === "light") setIsDarkMode(false);
    else setIsDarkMode(true);
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
      setActiveRoom(current => current.name === roomName ? { name: "General Vibes #1", password: "" } : current);
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
      } catch (err) { console.error("History fetch failed"); }
    };
    const loadRooms = async () => {
      try {
        const res = await fetch(`${API}/api/rooms`);
        const data = await res.json();
        const defaults = [{ name: "General Vibes #1", password: "" }];
        const dbRooms = Array.isArray(data) ? data : [];
        setRooms([...defaults, ...dbRooms.filter(r => r.name !== "General Vibes #1")]);
      } catch (err) { setRooms([{ name: "General Vibes #1", password: "" }]); }
    };
    loadHistory();
    loadRooms();
    setUnreadRooms(prev => { const next = new Set(prev); next.delete(activeRoom.name); return next; });
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('join_vault', { handle: myHandle, room: activeRoom.name });
    socket.emit('mark_seen', { room: activeRoom.name, handle: myHandle });
    const handleReceive = (data) => {
      if (data.room === activeRoom.name) {
        setChatHistory(prev => {
          if (prev.some(m => m._id === data._id)) return prev;
          return [...prev, data];
        });
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
      const playTone = (freq, startTime, duration, gainVal) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        osc.connect(gainNode); gainNode.connect(compressor); compressor.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.05);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime); osc.stop(startTime + duration + 0.01);
      };
      const now = ctx.currentTime;
      playTone(520, now, 0.12, 0.8);
      playTone(780, now + 0.1, 0.18, 0.7);
    } catch (e) {}
  };

  const handleExit = () => {
    localStorage.removeItem("vault_user");
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    router.push("/");
  };

  const handleTyping = () => {
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
      setUnreadRooms(prev => { const next = new Set(prev); next.delete(room.name); return next; });
    } else { setRoomToJoin(room); }
  };

  const verifyPassword = () => {
    if (joinPassword === roomToJoin.password) {
      setActiveRoom(roomToJoin);
      setUnreadRooms(prev => { const next = new Set(prev); next.delete(roomToJoin.name); return next; });
      setRoomToJoin(null); setJoinPassword(""); setSidebarOpen(false);
    } else alert("Wrong Password!");
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploadingImage(true);
    try {
      const compressed = await new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxW = 1200;
            const scale = img.width > maxW ? maxW / img.width : 1;
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Compression failed')); }, 'image/jpeg', 0.75);
          } catch (err) { reject(err); }
        };
        img.src = objectUrl;
      });
      const formData = new FormData();
      formData.append('image', compressed, 'image.jpg');
      const res = await fetch(`${API}/api/upload/image`, { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      const { url } = json;
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, image: url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, image: url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
    } catch (err) { alert("Image upload failed: " + err.message); }
    finally { setUploadingImage(false); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return alert("Video must be under 50MB!");
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch(`${API}/api/upload/video`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      const tempId = `temp_${Date.now()}`;
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, video: url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, video: url, time: tempMsg.time, seenBy: tempMsg.seenBy, tempId });
    } catch (err) { alert("Video upload failed."); }
    finally { setUploadingVideo(false); e.target.value = ""; }
  };

  const sendMessage = () => {
    if (message.trim() !== "" && socketRef.current) {
      const tempId = `temp_${Date.now()}`;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tempMsg = { _id: tempId, room: activeRoom.name, author: myHandle, text: message, time, seenBy: [myHandle] };
      setChatHistory(prev => [...prev, tempMsg]);
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, text: message, time, tempId });
      setMessage("");
    }
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    fetch(`${API}/api/messages/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: editText }) });
    setEditingId(null);
  };

  const insertEmoji = (emoji) => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); };

  if (!mounted) return <div style={{height: '100dvh', background: C.darkBg}} />;
  if (!myHandle) return <div style={{height: '100dvh', background: C.darkBg}} />;

  const sidebarProps = {
    rooms, activeRoom, onJoin: attemptJoin,
    onDelete: (name) => setRoomToDelete(name),
    onCreateClick: () => setShowCreateModal(true),
    onClose: () => setSidebarOpen(false),
    onToggleTheme: toggleTheme,
    isDarkMode, myHandle, onlineUsers, unreadRooms,
  };

  // Modal input style
  const modalInput = {
    width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12,
    background: isDarkMode ? '#0A0A0F' : '#F7F5FF',
    border: `1px solid ${border}`,
    color: text, fontWeight: 600, fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <main style={{
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      display: 'flex', background: bg,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: 'hidden', transition: 'background 0.3s',
    }}>

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)'}}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              style={{
                background: isDarkMode ? 'rgba(17,17,24,0.95)' : 'rgba(255,255,255,0.95)',
                border: `1px solid ${border}`,
                borderRadius: 20, padding: '28px 24px', maxWidth: 360, width: '100%',
                boxShadow: isDarkMode ? '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(168,85,247,0.1)' : '0 24px 80px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(20px)',
              }}>
              {roomToDelete ? (<>
                <div style={{marginBottom: 20}}>
                  <p style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.red, textTransform: 'uppercase', marginBottom: 6}}>Danger Zone</p>
                  <h2 style={{fontSize: 20, fontWeight: 900, color: text, letterSpacing: '-0.03em'}}>Delete Space</h2>
                  <p style={{fontSize: 13, color: mutedText, marginTop: 6}}>Enter the key for <strong style={{color: text}}>{roomToDelete}</strong></p>
                </div>
                <input placeholder="Room Key" type="password" style={modalInput} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmDeleteRoom()} autoFocus />
                <button onClick={confirmDeleteRoom} style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.red}, #FF6B8A)`,
                  border: 'none', color: 'white', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.05em',
                }}>Delete Forever</button>
              </>) : showCreateModal ? (<>
                <div style={{marginBottom: 20}}>
                  <p style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.purple, textTransform: 'uppercase', marginBottom: 6}}>Create</p>
                  <h2 style={{fontSize: 20, fontWeight: 900, color: text, letterSpacing: '-0.03em'}}>New Space</h2>
                </div>
                <input placeholder="Space name" style={modalInput} value={newRoomData.name} onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })} />
                <input placeholder="Set a password" type="password" style={modalInput} value={newRoomData.password} onChange={(e) => setNewRoomData({ ...newRoomData, password: e.target.value })} />
                <button onClick={handleCreateRoom} style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDim})`,
                  border: 'none', color: 'white', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.05em',
                }}>Create Space</button>
              </>) : (<>
                <div style={{marginBottom: 20}}>
                  <p style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.green, textTransform: 'uppercase', marginBottom: 6}}>Join</p>
                  <h2 style={{fontSize: 20, fontWeight: 900, color: text, letterSpacing: '-0.03em'}}>{roomToJoin?.name}</h2>
                </div>
                <input placeholder="Enter room password" type="password" style={modalInput} value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyPassword()} autoFocus />
                <button onClick={verifyPassword} style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.green}, #00D68F)`,
                  border: 'none', color: '#0A0A0F', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.05em',
                }}>Enter Vault</button>
              </>)}
              <button onClick={() => { setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword(""); }}
                style={{width: '100%', marginTop: 12, padding: '10px', background: 'transparent', border: 'none', color: mutedText, fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase'}}>
                Cancel
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
            style={{position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}
            className="md:hidden" />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{position: 'fixed', top: 0, left: 0, width: 280, zIndex: 40, height: '100dvh', borderRight: `1px solid ${border}`, overflow: 'hidden'}}
            className="md:hidden">
            <Sidebar {...sidebarProps} showClose={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div style={{width: 280, borderRight: `1px solid ${border}`, flexShrink: 0, height: '100%', overflow: 'hidden', transition: 'all 0.3s'}}
        className="hidden md:block">
        <Sidebar {...sidebarProps} showClose={false} />
      </div>

      {/* Main chat */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: bg}}>

        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${border}`,
          background: isDarkMode ? 'rgba(17,17,24,0.8)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(20px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, zIndex: 10,
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
            <button onClick={() => setSidebarOpen(true)} className="md:hidden" style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: isDarkMode ? C.darkHover : '#F0EEF8',
              border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, cursor: 'pointer', color: text,
            }}>☰</button>
            <div style={{minWidth: 0}}>
              <p style={{fontSize: 11, fontWeight: 700, color: mutedText, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1}}>Active Space</p>
              <h1 style={{fontSize: 16, fontWeight: 900, color: text, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{activeRoom.name}</h1>
            </div>
          </div>
          <div style={{display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10}}>
            <button onClick={() => setSoundEnabled(prev => !prev)} style={{
              width: 32, height: 32, borderRadius: 8,
              background: soundEnabled ? (isDarkMode ? C.darkHover : '#F0EEF8') : `${C.red}22`,
              border: `1px solid ${soundEnabled ? border : C.red + '44'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, cursor: 'pointer',
            }}>{soundEnabled ? "🔔" : "🔕"}</button>
            <button onClick={() => { if (confirm("Clear all messages?")) fetch(`${API}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, { method: 'DELETE' }); }} style={{
              padding: '0 10px', height: 32, borderRadius: 8,
              background: `${C.red}22`, border: `1px solid ${C.red}44`,
              color: C.red, fontWeight: 800, fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Wipe</button>
            <button onClick={handleExit} style={{
              padding: '0 10px', height: 32, borderRadius: 8,
              background: isDarkMode ? C.darkHover : '#F0EEF8',
              border: `1px solid ${border}`,
              color: mutedText, fontWeight: 800, fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Exit</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex: 1, overflowY: 'auto', padding: '16px 12px', background: bg}} className="sm:px-6 lg:px-8">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => {
              const isMe = msg.author === myHandle;
              return (
                <motion.div key={msg._id} layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  style={{display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 16}}>

                  {/* Author + time */}
                  {!isMe && (
                    <div style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4}}>
                      <Avatar name={msg.author} size={18} />
                      <span style={{fontSize: 11, fontWeight: 700, color: mutedText, letterSpacing: '0.04em'}}>{msg.author} · {msg.time}</span>
                    </div>
                  )}

                  <div className="group" style={{position: 'relative', maxWidth: '85%'}}>
                    {/* Bubble */}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe
                        ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDim})`
                        : (isDarkMode ? C.darkCard : C.lightCard),
                      border: isMe ? 'none' : `1px solid ${border}`,
                      boxShadow: isMe
                        ? `0 4px 20px ${C.purple}40`
                        : (isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)'),
                      position: 'relative',
                    }}>
                      {/* Hover actions */}
                      <div className="opacity-0 group-hover:opacity-100" style={{
                        position: 'absolute', top: -36, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0,
                        display: 'flex', gap: 4, alignItems: 'center',
                        background: isDarkMode ? 'rgba(17,17,24,0.95)' : 'rgba(255,255,255,0.95)',
                        border: `1px solid ${border}`,
                        borderRadius: 20, padding: '4px 8px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        zIndex: 10, transition: 'opacity 0.15s',
                        pointerEvents: 'none',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.pointerEvents = 'all'}
                      >
                        {['👍', '❤️', '🔥', '😂'].map(emoji => (
                          <button key={emoji} onClick={() => handleReaction(msg._id, emoji)}
                            style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '1px 2px', transition: 'transform 0.1s'}}
                            onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                          >{emoji}</button>
                        ))}
                        {isMe && !editingId && !msg._id?.startsWith('temp_') && (
                          <>
                            <div style={{width: 1, height: 14, background: border, margin: '0 2px'}} />
                            <button onClick={() => { setEditingId(msg._id); setEditText(msg.text); }}
                              style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: mutedText, padding: '1px 3px'}}>✎</button>
                            <button onClick={() => { if (confirm("Delete?")) fetch(`${API}/api/messages/${msg._id}`, { method: 'DELETE' }); }}
                              style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.red, padding: '1px 3px'}}>🗑</button>
                          </>
                        )}
                      </div>

                      {msg.image && <img src={msg.image} alt="img" style={{width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginBottom: 6, display: 'block'}} />}
                      {msg.video && <video src={msg.video} controls style={{width: '100%', maxHeight: 240, borderRadius: 10, marginBottom: 6, display: 'block', background: '#000'}} />}

                      {editingId === msg._id ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                          <input style={{
                            padding: '8px 10px', borderRadius: 8,
                            background: isDarkMode ? '#0A0A0F' : '#F7F5FF',
                            border: `1px solid ${border}`, color: text,
                            fontWeight: 600, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
                          }}
                            value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} autoFocus />
                          <div style={{display: 'flex', gap: 6}}>
                            <button onClick={saveEdit} style={{padding: '4px 12px', borderRadius: 6, background: C.green, border: 'none', color: '#0A0A0F', fontWeight: 800, fontSize: 11, cursor: 'pointer'}}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{padding: '4px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color: mutedText, fontWeight: 700, fontSize: 11, cursor: 'pointer'}}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.text && (
                            <p style={{
                              fontSize: 15, fontWeight: 500, lineHeight: 1.45,
                              color: isMe ? 'white' : text,
                              wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                              margin: 0,
                            }}>
                              {msg.text}
                              {isMe && <MessageTicks status={getTickStatus(msg, myHandle)} />}
                            </p>
                          )}
                          {(msg.image || msg.video) && isMe && (
                            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 4}}>
                              <MessageTicks status={getTickStatus(msg, myHandle)} />
                            </div>
                          )}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8}}>
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} style={{
                                  display: 'flex', alignItems: 'center', gap: 3,
                                  padding: '2px 8px', borderRadius: 20,
                                  background: users.includes(myHandle) ? `${C.green}22` : (isDarkMode ? '#1E1E2E' : '#F0EEF8'),
                                  border: `1px solid ${users.includes(myHandle) ? C.green + '55' : border}`,
                                  cursor: 'pointer', fontSize: 12,
                                }}>
                                  <span>{emoji}</span>
                                  <span style={{fontSize: 11, fontWeight: 700, color: users.includes(myHandle) ? C.green : mutedText}}>{users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Timestamp for my messages */}
                    {isMe && (
                      <p style={{fontSize: 10, color: mutedText, textAlign: 'right', marginTop: 3, paddingRight: 2}}>{msg.time}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {typingStatus && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4}}>
              <div style={{display: 'flex', gap: 3, padding: '8px 12px', borderRadius: 20, background: isDarkMode ? C.darkCard : C.lightCard, border: `1px solid ${border}`}}>
                {[0,1,2].map(i => (
                  <div key={i} style={{width: 5, height: 5, borderRadius: '50%', background: C.purple, animation: 'bounce 1s infinite', animationDelay: `${i*0.15}s`}} />
                ))}
              </div>
              <span style={{fontSize: 11, color: mutedText, fontWeight: 600}}>{typingStatus} is typing</span>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '10px 12px 10px',
          borderTop: `1px solid ${border}`,
          background: isDarkMode ? 'rgba(17,17,24,0.9)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div ref={emojiPickerRef}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                style={{
                  marginBottom: 8, padding: 10,
                  background: isDarkMode ? 'rgba(17,17,24,0.98)' : 'rgba(255,255,255,0.98)',
                  border: `1px solid ${border}`, borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(20px)',
                  display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 2, maxHeight: 140, overflowY: 'auto',
                }}>
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji} onClick={() => insertEmoji(emoji)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, padding: 3, borderRadius: 6,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {(uploadingVideo || uploadingImage) && (
            <div style={{
              marginBottom: 8, padding: '6px 12px', borderRadius: 8,
              background: `${C.purple}11`, border: `1px solid ${C.purple}33`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{width: 6, height: 6, borderRadius: '50%', background: C.purple, animation: 'pulse 1s infinite'}} />
              <span style={{fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.06em', textTransform: 'uppercase'}}>
                {uploadingImage ? "Uploading image..." : "Uploading video..."}
              </span>
            </div>
          )}

          <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />

            {/* Media buttons */}
            {[
              { icon: '📷', action: () => fileInputRef.current.click(), disabled: uploadingImage },
              { icon: '🎥', action: () => videoInputRef.current.click(), disabled: uploadingVideo },
              { icon: '😊', action: () => setShowEmojiPicker(p => !p), active: showEmojiPicker },
            ].map(({ icon, action, disabled, active }) => (
              <button key={icon} onClick={action} disabled={disabled} style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: active ? `${C.purple}22` : (isDarkMode ? C.darkHover : '#F0EEF8'),
                border: `1px solid ${active ? C.purple + '55' : border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, cursor: 'pointer', opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s',
              }}>{icon}</button>
            ))}

            <input type="text" value={message}
              onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message..."
              style={{
                flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 20,
                background: isDarkMode ? '#0A0A0F' : '#F7F5FF',
                border: `1px solid ${border}`,
                color: text, fontSize: 14, fontWeight: 500, outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = C.purple + '88'}
              onBlur={e => e.target.style.borderColor = border}
            />

            <button onClick={sendMessage} style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: message.trim() ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDim})` : (isDarkMode ? C.darkHover : '#F0EEF8'),
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: message.trim() ? `0 4px 12px ${C.purple}44` : 'none',
              fontSize: 16,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={message.trim() ? "white" : mutedText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={message.trim() ? "white" : mutedText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#2A2A40' : '#D0CDE8'}; border-radius: 4px; }
        .group:hover .opacity-0 { opacity: 1 !important; pointer-events: all !important; }
      `}</style>
    </main>
  );
}
