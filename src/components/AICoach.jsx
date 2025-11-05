import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { chatAPI } from '../services/api'

// Holographic Orb Component
const HolographicOrb = ({ size = 'md', className = '', isSpeaking = false }) => {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  }
  
  const nodeCount = size === 'lg' || size === 'xl' ? 8 : size === 'md' ? 6 : 4
  const nodeSize = size === 'lg' || size === 'xl' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-1 h-1' : 'w-0.5 h-0.5'
  
  // Generate unique IDs for this orb instance
  const orbId = React.useMemo(() => Math.random().toString(36).substring(7), [])
  const gridGradientId = `gridGradient-${orbId}`
  const streamGradientId = `streamGradient-${orbId}`
  
  return (
    <div 
      className={`relative ${sizeClasses[size]} ${className} ${isSpeaking ? 'animate-gentle-float' : ''}`}
    >
      {/* Outer glow */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-yellow-500 to-orange-500 opacity-60 blur-lg ${isSpeaking ? 'animate-pulse' : 'animate-pulse'}`} style={isSpeaking ? { animationDuration: '1s' } : {}}></div>
      
      {/* Main orb sphere */}
      <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-500 flex items-center justify-center overflow-hidden transition-all duration-300 ${isSpeaking ? 'ring-2 ring-orange-400/50 ring-offset-2 ring-offset-transparent' : ''}`}>
        {/* Inner grid pattern */}
        <div className="absolute inset-0 opacity-40">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <defs>
              <linearGradient id={gridGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
              </linearGradient>
            </defs>
            {/* Horizontal lines */}
            <line x1="0" y1="25" x2="100" y2="25" stroke={`url(#${gridGradientId})`} strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke={`url(#${gridGradientId})`} strokeWidth="0.5" />
            <line x1="0" y1="75" x2="100" y2="75" stroke={`url(#${gridGradientId})`} strokeWidth="0.5" />
            {/* Vertical lines */}
            <line x1="25" y1="0" x2="25" y2="100" stroke={`url(#${gridGradientId})`} strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke={`url(#${gridGradientId})`} strokeWidth="0.5" />
            <line x1="75" y1="0" x2="75" y2="100" stroke={`url(#${gridGradientId})`} strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* Animated network nodes */}
        <div className="absolute inset-0">
          {[...Array(nodeCount)].map((_, i) => {
            const angle = (i * 360) / nodeCount
            const radius = size === 'lg' || size === 'xl' ? 40 : size === 'md' ? 30 : 20
            const x = 50 + radius * Math.cos((angle * Math.PI) / 180)
            const y = 50 + radius * Math.sin((angle * Math.PI) / 180)
            
            return (
              <div
                key={i}
                className={`absolute ${nodeSize} rounded-full bg-white opacity-90 animate-pulse`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: isSpeaking ? '1s' : '2s'
                }}
              />
            )
          })}
        </div>
        
        {/* Central core */}
        <div className={`relative ${size === 'lg' || size === 'xl' ? 'w-8 h-8' : size === 'md' ? 'w-4 h-4' : 'w-2 h-2'} rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 ${isSpeaking ? 'animate-pulse' : ''}`} style={isSpeaking ? { animationDuration: '0.8s' } : {}}>
          <div className={`absolute inset-0 rounded-full bg-white/50 ${isSpeaking ? 'animate-ping' : ''}`} style={isSpeaking ? { animationDuration: '1s' } : {}}></div>
        </div>
        
        {/* Data stream lines */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={streamGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
              </linearGradient>
            </defs>
            {/* Animated connecting lines */}
            <line 
              x1="20" y1="30" x2="50" y2="50" 
              stroke={`url(#${streamGradientId})`} 
              strokeWidth="0.5"
              className="animate-pulse"
              style={{ animationDelay: '0s', animationDuration: '3s' }}
            />
            <line 
              x1="80" y1="30" x2="50" y2="50" 
              stroke={`url(#${streamGradientId})`} 
              strokeWidth="0.5"
              className="animate-pulse"
              style={{ animationDelay: '0.5s', animationDuration: '3s' }}
            />
            <line 
              x1="20" y1="70" x2="50" y2="50" 
              stroke={`url(#${streamGradientId})`} 
              strokeWidth="0.5"
              className="animate-pulse"
              style={{ animationDelay: '1s', animationDuration: '3s' }}
            />
            <line 
              x1="80" y1="70" x2="50" y2="50" 
              stroke={`url(#${streamGradientId})`} 
              strokeWidth="0.5"
              className="animate-pulse"
              style={{ animationDelay: '1.5s', animationDuration: '3s' }}
            />
          </svg>
        </div>
        
        {/* Rotating shimmer effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style={{ animationDuration: '8s' }}></div>
      </div>
    </div>
  )
}

const AICoach = () => {
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSessions = async () => {
    try {
      const sessionsData = await chatAPI.getChatSessions()
      // Ensure sessions is always an array
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : []
      setSessions(sessionsArray)
      
      // If no current session and sessions exist, select the first one
      if (!currentSession && sessionsArray.length > 0) {
        setCurrentSession(sessionsArray[0])
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setSessions([]) // Set to empty array on error
    }
  }

  const loadMessages = async (sessionId) => {
    if (!sessionId) return
    try {
      const messagesData = await chatAPI.getChatMessages(sessionId)
      // Ensure messages is always an array
      const formattedMessages = Array.isArray(messagesData) 
        ? messagesData.map(msg => ({
            ...msg,
            created_at: msg.created_at || new Date().toISOString(),
            suggestions: msg.suggestions || []
          }))
        : []
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
    }
  }

  const createNewSession = useCallback(async () => {
    setIsCreatingSession(true)
    try {
      const timestamp = new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit' 
      })
      const newSession = await chatAPI.createChatSession(`Unterhaltung ${timestamp}`)
      setSessions(prev => [newSession, ...prev])
      setCurrentSession(newSession)
      setMessages([])
    } catch (error) {
      console.error('Failed to create session:', error)
      alert('Fehler beim Erstellen der Session. Bitte versuche es erneut.')
    } finally {
      setIsCreatingSession(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id)
    }
  }, [currentSession])

  useEffect(() => {
    // Auto-select first session if available and none selected
    if (sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0])
    } else if (sessions.length === 0 && !currentSession && !isCreatingSession) {
      // Auto-create session if none exists
      createNewSession()
    }
  }, [sessions, currentSession, isCreatingSession, createNewSession])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    // Ensure we have a session
    if (!currentSession) {
      try {
        await createNewSession()
        // Wait a bit for session to be created, then retry
        setTimeout(() => {
          sendMessage()
        }, 1000)
      } catch (error) {
        console.error('Failed to create session before sending message:', error)
        alert('Fehler beim Erstellen der Session. Bitte versuche es erneut.')
      }
      return
    }

    const userMessage = newMessage.trim()
    setNewMessage('')
    setIsLoading(true)

    // Add user message immediately for better UX
    const tempUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
      suggestions: []
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await chatAPI.sendMessage(currentSession.id, userMessage)
      
      // Format response messages properly
      const formattedUserMessage = {
        id: response.user_message?.id || Date.now(),
        type: 'user',
        content: response.user_message?.content || userMessage,
        created_at: response.user_message?.created_at || new Date().toISOString(),
        suggestions: []
      }
      
      const formattedAIMessage = {
        id: response.ai_message?.id || Date.now() + 1,
        type: 'ai',
        content: response.ai_message?.content || '',
        created_at: response.ai_message?.created_at || new Date().toISOString(),
        suggestions: Array.isArray(response.ai_message?.suggestions) 
          ? response.ai_message.suggestions 
          : []
      }
      
      // Replace temp message with real messages
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempUserMessage.id)
        return [...filtered, formattedUserMessage, formattedAIMessage]
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
      
      // Show user-friendly error
      const errorMessage = error.message || 'Nachricht konnte nicht gesendet werden'
      alert(`Fehler: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setNewMessage(suggestion)
  }

  return (
    <div className="relative mx-auto flex h-screen max-w-lg flex-col overflow-hidden bg-background-light dark:bg-background-dark pb-24">
      {/* Top App Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-background-light px-4 py-3 dark:bg-background-dark">
        <div className="flex size-10 shrink-0 items-center justify-center">
          <HolographicOrb size="sm" />
        </div>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white">J.A.R.V.I.S.</h1>
        <div className="flex w-10 items-center justify-end">
          <button 
            onClick={createNewSession}
            disabled={isCreatingSession}
            className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-2xl">
              {isCreatingSession ? 'refresh' : 'add'}
            </span>
          </button>
        </div>
      </header>

      {/* Sessions Sidebar */}
      {sessions.length > 0 && (
        <div className="border-b border-gray-200 dark:border-white/10 p-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6">
          {/* Coach Persona Area - only show when no messages */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-normal text-gray-500 dark:text-gray-400">Heute</p>
              <p className="text-base font-normal text-gray-700 dark:text-gray-300">Wie kann ich Ihnen heute helfen, Meister?</p>
            </div>
          )}

          {/* Chat History */}
          <div className="flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="flex justify-center mb-6">
                  <HolographicOrb size="lg" />
                </div>
                <p className="text-lg font-medium">Starte eine Unterhaltung mit J.A.R.V.I.S.!</p>
                <p className="text-sm mt-2">Ihr intelligenter Partner für Strategie, Effizienz und Exzellenz.</p>
              </div>
            ) : (
              (() => {
                // Find the last AI message index
                let lastAIMessageIndex = -1
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].type === 'ai') {
                    lastAIMessageIndex = i
                    break
                  }
                }
                
                return messages.map((message, index) => {
                  // Check if this is the last AI message (should be animated)
                  const isLastAIMessage = message.type === 'ai' && 
                    index === lastAIMessageIndex && 
                    !isLoading
                
                return (
                <div key={message.id || index} className={`flex items-end gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                  {message.type === 'ai' && (
                    <HolographicOrb size="xs" isSpeaking={isLastAIMessage} />
                  )}
                  <div className={`flex flex-1 flex-col items-start gap-1 ${message.type === 'user' ? 'items-end' : ''}`}>
                    <p className={`flex max-w-xs rounded-xl px-4 py-3 text-base font-normal leading-normal break-words ${
                      message.type === 'user' 
                        ? 'rounded-br-sm bg-primary text-white' 
                        : 'rounded-bl-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-50'
                    }`}>
                      {message.content || '...'}
                    </p>
                    {message.suggestions && Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
                      <div className={`flex flex-wrap gap-2 mt-2 ${message.type === 'user' ? 'justify-end' : ''}`}>
                        {message.suggestions.map((suggestion, suggestionIndex) => (
                          <button
                            key={suggestionIndex}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 dark:border-primary/70 dark:bg-primary/20 dark:text-primary-300 dark:hover:bg-primary/30 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )})
              })()
            )}

            {/* AI Loading Indicator */}
            {isLoading && (
              <div className="flex items-end gap-3">
                <HolographicOrb size="xs" isSpeaking={true} />
                <div className="flex flex-1 flex-col items-start gap-1">
                  <div className="flex max-w-xs items-center gap-1.5 rounded-xl rounded-bl-sm bg-gray-200 px-4 py-3 dark:bg-gray-700">
                    <span className="size-2 animate-[bounce_1s_infinite] rounded-full bg-gray-400 dark:bg-gray-500"></span>
                    <span className="size-2 animate-[bounce_1s_infinite_200ms] rounded-full bg-gray-400 [animation-delay:200ms] dark:bg-gray-500"></span>
                    <span className="size-2 animate-[bounce_1s_infinite_400ms] rounded-full bg-gray-400 [animation-delay:400ms] dark:bg-gray-500"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div ref={messagesEndRef} />
      </main>

      {/* Message Input Field */}
      <footer className="shrink-0 border-t border-gray-200 bg-background-light p-2 dark:border-white/10 dark:bg-background-dark">
        {/* Suggestion Chips */}
        <div className="mb-2 flex gap-2 overflow-x-auto whitespace-nowrap px-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            onClick={() => handleSuggestionClick('Ich brauche Fokus heute')}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Ich brauche Fokus heute
          </button>
          <button 
            onClick={() => handleSuggestionClick('Analyse meiner Fortschritte')}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Analyse meiner Fortschritte
          </button>
          <button 
            onClick={() => handleSuggestionClick('Strategische Planung')}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Strategische Planung
          </button>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex flex-1 items-center">
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full rounded-full border-gray-300 bg-gray-100 py-2.5 pl-4 pr-12 text-base text-gray-900 placeholder-gray-500 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" 
              placeholder={currentSession ? "Schreibe eine Nachricht..." : "Warte auf Session..."} 
              type="text"
              disabled={isLoading || !currentSession}
            />
            <button className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary-300">
              <span className="material-symbols-outlined text-2xl">mic</span>
            </button>
          </div>
          <button 
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading || !currentSession}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-2xl">send</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default AICoach