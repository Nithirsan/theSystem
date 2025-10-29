import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { journalAPI } from '../services/api'

const Journal = () => {
  const [entries, setEntries] = useState([])
  const [currentEntry, setCurrentEntry] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [mood, setMood] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const moods = [
    { value: 'excellent', label: 'Ausgezeichnet', emoji: '😄', color: 'text-green-500' },
    { value: 'good', label: 'Gut', emoji: '😊', color: 'text-blue-500' },
    { value: 'okay', label: 'Okay', emoji: '😐', color: 'text-yellow-500' },
    { value: 'bad', label: 'Schlecht', emoji: '😔', color: 'text-orange-500' },
    { value: 'terrible', label: 'Schrecklich', emoji: '😢', color: 'text-red-500' }
  ]

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    loadEntryForDate(selectedDate)
  }, [selectedDate])

  const loadEntries = async () => {
    try {
      const entriesData = await journalAPI.getJournalEntries()
      setEntries(entriesData)
    } catch (error) {
      console.error('Failed to load entries:', error)
    }
  }

  const loadEntryForDate = async (date) => {
    setIsLoading(true)
    try {
      const entry = await journalAPI.getJournalEntryByDate(date)
      setCurrentEntry(entry)
      setMood(entry.mood || '')
      setContent(entry.content || '')
      setTags(entry.tags || '')
    } catch (error) {
      if (error.message.includes('not found')) {
        // No entry for this date, reset form
        setCurrentEntry(null)
        setMood('')
        setContent('')
        setTags('')
      } else {
        console.error('Failed to load entry:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!content.trim()) return

    setIsSaving(true)
    try {
      const entryData = {
        entry_date: selectedDate,
        mood: mood,
        content: content.trim(),
        tags: tags.trim()
      }

      const savedEntry = await journalAPI.createOrUpdateJournalEntry(entryData)
      setCurrentEntry(savedEntry)
      
      // Refresh entries list
      loadEntries()
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!currentEntry) return

    if (window.confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
      try {
        await journalAPI.deleteJournalEntry(currentEntry.id)
        setCurrentEntry(null)
        setMood('')
        setContent('')
        setTags('')
        loadEntries()
      } catch (error) {
        console.error('Failed to delete entry:', error)
      }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMoodEmoji = (moodValue) => {
    const moodObj = moods.find(m => m.value === moodValue)
    return moodObj ? moodObj.emoji : '😐'
  }

  const getMoodColor = (moodValue) => {
    const moodObj = moods.find(m => m.value === moodValue)
    return moodObj ? moodObj.color : 'text-gray-500'
  }

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + direction)
    setSelectedDate(newDate.toISOString().split('T')[0])
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      {/* Top App Bar */}
      <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
        <div className="flex w-12 items-center justify-start">
          <Link to="/" className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 bg-transparent text-slate-800 dark:text-slate-200 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 w-10">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
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
          {formatDate(selectedDate)}
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
          {moods.map((moodOption) => (
            <button
              key={moodOption.value}
              onClick={() => setMood(moodOption.value)}
              className={`flex h-10 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-full pl-3 pr-4 ${
                mood === moodOption.value 
                  ? 'bg-slate-200 dark:bg-slate-800 ring-2 ring-primary' 
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              <span className="text-xl">{moodOption.emoji}</span>
              <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal">
                {moodOption.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Text Area */}
      <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
        <label className="flex flex-col min-w-40 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin">refresh</span>
            </div>
          ) : (
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-slate-800 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-300 dark:border-slate-700 bg-transparent min-h-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-relaxed" 
              placeholder="Was geht dir heute durch den Kopf? Worauf bist du heute stolz?"
            />
          )}
        </label>
      </div>

      {/* Tags Input */}
      <div className="px-4 py-3">
        <label className="block text-slate-800 dark:text-white text-sm font-medium mb-2">
          Tags (optional)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="z.B. Arbeit, Familie, Sport, Entspannung"
          className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-0"
        />
      </div>

      {/* Mental Health Resources Card */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between rounded-xl p-4 bg-primary/20">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-white">Benötigst du Unterstützung?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Tools für dein Wohlbefinden.</p>
          </div>
          <Link to="/coach">
            <span className="material-symbols-outlined text-slate-800 dark:text-white">arrow_forward_ios</span>
          </Link>
        </div>
      </div>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-slate-800 dark:text-white text-lg font-bold mb-4">Letzte Einträge</h3>
          <div className="space-y-3">
            {entries.slice(0, 3).map(entry => (
              <div
                key={entry.id}
                onClick={() => setSelectedDate(entry.entry_date.split('T')[0])}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedDate === entry.entry_date.split('T')[0]
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-300 dark:border-slate-700 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${getMoodColor(entry.mood)}`}>
                    {getMoodEmoji(entry.mood)}
                  </span>
                  <div>
                    <p className="text-slate-800 dark:text-white font-medium">
                      {formatDate(entry.entry_date)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                      {entry.content.length > 100 ? entry.content.substring(0, 100) + '...' : entry.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-grow"></div> {/* Spacer to push toolbar to bottom */}

      {/* Bottom Toolbar */}
      <div className="sticky bottom-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentEntry && (
              <button 
                onClick={handleDelete}
                className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>
          <button 
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
                Speichern...
              </>
            ) : (
              'Speichern'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Journal