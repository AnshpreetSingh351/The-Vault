"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function useGlitchText(text, active) {
  const [display, setDisplay] = useState(text);
  const chars = "█▓▒░$@#&!?/\\|<>[]{}~^*";
  useEffect(() => {
    if (!active) { setDisplay(text); return; }
    let iter = 0;
    const interval = setInterval(() => {
      setDisplay(text.split("").map((c, i) => {
        if (i < iter) return text[i];
        if (c === " ") return " ";
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      iter += 0.4;
      if (iter >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [active, text]);
  return display;
}

function VaultRings() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
      {[600, 480, 360, 260].map((size, i) => (
        <motion.div key={size}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            width: size, height: size,
            borderRadius: '50%',
            border: `1px solid rgba(168,85,247,${0.03 + i * 0.02})`,
            boxShadow: `inset 0 0 ${20 + i * 10}px rgba(168,85,247,${0.02 + i * 0.01})`,
          }}>
          {/* Notches on ring */}
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <div key={deg} style={{
              position: 'absolute', width: 4, height: 4, borderRadius: '50%',
              background: `rgba(168,85,247,${0.2 + i * 0.1})`,
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateX(${size / 2 - 2}px) translateY(-50%)`,
              boxShadow: `0 0 6px rgba(168,85,247,0.5)`,
            }} />
          ))}
        </motion.div>
      ))}
      {/* Center glow */}
      <div style={{
        position: 'absolute', width: 120, height: 120, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
      }} />
    </div>
  );
}

function ScanLine() {
  return (
    <motion.div
      animate={{ y: ['0%', '100%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
      style={{
        position: 'absolute', left: 0, right: 0, height: 2, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), rgba(16,245,160,0.2), transparent)',
        zIndex: 5,
      }}
    />
  );
}

export default function IdentityPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [glitchActive, setGlitchActive] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const vaultTitle = useGlitchText("THE VAULT", glitchActive);

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("vault_user");
    if (user) router.push('/dashboard');
    // Trigger glitch on load
    setTimeout(() => setGlitchActive(true), 600);
    setTimeout(() => setGlitchActive(false), 2200);
  }, [router]);

  const handleAuth = async (action) => {
    if (!username || !password) { setError("Access credentials required."); return; }
    if (action === 'login') {
      setUnlocking(true);
      await new Promise(r => setTimeout(r, 600));
      setUnlocking(false);
    }
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
        setError(data.error || "Access denied.");
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 1000);
      }
    } catch {
      setError("Signal lost. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div style={{ height: '100dvh', background: '#050508' }} />;

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#050508',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated vault rings background */}
      <VaultRings />

      {/* Scanline effect */}
      <ScanLine />

      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        opacity: 0.4,
      }} />

      {/* Corner decorations */}
      {[
        { top: 20, left: 20, rotate: 0 },
        { top: 20, right: 20, rotate: 90 },
        { bottom: 20, right: 20, rotate: 180 },
        { bottom: 20, left: 20, rotate: 270 },
      ].map((pos, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
          style={{
            position: 'absolute', ...pos, width: 40, height: 40, pointerEvents: 'none', zIndex: 3,
            transform: `rotate(${pos.rotate}deg)`,
            borderTop: '1px solid rgba(168,85,247,0.4)',
            borderLeft: '1px solid rgba(168,85,247,0.4)',
          }} />
      ))}

      {/* Status bar top */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 10,
        }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10F5A0', boxShadow: '0 0 8px #10F5A0' }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
          SECURE · ENCRYPTED · PRIVATE
        </span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10F5A0', boxShadow: '0 0 8px #10F5A0' }} />
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: 400,
          margin: '0 20px',
        }}>

        {/* Vault door header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {/* Big glitchy title */}
          <motion.h1
            style={{
              fontSize: 'clamp(42px, 10vw, 64px)',
              fontWeight: 900,
              letterSpacing: '0.12em',
              margin: 0,
              lineHeight: 1,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(168,85,247,0.9) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: glitchActive ? 'blur(0.5px)' : 'none',
              textShadow: 'none',
              position: 'relative',
            }}
          >
            {vaultTitle}
          </motion.h1>

          {/* Subtitle with typewriter feel */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5))' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(168,85,247,0.7)', textTransform: 'uppercase', fontWeight: 700 }}>
              ACCESS TERMINAL
            </span>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'linear-gradient(90deg, rgba(168,85,247,0.5), transparent)' }} />
          </motion.div>
        </div>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            background: 'rgba(10,10,20,0.85)',
            border: '1px solid rgba(168,85,247,0.2)',
            borderRadius: 4,
            padding: '28px 24px',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            boxShadow: '0 0 60px rgba(168,85,247,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>

          {/* Top left label */}
          <div style={{
            position: 'absolute', top: -10, left: 16,
            background: '#050508', padding: '0 8px',
            fontSize: 9, letterSpacing: '0.2em', color: 'rgba(168,85,247,0.7)',
            textTransform: 'uppercase', fontWeight: 700,
          }}>
            IDENTITY VERIFICATION
          </div>

          {/* Unlocking animation */}
          <AnimatePresence>
            {unlocking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: 4, zIndex: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(4px)',
                }}>
                <div style={{ textAlign: 'center' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ fontSize: 32, marginBottom: 10 }}>🔓</motion.div>
                  <p style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(16,245,160,0.8)', textTransform: 'uppercase' }}>Unlocking...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Handle field */}
            {[
              { label: '// HANDLE', placeholder: '@identifier', type: 'text', val: username, set: setUsername, field: 'user', extra: { autoCapitalize: 'none', autoCorrect: 'off' } },
              { label: '// SECRET KEY', placeholder: '••••••••••', type: 'password', val: password, set: setPassword, field: 'pass', extra: {} },
            ].map(({ label, placeholder, type, val, set, field, extra }) => (
              <div key={field}>
                <p style={{
                  fontSize: 9, letterSpacing: '0.2em', fontWeight: 700,
                  color: focusedField === field ? 'rgba(168,85,247,0.9)' : 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase', marginBottom: 8, transition: 'color 0.2s',
                }}>{label}</p>
                <div style={{ position: 'relative' }}>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={val}
                    onChange={(e) => { set(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField(field)}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth('login')}
                    {...extra}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: focusedField === field ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${focusedField === field ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 4,
                      color: '#E8E8F0',
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      letterSpacing: type === 'password' ? '0.1em' : '0.02em',
                    }}
                  />
                  {/* Active indicator bar */}
                  <motion.div
                    animate={{ scaleX: focusedField === field ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                      background: 'linear-gradient(90deg, rgba(168,85,247,0.8), rgba(16,245,160,0.4))',
                      transformOrigin: 'left',
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 4,
                    background: 'rgba(255,75,110,0.08)',
                    border: '1px solid rgba(255,75,110,0.25)',
                  }}>
                  <span style={{ fontSize: 10 }}>⚠</span>
                  <span style={{ fontSize: 11, color: '#FF4B6E', fontWeight: 700, letterSpacing: '0.05em' }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {/* Primary — Login */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAuth('login')}
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? 'rgba(168,85,247,0.3)' : 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(124,58,237,0.9))',
                  border: '1px solid rgba(168,85,247,0.5)',
                  borderRadius: 4, color: 'white',
                  fontWeight: 800, fontSize: 12,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 20px rgba(168,85,247,0.2)',
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>▋</motion.span>
                    VERIFYING
                  </span>
                ) : 'ENTER VAULT'}
              </motion.button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>

              {/* Secondary — Register */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAuth('register')}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4, color: 'rgba(255,255,255,0.4)',
                  fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,245,160,0.3)'; e.currentTarget.style.color = 'rgba(16,245,160,0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >
                REGISTER NEW ID
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Bottom status */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {['E2E ENCRYPTED', 'NO LOGS', 'PRIVATE'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(16,245,160,0.6)' }} />
              <span style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.15); font-family: inherit; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #050508 inset !important;
          -webkit-text-fill-color: #E8E8F0 !important;
        }
      `}</style>
    </main>
  );
}
