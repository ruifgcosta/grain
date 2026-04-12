/**
 * Landing page v3 — redesign fiel ao protótipo.
 * Editorial, dark, inglês. Sem algoritmo, sem ruído.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Play, Plus, ChevronRight } from 'lucide-react';

// ─── Mock data ────────────────────────────────────────────────────────────────

const TICKER_ARTICLES = [
  { source: 'BBC News',     color: '#b80000', tag: '',         title: 'Ukraine forces advance near Kharkiv amid heavy resistance' },
  { source: 'Reuters',      color: '#ff8000', tag: 'Economy',  title: 'Fed holds rates steady, signals no rush to cut' },
  { source: 'Público',      color: '#1a1aff', tag: 'Portugal', title: 'Portugal regista crescimento no primeiro trimestre' },
  { source: 'The Guardian', color: '#005689', tag: 'Climate',  title: 'EU leaders reach historic climate deal at Brussels summit' },
  { source: 'Al Jazeera',   color: '#c8a96e', tag: 'World',   title: 'Ceasefire negotiations collapse amid renewed strikes' },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need an account to use grain?',
    a: 'No. The feed is public — you can read articles without signing up. An account is only needed if you want to follow topics or manage your sources.',
  },
  {
    q: 'Where do the articles come from? Are they reliable?',
    a: 'Grain aggregates RSS feeds from 10+ hand-picked outlets: BBC News, The Guardian, Público, Observador, Washington Post, RTP, Al Jazeera, NPR, Wired, DW News and Ars Technica. No user-generated content.',
  },
  {
    q: 'How does the AI summary work?',
    a: 'When you click "AI Summary", grain sends the article URL to Gemini 2.5 Flash, which generates a concise summary in European Portuguese. Summaries are cached and shared — if someone already requested it, you get it instantly.',
  },
  {
    q: 'What is topic follow and how does it work?',
    a: 'You describe a topic in plain language (e.g. "renewable energy in Europe"). Grain converts it to a semantic embedding and matches it against new articles as they arrive — no keyword matching, no manual setup.',
  },
  {
    q: 'What languages are articles delivered in?',
    a: 'Portuguese and English sources are both included. English articles are automatically translated to European Portuguese using Gemini.',
  },
  {
    q: 'Is it free? Will it stay free?',
    a: 'Yes. Grain has no ads, no subscriptions, no data selling. It runs on Cloudflare Workers and the AI costs are marginal at this scale.',
  },
];

// ─── Subcomponentes ────────────────────────────────────────────────────────────

/** FAQ accordion item */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-sm text-text group-hover:text-gold transition-colors">{q}</span>
        <span className="text-muted flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full border border-border group-hover:border-border2 transition-colors">
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="block text-xs leading-none"
          >
            +
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-muted leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Mini mockup: Topic follow */
function TopicFollowMockup() {
  const topics = [
    { emoji: '🟡', label: 'War in Ukraine',        badge: '2',          color: '#c8a96e' },
    { emoji: '🔵', label: 'Artificial Intelligence', badge: '1',         color: '#4a90d9' },
    { emoji: '🟢', label: 'Global Economy',          badge: 'up to date', color: '#888' },
  ];
  return (
    <div className="flex flex-col gap-2 mt-3">
      {topics.map(t => (
        <div key={t.label} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg3 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm">{t.emoji}</span>
            <span className="text-xs text-text">{t.label}</span>
          </div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: t.badge === 'up to date' ? 'transparent' : t.color + '22',
              color: t.badge === 'up to date' ? '#555' : t.color,
              border: t.badge === 'up to date' ? '1px solid #222' : `1px solid ${t.color}44`,
            }}
          >
            {t.badge}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Mini mockup: Sources */
function SourcesMockup() {
  const active = [
    { label: 'BBC',    color: '#b80000' },
    { label: 'Público',color: '#1a1aff' },
    { label: 'Reuters',color: '#ff8000' },
  ];
  const inactive = ['The Verge', 'Ars Technica'];
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {active.map(s => (
          <span key={s.label} className="text-xs px-2.5 py-1 rounded-full font-medium text-bg" style={{ backgroundColor: s.color }}>
            {s.label}
          </span>
        ))}
        {inactive.map(s => (
          <span key={s} className="text-xs px-2.5 py-1 rounded-full text-muted border border-border">{s}</span>
        ))}
      </div>
      <button className="flex items-center gap-1 text-xs text-muted hover:text-gold transition-colors mt-1">
        <Plus size={10} />
        suggest a source
      </button>
    </div>
  );
}

/** Mini mockup: Translation */
function TranslationMockup() {
  return (
    <div className="mt-3">
      <div className="p-3 rounded-xl border border-border bg-bg3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] text-gold border border-gold/30 bg-gold/10 px-1.5 py-0.5 rounded-full">auto-translated</span>
        </div>
        <p className="text-xs text-text leading-relaxed line-clamp-4">
          "Ukrainian forces advanced +4km in the Kharkiv region, recapturing two strategic villages..."
        </p>
      </div>
    </div>
  );
}

/** Fade-in section wrapper */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text font-body overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="grain" className="w-6 h-6" />
            <span className="font-display font-extrabold text-xl text-text tracking-tight">grain</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoaded && isSignedIn ? (
              <button
                onClick={() => navigate('/feed')}
                className="text-xs text-muted border border-border px-3 py-1.5 rounded-lg hover:text-text hover:border-border2 transition-colors"
              >
                open feed
              </button>
            ) : (
              <>
                <button onClick={() => openSignIn()} className="text-xs text-muted hover:text-text transition-colors hidden sm:block">
                  sign in
                </button>
                <button
                  onClick={() => navigate('/feed')}
                  className="text-xs text-text border border-border px-3 py-1.5 rounded-lg hover:border-border2 transition-colors"
                >
                  get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-16 px-6">
        <div className="max-w-3xl mx-auto">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-1.5 text-xs text-muted mb-6"
          >
            <span>RSS feeds</span>
            <span>·</span>
            <span>AI summaries</span>
            <span>·</span>
            <span>topic follow</span>
            <ChevronRight size={12} className="text-muted" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-text leading-[1.0] tracking-tight mb-6"
          >
            news without
            <br />the <span className="text-gold">noise.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-base text-muted leading-relaxed max-w-xl mb-3"
          >
            Trusted sources, AI-summarised on demand, organised
            around the topics that actually matter to you.
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xs text-muted/60 mb-8"
          >
            no noise, only grain.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="flex flex-wrap items-center gap-3 mb-4"
          >
            <button
              onClick={() => navigate('/feed')}
              className="px-5 py-2.5 rounded-lg border border-border text-sm text-text hover:border-border2 hover:bg-bg2 transition-colors"
            >
              open the feed
            </button>
            <button
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted hover:text-text hover:border-border2 transition-colors"
            >
              see how it works
            </button>
          </motion.div>

          {/* Meta */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-xs text-muted/50"
          >
            free · no algorithm · no ads
          </motion.p>
        </div>
      </section>

      {/* ── News ticker ── */}
      <section className="border-y border-border overflow-x-auto scrollbar-none">
        <div className="flex divide-x divide-border min-w-max sm:min-w-0">
          {TICKER_ARTICLES.slice(0, 3).map((a, i) => (
            <div key={i} className="flex-1 min-w-[260px] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[10px] text-muted font-medium">{a.source}</span>
                {a.tag && (
                  <span className="text-[9px] text-muted border border-border px-1.5 py-0.5 rounded-full">{a.tag}</span>
                )}
              </div>
              <p className="text-xs text-text font-medium leading-snug line-clamp-2">{a.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Features — 3 colunas ── */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8 items-start">

          {/* Coluna 1: AI Summaries texto */}
          <FadeIn delay={0}>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">AI Summaries</p>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-text leading-tight mb-4">
              reads for you,<br />only when asked.
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Every article is automatically translated. The summary is only generated when you ask —
              no waste, no wait.
            </p>
          </FadeIn>

          {/* Coluna 2: Stats */}
          <FadeIn delay={0.08}>
            <div className="flex flex-col gap-6">
              {[
                { value: '10',  label: 'trusted sources' },
                { value: '30m', label: 'refresh interval' },
                { value: '0€',  label: 'cost to the reader' },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-display font-extrabold text-4xl text-text">{s.value}</div>
                  <div className="text-xs text-muted mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Coluna 3: App mockup */}
          <FadeIn delay={0.16}>
            <div className="rounded-xl border border-border bg-bg2 overflow-hidden">
              {/* Chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-bg3">
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <div key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                ))}
                <div className="flex-1 flex items-center gap-1.5 ml-2 bg-bg rounded-full px-2 py-0.5">
                  <img src="/favicon.svg" className="w-2.5 h-2.5 opacity-60" alt="" />
                  <span className="text-[9px] text-muted">grain.app</span>
                </div>
              </div>
              {/* Article cards */}
              <div className="p-2.5 flex flex-col gap-2">
                {TICKER_ARTICLES.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex flex-col gap-1 p-2.5 rounded-lg border border-border bg-bg">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="text-[9px] text-muted">{a.source}</span>
                    </div>
                    <p className="text-[10px] text-text font-medium leading-tight line-clamp-2">{a.title}</p>
                    <div className="flex gap-1 mt-0.5">
                      <span className="text-[8px] text-green border border-green-bdr bg-green-bg px-1.5 py-0.5 rounded">AI</span>
                      <span className="text-[8px] text-gold border border-gold/20 bg-gold/5 px-1.5 py-0.5 rounded">follow</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 3 Feature cards com mini UI ── */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-5">

          {/* Card 1: Topic follow */}
          <FadeIn delay={0} className="flex flex-col p-6 rounded-2xl border border-border bg-bg2">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Topic Follow</p>
            <h3 className="font-display font-extrabold text-xl text-text leading-tight">
              follow the story,<br />not the article.
            </h3>
            <p className="text-xs text-muted mt-2 mb-1 leading-relaxed">
              Describe a topic. New matching articles appear automatically.
            </p>
            <TopicFollowMockup />
          </FadeIn>

          {/* Card 2: Your sources */}
          <FadeIn delay={0.08} className="flex flex-col p-6 rounded-2xl border border-border bg-bg2">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Your Sources</p>
            <h3 className="font-display font-extrabold text-xl text-text leading-tight">
              you decide<br />where it comes from.
            </h3>
            <p className="text-xs text-muted mt-2 mb-1 leading-relaxed">
              Toggle any of the 10+ outlets. Suggest ones we're missing.
            </p>
            <SourcesMockup />
          </FadeIn>

          {/* Card 3: Language */}
          <FadeIn delay={0.16} className="flex flex-col p-6 rounded-2xl border border-border bg-bg2">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-3">No Language Barrier</p>
            <h3 className="font-display font-extrabold text-xl text-text leading-tight">
              always in<br />your language.
            </h3>
            <p className="text-xs text-muted mt-2 mb-1 leading-relaxed">
              English articles are automatically translated to European Portuguese.
            </p>
            <TranslationMockup />
          </FadeIn>
        </div>
      </section>

      {/* ── See how it works (video placeholder) ── */}
      <section id="how-it-works" className="py-20 px-6 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-4">In Action</p>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text leading-tight">
                see how it <span className="text-gold">works</span>
              </h2>
              <p className="text-sm text-muted mt-3 max-w-md mx-auto leading-relaxed">
                Two minutes that show everything — from the feed to follow,
                through AI summaries.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            {/* Video placeholder */}
            <div className="w-full aspect-video bg-bg2 border border-border rounded-2xl flex items-center justify-center relative overflow-hidden">
              {/* Subtle grid background */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              {/* Play button */}
              <div className="relative flex flex-col items-center gap-4">
                <button className="w-16 h-16 rounded-full bg-gold hover:bg-gold2 transition-colors flex items-center justify-center shadow-lg">
                  <Play size={22} className="text-bg ml-1" fill="currentColor" />
                </button>
                <span className="text-xs text-muted">grain · product demo · 2 min</span>
              </div>
            </div>
          </FadeIn>

          {/* Feature dots */}
          <FadeIn delay={0.2}>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
              {['real-time feed', 'AI summaries on demand', 'semantic topic follow', 'source management'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="w-1 h-1 rounded-full bg-gold" />
                  {f}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-[1fr_2fr] gap-12 items-start">

          {/* Left: label + headline */}
          <FadeIn>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">FAQ</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text leading-tight">
              any <span className="text-gold">questions?</span>
            </h2>
            <p className="text-sm text-muted mt-4 leading-relaxed">
              The most common questions about how grain works, what it
              needs, and what it doesn't do.
            </p>
          </FadeIn>

          {/* Right: accordion */}
          <FadeIn delay={0.05}>
            <div className="border-t border-border">
              {FAQ_ITEMS.map(item => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-6">
          <FadeIn className="flex flex-col items-center gap-6">
            <img src="/favicon.svg" alt="grain" className="w-12 h-12" />
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-text leading-tight">
              news with <span className="text-gold">texture,</span>
              <br />not noise.
            </h2>
            <p className="text-xs text-muted/60">no noise, only grain.</p>
            <button
              onClick={() => navigate('/feed')}
              className="px-8 py-3 rounded-xl border border-border text-sm text-text hover:border-border2 hover:bg-bg2 transition-colors"
            >
              start reading
            </button>
            <p className="text-xs text-muted/40">free · no algorithm · no ads</p>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="grain" className="w-5 h-5" />
            <span className="font-display font-extrabold text-sm text-text">grain</span>
          </div>
          <span className="text-xs text-muted/50">no noise, only grain.</span>
        </div>
      </footer>

    </div>
  );
}
