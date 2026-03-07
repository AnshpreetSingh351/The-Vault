"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  
  // 📱 Mobile State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 🚀 PRODUCTION URL: Ensure this matches your live Render URL exactly!
  const SERVER_URL = "https://the-vault-backend.onrender.com"; 

  useEffect(() => {
    const savedName = localStorage.getItem("vault_user");
    if (!savedName) { router.replace('/'); return; }
    setMyHandle(savedName);
    if (localStorage.getItem("vault_theme") === "dark") setIsDarkMode(true);

    const loadData = async () => {
      try {
        // 🚀 FIXED: Now uses SERVER_URL
        const hRes = await fetch(`${SERVER_URL}/api/messages/${encodeURIComponent(activeRoom.name)}`);
        setChatHistory(await hRes.json());
        
        const rRes = await fetch(`${SERVER_URL}/api/rooms`);
        const dbRooms = await rRes.json();
        setRooms([{ name: "General Vibes #1", password: "" }, ...dbRooms]);
      } catch (err) { console.error("History/Room fetch failed"); }
    };
    loadData();

    if (!socketRef.current) socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;
    socket.emit('join_vault', { handle: savedName, room: activeRoom.name });
    
    socket.on("online_users", (users) => setOnlineUsers(users));
    socket.on("receive_message", (data) => {
      if (data.room === activeRoom.name) {
          setChatHistory(prev => [...prev, data]);
          if (data.author !== savedName) socket.emit('mark_read', { messageId: data._id, handle: savedName });
      }
    });
    socket.on("message_edited", (updated) => setChatHistory(prev => prev.map(m => m._id === updated._id ? updated : m)));
    socket.on("user_typing", (data) => { if (data.room === activeRoom.name && data.handle !== savedName) setTypingStatus(data.isTyping ? data.handle : null); });
    socket.on("room_cleared", (name) => { if (activeRoom.name === name) setChatHistory([]); });
    socket.on("room_created", (room) => setRooms(prev => [...prev, room]));
    socket.on("room_deleted", (name) => { setRooms(prev => prev.filter(r => r.name !== name)); if (activeRoom.name === name) setActiveRoom({ name: "General Vibes #1" }); });

    return () => { socket.off("online_users"); socket.off("receive_message"); socket.off("room_created"); socket.off("room_deleted"); };
  }, [activeRoom.name, SERVER_URL]);

  useEffect(() => {
    if (chatHistory.length > 0 && myHandle && socketRef.current) {
        chatHistory.forEach(msg => { if (!msg.readBy?.includes(myHandle)) socketRef.current.emit('mark_read', { messageId: msg._id, handle: myHandle }); });
    }
  }, [chatHistory, myHandle]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { socketRef.current.emit("typing", { room: activeRoom.name, handle: myHandle, isTyping: false }); }, 2000);
  };

  const handleCreateRoom = async () => {
    if (!newRoomData.name || !newRoomData.password) return alert("Fill all fields!");
    // 🚀 FIXED: Now uses SERVER_URL
    const res = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newRoomData) });
    if (res.ok) setShowCreateModal(false);
  };

  const attemptJoin = (room) => { setIsSidebarOpen(false); room.password ? setRoomToJoin(room) : setActiveRoom(room); };

  const sendMessage = () => {
    if (message.trim() !== "" && socketRef.current) {
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      setMessage(""); 
    }
  };

  if (!myHandle) return <div className="h-screen bg-[#0D0D0D]" />;

  return (
    <main className={`h-screen flex font-mono overflow-hidden transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D] text-white" : "bg-[#FFFBEB] text-black"}`}>
      
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`border-[4px] border-black p-6 md:p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
                    {roomToDelete ? (
                        <>
                            <h2 className="text-xl font-black uppercase mb-2 text-[#FF4B4B]">Destroy Space</h2>
                            <input placeholder="Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold mb-4" value={deletePassword} onChange={(e)=>setDeletePassword(e.target.value)} />
                            <button onClick={async () => { const res = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomToDelete)}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: deletePassword }) }); if(res.ok) { setRoomToDelete(null); setDeletePassword(""); } else alert("Bad key"); }} className="w-full bg-[#FF4B4B] text-white border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Destroy</button>
                        </>
                    ) : showCreateModal ? (
                        <>
                            <h2 className="text-xl font-black uppercase mb-4">New Space</h2>
                            <input placeholder="Name" className="w-full border-2 border-black p-3 text-black font-bold mb-4" value={newRoomData.name} onChange={(e)=>setNewRoomData({...newRoomData, name: e.target.value})} />
                            <input placeholder="Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold mb-4" value={newRoomData.password} onChange={(e)=>setNewRoomData({...newRoomData, password: e.target.value})} />
                            <button onClick={handleCreateRoom} className="w-full bg-[#B967FF] text-white border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Build</button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-black uppercase mb-4">Unlock {roomToJoin?.name}</h2>
                            <input placeholder="Enter Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold mb-4" value={joinPassword} onChange={(e)=>setJoinPassword(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && (joinPassword === roomToJoin.password ? (setActiveRoom(roomToJoin), setRoomToJoin(null), setJoinPassword("")) : alert("Wrong!"))} autoFocus />
                        </>
                    )}
                    <button onClick={() => {setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null);}} className="w-full mt-4 text-[10px] font-black uppercase opacity-60">Cancel</button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}</AnimatePresence>

      <motion.div animate={{ x: isSidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 768 ? "-100%" : 0) }} className={`fixed md:relative w-72 border-r-[4px] border-black p-6 flex flex-col z-50 h-full transition-colors duration-500 ${isDarkMode ? "bg-[#161616]" : "bg-white shadow-[4px_0px_0px_0px_rgba(0,0,0,1)]"}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase italic">Vault</h2>
          <button onClick={() => {setIsDarkMode(!isDarkMode); localStorage.setItem("vault_theme", !isDarkMode ? "dark" : "light");}} className="p-2 border-2 border-black rounded-full bg-[#FFD700] text-black text-xs">{isDarkMode ? "☀️" : "🌙"}</button>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="mb-6 w-full border-[3px] border-black p-2 font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#B967FF] transition-all">+ New Space</button>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {rooms.map((room) => (
            <div key={room.name} className="relative group">
                <button onClick={() => attemptJoin(room)} className={`w-full border-[3px] border-black p-3 font-bold flex justify-between items-center transition-all ${activeRoom.name === room.name ? "bg-[#B967FF] text-white shadow-[3px_3px_0px_0px_rgba(185,103,255,0.4)]" : (isDarkMode ? "bg-[#222]" : "bg-white")}`}>
                  <span className="truncate pr-2">{room.name}</span>
                  {room.password && <span>🔒</span>}
                </button>
                {room.name !== "General Vibes #1" && <button onClick={() => setRoomToDelete(room.name)} className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 bg-[#FF4B4B] border-2 border-black rounded-full w-5 h-5 flex items-center justify-center text-[8px] z-20">🗑️</button>}
            </div>
          ))}
          <div className="mt-10 pt-6 border-t-4 border-black border-dashed">
            <h3 className="text-[10px] font-black uppercase mb-4 opacity-60">Online</h3>
            <div className="space-y-3">
              {onlineUsers.map((user, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#05FFA1] animate-pulse border border-black shadow-[0_0_5px_rgba(5,255,161,0.5)]" />
                  <span className="text-xs font-bold uppercase truncate">{user}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className={`flex-1 flex flex-col h-full relative transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D]" : "bg-white"}`}>
        <div className={`border-b-[4px] border-black p-4 md:p-6 flex justify-between items-center z-10 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden border-2 border-black p-1 bg-[#05FFA1] text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">☰</button>
            <h1 className={`text-lg md:text-2xl font-black uppercase italic tracking-tighter truncate max-w-[140px] md:max-w-none`}>{activeRoom.name}</h1>
          </div>
          <button onClick={() => { if(confirm("Wipe messages?")) fetch(`${SERVER_URL}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, {method:'DELETE'}); }} className="text-[8px] font-black bg-[#FF4B4B] text-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">WIPE</button>
        </div>

        <div className={`flex-1 p-4 md:p-8 space-y-6 overflow-y-auto ${isDarkMode ? "bg-[#0D0D0D]" : "bg-[#f9f9f9]"}`}>
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => (
              <motion.div key={msg._id} layout initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className={`flex flex-col mb-6 ${msg.author === myHandle ? "items-end" : "items-start"}`}>
                <div className={`relative border-[3px] border-black p-3 md:p-4 max-w-[85%] md:max-w-md transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${msg.author === myHandle ? `bg-[#B967FF] text-white` : (isDarkMode ? `bg-[#1F1F1F] text-white` : "bg-white text-black")}`}>
                  <p className={`text-[8px] md:text-[10px] font-black uppercase mb-1 transition-colors ${isDarkMode ? "text-[#05FFA1]" : "opacity-50"}`}>{msg.author} • {msg.time}</p>
                  <p className="font-bold text-sm md:text-lg break-all whitespace-pre-wrap leading-tight">{msg.text}</p>
                  <div className="flex justify-end items-center gap-1 mt-1 opacity-60">
                    <span className="text-[8px] font-black">{msg.readBy?.length > 1 ? `Seen by ${msg.readBy.length}` : (msg.author === myHandle ? "Sent" : "")}</span>
                    {msg.author === myHandle && <span className={msg.readBy?.length > 1 ? "text-[#05FFA1]" : ""}>{msg.readBy?.length > 1 ? "✓✓" : "✓"}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>

        <div className={`p-4 md:p-6 border-t-[4px] border-black flex gap-2 md:gap-4 items-center ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
          <button onClick={() => fileInputRef.current.click()} className="border-[3px] border-black p-3 bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">📷</button>
          <input type="text" value={message} onChange={(e) => { setMessage(e.target.value); handleTyping(); }} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Drop a vibe..." className={`flex-1 border-[3px] border-black p-3 md:p-4 font-bold outline-none text-sm md:text-base ${isDarkMode ? "bg-[#222] text-white" : "bg-white text-black"}`} />
          <button onClick={sendMessage} className="bg-[#05FFA1] text-black border-[3px] border-black px-4 md:px-8 py-3 md:py-4 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">Send</button>
        </div>
      </div>
    </main>
  );
}