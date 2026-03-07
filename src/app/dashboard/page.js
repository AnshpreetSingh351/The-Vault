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
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", password: "" });
  const [roomToJoin, setRoomToJoin] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  // 🚀 IMPORTANT: Update this variable with your LIVE Render backend URL
  const SERVER_URL = "https://the-vault-backend.onrender.com"; 

  useEffect(() => {
    const savedName = localStorage.getItem("vault_user");
    if (!savedName) { router.replace('/'); return; }
    setMyHandle(savedName);

    const savedTheme = localStorage.getItem("vault_theme");
    if (savedTheme === "dark") setIsDarkMode(true);

    const loadHistory = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/messages/${encodeURIComponent(activeRoom.name)}`);
        const data = await res.json();
        setChatHistory(Array.isArray(data) ? data : []);
      } catch (err) { console.error("History fetch failed"); }
    };

    const loadRooms = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms`);
        const data = await res.json();
        const defaults = [{ name: "General Vibes #1", password: "" }];
        const dbRooms = Array.isArray(data) ? data : [];
        setRooms([...defaults, ...dbRooms.filter(r => r.name !== "General Vibes #1")]);
      } catch (err) { 
        console.error("Room fetch error.");
        setRooms([{ name: "General Vibes #1", password: "" }]);
      }
    };

    loadHistory();
    loadRooms();

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
    socket.on("message_deleted", (id) => setChatHistory(prev => prev.filter(m => m._id !== id)));
    socket.on("message_edited", (updated) => setChatHistory(prev => prev.map(m => m._id === updated._id ? updated : m)));
    socket.on("user_typing", (data) => {
      if (data.room === activeRoom.name && data.handle !== savedName) setTypingStatus(data.isTyping ? data.handle : null);
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
  }, [router, activeRoom.name, SERVER_URL]);

  useEffect(() => {
    if (chatHistory.length > 0 && myHandle && socketRef.current) {
        chatHistory.forEach(msg => {
            if (!msg.readBy?.includes(myHandle)) {
                socketRef.current.emit('mark_read', { messageId: msg._id, handle: myHandle });
            }
        });
    }
  }, [chatHistory, myHandle]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

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
    const res = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newRoomData) });
    if (res.ok) setShowCreateModal(false);
    else alert("Error creating room.");
  };

  const confirmDeleteRoom = async () => {
    const res = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomToDelete)}`, { 
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password: deletePassword })
    });
    if (res.ok) { setRoomToDelete(null); setDeletePassword(""); }
    else alert("Incorrect Room Key! ❌");
  };

  const attemptJoin = (room) => {
    if (!room.password || room.name === "General Vibes #1") setActiveRoom(room);
    else setRoomToJoin(room);
  };

  const verifyPassword = () => {
    if (joinPassword === roomToJoin.password) {
        setActiveRoom(roomToJoin);
        setRoomToJoin(null);
        setJoinPassword("");
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
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, image: reader.result, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = () => {
    if (message.trim() !== "" && socketRef.current) {
      socketRef.current.emit("send_message", { room: activeRoom.name, author: myHandle, text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      setMessage(""); 
    }
  };

  if (!myHandle) return <div className={`h-screen ${isDarkMode ? "bg-[#0D0D0D]" : "bg-[#FFFBEB]"}`} />;

  return (
    <main className={`h-screen flex font-mono overflow-hidden transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D] text-white" : "bg-[#FFFBEB] text-black"}`}>
      
      <AnimatePresence>
        {(showCreateModal || roomToJoin || roomToDelete) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                <div className={`border-[4px] border-black p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
                    
                    {roomToDelete ? (
                        <>
                            <h2 className="text-xl font-black uppercase mb-2 italic text-[#FF4B4B]">Confirm Destruction</h2>
                            <p className="text-[10px] font-bold uppercase mb-6 opacity-60">Enter the Room Key for {roomToDelete} to destroy it.</p>
                            <input placeholder="Room Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={deletePassword} onChange={(e)=>setDeletePassword(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && confirmDeleteRoom()} autoFocus />
                            <button onClick={confirmDeleteRoom} className="w-full bg-[#FF4B4B] text-white border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-0 transition-all">Destroy Space 💣</button>
                        </>
                    ) : showCreateModal ? (
                        <>
                            <h2 className="text-xl font-black uppercase mb-6 italic">New Space</h2>
                            <input placeholder="Name" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={newRoomData.name} onChange={(e)=>setNewRoomData({...newRoomData, name: e.target.value})} />
                            <input placeholder="Set Password" type="password" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={newRoomData.password} onChange={(e)=>setNewRoomData({...newRoomData, password: e.target.value})} />
                            <button onClick={handleCreateRoom} className="w-full bg-[#B967FF] text-white border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-0 transition-all">Build Space</button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-black uppercase mb-6 italic tracking-tighter">Join {roomToJoin?.name}</h2>
                            <input placeholder="Enter Room Key" type="password" className="w-full border-2 border-black p-3 text-black font-bold outline-none mb-4" value={joinPassword} onChange={(e)=>setJoinPassword(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && verifyPassword()} autoFocus />
                            <button onClick={verifyPassword} className="w-full bg-[#05FFA1] text-black border-[3px] border-black p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-0 transition-all">Enter Vault</button>
                        </>
                    )}
                    <button onClick={() => {setShowCreateModal(false); setRoomToJoin(null); setRoomToDelete(null); setDeletePassword("");}} className="w-full mt-4 text-[10px] font-black uppercase opacity-60">Cancel</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-80 border-r-[4px] border-black p-6 flex flex-col z-20 h-full transition-colors duration-500 ${isDarkMode ? "bg-[#161616] shadow-[4px_0px_0px_0px_rgba(5,255,161,0.1)]" : "bg-white shadow-[4px_0px_0px_0px_rgba(0,0,0,1)]"}`}>
        <div className="flex justify-between items-center mb-2 border-b-[4px] border-black pb-2">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Spaces</h2>
          <button onClick={toggleTheme} className={`p-2 rounded-full border-2 border-black transition-all hover:scale-110 active:scale-95 ${isDarkMode ? "bg-[#FFD700]" : "bg-[#2D3436]"}`}>{isDarkMode ? "☀️" : "🌙"}</button>
        </div>
        <p className={`mb-4 text-[10px] font-bold p-1 border-2 border-black bg-[#05FFA1] text-black uppercase text-center`}>ID: {myHandle}</p>
        <button onClick={() => setShowCreateModal(true)} className={`mb-6 w-full border-[3px] border-black p-2 font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#B967FF] hover:text-white transition-all`}>+ Build New Space</button>

        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {rooms.map((room) => (
            <div key={room.name} className="group relative">
                <button onClick={() => attemptJoin(room)} 
                  className={`w-full border-[3px] border-black p-3 font-bold transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center ${activeRoom.name === room.name ? "bg-[#B967FF] text-white shadow-[3px_3px_0px_0px_rgba(185,103,255,0.4)]" : (isDarkMode ? "bg-[#222] text-white" : "bg-white text-black")}`}>
                  <span>{room.name}</span>
                  {room.password && <span className="text-[10px]">🔒</span>}
                </button>
                {room.name !== "General Vibes #1" && (
                    <button onClick={(e) => { e.stopPropagation(); setRoomToDelete(room.name); }} 
                        className="absolute -right-2 top-1 opacity-0 group-hover:opacity-100 bg-[#FF4B4B] text-white border-2 border-black rounded-full w-5 h-5 flex items-center justify-center text-[8px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-all z-20">🗑️</button>
                )}
            </div>
          ))}
          <div className="mt-10 pt-6 border-t-4 border-black border-dashed">
            <h3 className={`text-[10px] font-black uppercase mb-4 ${isDarkMode ? "text-[#05FFA1]" : "opacity-60"}`}>Live ({onlineUsers.length})</h3>
            <div className="space-y-3">
              {onlineUsers.map((user, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#05FFA1] animate-pulse border border-black" />
                  <span className="text-xs font-bold uppercase tracking-wider">{typeof user === 'object' ? user.handle : user}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col h-full relative transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D]" : "bg-white"}`}>
        <div className={`border-b-[4px] border-black p-6 flex justify-between items-center z-10 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
          <h1 className={`text-2xl font-black uppercase italic tracking-tighter ${isDarkMode ? "text-[#B967FF]" : "text-black"}`}>{activeRoom.name}</h1>
          <button onClick={() => { if(confirm("Wipe?")) fetch(`${SERVER_URL}/api/messages/clear/${encodeURIComponent(activeRoom.name)}`, {method:'DELETE'}); }} className="text-[8px] font-black bg-[#FF4B4B] text-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">WIPE</button>
        </div>

        <div className={`flex-1 p-8 space-y-6 overflow-y-auto transition-colors duration-500 ${isDarkMode ? "bg-[#0D0D0D]" : "bg-[#f9f9f9]"}`}>
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => (
              <motion.div 
                key={msg._id} 
                layout 
                initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`group flex flex-col mb-6 ${msg.author === myHandle ? "items-end" : "items-start"}`}
              >
                <div className={`relative border-[3px] border-black p-4 max-w-md transition-all duration-300 ${msg.author === myHandle ? `bg-[#B967FF] text-white shadow-[5px_5px_0px_0px_rgba(185,103,255,0.3)]` : (isDarkMode ? `bg-[#1F1F1F] text-white shadow-[5px_5px_0px_0px_rgba(5,255,161,0.2)]` : "bg-white text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]")}`}>
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                      <div className={`flex gap-1 border-2 border-black rounded-full px-2 py-0.5 mr-2 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
                          {['👍', '❤️', '🔥', '😂'].map(emoji => (
                              <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} className="hover:scale-125 transition-transform text-xs active:scale-90">{emoji}</button>
                          ))}
                      </div>
                      {msg.author === myHandle && !editingId && (
                        <>
                          <button onClick={() => { setEditingId(msg._id); setEditText(msg.text); }} className="bg-white border-2 border-black rounded p-0.5 text-[8px] text-black hover:bg-[#05FFA1]">✎</button>
                          <button onClick={() => {if(confirm("Delete?")) fetch(`${SERVER_URL}/api/messages/${msg._id}`, {method:'DELETE'});}} className="bg-white border-2 border-black rounded p-0.5 text-[8px] text-black hover:bg-[#FF4B4B]">🗑️</button>
                        </>
                      )}
                  </div>

                  <p className={`text-[10px] font-black uppercase mb-1 transition-colors ${isDarkMode ? "text-[#05FFA1]" : "opacity-50"}`}>{msg.author} • {msg.time}</p>
                  {msg.image && <img src={msg.image} className="mb-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] max-h-64 object-cover w-full rounded-sm" />}
                  
                  {editingId === msg._id ? (
                    <div className="flex flex-col gap-3 min-w-[220px]">
                      <input className={`p-3 border-[3px] border-black font-bold w-full ${isDarkMode ? "bg-[#333] text-white" : "bg-white text-black"}`} value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} autoFocus />
                      <button onClick={() => setEditingId(null)} className="text-[8px] font-black uppercase opacity-60">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-lg break-all whitespace-pre-wrap leading-tight pr-10">{msg.text}</p>
                      <div className="flex justify-end items-center gap-1 mt-1 opacity-60">
                        <span className="text-[9px] font-black">
                            {msg.readBy?.length > 1 ? `Seen by ${msg.readBy.length}` : (msg.author === myHandle ? "Sent" : "")}
                        </span>
                        {msg.author === myHandle && (
                            <span className={msg.readBy?.length > 1 ? "text-[#05FFA1]" : ""}>
                                {msg.readBy?.length > 1 ? "✓✓" : "✓"}
                            </span>
                        )}
                      </div>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                  <div key={emoji} onClick={() => handleReaction(msg._id, emoji)} 
                                      className={`flex items-center gap-1 border-2 border-black rounded-md px-1.5 py-0.5 text-[10px] cursor-pointer transition-all active:scale-95 ${users.includes(myHandle) ? "bg-[#05FFA1] text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : (isDarkMode ? "bg-[#333] text-white" : "bg-gray-100 text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]")}`}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-4 animate-pulse">
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

        <div className={`p-6 border-t-[4px] border-black flex gap-4 items-center z-10 transition-colors duration-500 ${isDarkMode ? "bg-[#161616]" : "bg-white"}`}>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          <button onClick={() => fileInputRef.current.click()} className={`border-[3px] border-black p-3 hover:bg-[#01CDFE] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none ${isDarkMode ? "bg-[#222] text-white" : "bg-white"}`}>📷</button>
          
          <input type="text" value={message} onChange={(e) => { setMessage(e.target.value); handleTyping(); }} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." 
            className={`flex-1 border-[3px] border-black p-4 font-bold outline-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDarkMode ? "bg-[#222] text-white placeholder-gray-500" : "bg-white text-black"}`} />
          
          <button onClick={sendMessage} className="bg-[#05FFA1] text-black border-[3px] border-black px-8 py-4 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-1 transition-all">Send</button>
        </div>
      </div>
    </main>
  );
}