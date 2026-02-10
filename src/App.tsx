import { useState, useCallback } from 'react';
import type { ViewId, Deck, AppSettings } from './types';
import { deleteSourceFile } from './services/sourceFileStore';
import { DEFAULT_SETTINGS } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/common/Header';
import { DeckList } from './components/deck/DeckList';
import { DeckOverview } from './components/deck/DeckOverview';
import { UploadPage } from './components/upload/UploadPage';
import { StudyMode } from './components/study/StudyMode';
import { SettingsPage } from './components/settings/SettingsPage';
import { AdBanner } from './components/common/AdBanner';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [decks, setDecks] = useLocalStorage<Deck[]>('pdf-study-decks', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('pdf-study-settings', DEFAULT_SETTINGS);

  const activeDeck = activeDeckId ? decks.find(d => d.id === activeDeckId) ?? null : null;

  const handleNavigate = useCallback((view: ViewId) => {
    setActiveView(view);
    if (view !== 'deck' && view !== 'study') {
      setActiveDeckId(null);
    }
  }, []);

  const handleSelectDeck = useCallback((deckId: string) => {
    setActiveDeckId(deckId);
    setActiveView('deck');
  }, []);

  const handleDeleteDeck = useCallback((deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck?.sourceFileId) {
      deleteSourceFile(deck.sourceFileId).catch(() => {});
    }
    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeckId === deckId) {
      setActiveDeckId(null);
      setActiveView('home');
    }
  }, [decks, setDecks, activeDeckId]);

  const handleImportDecks = useCallback((imported: Deck[]) => {
    setDecks(prev => {
      const existingIds = new Set(prev.map(d => d.id));
      const newDecks = imported.filter(d => !existingIds.has(d.id));
      return [...newDecks, ...prev];
    });
  }, [setDecks]);

  const handleDeckCreated = useCallback((deck: Deck) => {
    setDecks(prev => [deck, ...prev]);
    setActiveDeckId(deck.id);
    setActiveView('deck');
  }, [setDecks]);

  const handleUpdateDeck = useCallback((updatedDeck: Deck) => {
    setDecks(prev => prev.map(d => d.id === updatedDeck.id ? updatedDeck : d));
  }, [setDecks]);

  const handleStartStudy = useCallback(() => {
    setActiveView('study');
  }, []);

  const handleExitStudy = useCallback(() => {
    setActiveView('deck');
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return (
          <DeckList
            decks={decks}
            onSelectDeck={handleSelectDeck}
            onDeleteDeck={handleDeleteDeck}
            onNavigateUpload={() => handleNavigate('upload')}
          />
        );

      case 'upload':
        return (
          <UploadPage
            settings={settings}
            onDeckCreated={handleDeckCreated}
            onNavigateSettings={() => handleNavigate('settings')}
          />
        );

      case 'deck':
        if (!activeDeck) {
          handleNavigate('home');
          return null;
        }
        return (
          <DeckOverview
            deck={activeDeck}
            onStartStudy={handleStartStudy}
            onBack={() => handleNavigate('home')}
          />
        );

      case 'study':
        if (!activeDeck) {
          handleNavigate('home');
          return null;
        }
        return (
          <StudyMode
            deck={activeDeck}
            cardsPerSession={settings.cardsPerSession}
            onUpdateDeck={handleUpdateDeck}
            onExit={handleExitStudy}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            onSettingsChange={setSettings}
            decks={decks}
            onImportDecks={handleImportDecks}
          />
        );
    }
  };

  return (
    <>
      <Header activeView={activeView} onNavigate={handleNavigate} />
      <main className="app-content">
        <div className="app-page">
          <AdBanner slot="topBanner" className="ad-banner--top" />
          {renderView()}
        </div>
      </main>
    </>
  );
}

export default App;
