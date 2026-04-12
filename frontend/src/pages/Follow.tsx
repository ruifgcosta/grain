/**
 * Página /follow — temas seguidos e artigos correspondentes.
 */

import { useState } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import Layout from '@/components/Layout';
import ArticleCard from '@/components/ArticleCard';
import { useFollowTopics, useUnfollowTopic, useTopicArticles, useFollowTopic } from '@/hooks/useFollows';
import { Loader2, Plus, X, ChevronRight, BookmarkCheck } from 'lucide-react';

function NewFollowForm({ onSuccess }: { onSuccess: () => void }) {
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('');
  const followMutation = useFollowTopic();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    followMutation.mutate(
      { text: text.trim(), emoji: emoji || null },
      { onSuccess: () => { setText(''); setEmoji(''); onSuccess(); } }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-card border border-gold/30 bg-gold-dim">
      <p className="text-sm font-medium text-text">Seguir novo tema</p>
      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          placeholder="🌍"
          maxLength={4}
          className="w-14 px-2 py-2 rounded-lg bg-bg3 border border-border text-center text-lg focus:outline-none focus:border-gold/50"
        />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Descreve o tema… (ex: guerra na Ucrânia)"
          className="flex-1 px-3 py-2 rounded-lg bg-bg3 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
          autoFocus
        />
      </div>
      {followMutation.isError && (
        <p className="text-xs text-red-400">{followMutation.error?.message}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onSuccess}
          className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-text transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!text.trim() || followMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gold text-bg font-medium hover:bg-gold2 disabled:opacity-50 transition-colors"
        >
          {followMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : <Plus size={14} />
          }
          Seguir
        </button>
      </div>
    </form>
  );
}

function TopicRow({
  topic,
  isSelected,
  onSelect,
}: {
  topic: { id: string; name: string; emoji: string | null; unread_count: number };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const unfollow = useUnfollowTopic();

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
        ${isSelected ? 'bg-bg3 border-l-2 border-l-gold' : 'hover:bg-bg2'}`}
      onClick={onSelect}
    >
      <span className="text-xl w-7 text-center">{topic.emoji ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate capitalize">{topic.name}</p>
      </div>
      {topic.unread_count > 0 && (
        <span className="text-xs bg-gold text-bg font-bold px-2 py-0.5 rounded-full">
          {topic.unread_count}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); unfollow.mutate(topic.id); }}
        className="p-1 rounded text-muted hover:text-text transition-colors opacity-0 group-hover:opacity-100"
        title="Deixar de seguir"
      >
        <X size={14} />
      </button>
      <ChevronRight size={14} className="text-muted flex-shrink-0" />
    </div>
  );
}

function TopicArticles({ topicId }: { topicId: string }) {
  const { data, isLoading } = useTopicArticles(topicId);
  const articles = data?.articles ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <BookmarkCheck size={32} className="text-muted" />
        <p className="text-sm text-muted">Nenhum artigo encontrado ainda.</p>
        <p className="text-xs text-muted2">Os matches são actualizados a cada hora.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {articles.map(article => (
        <ArticleCard
          key={article.id}
          article={article}
          topicId={topicId}
          isRead={article.is_read === 1}
        />
      ))}
    </div>
  );
}

export default function Follow() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const { data, isLoading } = useFollowTopics();
  const topics = data?.topics ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
          <BookmarkCheck size={40} className="text-muted" />
          <h2 className="font-display font-extrabold text-xl text-text">Segue temas que te interessam</h2>
          <p className="text-sm text-muted max-w-sm">
            Cria uma conta gratuita para seguir temas e receber artigos correspondentes.
          </p>
          <button
            onClick={() => openSignIn()}
            className="px-5 py-2.5 rounded-xl bg-gold text-bg font-semibold text-sm hover:bg-gold2 transition-colors"
          >
            Entrar / Criar conta
          </button>
        </div>
      </Layout>
    );
  }

  const selectedTopic = topics.find(t => t.id === selectedId);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* ── Cabeçalho ── */}
        <div className="px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-text">Follow</h1>
            <p className="text-sm text-muted mt-1">Artigos sobre os temas que segues.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-gold text-bg font-semibold hover:bg-gold2 transition-colors"
          >
            <Plus size={14} />
            Novo tema
          </button>
        </div>

        {/* ── Formulário novo tema ── */}
        {showForm && (
          <div className="px-4 mb-4">
            <NewFollowForm onSuccess={() => setShowForm(false)} />
          </div>
        )}

        {/* ── Dois painéis: lista / artigos ── */}
        <div className="flex border-t border-border">
          {/* Painel esquerdo — lista de temas */}
          <div className="w-full sm:w-72 sm:flex-shrink-0 border-r border-border">
            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-muted" />
              </div>
            )}

            {!isLoading && topics.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted">Ainda não segues nenhum tema.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-sm text-gold hover:text-gold2"
                >
                  + Adicionar tema
                </button>
              </div>
            )}

            <div className="divide-y divide-border">
              {topics.map(topic => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  isSelected={selectedId === topic.id}
                  onSelect={() => setSelectedId(
                    selectedId === topic.id ? null : topic.id
                  )}
                />
              ))}
            </div>
          </div>

          {/* Painel direito — artigos do tema seleccionado (desktop) */}
          <div className="hidden sm:flex flex-1 flex-col">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center gap-2">
                <BookmarkCheck size={32} className="text-muted" />
                <p className="text-sm text-muted">Selecciona um tema para ver os artigos.</p>
              </div>
            ) : (
              <TopicArticles topicId={selectedId} />
            )}
          </div>
        </div>

        {/* Artigos do tema seleccionado — mobile (abaixo da lista) */}
        {selectedId && (
          <div className="sm:hidden border-t border-border">
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium capitalize">{selectedTopic?.name}</p>
              <button
                onClick={() => setSelectedId(null)}
                className="text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
            <TopicArticles topicId={selectedId} />
          </div>
        )}
      </div>
    </Layout>
  );
}
