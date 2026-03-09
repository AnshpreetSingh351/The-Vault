"use client";

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function IdentityPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("vault_user");
    if (user) router.push('/dashboard');
  }, [router]);

  const handleAuth = async (action) => {
    if (!username || !password) return alert("Fill in all fields!");
    try {
      const response = await fetch(`${API}/api/${action}`, {
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
      alert("Server error! Is your backend running?");
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#FFFBEB]" />;

  return (
    <main className="min-h-screen bg-[#FFFBEB] flex items-center justify-center p-4 font-mono text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8"
      >
        <h1 className="text-3xl sm:text-4xl font-black italic uppercase mb-6 sm:mb-8">
          THE <span className="bg-[#FF71CE] px-2 text-white">VAULT</span>
        </h1>
        <div className="space-y-4 sm:space-y-6">
          <input
            type="text"
            placeholder="@handle"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border-[3px] border-black p-3 sm:p-4 text-base sm:text-lg font-bold outline-none focus:bg-[#05FFA1] transition-colors"
          />
          <input
            type="password"
            placeholder="secret key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth('login')}
            className="w-full border-[3px] border-black p-3 sm:p-4 text-base sm:text-lg font-bold outline-none focus:bg-[#01CDFE] transition-colors"
          />
          <div className="pt-1 sm:pt-2 space-y-3 sm:space-y-4">
            <button
              onClick={() => handleAuth('register')}
              className="w-full bg-[#B967FF] border-[3px] border-black py-3 sm:py-4 text-lg sm:text-xl font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-0 transition-all"
            >
              Register New ID
            </button>
            <button
              onClick={() => handleAuth('login')}
              className="w-full bg-white border-[3px] border-black py-3 text-base sm:text-lg font-black uppercase hover:bg-gray-100 active:bg-gray-200 transition-all"
            >
              Login to Existing ID
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
