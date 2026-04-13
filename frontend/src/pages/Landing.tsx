/**
 * Landing page v6 — light theme inspirado Liftoff.
 * Logo real (/logo.svg) em todos os sítios. Cores claras.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, BookmarkCheck, Rss, ChevronRight } from 'lucide-react';

// ─── Design tokens (light theme) ─────────────────────────────────────────────
const C = {
  bg:       '#fafaf8',
  bg2:      '#f2ede4',
  bg3:      '#ffffff',
  border:   '#e5dfd6',
  text:     '#111111',
  muted:    '#777777',
  muted2:   '#aaaaaa',
  gold:     '#b8923a',
  goldLight:'#f5ead4',
  green:    '#1a7a4a',
  greenBg:  '#edf7f1',
};

// ─── Dados ────────────────────────────────────────────────────────────────────
const SOURCES = [
  { name: 'BBC News',       color: '#b80000' },
  { name: 'The Guardian',   color: '#005689' },
  { name: 'Público',        color: '#1a1aff' },
  { name: 'Observador',     color: '#e63329' },
  { name: 'Washington Post',color: '#333333' },
  { name: 'RTP Notícias',   color: '#009a44' },
  { name: 'Al Jazeera',     color: '#8b6914' },
  { name: 'Wired',          color: '#555555' },
  { name: 'NPR News',       color: '#1a5fa8' },
  { name: 'DW News',        color: '#c41e3a' },
  { name: 'Ars Technica',   color: '#c84000' },
];

const MOCK_ARTICLES = [
  { source: 'BBC News',     color: '#b80000', title: 'EU leaders reach historic climate agreement at Brussels summit', time: '2m' },
  { source: 'Público',      color: '#1a1aff', title: 'Portugal regista crescimento de 2,3% no primeiro trimestre', time: '8m' },
  { source: 'The Guardian', color: '#005689', title: 'Scientists find new approach to carbon capture technology', time: '15m' },
];

const FAQ_ITEMS = [
  { q: 'Do I need an account to use grain?',    a: 'No. The feed is public — you can read without signing up. An account is only needed to follow topics or manage your sources.' },
  { q: 'Where do the articles come from?',       a: 'Grain aggregates RSS feeds from 11 hand-picked outlets: BBC News, The Guardian, Público, Observador, Washington Post, RTP, Al Jazeera, NPR, Wired, DW News and Ars Technica.' },
  { q: 'How does the AI summary work?',          a: 'Click "AI Summary" on any article. Gemini 2.5 Flash generates a concise summary in European Portuguese. Summaries are cached and shared — instant if already generated.' },
  { q: 'What is topic follow?',                  a: 'Describe a topic in plain language. grain converts it to a semantic embedding and finds matching articles as they arrive. No keywords, no manual setup.' },
  { q: 'Is it free? Will it stay free?',         a: 'Yes. No ads, no subscriptions, no data selling. Runs on Cloudflare Workers with minimal AI costs.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        style={{ color: C.text }}>
        <span className="text-sm font-medium">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
          className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-sm"
          style={{ border: `1px solid ${C.border}`, color: C.muted }}>+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="pb-4 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Logo — usa sempre /logo.svg (com BASE_URL correcto) ─────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // ex: "/grain"

function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src={`${BASE}/logo.svg`}
      alt="grain logo"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.22, display: 'block', flexShrink: 0 }}
    />
  );
}

// ─── App mockups (light) ──────────────────────────────────────────────────────
function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${C.border}`, background: C.bg3, boxShadow: '0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div className="flex gap-1.5">
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />)}
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-1" style={{ background: C.bg2 }}>
          <Logo size={12} />
          <span className="text-[10px]" style={{ color: C.muted }}>grain.app</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function FeedMockup() {
  return (
    <AppChrome>
      <div className="p-3 flex flex-col gap-2">
        {MOCK_ARTICLES.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
            className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ border: `1px solid ${C.border}`, background: C.bg }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-[10px] font-medium" style={{ color: C.muted }}>{a.source}</span>
              </div>
              <span className="text-[10px]" style={{ color: C.muted2 }}>{a.time}</span>
            </div>
            <p className="text-[11px] font-semibold leading-snug" style={{ color: C.text }}>{a.title}</p>
            <div className="flex gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ border: `1px solid ${C.green}44`, background: C.greenBg, color: C.green }}>
                <Sparkles size={7} />AI
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ border: `1px solid ${C.border}`, color: C.muted }}>follow</span>
            </div>
          </motion.div>
        ))}
      </div>
    </AppChrome>
  );
}

function SummaryMockup() {
  return (
    <AppChrome>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 p-3 rounded-xl"
          style={{ border: `1px solid ${C.green}44`, background: C.bg }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b80000]" />
            <span className="text-[10px]" style={{ color: C.muted }}>BBC News · 2m</span>
          </div>
          <p className="text-[11px] font-semibold leading-snug" style={{ color: C.text }}>EU leaders reach historic climate agreement at Brussels summit</p>
          <div className="p-2.5 rounded-lg" style={{ background: C.greenBg, border: `1px solid ${C.green}33` }}>
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles size={8} style={{ color: C.green }} />
              <span className="text-[9px] font-medium" style={{ color: C.green }}>Resumo IA · PT</span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: C.text }}>
              Líderes europeus chegaram a acordo sobre metas climáticas para 2035, com redução de 65% nas emissões e €400 mil milhões em renováveis.
            </p>
          </div>
        </div>
        {MOCK_ARTICLES.slice(1).map((a, i) => (
          <div key={i} className="flex flex-col gap-1 p-2.5 rounded-xl opacity-50"
            style={{ border: `1px solid ${C.border}`, background: C.bg }}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-[9px]" style={{ color: C.muted }}>{a.source}</span>
            </div>
            <p className="text-[10px] font-medium leading-tight line-clamp-1" style={{ color: C.text }}>{a.title}</p>
          </div>
        ))}
      </div>
    </AppChrome>
  );
}

function FollowMockup() {
  return (
    <AppChrome>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 p-2.5 rounded-xl"
          style={{ border: `1px solid ${C.gold}66`, background: C.goldLight }}>
          <span className="text-sm">✍️</span>
          <span className="text-[10px]" style={{ color: C.muted }}>alterações climáticas na Europa</span>
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ background: C.gold, color: '#fff' }}>Follow</span>
        </div>
        {[
          { emoji: '🌍', label: 'Climate & Energy Europe', count: 3 },
          { emoji: '🏛️', label: 'EU Politics & Policy',   count: 1 },
          { emoji: '💻', label: 'AI & Technology',         count: 5 },
        ].map(t => (
          <div key={t.label} className="flex items-center justify-between p-2.5 rounded-xl"
            style={{ border: `1px solid ${C.border}`, background: C.bg }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t.emoji}</span>
              <span className="text-[10px] font-medium" style={{ color: C.text }}>{t.label}</span>
            </div>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: C.goldLight, color: C.gold, border: `1px solid ${C.gold}44` }}>
              {t.count} new
            </span>
          </div>
        ))}
      </div>
    </AppChrome>
  );
}

function SourcesMockup() {
  return (
    <AppChrome>
      <div className="p-3 flex flex-col gap-2">
        <p className="text-[9px] uppercase tracking-widest px-1 mb-1" style={{ color: C.muted2 }}>Active sources</p>
        {SOURCES.slice(0, 5).map(s => (
          <div key={s.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ border: `1px solid ${C.border}`, background: C.bg }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] font-medium" style={{ color: C.text }}>{s.name}</span>
            </div>
            <div className="w-8 h-4 rounded-full flex items-center justify-end pr-0.5"
              style={{ backgroundColor: C.gold }}>
              <div className="w-3 h-3 rounded-full bg-white/70" />
            </div>
          </div>
        ))}
      </div>
    </AppChrome>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: 'DM Sans, sans-serif', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, background: `${C.bg}ee`, backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* LOGO REAL */}
          <button onClick={() => navigate('/landing')} className="flex items-center gap-2.5">
            <Logo size={32} />
            <span style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: '1.2rem', color: C.text, letterSpacing: '-0.02em' }}>grain</span>
          </button>

          <div className="hidden sm:flex items-center gap-6 text-sm" style={{ color: C.muted }}>
            <button onClick={() => scrollTo('how')} className="hover:opacity-70 transition-opacity">How it works</button>
            <button onClick={() => scrollTo('faq')} className="hover:opacity-70 transition-opacity">FAQ</button>
          </div>

          <div className="flex items-center gap-3">
            {isLoaded && (isSignedIn ? (
              <button onClick={() => navigate('/feed')}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: C.text, color: C.bg }}>
                Open feed <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button onClick={() => openSignIn()} className="text-sm transition-opacity hover:opacity-60 hidden sm:block" style={{ color: C.muted }}>Log in</button>
                <button onClick={() => navigate('/feed')}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
                  style={{ background: C.text, color: C.bg }}>
                  Get started
                </button>
              </>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-8 px-6 overflow-hidden">
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[500px]"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(200,150,60,0.13) 0%, transparent 65%)', filter: 'blur(50px)' }} />
          <div className="absolute top-40 left-1/4 w-80 h-80"
            style={{ background: 'radial-gradient(ellipse, rgba(255,140,60,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute top-24 right-1/4 w-72 h-72"
            style={{ background: 'radial-gradient(ellipse, rgba(160,100,220,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ border: `1px solid ${C.border}`, background: C.bg3, color: C.muted }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            RSS feeds · AI summaries · topic follow
            <ChevronRight size={12} />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 'clamp(2.8rem, 7vw, 5rem)', lineHeight: 1.0, letterSpacing: '-0.03em', color: C.text, marginBottom: '1.5rem' }}>
            news without<br />the <span style={{ color: C.gold }}>noise.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
            style={{ fontSize: '1.1rem', color: C.muted, lineHeight: 1.6, maxWidth: '32rem', margin: '0 auto 2rem' }}>
            Trusted sources, AI-summarised on demand, organised around the topics that actually matter to you.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-3">
            <button onClick={() => navigate('/feed')}
              className="flex items-center gap-2 text-sm font-semibold px-7 py-3 rounded-xl hover:opacity-80 transition-opacity"
              style={{ background: C.text, color: C.bg }}>
              Open the feed <ArrowRight size={15} />
            </button>
            <button onClick={() => scrollTo('how')}
              className="px-7 py-3 rounded-xl text-sm hover:opacity-70 transition-opacity"
              style={{ border: `1px solid ${C.border}`, color: C.muted, background: C.bg3 }}>
              How it works
            </button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-xs mb-16" style={{ color: C.muted2 }}>
            free · no algorithm · no ads
          </motion.p>

          {/* Hero mockup + floating cards */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative max-w-2xl mx-auto">

            {/* Floating card left */}
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-10 top-10 z-10 hidden lg:block w-48"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))' }}>
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${C.border}`, background: C.bg3 }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={8} style={{ color: C.green }} />
                  <span className="text-[9px]" style={{ color: C.muted }}>AI Summary ready</span>
                </div>
                <p className="text-[10px] leading-snug" style={{ color: C.text }}>Líderes acordam metas climáticas com €400B em renováveis.</p>
              </div>
            </motion.div>

            {/* Floating card right */}
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -right-10 top-12 z-10 hidden lg:block w-44"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))' }}>
              <div className="p-3 rounded-xl" style={{ border: `1px solid ${C.border}`, background: C.bg3 }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🌍</span>
                  <span className="text-[9px]" style={{ color: C.muted }}>New match</span>
                </div>
                <p className="text-[11px] font-semibold" style={{ color: C.gold }}>Climate & Energy</p>
                <p className="text-[9px] mt-0.5" style={{ color: C.muted2 }}>3 new articles</p>
              </div>
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none rounded-b-2xl"
              style={{ background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
            <FeedMockup />
          </motion.div>
        </div>
      </section>

      {/* ── Sources strip ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '3rem 1.5rem' }}>
        <p className="text-center text-xs uppercase tracking-widest mb-6" style={{ color: C.muted2 }}>Trusted sources included</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {SOURCES.map(s => (
            <div key={s.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ border: `1px solid ${C.border}`, background: C.bg3 }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs whitespace-nowrap" style={{ color: C.muted }}>{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Value props ── */}
      <section style={{ padding: '5rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: C.text, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              News that feels human.
            </h2>
            <p style={{ color: C.muted, fontSize: '1rem', maxWidth: '28rem', margin: '0 auto' }}>
              grain amplifies quality journalism, not engagement metrics.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { icon: Rss,           color: '#b8923a', bg: '#fdf3e0', title: 'Better sources', desc: 'Hand-picked newsrooms only. No aggregators, no blogs, no noise.' },
              { icon: Shield,        color: '#1a5fa8', bg: '#e8f0fb', title: 'Less noise',     desc: 'No algorithm, no personalisation, no filter bubble. Chronological always.' },
              { icon: BookmarkCheck, color: '#1a7a4a', bg: '#edf7f1', title: 'More signal',    desc: 'Follow topics semantically. grain finds what matters to you as it arrives.' },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08} className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: p.bg }}>
                  <p.icon size={22} style={{ color: p.color }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: C.text }}>{p.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: '5rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: C.text, letterSpacing: '-0.02em' }}>
              How grain works
            </h2>
            <p className="mt-3 max-w-md mx-auto" style={{ color: C.muted }}>From opening the feed to following what matters — it takes seconds.</p>
          </FadeIn>

          <div className="flex flex-col gap-24">
            {[
              { n: '01', title: 'Open the feed.\nRead without the noise.', desc: '11 curated newsrooms, refreshed every 30 minutes. English articles automatically translated to European Portuguese. Chronological — no algorithm decides what you see.', mockup: <FeedMockup />, flip: false },
              { n: '02', title: 'Summarise with AI.\nOnly when you ask.', desc: 'One click and Gemini 2.5 Flash generates a concise summary in European Portuguese. Summaries are cached and shared between all users — instant if already generated.', mockup: <SummaryMockup />, flip: true },
              { n: '03', title: 'Follow topics\nin plain language.', desc: 'Describe what you care about naturally. grain converts it to a semantic embedding and finds matching articles as they arrive. No keywords, no manual curation needed.', mockup: <FollowMockup />, flip: false },
              { n: '04', title: 'You decide\nwhere it comes from.', desc: 'Toggle any of the 11 curated newsrooms on or off. Suggest a source if it\'s missing. Your feed, your rules — no hidden incentives behind what\'s included.', mockup: <SourcesMockup />, flip: true },
            ].map(step => (
              <FadeIn key={step.n}>
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className={`flex flex-col gap-4 ${step.flip ? 'order-1 lg:order-2' : ''}`}>
                    <span className="text-xs font-mono uppercase tracking-widest" style={{ color: C.gold }}>
                      {step.n}
                    </span>
                    <h3 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: C.text, lineHeight: 1.15, letterSpacing: '-0.02em', whiteSpace: 'pre-line' }}>
                      {step.title}
                    </h3>
                    <p className="leading-relaxed" style={{ color: C.muted }}>{step.desc}</p>
                  </div>
                  <div className={step.flip ? 'order-2 lg:order-1 lg:pr-8' : 'lg:pl-8'}>
                    {step.mockup}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section style={{ padding: '5rem 1.5rem', borderBottom: `1px solid ${C.border}`, background: C.bg2, position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(200,150,60,0.1) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <FadeIn className="max-w-2xl mx-auto text-center relative">
          <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: C.text, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Quality journalism,<br />without the subscription wall.
          </h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: C.muted, fontSize: '0.95rem', lineHeight: 1.6 }}>
            Free forever. No credit card. No algorithm. No ads.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate('/feed')}
              className="flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-xl hover:opacity-80 transition-opacity"
              style={{ background: C.text, color: C.bg }}>
              Open the feed <ArrowRight size={15} />
            </button>
            {!isSignedIn && (
              <button onClick={() => openSignIn()}
                className="px-7 py-3.5 rounded-xl text-sm hover:opacity-70 transition-opacity"
                style={{ border: `1px solid ${C.border}`, color: C.muted, background: C.bg3 }}>
                Create account
              </button>
            )}
          </div>
        </FadeIn>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: '5rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-[260px_1fr] gap-16 items-start">
          <FadeIn>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: C.muted2 }}>FAQ</p>
            <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: '2rem', color: C.text, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Frequently<br />asked<br /><span style={{ color: C.gold }}>questions.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: C.muted }}>
              Everything you need to know about how grain works.
            </p>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {FAQ_ITEMS.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '7rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
            style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(200,150,60,0.14) 0%, transparent 65%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-10 right-1/3 w-72 h-72"
            style={{ background: 'radial-gradient(ellipse, rgba(160,100,220,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        </div>
        <FadeIn className="max-w-xl mx-auto text-center flex flex-col items-center gap-6 relative">
          {/* LOGO REAL em destaque */}
          <Logo size={80} />

          <h2 style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: C.text, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            News without<br />the <span style={{ color: C.gold }}>noise.</span>
          </h2>
          <p style={{ color: C.muted2, fontSize: '0.85rem' }}>no noise, only grain.</p>
          <button onClick={() => navigate('/feed')}
            className="flex items-center gap-2 text-sm font-semibold px-8 py-3.5 rounded-xl hover:opacity-80 transition-opacity"
            style={{ background: C.text, color: C.bg }}>
            Start reading <ArrowRight size={15} />
          </button>
          <p style={{ color: C.muted2, fontSize: '0.75rem' }}>free · no algorithm · no ads</p>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '2rem 1.5rem' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* LOGO REAL no footer */}
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 600, fontSize: '1rem', color: C.text }}>grain</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: C.muted }}>
            <button onClick={() => navigate('/feed')} className="hover:opacity-70 transition-opacity">Feed</button>
            <button onClick={() => navigate('/sources')} className="hover:opacity-70 transition-opacity">Sources</button>
            <button onClick={() => navigate('/follow')} className="hover:opacity-70 transition-opacity">Follow</button>
          </div>
          <span style={{ color: C.muted2, fontSize: '0.75rem' }}>no noise, only grain.</span>
        </div>
      </footer>

    </div>
  );
}
