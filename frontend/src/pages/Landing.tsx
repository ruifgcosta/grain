/**
 * Landing page v5 — inspirado Liftoff.
 * Blobs/orbs, strip de fontes, props 3 cols, how-it-works alternado,
 * CTA banner, FAQ 2 colunas, final CTA com gradiente.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Sparkles, BookmarkCheck, Rss, ArrowRight, Shield, ChevronRight } from 'lucide-react';

const SOURCES = [
  { name: 'BBC News', color: '#b80000' }, { name: 'The Guardian', color: '#005689' },
  { name: 'Público', color: '#1a1aff' }, { name: 'Observador', color: '#e63329' },
  { name: 'Washington Post', color: '#ccc' }, { name: 'RTP Notícias', color: '#009a44' },
  { name: 'Al Jazeera', color: '#c8a96e' }, { name: 'Wired', color: '#aaa' },
  { name: 'NPR News', color: '#4a90d9' }, { name: 'DW News', color: '#c41e3a' },
  { name: 'Ars Technica', color: '#ff4e00' },
];

const MOCK_ARTICLES = [
  { source: 'BBC News', color: '#b80000', title: 'EU leaders reach historic climate agreement', time: '2m' },
  { source: 'Público', color: '#1a1aff', title: 'Portugal regista crescimento de 2,3% no trimestre', time: '8m' },
  { source: 'The Guardian', color: '#005689', title: 'Scientists find new approach to carbon capture', time: '15m' },
];

const FAQ_ITEMS = [
  { q: 'Do I need an account to use grain?', a: 'No. The feed is public — you can read without signing up. An account is only needed to follow topics or manage sources.' },
  { q: 'Where do the articles come from?', a: 'Grain aggregates RSS feeds from 10+ hand-picked outlets: BBC News, The Guardian, Público, Observador, Washington Post, RTP, Al Jazeera, NPR, Wired, DW News and Ars Technica.' },
  { q: 'How does the AI summary work?', a: 'Click "AI Summary" on any article. Gemini 2.5 Flash generates a concise summary in European Portuguese. Cached — if someone already requested it, you get it instantly.' },
  { q: 'What is topic follow?', a: 'Describe a topic in plain language. Grain converts it to a semantic embedding and matches it against articles as they arrive. No keywords, no setup.' },
  { q: 'Is it free? Will it stay free?', a: 'Yes. No ads, no subscriptions, no data selling. Runs on Cloudflare Workers, AI costs minimal at this scale.' },
];

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 py-4 text-left group">
        <span className="text-sm text-text group-hover:text-gold transition-colors">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
          className="text-muted w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border border-border text-sm">+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="pb-4 text-sm text-muted leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] overflow-hidden"
      style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#080808]">
        <div className="flex gap-1.5">
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />)}
        </div>
        <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-full px-3 py-1">
          <img src="/favicon.svg" className="w-3 h-3 opacity-50" alt="" />
          <span className="text-[10px] text-white/25">grain.app</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function FeedMockup() {
  return (
    <AppShell>
      <div className="p-3 flex flex-col gap-2">
        {MOCK_ARTICLES.map((a, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
            className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-[10px] text-white/40">{a.source}</span>
              </div>
              <span className="text-[10px] text-white/25">{a.time}</span>
            </div>
            <p className="text-[11px] text-white/80 font-semibold leading-snug">{a.title}</p>
            <div className="flex gap-1.5">
              <span className="text-[9px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles size={7} />AI
              </span>
              <span className="text-[9px] border border-white/10 text-white/30 px-1.5 py-0.5 rounded">follow</span>
            </div>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}

function SummaryMockup() {
  return (
    <AppShell>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(16,185,129,0.3)' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b80000]" />
            <span className="text-[10px] text-white/40">BBC News · 2m</span>
          </div>
          <p className="text-[11px] text-white/80 font-semibold leading-snug">EU leaders reach historic climate agreement at Brussels summit</p>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '0.5px solid rgba(16,185,129,0.25)' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles size={8} className="text-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-medium">Resumo IA · PT</span>
            </div>
            <p className="text-[10px] text-white/70 leading-relaxed">Líderes europeus chegaram a acordo sobre metas climáticas para 2035, com redução de 65% nas emissões e €400 mil milhões em renováveis.</p>
          </div>
        </div>
        {MOCK_ARTICLES.slice(1).map((a, i) => (
          <div key={i} className="flex flex-col gap-1 p-2.5 rounded-xl opacity-40"
            style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-[9px] text-white/40">{a.source}</span>
            </div>
            <p className="text-[10px] text-white/60 font-medium leading-tight line-clamp-1">{a.title}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function FollowMockup() {
  return (
    <AppShell>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 p-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(200,169,110,0.3)' }}>
          <span className="text-sm">✍️</span>
          <span className="text-[10px] text-white/50">alterações climáticas na Europa</span>
          <span className="ml-auto text-[9px] bg-[#c8a96e] text-black px-2 py-0.5 rounded-full font-medium flex-shrink-0">Follow</span>
        </div>
        {[
          { emoji: '🌍', label: 'Climate & Energy Europe', count: 3 },
          { emoji: '🏛️', label: 'EU Politics & Policy', count: 1 },
          { emoji: '💻', label: 'AI & Technology', count: 5 },
        ].map(t => (
          <div key={t.label} className="flex items-center justify-between p-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t.emoji}</span>
              <span className="text-[10px] text-white/70">{t.label}</span>
            </div>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(200,169,110,0.15)', color: '#c8a96e', border: '0.5px solid rgba(200,169,110,0.3)' }}>
              {t.count} new
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function SourcesMockup() {
  return (
    <AppShell>
      <div className="p-3 flex flex-col gap-2">
        <p className="text-[9px] text-white/30 uppercase tracking-widest px-1 mb-1">Active sources</p>
        {SOURCES.slice(0, 5).map(s => (
          <div key={s.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-white/70">{s.name}</span>
            </div>
            <div className="w-8 h-4 rounded-full flex items-center justify-end pr-0.5" style={{ backgroundColor: '#c8a96e99' }}>
              <div className="w-3 h-3 rounded-full bg-black/40" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text font-body overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/landing')}>
            <img src="/favicon.svg" alt="" className="w-6 h-6" />
            <span className="font-display font-extrabold text-lg text-text tracking-tight">grain</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted">
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-text transition-colors">How it works</button>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-text transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            {isLoaded && (isSignedIn ? (
              <button onClick={() => navigate('/feed')} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-gold text-bg hover:bg-gold2 transition-colors">
                Open feed <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button onClick={() => openSignIn()} className="text-sm text-muted hover:text-text transition-colors hidden sm:block">Log in</button>
                <button onClick={() => navigate('/feed')} className="text-sm font-semibold px-4 py-2 rounded-xl bg-text text-bg hover:opacity-90 transition-opacity">
                  Get started
                </button>
              </>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px]"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(200,169,110,0.11) 0%, transparent 65%)', filter: 'blur(40px)' }} />
          <div className="absolute top-40 left-1/4 w-80 h-80"
            style={{ background: 'radial-gradient(ellipse, rgba(130,80,200,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute top-32 right-1/4 w-72 h-72"
            style={{ background: 'radial-gradient(ellipse, rgba(200,140,80,0.09) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg2 text-xs text-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            RSS feeds · AI summaries · topic follow
            <ChevronRight size={12} />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-display font-extrabold text-5xl sm:text-6xl lg:text-[72px] text-text leading-[1.0] tracking-tight mb-6">
            news without<br />the <span className="text-gold">noise.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
            className="text-base sm:text-lg text-muted leading-relaxed max-w-xl mx-auto mb-8">
            Trusted sources, AI-summarised on demand, organised around the topics that actually matter to you.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-3">
            <button onClick={() => navigate('/feed')}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-text text-bg font-semibold hover:opacity-90 transition-opacity text-sm">
              Open the feed <ArrowRight size={15} />
            </button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-7 py-3 rounded-xl border border-border text-sm text-muted hover:text-text hover:border-border2 transition-colors">
              How it works
            </button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-xs text-muted/40 mb-16">free · no algorithm · no ads</motion.p>

          {/* Hero mockup with floating cards */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative max-w-2xl mx-auto">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-10 top-8 z-10 hidden lg:block w-48">
              <div className="p-3 rounded-xl border border-white/10 bg-[#0e0e0e]"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={8} className="text-emerald-400" />
                  <span className="text-[9px] text-white/40">AI Summary ready</span>
                </div>
                <p className="text-[10px] text-white/70 leading-snug">Líderes acordam metas climáticas com €400B em renováveis.</p>
              </div>
            </motion.div>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -right-10 top-10 z-10 hidden lg:block w-44">
              <div className="p-3 rounded-xl border border-white/10 bg-[#0e0e0e]"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🌍</span>
                  <span className="text-[9px] text-white/40">New match</span>
                </div>
                <p className="text-[11px] font-medium" style={{ color: '#c8a96e' }}>Climate & Energy</p>
                <p className="text-[9px] text-white/30 mt-0.5">3 new articles</p>
              </div>
            </motion.div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent z-10 rounded-b-2xl pointer-events-none" />
            <FeedMockup />
          </motion.div>
        </div>
      </section>

      {/* Sources strip */}
      <section className="py-12 border-y border-border">
        <p className="text-center text-xs text-muted/50 uppercase tracking-widest mb-6">Trusted sources included</p>
        <div className="flex flex-wrap justify-center gap-3 px-6 max-w-4xl mx-auto">
          {SOURCES.map(s => (
            <div key={s.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted whitespace-nowrap">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text mb-3">News that feels human.</h2>
            <p className="text-muted text-base max-w-md mx-auto">grain amplifies quality journalism, not engagement metrics.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { icon: Rss,           color: '#c8a96e', bg: 'rgba(200,169,110,0.1)', title: 'Better sources', desc: 'Hand-picked newsrooms only. No aggregators, no blogs, no noise.' },
              { icon: Shield,        color: '#4a90d9', bg: 'rgba(74,144,217,0.1)',  title: 'Less noise',    desc: 'No algorithm, no personalisation, no filter bubble. Chronological.' },
              { icon: BookmarkCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  title: 'More signal',   desc: 'Follow topics semantically. grain finds what matters to you.' },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08} className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: p.bg, border: `0.5px solid ${p.color}44` }}>
                  <p.icon size={22} style={{ color: p.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-text mb-2">{p.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — alternado */}
      <section id="how" className="py-20 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text">How grain works</h2>
            <p className="text-muted text-base mt-3 max-w-md mx-auto">From opening the feed to following what matters — it takes seconds.</p>
          </FadeIn>
          <div className="flex flex-col gap-24">
            {[
              { n: '01', title: 'Open the feed.\nRead without the noise.', desc: '11 curated newsrooms, updated every 30 minutes. English articles automatically translated to European Portuguese. Chronological — no algorithm decides what you see.', mockup: <FeedMockup />, right: true },
              { n: '02', title: 'Summarise with AI.\nOnly when you ask.', desc: 'One click and Gemini 2.5 Flash generates a concise summary in European Portuguese. Summaries are cached and shared between all users — instant if already generated.', mockup: <SummaryMockup />, right: false },
              { n: '03', title: 'Follow topics\nin plain language.', desc: 'Describe what you care about naturally. grain converts it to a semantic embedding and automatically finds matching articles as they arrive. No keywords, no manual curation.', mockup: <FollowMockup />, right: true },
              { n: '04', title: 'You decide\nwhere it comes from.', desc: 'Toggle any of the 11+ curated newsrooms on or off. Suggest a source if it\'s missing. Your feed, your rules — no hidden incentives.', mockup: <SourcesMockup />, right: false },
            ].map((step) => (
              <FadeIn key={step.n}>
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className={`flex flex-col gap-4 ${!step.right ? 'order-1 lg:order-2' : ''}`}>
                    <span className="text-xs font-mono text-gold/60 uppercase tracking-widest">{step.n}</span>
                    <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-text leading-tight" style={{ whiteSpace: 'pre-line' }}>{step.title}</h3>
                    <p className="text-muted leading-relaxed">{step.desc}</p>
                  </div>
                  <div className={!step.right ? 'order-2 lg:order-1 lg:pr-8' : 'lg:pl-8'}>
                    {step.mockup}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 px-6 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(200,169,110,0.07) 0%, transparent 70%)' }} />
        <FadeIn className="max-w-2xl mx-auto text-center relative">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text mb-4 leading-tight">
            Quality journalism,<br />without the subscription wall.
          </h2>
          <p className="text-muted text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Trusted by readers who value substance over virality. Free forever, no credit card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate('/feed')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-text text-bg font-semibold hover:opacity-90 transition-opacity text-sm">
              Open the feed <ArrowRight size={15} />
            </button>
            {!isSignedIn && (
              <button onClick={() => openSignIn()}
                className="px-7 py-3.5 rounded-xl border border-border text-sm text-muted hover:text-text hover:border-border2 transition-colors">
                Create account
              </button>
            )}
          </div>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-[260px_1fr] gap-16 items-start">
          <FadeIn>
            <p className="text-xs text-muted/50 uppercase tracking-widest mb-4">FAQ</p>
            <h2 className="font-display font-extrabold text-3xl text-text leading-tight">
              Frequently<br />asked<br /><span className="text-gold">questions.</span>
            </h2>
            <p className="text-sm text-muted mt-4 leading-relaxed">Everything you need to know about how grain works.</p>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="border-t border-border">
              {FAQ_ITEMS.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
            style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(200,169,110,0.1) 0%, transparent 65%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-10 left-1/4 w-72 h-72"
            style={{ background: 'radial-gradient(ellipse, rgba(100,60,200,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <FadeIn className="max-w-xl mx-auto text-center flex flex-col items-center gap-6 relative">
          <img src="/logo.svg" alt="grain" width={72} height={72} className="rounded-2xl shadow-2xl" />
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-text leading-tight">
            News without<br />the <span className="text-gold">noise.</span>
          </h2>
          <p className="text-sm text-muted/60">no noise, only grain.</p>
          <button onClick={() => navigate('/feed')}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-text text-bg font-semibold hover:opacity-90 transition-opacity text-sm">
            Start reading <ArrowRight size={15} />
          </button>
          <p className="text-xs text-muted/30">free · no algorithm · no ads</p>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="w-5 h-5" />
            <span className="font-display font-extrabold text-text">grain</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted">
            <button onClick={() => navigate('/feed')} className="hover:text-text transition-colors">Feed</button>
            <button onClick={() => navigate('/sources')} className="hover:text-text transition-colors">Sources</button>
            <button onClick={() => navigate('/follow')} className="hover:text-text transition-colors">Follow</button>
          </div>
          <span className="text-xs text-muted/40">no noise, only grain.</span>
        </div>
      </footer>

    </div>
  );
}
