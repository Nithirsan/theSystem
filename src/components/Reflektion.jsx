import React, { useState, useEffect } from 'react'
import { meditationAPI } from '../services/api'
import ReactMarkdown from 'react-markdown'

const Reflektion = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStartModal, setShowStartModal] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [meditationGoal, setMeditationGoal] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await meditationAPI.getSessions()
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load meditation sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartMeditation = async () => {
    if (!meditationGoal.trim()) {
      setError('Bitte gib ein Ziel für die Meditation ein')
      return
    }

    setIsSending(true)
    setError('')
    try {
      const response = await meditationAPI.startMeditation({ goal: meditationGoal.trim() })
      if (response && response.session) {
        setActiveSession(response.session)
        setMessages([{
          id: Date.now(),
          type: 'ai',
          content: response.initial_message || 'Willkommen zu deiner Meditation. Lass uns gemeinsam beginnen.',
          created_at: new Date().toISOString()
        }])
        setShowStartModal(false)
        setMeditationGoal('')
      }
    } catch (error) {
      console.error('Failed to start meditation:', error)
      setError(error.message || 'Fehler beim Starten der Meditation')
    } finally {
      setIsSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!activeSession || !currentMessage.trim() || isSending) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    setIsSending(true)
    setError('')

    // Add user message immediately
    const tempUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await meditationAPI.sendMessage(activeSession.id, { content: userMessage })
      
      if (response && response.ai_message) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response.ai_message,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error('Unerwartete Antwort vom Server')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error.message || 'Fehler beim Senden der Nachricht')
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
    } finally {
      setIsSending(false)
    }
  }

  const handleEndMeditation = async () => {
    if (!activeSession) return

    if (!confirm('Möchtest du die Meditation wirklich beenden? Ein Bericht wird erstellt.')) {
      return
    }

    setIsSending(true)
    setError('')
    try {
      const response = await meditationAPI.endMeditation(activeSession.id)
      if (response && response.session) {
        setActiveSession(response.session)
        setShowReport(true)
        await loadSessions()
      }
    } catch (error) {
      console.error('Failed to end meditation:', error)
      setError(error.message || 'Fehler beim Beenden der Meditation')
    } finally {
      setIsSending(false)
    }
  }

  const handleCloseSession = () => {
    setActiveSession(null)
    setMessages([])
    setShowReport(false)
    setCurrentMessage('')
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mx-auto max-w-lg bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          <p className="mt-4 text-text-light-secondary dark:text-text-dark-secondary">Lade Meditationen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col mx-auto max-w-lg group/design-root overflow-x-hidden pb-28">
      {/* Top App Bar */}
      <header className="flex items-center p-5 pt-6 pb-4 justify-between glass sticky top-0 z-10 border-b border-border-light dark:border-border-dark backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
            <span className="material-symbols-outlined text-white text-xl">self_improvement</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary leading-tight tracking-[-0.015em]">Reflektion</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">Meditation & Achtsamkeit</p>
          </div>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="flex items-center justify-center rounded-xl h-10 w-10 bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">add</span>
        </button>
      </header>

      <main className="flex-grow px-4 py-6">
        {activeSession && !showReport ? (
          // Active Meditation Session
          <div className="space-y-4">
            {/* Session Info */}
            <div className="bg-card-light dark:bg-card-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  Meditation: {activeSession.goal}
                </h3>
                <button
                  onClick={handleEndMeditation}
                  disabled={isSending}
                  className="px-3 py-1 text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  Beenden
                </button>
              </div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Gestartet: {new Date(activeSession.started_at).toLocaleString('de-DE')}
              </p>
            </div>

            {/* Messages */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-card-light dark:bg-card-dark text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 sticky bottom-0 bg-background-light dark:bg-background-dark pt-2 pb-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Deine Antwort..."
                className="flex-1 input text-sm"
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !currentMessage.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ) : showReport && activeSession ? (
          // Completed Meditation - Show Report
          <div className="space-y-4">
            <div className="bg-card-light dark:bg-card-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  Meditationsbericht
                </h3>
                <button
                  onClick={handleCloseSession}
                  className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Zurück
                </button>
              </div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Ziel: {activeSession.goal}
              </p>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Gestartet: {new Date(activeSession.started_at).toLocaleString('de-DE')}
              </p>
              {activeSession.ended_at && (
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Beendet: {new Date(activeSession.ended_at).toLocaleString('de-DE')}
                </p>
              )}
              {activeSession.duration_seconds > 0 && (
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Dauer: {formatDuration(activeSession.duration_seconds)}
                </p>
              )}
            </div>

            {activeSession.report && (
              <div className="bg-card-light dark:bg-card-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
                  Bericht
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-light-primary dark:prose-headings:text-text-dark-primary prose-p:text-text-light-primary dark:prose-p:text-text-dark-primary">
                  <ReactMarkdown>{activeSession.report}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="bg-card-light dark:bg-card-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
                Gesprächsverlauf
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        msg.type === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark'
                      }`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Session List
          <>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
                  self_improvement
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-base mb-4">
                  Noch keine Meditationen durchgeführt
                </p>
                <button
                  onClick={() => setShowStartModal(true)}
                  className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
                >
                  Erste Meditation starten
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={async () => {
                      try {
                        const data = await meditationAPI.getSession(session.id)
                        
                        // If session is completed, automatically reactivate it to allow resuming
                        if (data.session.status === 'completed') {
                          // Reactivate the session by sending a message (which will auto-reactivate)
                          // Or we can just load it and let the first message reactivate it
                          setActiveSession({ ...data.session, status: 'active' })
                        } else {
                          setActiveSession(data.session)
                        }
                        
                        // Convert messages to the format expected by the component
                        const formattedMessages = (data.messages || []).map(msg => ({
                          id: msg.id,
                          type: msg.type,
                          content: msg.content,
                          created_at: msg.created_at
                        }))
                        setMessages(formattedMessages)
                        setShowReport(false) // Always show meditation view, not report
                      } catch (error) {
                        console.error('Failed to load session:', error)
                        setError('Fehler beim Laden der Meditation')
                      }
                    }}
                    className="card-hover animate-fade-in border-l-4 bg-purple-500 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold">
                          {session.goal || 'Meditation'}
                        </h3>
                        <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                          {new Date(session.started_at).toLocaleString('de-DE')}
                        </p>
                        {session.status === 'completed' && session.duration_seconds > 0 && (
                          <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                            Dauer: {formatDuration(session.duration_seconds)}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.status === 'completed' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {session.status === 'completed' ? 'Abgeschlossen' : 'Aktiv'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const data = await meditationAPI.getSession(session.id)
                            setActiveSession(data.session)
                            const formattedMessages = (data.messages || []).map(msg => ({
                              id: msg.id,
                              type: msg.type,
                              content: msg.content,
                              created_at: msg.created_at
                            }))
                            setMessages(formattedMessages)
                            setShowReport(true)
                          } catch (error) {
                            console.error('Failed to load session:', error)
                            setError('Fehler beim Laden der Meditation')
                          }
                        }}
                        className="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        Bericht anzeigen
                      </button>
                      <span className="text-text-light-secondary dark:text-text-dark-secondary">|</span>
                      <span className="text-sm text-primary">
                        {session.status === 'completed' ? 'Wiederaufnehmen →' : 'Fortführen →'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Start Meditation Modal */}
      {showStartModal && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowStartModal(false)}
        >
          <div 
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Neue Meditation starten
              </h2>
              <button
                onClick={() => setShowStartModal(false)}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Was ist das Ziel der Meditation? *
                </label>
                <textarea
                  value={meditationGoal}
                  onChange={(e) => setMeditationGoal(e.target.value)}
                  placeholder="z.B. Stress abbauen, Klarheit finden, Entspannung..."
                  rows="4"
                  className="input resize-none w-full"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleStartMeditation}
                  disabled={isSending || !meditationGoal.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Wird gestartet...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">self_improvement</span>
                      Meditation starten
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reflektion

