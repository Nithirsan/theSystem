import React, { useState } from 'react'

const AICoach = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Hallo! Ich bin hier, um dich auf deinem Weg zu unterstützen. Womit können wir heute anfangen?',
      timestamp: new Date()
    },
    {
      id: 2,
      type: 'user',
      text: 'Hilf mir, ein Ziel zu setzen.',
      timestamp: new Date()
    },
    {
      id: 3,
      type: 'ai',
      text: 'Großartig! Ein klares Ziel ist der erste Schritt zum Erfolg. Um welchen Lebensbereich geht es denn?',
      timestamp: new Date(),
      suggestions: ['Karriere', 'Gesundheit', 'Persönliches']
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const userMessage = {
        id: messages.length + 1,
        type: 'user',
        text: newMessage,
        timestamp: new Date()
      }
      
      setMessages([...messages, userMessage])
      setNewMessage('')
      setIsTyping(true)
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: messages.length + 2,
          type: 'ai',
          text: 'Das ist ein interessanter Punkt! Lass uns das genauer besprechen.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiResponse])
        setIsTyping(false)
      }, 2000)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: suggestion,
      timestamp: new Date()
    }
    
    setMessages([...messages, userMessage])
    setIsTyping(true)
    
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        text: `Ausgezeichnet! ${suggestion} ist ein wichtiger Bereich. Lass uns konkrete Schritte entwickeln.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 2000)
  }

  return (
    <div className="relative mx-auto flex h-screen max-w-lg flex-col overflow-hidden bg-background-light dark:bg-background-dark">
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
          <button className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <span className="material-symbols-outlined text-2xl">more_vert</span>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6">
          {/* Coach Persona Area */}
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-normal text-gray-500 dark:text-gray-400">Heute</p>
            <p className="text-base font-normal text-gray-700 dark:text-gray-300">Wie kann ich dir heute helfen?</p>
          </div>

          {/* Chat History */}
          <div className="flex flex-col gap-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-end gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                {message.type === 'ai' && (
                  <div 
                    className="aspect-square w-8 shrink-0 rounded-full bg-cover bg-center" 
                    style={{
                      backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBpzjs7XfKJA785nt4rm6dISh0iW76RMvvFq5RwSNdHxw_2ZFhkTQVdPFm_NC0FM1HjdhAJED0EK6LXkPPasl3vdvA-CS6YOJAxdhKHXuswBQi4FaDaKqLw2y0eblpszplbvzYe4T1NL0_KogofAzelihFcuvob-Ai6dX6Hn_r02R4FFVAXrE-vwnLoJBYBWS8J3tN7DhOC3w224S-8SpnYwX71gbXu70oEqszJ4WZvUSakqHsUIfFqBt_A490dlmA1I1K-ICMydCY")'
                    }}
                  />
                )}
                <div className={`flex flex-1 flex-col items-start gap-1 ${message.type === 'user' ? 'items-end' : ''}`}>
                  <p className={`flex max-w-xs rounded-xl px-4 py-3 text-base font-normal leading-normal ${
                    message.type === 'user' 
                      ? 'rounded-br-sm bg-primary text-white' 
                      : 'rounded-bl-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-50'
                  }`}>
                    {message.text}
                  </p>
                  {message.suggestions && (
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 dark:border-primary/70 dark:bg-primary/20 dark:text-primary-300 dark:hover:bg-primary/30"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* AI Loading Indicator */}
            {isTyping && (
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
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full rounded-full border-gray-300 bg-gray-100 py-2.5 pl-4 pr-12 text-base text-gray-900 placeholder-gray-500 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400" 
              placeholder="Schreibe eine Nachricht..." 
              type="text"
            />
            <button className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary-300">
              <span className="material-symbols-outlined text-2xl">mic</span>
            </button>
          </div>
          <button 
            onClick={handleSendMessage}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-blue-600 dark:hover:bg-blue-500"
          >
            <span className="material-symbols-outlined text-2xl">send</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default AICoach
