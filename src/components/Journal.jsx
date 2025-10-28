import React, { useState } from 'react'

const Journal = () => {
  const [selectedMood, setSelectedMood] = useState('happy')
  const [journalText, setJournalText] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())

  const moods = [
    { id: 'happy', label: 'Glücklich', icon: 'sentiment_satisfied' },
    { id: 'sad', label: 'Traurig', icon: 'sentiment_sad' },
    { id: 'excited', label: 'Aufgeregt', icon: 'sentiment_excited' },
    { id: 'calm', label: 'Ruhig', icon: 'sentiment_calm' },
    { id: 'stressed', label: 'Gestresst', icon: 'sentiment_stressed' }
  ]

  const formatDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' }
    return date.toLocaleDateString('de-DE', options)
  }

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction)
    setCurrentDate(newDate)
  }

  const handleSave = () => {
    // Here you would typically save to a backend or local storage
    console.log('Saving journal entry:', {
      date: currentDate,
      mood: selectedMood,
      text: journalText
    })
    alert('Eintrag gespeichert!')
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      {/* Top App Bar */}
      <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
        <div className="flex w-12 items-center justify-start">
          <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 bg-transparent text-slate-800 dark:text-slate-200 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 w-10">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
        </div>
        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Tagebuch</h2>
        <div className="flex w-12 items-center justify-end gap-2">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">lock</span>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button 
          onClick={() => navigateDate(-1)}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-slate-800 dark:text-white tracking-light text-xl font-bold leading-tight text-center">
          {formatDate(currentDate)}
        </h2>
        <button 
          onClick={() => navigateDate(1)}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Mood/Feeling Tracker */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-left pb-3">
          Wie fühlst du dich heute?
        </h1>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setSelectedMood(mood.id)}
              className={`flex h-10 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-full pl-3 pr-4 ${
                selectedMood === mood.id 
                  ? 'bg-slate-200 dark:bg-slate-800 ring-2 ring-primary' 
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-slate-800 dark:text-slate-200 text-xl">
                {mood.icon}
              </span>
              <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal">
                {mood.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Text Area */}
      <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
        <label className="flex flex-col min-w-40 flex-1">
          <textarea 
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-transparent min-h-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-relaxed" 
            placeholder="Was geht dir heute durch den Kopf? Worauf bist du heute stolz?"
          />
        </label>
      </div>

      {/* Mental Health Resources Card */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between rounded-xl p-4 bg-primary/20">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-white">Benötigst du Unterstützung?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Tools für dein Wohlbefinden.</p>
          </div>
          <span className="material-symbols-outlined text-slate-800 dark:text-white">arrow_forward_ios</span>
        </div>
      </div>

      <div className="flex-grow"></div> {/* Spacer to push toolbar to bottom */}

      {/* Bottom Toolbar */}
      <div className="sticky bottom-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined">format_bold</span>
            </button>
            <button className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined">format_italic</span>
            </button>
            <button className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined">format_list_bulleted</span>
            </button>
            <button className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined">add_photo_alternate</span>
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold"
          >
            <span>Speichern</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Journal
