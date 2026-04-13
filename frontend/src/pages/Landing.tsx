/**
 * Landing page v4 — inspiração Liftoff/Linear.
 * Hero centrado com glow, bento grid, logo em destaque.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Sparkles, BookmarkCheck, Rss, ArrowRight, Zap, Shield, Globe, Plus, Play, ChevronRight } from 'lucide-react';

// ─── Dados ────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  { q: 'Do I need an account to use grain?', a: 'No. The feed is public — you can read without signing up. An account is only needed to follow topics or manage sources.' },
  { q: 'Where do the articles come from?', a: 'Grain aggregates RSS feeds from 10+ hand-picked outlets: BBC News, The Guardian, Público, Observador, Washington Post, RTP, Al Jazeera, NPR, Wired, DW News and Ars Technica.' },
  { q: 'How does the AI summary work?', a: 'Click "AI Summary" on any article. Gemini 2.5 Flash generates a concise summary in European Portuguese. Summaries are cached — if someone already requested it, you get it instantly.' },
  { q: 'What is topic follow?', a: 'Describe a topic in plain language. Grain converts it to a semantic embedding and matches it against new articles as they arrive. No keywords, no manual setup.' },
  { q: 'Is it free? Will it stay free?', a: 'Yes. No ads, no subscriptions, no data selling. It runs on Cloudflare Workers and AI costs are minimal at this scale.' },
];

const SOURCES = [
  { name: 'BBC News', color: '#b80000' }, { name: 'The Guardian', color: '#005689' },
  { name: 'Público', color: '#1a1aff' }, { name: 'Observador', color: '#e63329' },
  { name: 'Washington Post', color: '#111' }, { name: 'RTP', color: '#009a44' },
  { name: 'Al Jazeera', color: '#c8a96e' }, { name: 'Wired', color: '#888' },
  { name: 'NPR', color: '#4a90d9' }, { name: 'DW News', color: '#c41e3a' },
];

const MOCK_ARTICLES = [
  { source: 'BBC News', color: '#b80000', title: 'EU leaders reach historic climate agreement at Brussels summit', time: '2m', tag: 'World' },
  { source: 'Público', color: '#1a1aff', title: 'Portugal regista crescimento de 2,3% no primeiro trimestre', time: '8m', tag: 'Portugal' },
  { source: 'The Guardian', color: '#005689', title: 'Scientists discover new approach to carbon capture', time: '15m', tag: 'Climate' },
  { source: 'Observador', color: '#e63329', title: 'Banco de Portugal alerta para riscos no mercado imobiliário', time: '23m', tag: 'Economia' },
];

// ─── Logo component ───────────────────────────────────────────────────────────

/**
 * GrainLogo — duas variantes:
 *  - dark (default): favicon.svg, sem fundo, dots claros → para navbar/UI escura
 *  - light: logo.svg, com fundo creme → para hero, CTA, footer
 */
function GrainLogo({ size = 28, variant = 'dark', className = '' }: { size?: number; variant?: 'dark' | 'light'; className?: string }) {
  const src = variant === 'light' ? '/logo.svg' : '/favicon.svg';
  return (
    <img
      src={src}
      alt="grain"
      width={size}
      height={size}
      className={variant === 'light' ? `rounded-xl ${className}` : className}
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 py-4 text-left group">
        <span className="text-sm text-text group-hover:text-gold transition-colors">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
          className="text-muted w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border border-border text-sm leading-none">
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden">
            <p className="pb-4 text-sm text-muted leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────

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

// ─── Mini feed mockup ─────────────────────────────────────────────────────────

function FeedMockup() {
  return (
    <div className="rounded-2xl border border-border bg-bg2 overflow-hidden shadow-2xl" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg">
        <div className="flex gap-1.5">
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />)}
        </div>
        <div className="flex-1 flex items-center gap-2 bg-bg2 rounded-full px-3 py-1">
          <GrainLogo size={12} className="opacity-70" />
          <span className="text-[10px] text-muted">grain.app / feed</span>
        </div>
      </div>
      {/* Articles */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {MOCK_ARTICLES.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-bg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[9px] text-muted font-medium truncate">{a.source}</span>
              </div>
              <span className="text-[9px] text-muted">{a.time}</span>
            </div>
            <p className="text-[10px] text-text font-semibold leading-snug line-clamp-2">{a.title}</p>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[8px] border border-green-bdr bg-green-bg text-green px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Sparkles size={7} />AI
              </span>
              <span className="text-[8px] border border-border text-muted px-1.5 py-0.5 rounded-md">{a.tag}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Bento cards ──────────────────────────────────────────────────────────────

function BentoSourcesCard() {
  return (
    <div className="flex flex-col h-full p-6">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Sources</p>
      <h3 className="font-display font-extrabold text-xl text-text mb-2">You decide<br />where it comes from.</h3>
      <p className="text-xs text-muted leading-relaxed mb-4">Toggle any outlet. 10+ curated newsrooms, no junk.</p>
      <div className="flex flex-wrap gap-2 mt-auto">
        {SOURCES.slice(0, 6).map(s => (
          <div key={s.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-bg">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-muted">{s.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-[10px] text-muted">
          <Plus size={9} />+4 more
        </div>
      </div>
    </div>
  );
}

function BentoFollowCard() {
  const topics = [
    { emoji: '🌍', label: 'Climate & Energy', count: 3 },
    { emoji: '🏛️', label: 'EU Politics', count: 1 },
    { emoji: '💻', label: 'AI & Tech', count: 5 },
  ];
  return (
    <div className="flex flex-col h-full p-6">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Topic Follow</p>
      <h3 className="font-display font-extrabold text-xl text-text mb-2">Follow the story,<br />not the article.</h3>
      <p className="text-xs text-muted leading-relaxed mb-4">Plain language. Semantic matching. No keywords needed.</p>
      <div className="flex flex-col gap-2 mt-auto">
        {topics.map(t => (
          <div key={t.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg border border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t.emoji}</span>
              <span className="text-xs text-text">{t.label}</span>
            </div>
            <span className="text-[10px] font-medium text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">{t.count} new</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoAICard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col h-full p-6">
      <p className="text-[10px] text-muted uppercase tracking-widest mb-3">AI Summaries</p>
      <h3 className="font-display font-extrabold text-xl text-text mb-2">Reads for you,<br />only when asked.</h3>
      <div className="mt-auto">
        <div className="p-3 rounded-xl bg-bg border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={10} className="text-green" />
            <span className="text-[9px] text-green font-medium">AI Summary · PT</span>
          </div>
          <p className="text-[10px] text-text leading-relaxed">
            {expanded
              ? 'Líderes europeus chegaram a acordo sobre metas climáticas para 2035. O pacto prevê redução de 65% nas emissões e investimento de €400 mil milhões em energias renováveis.'
              : 'Líderes europeus chegaram a acordo sobre metas climáticas para 2035...'}
          </p>
          {!expanded && (
            <button onClick={() => setExpanded(true)} className="mt-2 text-[9px] text-gold hover:underline">
              read more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BentoStatsCard() {
  const stats = [
    { v: '10+', l: 'curated sources' },
    { v: '30m', l: 'refresh interval' },
    { v: '0€',  l: 'cost to you' },
  ];
  return (
    <div className="flex flex-col justify-between h-full p-6">
      <div>
        <p className="text-[10px] text-muted uppercase tracking-widest mb-3">By the numbers</p>
        <h3 className="font-display font-extrabold text-xl text-text">Simple, honest, free.</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6">
        {stats.map(s => (
          <div key={s.l} className="flex flex-col gap-1">
            <span className="font-display font-extrabold text-3xl text-text">{s.v}</span>
            <span className="text-[10px] text-muted leading-tight">{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text font-body overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/landing')}>
            <GrainLogo size={28} />
            <span className="font-display font-extrabold text-lg text-text tracking-tight">grain</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted">
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-text transition-colors">How it works</button>
            <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-text transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            {isLoaded && (isSignedIn ? (
              <button onClick={() => navigate('/feed')}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-gold text-bg hover:bg-gold2 transition-colors">
                Open feed <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button onClick={() => openSignIn()} className="text-sm text-muted hover:text-text transition-colors hidden sm:block">Sign in</button>
                <button onClick={() => navigate('/feed')}
                  className="text-sm font-medium px-4 py-2 rounded-xl border border-border hover:border-border2 hover:bg-bg2 transition-colors">
                  Get started
                </button>
              </>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(200,169,110,0.08) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          {/* Logo em destaque */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-30" style={{ backgroundColor: '#c8a96e' }} />
              <GrainLogo size={64} variant="light" className="relative shadow-2xl" />
            </div>
          </motion.div>

          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg2 text-xs text-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            RSS feeds · AI summaries · topic follow
            <ChevronRight size={12} />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-text leading-[1.0] tracking-tight mb-6">
            news without<br />the <span className="text-gold">noise.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-base sm:text-lg text-muted leading-relaxed max-w-xl mx-auto mb-8">
            Trusted sources, AI-summarised on demand, organised around the topics that actually matter to you.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <button onClick={() => navigate('/feed')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-gold2 transition-colors text-sm">
              Open the feed <ArrowRight size={15} />
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3 rounded-xl border border-border text-sm text-muted hover:text-text hover:border-border2 transition-colors">
              See how it works
            </button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-xs text-muted/40 mb-16">
            free · no algorithm · no ads
          </motion.p>

          {/* Feed mockup */}
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative">
            {/* Fade na parte de baixo do mockup */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent z-10 pointer-events-none rounded-b-2xl" />
            <FeedMockup />
          </motion.div>
        </div>
      </section>

      {/* ── Sources strip ── */}
      <div className="border-y border-border py-5 overflow-hidden">
        <div className="flex items-center justify-center gap-2 flex-wrap px-6 max-w-4xl mx-auto">
          <span className="text-[10px] text-muted uppercase tracking-widest mr-2">Sources</span>
          {SOURCES.map(s => (
            <div key={s.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-bg2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted whitespace-nowrap">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bento grid ── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">Features</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text">
              Feito para ler, <span className="text-gold">não para vender.</span>
            </h2>
          </FadeIn>

          {/* Bento grid — linha 1 */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Sources — span 1 */}
            <FadeIn delay={0} className="rounded-2xl border border-border bg-bg2 hover:border-border2 transition-colors">
              <BentoSourcesCard />
            </FadeIn>

            {/* Follow — span 1 */}
            <FadeIn delay={0.06} className="rounded-2xl border border-border bg-bg2 hover:border-border2 transition-colors">
              <BentoFollowCard />
            </FadeIn>

            {/* Stats — span 1 */}
            <FadeIn delay={0.12} className="rounded-2xl border border-border bg-bg2 hover:border-border2 transition-colors">
              <BentoStatsCard />
            </FadeIn>
          </div>

          {/* Bento grid — linha 2 */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* AI — largo */}
            <FadeIn delay={0.06} className="rounded-2xl border border-border bg-bg2 hover:border-border2 transition-colors">
              <BentoAICard />
            </FadeIn>

            {/* No algo / PWA */}
            <FadeIn delay={0.12} className="rounded-2xl border border-border bg-bg2 hover:border-border2 transition-colors">
              <div className="p-6 flex flex-col h-full">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Always with you</p>
                <h3 className="font-display font-extrabold text-xl text-text mb-2">No algorithm.<br />No noise. Ever.</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Chronological only. No filter bubble. Install as a PWA for native-like experience with offline support.
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {[
                    { icon: Shield, text: 'No tracking' },
                    { icon: Zap,    text: 'PWA offline' },
                    { icon: Globe,  text: 'PT + EN' },
                    { icon: Rss,    text: 'RSS only' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-bg text-xs text-muted">
                      <Icon size={11} className="text-gold" />{text}
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── How it works — 3 passos ── */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">How it works</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text">
              Three steps. <span className="text-gold">Nothing more.</span>
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: '01', icon: Rss,           title: 'Open the feed',       desc: 'Quality newsrooms, in PT and EN. Chronological. No algorithm decides what you see.' },
              { n: '02', icon: Sparkles,       title: 'Summarise with AI',   desc: 'One click. Gemini summarises in European Portuguese in seconds, cached for everyone.' },
              { n: '03', icon: BookmarkCheck,  title: 'Follow what matters', desc: 'Describe a topic. grain finds matching articles semantically as they arrive.' },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="flex flex-col gap-4">
                  {/* Número com inverted corner */}
                  <div className="relative w-fit">
                    <div className="w-10 h-10 flex items-center justify-center font-display font-extrabold text-sm text-bg"
                      style={{ backgroundColor: 'var(--color-gold)', borderRadius: '0 10px 10px 10px' }}>
                      {step.n}
                    </div>
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-bg" style={{ borderRadius: '0 0 100% 0' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <step.icon size={15} className="text-gold flex-shrink-0" />
                    <h3 className="font-semibold text-text">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video placeholder ── */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-10">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">In action</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text">
              See how it <span className="text-gold">works</span>
            </h2>
            <p className="text-sm text-muted mt-3 max-w-md mx-auto">
              Two minutes that show everything — from the feed to follow, through AI summaries.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="aspect-video rounded-2xl border border-border bg-bg2 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(200,169,110,0.4) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="flex flex-col items-center gap-4 relative">
                <button className="w-16 h-16 rounded-full bg-gold hover:bg-gold2 transition-all hover:scale-105 flex items-center justify-center shadow-lg"
                  style={{ boxShadow: '0 0 40px rgba(200,169,110,0.3)' }}>
                  <Play size={22} className="text-bg ml-1" fill="currentColor" />
                </button>
                <span className="text-xs text-muted">grain · product demo · 2 min</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
              {['real-time feed', 'AI summaries on demand', 'semantic topic follow', 'source management'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="w-1 h-1 rounded-full bg-gold" />{f}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-[280px_1fr] gap-16 items-start">
          <FadeIn>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-4">FAQ</p>
            <h2 className="font-display font-extrabold text-3xl text-text leading-tight">
              Any <span className="text-gold">questions?</span>
            </h2>
            <p className="text-sm text-muted mt-4 leading-relaxed">
              Everything you need to know about grain and how it works.
            </p>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="border-t border-border">
              {FAQ_ITEMS.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-28 px-6 border-t border-border relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(200,169,110,0.07) 0%, transparent 70%)' }} />
        </div>
        <FadeIn className="max-w-xl mx-auto text-center flex flex-col items-center gap-6 relative">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20" style={{ backgroundColor: '#c8a96e' }} />
            <GrainLogo size={72} variant="light" className="relative shadow-2xl" />
          </div>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-text leading-tight">
            news with <span className="text-gold">texture,</span><br />not noise.
          </h2>
          <p className="text-sm text-muted/60 -mt-2">no noise, only grain.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate('/feed')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gold text-bg font-semibold hover:bg-gold2 transition-colors text-sm">
              Start reading <ArrowRight size={15} />
            </button>
            {!isSignedIn && (
              <button onClick={() => openSignIn()}
                className="px-7 py-3.5 rounded-xl border border-border text-sm text-muted hover:text-text hover:border-border2 transition-colors">
                Create account
              </button>
            )}
          </div>
          <p className="text-xs text-muted/30">free · no algorithm · no ads</p>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <GrainLogo size={24} />
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
