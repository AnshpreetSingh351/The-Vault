"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function IdentityPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("vault_user");
    if (user) router.push('/dashboard');
  }, [router]);

  const handleAuth = async (action) => {
    if (!username || !password) { setError("Fill in all fields."); return; }
    setLoading(true);
    setError("");
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
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Can't reach server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div style={{ height: '100dvh', background: '#0A0A0F' }} />;

  const inputStyle = (field) => ({
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    background: activeField === field ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${activeField === field ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
    color: '#E8E8F0',
    fontSize: 15,
    fontWeight: 500,
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    fontFamily: "inherit",
  });

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#0A0A0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
        top: '-100px', left: '-100px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,245,160,0.07) 0%, transparent 70%)',
        bottom: '-80px', right: '-80px', pointerEvents: 'none',
      }} />

      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: '100%', maxWidth: 380,
          background: 'rgba(17,17,24,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: '36px 28px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.08)',
          position: 'relative',
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.8), transparent)',
          borderRadius: 1,
        }} />

        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {/* Vault icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.2))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
              boxShadow: '0 8px 32px rgba(168,85,247,0.2)',
            }}>
              🔐
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(168,85,247,0.8)', textTransform: 'uppercase', marginBottom: 6 }}>
              Welcome to
            </p>
            <h1 style={{
              fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em',
              color: '#E8E8F0', margin: 0, lineHeight: 1,
            }}>
              The{' '}
              <span style={{
                background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Vault
              </span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontWeight: 500 }}>
              Your private space to connect
            </p>
          </motion.div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Handle
            </label>
            <input
              type="text"
              placeholder="@yourname"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              onFocus={() => setActiveField('user')}
              onBlur={() => setActiveField(null)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth('login')}
              style={inputStyle('user')}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Secret Key
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onFocus={() => setActiveField('pass')}
              onBlur={() => setActiveField(null)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth('login')}
              style={inputStyle('pass')}
            />
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: 12, color: '#FF4B6E', fontWeight: 600, margin: 0, padding: '8px 12px', background: 'rgba(255,75,110,0.1)', borderRadius: 8, border: '1px solid rgba(255,75,110,0.2)' }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {/* Login button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAuth('login')}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                border: 'none', color: 'white',
                fontWeight: 800, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '0.02em',
                boxShadow: '0 4px 20px rgba(168,85,247,0.35)',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>

            {/* Register button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAuth('register')}
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.color = '#E8E8F0'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              Create New Account
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 24, fontWeight: 500 }}>
          End-to-end private · No ads · Just vibes
        </p>
      </motion.div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </main>
  );
}
