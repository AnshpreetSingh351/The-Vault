"use client";

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IdentityPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Check if a user is already authenticated in this browser
    const user = localStorage.getItem("vault_user");
    if (user) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleAuth = async (action) => {
    if (!username || !password) return alert("Fill in all fields!");

    try {
      const response = await fetch(`http://localhost:3001/api/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("vault_user", username);
        router.push('/dashboard');
      } else {
        alert(data.error); 
      }
    } catch (error) {
      alert("Server error! Is your backend running on port 3001?");
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFBEB] flex items-center justify-center p-4 font-mono text-black">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8">
        <h1 className="text-4xl font-black italic uppercase mb-8">
          THE <span className="bg-[#FF71CE] px-2 text-white">VAULT</span>
        </h1>
        <div className="space-y-6">
          <input 
            type="text" placeholder="@handle" value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border-[3px] border-black p-4 text-lg font-bold outline-none focus:bg-[#05FFA1]"
          />
          <input 
            type="password" placeholder="secret key" value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-[3px] border-black p-4 text-lg font-bold outline-none focus:bg-[#01CDFE]"
          />
          <div className="pt-2 space-y-4">
            <button onClick={() => handleAuth('register')} className="w-full bg-[#B967FF] border-[3px] border-black py-4 text-xl font-black uppercase text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all">
              Register New ID
            </button>
            <button onClick={() => handleAuth('login')} className="w-full bg-white border-[3px] border-black py-3 text-lg font-black uppercase hover:bg-gray-100 transition-all">
              Login to Existing ID
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}