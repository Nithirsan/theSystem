import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { chatAPI } from '../services/api'

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
        <div className="flex size-10 shrink-0 items-center">
          <div 
            className="aspect-square size-10 rounded-full bg-cover bg-center" 
            style={{
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBzXvmxLNUCS4S5DD0IRYccwxNGWRiCCvzXTu5HSn4Vgw1n-VND17iVwnORqndUIrpVF7ssH6qVUCRGQiDTVUyhGqTq8nn0KwUcFe2JF86X7QRXxCzRNYC4OsYJ_mBPj01_TYaJ_D_zxAeIL8O2_pI-nvLUoSZkDL4_TQMeB5BxodU6m3VhdA2tWc4MohPjCeY4LnRdWwz0TpHDp0j471qMh0vKx3WL2y2yC-cA3KapSHqpZQlwIhFoVi3vQP-vBUteycUMtoPNmgc")'
            }}
          />
        </div>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white">Dein Coach</h1>
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
              <p className="text-base font-normal text-gray-700 dark:text-gray-300">Wie kann ich dir heute helfen?</p>
            </div>
          )}

          {/* Chat History */}
          <div className="flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <span className="material-symbols-outlined text-6xl mb-4 block">chat_bubble_outline</span>
                <p className="text-lg font-medium">Starte eine Unterhaltung mit deinem AI Coach!</p>
                <p className="text-sm mt-2">Er kann dir bei Gewohnheiten, Zielen und Motivation helfen.</p>
              </div>
            ) : (
              (messages || []).map((message, index) => (
                <div key={message.id || index} className={`flex items-end gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                  {message.type === 'ai' && (
                    <div 
                      className="aspect-square w-8 shrink-0 rounded-full bg-cover bg-center" 
                      style={{
                        backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBpzjs7XfKJA785nt4rm6dISh0iW76RMvvFq5RwSNdHxw_2ZFhkTQVdPFm_NC0FM1HjdhAJED0EK6LXkPPasl3vdvA-CS6YOJAxdhKHXuswBQi4FaDaKqLw2y0eblpszplbvzYe4T1NL0_KogofAzelihFcuvob-Ai6dX6Hn_r02R4FFVAXrE-vwnLoJBYBWS8J3tN7DhOC3w224S-8SpnYwX71gbXu70oEqszJ4WZvUSakqHsUIfFqBt_A490dlmA1I1K-ICMydCY")'
                      }}
                    />
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
              ))
            )}

            {/* AI Loading Indicator */}
            {isLoading && (
              <div className="flex items-end gap-3">
                <div 
                  className="aspect-square w-8 shrink-0 rounded-full bg-cover bg-center" 
                  style={{
                    backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDlB3Mt82cmfYinhSFvjVJvyql0G1O1LQzbVOzWrGWGrLmc4OzoUtA0wkelnSS4Ie_oniv9--eJJpAGFREJsx4s9w7tTxLba9-59msgbCfWkeG50gxkKMiifL4iZtdUubeMwy8W2YUGJ7r8bbcO7v178iDGBw5YVsy9nGdldQ8MMidR1xK43batFn5G1mPPDPxcxzAPKm62hl6MP7ljNz1tCsLu0uoAlxrXZoHO7D6bDNTuomYxFyT5oxLj4zwy7Q992oTWuJ-r_Ms")'
                  }}
                />
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
            onClick={() => handleSuggestionClick('Ich brauche Motivation')}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Ich brauche Motivation
          </button>
          <button 
            onClick={() => handleSuggestionClick('Wie war mein Tag?')}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Wie war mein Tag?
          </button>
          <button 
            onClick={() => handleSuggestionClick('Journal beginnen')}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Journal beginnen
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