import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { journalAPI } from '../services/api'
import { habitsAPI } from '../services/api'
import { tasksAPI } from '../services/api'

const Journal = () => {
  const [step, setStep] = useState(0) // 0 = Start, 1-8 = Steps
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [hasEntryForToday, setHasEntryForToday] = useState(false)
  const [checkingEntry, setCheckingEntry] = useState(true)
  const [recentEntries, setRecentEntries] = useState([])
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [summaryDays, setSummaryDays] = useState(7)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summary, setSummary] = useState('')

  // Step 1: Mood
  const [mood, setMood] = useState('')

  // Step 2: Habits
  const [habits, setHabits] = useState([])
  const [selectedHabits, setSelectedHabits] = useState([])

  // Step 3: Tasks
  const [tasks, setTasks] = useState([])
  const [selectedTasks, setSelectedTasks] = useState([])
  const [additionalTasks, setAdditionalTasks] = useState([''])

  // Step 4: Appreciations
  const [appreciations, setAppreciations] = useState(['', '', ''])

  // Step 5: Improvements
  const [improvements, setImprovements] = useState([''])

  // Step 6-8: AI Generated Questions
  const [aiQuestions, setAiQuestions] = useState([])
  const [aiAnswers, setAiAnswers] = useState({})

  const moods = [
    { value: 'excellent', label: 'Ausgezeichnet', emoji: '😄', color: 'text-green-500' },
    { value: 'good', label: 'Gut', emoji: '😊', color: 'text-blue-500' },
    { value: 'okay', label: 'Okay', emoji: '😐', color: 'text-yellow-500' },
    { value: 'bad', label: 'Schlecht', emoji: '😔', color: 'text-orange-500' },
    { value: 'terrible', label: 'Schrecklich', emoji: '😢', color: 'text-red-500' }
  ]

  useEffect(() => {
    // Always check for today's entry on mount
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
    checkExistingEntry()
    loadRecentEntries()
  }, [])

  useEffect(() => {
    if (step === 2) {
      loadHabits()
    }
  }, [step])

  useEffect(() => {
    if (step === 3) {
      loadTasks()
    }
  }, [step])

  useEffect(() => {
    if (step === 5) {
      console.log('Step 5 reached, generating AI questions...')
      generateAIQuestions()
    }
  }, [step])

  // Also generate questions if we're at step 6 but don't have questions yet
  useEffect(() => {
    if (step === 6 && aiQuestions.length === 0 && !isGeneratingQuestions) {
      console.log('Step 6 reached but no questions, generating...')
      generateAIQuestions()
    }
  }, [step, aiQuestions.length, isGeneratingQuestions])

  const checkExistingEntry = async () => {
    setCheckingEntry(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const entry = await journalAPI.getJournalEntryByDate(today)
      if (entry) {
        // Entry exists for today
        setHasEntryForToday(true)
        setStep(0)
      } else {
        // No entry exists for today
        setHasEntryForToday(false)
        setStep(0)
      }
    } catch (error) {
      // No entry exists - this is fine
      setHasEntryForToday(false)
      setStep(0)
    } finally {
      setCheckingEntry(false)
    }
  }

  const loadRecentEntries = async () => {
    try {
      const entries = await journalAPI.getJournalEntries()
      // Sort by date descending and limit to last 10
      const sorted = entries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)).slice(0, 10)
      setRecentEntries(sorted)
    } catch (error) {
      console.error('Failed to load recent entries:', error)
      setRecentEntries([])
    }
  }

  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const entries = await journalAPI.getJournalEntries()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - summaryDays)
      
      const filteredEntries = entries.filter(entry => {
        const entryDate = new Date(entry.entry_date)
        return entryDate >= cutoffDate
      }).sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))

      if (filteredEntries.length === 0) {
        alert(`Keine Journal-Einträge in den letzten ${summaryDays} Tagen gefunden.`)
        setIsGeneratingSummary(false)
        return
      }

      const summaryText = await journalAPI.generateSummary(filteredEntries, summaryDays)
      setSummary(summaryText)
      setShowSummaryDialog(false)
    } catch (error) {
      console.error('Failed to generate summary:', error)
      alert(`Fehler beim Erstellen der Zusammenfassung: ${error.message || 'Bitte versuche es erneut.'}`)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const loadHabits = async () => {
    try {
      const habitsData = await habitsAPI.getHabits()
      setHabits(habitsData.filter(h => h.is_active))
    } catch (error) {
      console.error('Failed to load habits:', error)
      setHabits([])
    }
  }

  const loadTasks = async () => {
    try {
      const tasksData = await tasksAPI.getTasks()
      // Only show completed tasks
      setTasks(tasksData.filter(t => t.completed_at))
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setTasks([])
    }
  }

  const generateAIQuestions = async () => {
    console.log('generateAIQuestions called')
    setIsGeneratingQuestions(true)
    try {
      // Collect all data so far
      const contextData = {
        mood: mood,
        selectedHabits: selectedHabits.map(id => habits.find(h => h.id === id)?.name).filter(Boolean),
        selectedTasks: selectedTasks.map(id => tasks.find(t => t.id === id)?.title).filter(Boolean),
        additionalTasks: additionalTasks.filter(t => t.trim()),
        appreciations: appreciations.filter(a => a.trim()),
        improvements: improvements.filter(i => i.trim())
      }

      console.log('Sending context data:', contextData)
      const questions = await journalAPI.generateJournalQuestions(contextData)
      console.log('Received questions from API:', questions)
      console.log('Questions type:', typeof questions, 'isArray:', Array.isArray(questions))
      
      if (!Array.isArray(questions)) {
        console.error('Questions is not an array!', questions)
        setAiQuestions([])
        return
      }
      
      if (questions.length === 0) {
        console.warn('Received empty questions array')
        // Use fallback questions
        setAiQuestions([
          { question: "Was hat dich heute besonders motiviert?" },
          { question: "Gibt es etwas, wofür du heute besonders dankbar bist?" }
        ])
      } else {
        setAiQuestions(questions)
      }
      
      // Initialize empty answers for each question
      const answers = {}
      const questionsToUse = questions.length > 0 ? questions : [
        { question: "Was hat dich heute besonders motiviert?" },
        { question: "Gibt es etwas, wofür du heute besonders dankbar bist?" }
      ]
      questionsToUse.forEach((q, index) => {
        answers[index] = ''
      })
      setAiAnswers(answers)
      console.log('AI Questions set:', questionsToUse.length, 'questions')
    } catch (error) {
      console.error('Failed to generate AI questions:', error)
      // If AI fails, use fallback questions
      const fallbackQuestions = [
        { question: "Was hat dich heute besonders motiviert?" },
        { question: "Gibt es etwas, wofür du heute besonders dankbar bist?" }
      ]
      setAiQuestions(fallbackQuestions)
      const answers = {}
      fallbackQuestions.forEach((q, index) => {
        answers[index] = ''
      })
      setAiAnswers(answers)
    } finally {
      setIsGeneratingQuestions(false)
      console.log('Finished generating questions, isGeneratingQuestions:', false)
    }
  }

  const handleNext = () => {
    console.log('handleNext called:', { step, isGeneratingQuestions, aiQuestionsLength: aiQuestions.length })
    
    if (step < 5) {
      setStep(step + 1)
    } else if (step === 5) {
      // After step 5, we need to check if AI questions are ready
      if (isGeneratingQuestions) {
        // Still generating, wait
        console.log('Still generating questions, waiting...')
        return
      }
      if (aiQuestions.length > 0) {
        // AI questions are ready, go to first question
        console.log('AI questions ready, going to step 6')
        setStep(6)
      } else {
        // No AI questions (maybe API failed), skip directly to save
        console.log('No AI questions, going to save step')
        // Set step to 6, which will be treated as save step if no questions
        setStep(6)
      }
    } else if (step > 5 && step < 5 + Math.max(aiQuestions.length, 1)) {
      // Between AI questions (if questions exist)
      if (aiQuestions.length > 0) {
        console.log('Moving to next AI question')
        setStep(step + 1)
      } else {
        // No questions, this should be the save step
        console.log('No questions, at save step')
      }
    } else if (step === 5 + Math.max(aiQuestions.length, 0)) {
      // At the end, should show save button (handled in render)
      console.log('At end step, should show save button')
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleHabitToggle = (habitId) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    )
  }

  const handleTaskToggle = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleAddAdditionalTask = () => {
    setAdditionalTasks([...additionalTasks, ''])
  }

  const handleAdditionalTaskChange = (index, value) => {
    const newTasks = [...additionalTasks]
    newTasks[index] = value
    setAdditionalTasks(newTasks)
  }

  const handleAddImprovement = () => {
    setImprovements([...improvements, ''])
  }

  const handleImprovementChange = (index, value) => {
    const newImprovements = [...improvements]
    newImprovements[index] = value
    setImprovements(newImprovements)
  }

  const handleAppreciationChange = (index, value) => {
    const newAppreciations = [...appreciations]
    newAppreciations[index] = value
    setAppreciations(newAppreciations)
  }

  const handleAIAnswerChange = (index, value) => {
    setAiAnswers(prev => ({
      ...prev,
      [index]: value
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Compile all data into content
      const contentParts = []

      // Step 1: Mood
      contentParts.push(`Stimmung: ${moods.find(m => m.value === mood)?.label || mood}`)

      // Step 2: Habits
      if (selectedHabits.length > 0) {
        const habitNames = selectedHabits.map(id => habits.find(h => h.id === id)?.name).filter(Boolean)
        contentParts.push(`\nGewohnheiten heute: ${habitNames.join(', ')}`)
      }

      // Step 3: Tasks
      const allTasks = [
        ...selectedTasks.map(id => tasks.find(t => t.id === id)?.title).filter(Boolean),
        ...additionalTasks.filter(t => t.trim())
      ]
      if (allTasks.length > 0) {
        contentParts.push(`\nErledigte Aufgaben: ${allTasks.join(', ')}`)
      }

      // Step 4: Appreciations
      const validAppreciations = appreciations.filter(a => a.trim())
      if (validAppreciations.length > 0) {
        contentParts.push(`\nWertgeschätzt heute:\n${validAppreciations.map((a, i) => `${i + 1}. ${a}`).join('\n')}`)
      }

      // Step 5: Improvements
      const validImprovements = improvements.filter(i => i.trim())
      if (validImprovements.length > 0) {
        contentParts.push(`\nVerbesserungen für nächstes Mal:\n${validImprovements.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`)
      }

      // Step 6-8: AI Questions
      if (aiQuestions.length > 0) {
        contentParts.push(`\n\nReflexionsfragen:`)
        aiQuestions.forEach((questionObj, index) => {
          const question = questionObj.question || questionObj // Support both formats
          const answer = aiAnswers[index] || ''
          if (answer.trim()) {
            contentParts.push(`\n${question}\n${answer}`)
          }
        })
      }

      const content = contentParts.join('')

      // Create tags from habits and tasks - convert to JSON array
      const tagsArray = [
        ...selectedHabits.map(id => habits.find(h => h.id === id)?.name).filter(Boolean),
        ...selectedTasks.map(id => tasks.find(t => t.id === id)?.title).filter(Boolean)
      ]

      // Format date correctly for backend (needs to be ISO string with time)
      const entryDate = new Date(selectedDate + 'T00:00:00Z').toISOString()

      const entryData = {
        entry_date: entryDate,
        mood: mood,
        content: content,
        tags: JSON.stringify(tagsArray) // Send as JSON string
      }

      console.log('Saving entry with data:', entryData)
      
      await journalAPI.createOrUpdateJournalEntry(entryData)
      
      // Reset and go back to start
      setStep(0)
      resetForm()
      // Check if entry exists after saving
      checkExistingEntry()
    } catch (error) {
      console.error('Failed to save entry:', error)
      console.error('Error details:', error.message, error.stack)
      alert(`Fehler beim Speichern des Eintrags: ${error.message || 'Bitte versuche es erneut.'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setMood('')
    setSelectedHabits([])
    setSelectedTasks([])
    setAdditionalTasks([''])
    setAppreciations(['', '', ''])
    setImprovements([''])
    setAiQuestions([])
    setAiAnswers({})
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

  const canProceed = () => {
    switch (step) {
      case 1:
        return mood !== ''
      case 2:
        return true // Habits are optional
      case 3:
        return true // Tasks are optional
      case 4:
        return appreciations.some(a => a.trim()) // At least one appreciation
      case 5:
        return improvements.some(i => i.trim()) // At least one improvement
      default:
        return true
    }
  }

  // Render Start Screen
  if (step === 0) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden pb-24">
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

        {/* Date Display */}
        <div className="flex items-center justify-center px-4 pt-8 pb-6">
          <h2 className="text-slate-800 dark:text-white tracking-light text-xl font-bold leading-tight text-center">
            {formatDate(selectedDate)}
          </h2>
        </div>

        {/* Content based on whether entry exists */}
        {checkingEntry ? (
          <div className="flex items-center justify-center px-4 py-8 flex-grow">
            <div className="flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin">refresh</span>
              <p className="text-slate-600 dark:text-slate-400 text-center">
                Prüfe Journal-Eintrag...
              </p>
            </div>
          </div>
        ) : hasEntryForToday ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 flex-grow gap-6">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
              <span className="material-symbols-outlined text-primary text-6xl">check_circle</span>
              <h3 className="text-slate-800 dark:text-white text-xl font-bold">
                Journal für heute bereits erstellt
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Du hast heute bereits ein Journal-Eintrag erstellt. Du kannst morgen einen neuen Eintrag erstellen.
              </p>
            </div>
            
            {/* Summary Button */}
            <button
              onClick={() => setShowSummaryDialog(true)}
              className="flex items-center justify-center gap-2 rounded-full bg-primary text-white px-6 py-3 text-base font-bold hover:bg-primary/80 transition-colors shadow-lg"
            >
              <span className="material-symbols-outlined">summarize</span>
              Journals der letzten Tage zusammenfassen
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-8 flex-grow gap-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-8 h-16 text-xl font-bold hover:bg-[#F8C8B3]/80 transition-colors shadow-lg"
            >
              Journal für heute starten
            </button>
            
            {/* Summary Button */}
            <button
              onClick={() => setShowSummaryDialog(true)}
              className="flex items-center justify-center gap-2 rounded-full bg-primary text-white px-6 py-3 text-base font-bold hover:bg-primary/80 transition-colors shadow-lg"
            >
              <span className="material-symbols-outlined">summarize</span>
              Journals der letzten Tage zusammenfassen
            </button>
          </div>
        )}

        {/* Recent Entries Section */}
        {recentEntries.length > 0 && (
          <div className="px-4 pb-8">
            <h3 className="text-slate-800 dark:text-white text-lg font-bold mb-4">Letzte Journals</h3>
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => {
                    setSelectedDate(entry.entry_date)
                    setStep(0)
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-800 dark:text-white font-semibold">
                      {formatDate(entry.entry_date)}
                    </span>
                    {entry.mood && (
                      <span className="text-2xl">
                        {moods.find(m => m.value === entry.mood)?.emoji || '📝'}
                      </span>
                    )}
                  </div>
                  {entry.content && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
                      {entry.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Dialog */}
        {showSummaryDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-slate-800 dark:text-white text-xl font-bold mb-4">
                Journals zusammenfassen
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Wie viel Tage in der Vergangenheit soll das Letzte Journal liegen?
              </p>
              <input
                type="number"
                value={summaryDays}
                onChange={(e) => setSummaryDays(parseInt(e.target.value) || 7)}
                min="1"
                max="365"
                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-0 mb-4"
                placeholder="Anzahl Tage"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSummaryDialog(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  disabled={isGeneratingSummary}
                >
                  Abbrechen
                </button>
                <button
                  onClick={generateSummary}
                  disabled={isGeneratingSummary}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingSummary ? 'Erstelle...' : 'Zusammenfassen'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 dark:text-white text-xl font-bold">
                  Zusammenfassung
                </h3>
                <button
                  onClick={() => setSummary('')}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-800 dark:text-white whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render Steps
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden pb-24">
      {/* Top App Bar */}
      <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
        <div className="flex w-12 items-center justify-start">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 bg-transparent text-slate-800 dark:text-slate-200 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 w-10"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          ) : (
            <Link to="/" className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 bg-transparent text-slate-800 dark:text-slate-200 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 w-10">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
          )}
        </div>
        <h2 className="text-slate-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          Schritt {step} {step > 5 && aiQuestions.length > 0 ? `von ${5 + aiQuestions.length}` : step <= 5 ? 'von 5' : ''}
        </h2>
        <div className="flex w-12 items-center justify-end gap-2">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">lock</span>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-4 pt-4 pb-2">
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((step / (5 + Math.max(aiQuestions.length, 0))) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-grow px-4 py-6">
        {/* Step 1: Mood */}
        {step === 1 && (
          <div>
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight mb-6 text-center">
              Wie fühlst du dich heute?
            </h1>
            <div className="flex flex-col gap-3">
              {moods.map((moodOption) => (
                <button
                  key={moodOption.value}
                  onClick={() => setMood(moodOption.value)}
                  className={`flex h-16 shrink-0 cursor-pointer items-center justify-center gap-x-3 rounded-xl p-4 ${
                    mood === moodOption.value 
                      ? 'bg-slate-200 dark:bg-slate-800 ring-2 ring-primary' 
                      : 'bg-slate-100 dark:bg-slate-900'
                  }`}
                >
                  <span className="text-3xl">{moodOption.emoji}</span>
                  <p className="text-slate-800 dark:text-slate-200 text-lg font-medium leading-normal">
                    {moodOption.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Habits */}
        {step === 2 && (
          <div>
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight mb-6 text-center">
              Welche Gewohnheiten hast du heute ausgeübt?
            </h1>
            {habits.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                Du hast noch keine aktiven Gewohnheiten. Du kannst diese Auswahl überspringen.
              </p>
            ) : (
              <div className="space-y-3">
                {habits.map((habit) => (
                  <label
                    key={habit.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedHabits.includes(habit.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedHabits.includes(habit.id)}
                      onChange={() => handleHabitToggle(habit.id)}
                      className="w-5 h-5 rounded text-primary"
                    />
                    <div className="flex-1">
                      <p className="text-slate-800 dark:text-white font-medium">{habit.name}</p>
                      {habit.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{habit.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Tasks */}
        {step === 3 && (
          <div>
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight mb-6 text-center">
              Welche Aufgaben konntest du heute erledigen?
            </h1>
            {tasks.length > 0 && (
              <div className="space-y-3 mb-6">
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedTasks.includes(task.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleTaskToggle(task.id)}
                      className="w-5 h-5 rounded text-primary"
                    />
                    <div className="flex-1">
                      <p className="text-slate-800 dark:text-white font-medium">{task.title}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-slate-800 dark:text-white text-sm font-medium mb-2">
                Weitere erledigte Aufgaben:
              </label>
              {additionalTasks.map((task, index) => (
                <input
                  key={index}
                  type="text"
                  value={task}
                  onChange={(e) => handleAdditionalTaskChange(index, e.target.value)}
                  placeholder={`Aufgabe ${index + 1}`}
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-0 mb-2"
                />
              ))}
              <button
                onClick={handleAddAdditionalTask}
                className="flex items-center gap-2 text-primary font-medium mt-2"
              >
                <span className="material-symbols-outlined">add</span>
                Weitere Aufgabe hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Appreciations */}
        {step === 4 && (
          <div>
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight mb-6 text-center">
              Nenne 3 Dinge, die du heute besonders wertgeschätzt hast
            </h1>
            <div className="space-y-4">
              {appreciations.map((appreciation, index) => (
                <input
                  key={index}
                  type="text"
                  value={appreciation}
                  onChange={(e) => handleAppreciationChange(index, e.target.value)}
                  placeholder={`Wertschätzung ${index + 1}`}
                  className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-0 text-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Improvements */}
        {step === 5 && (
          <div>
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight mb-6 text-center">
              Nenne mindestens eine Sache, die du das nächste Mal verbessern willst
            </h1>
            <div className="space-y-4">
              {improvements.map((improvement, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={improvement}
                    onChange={(e) => handleImprovementChange(index, e.target.value)}
                    placeholder={`Verbesserung ${index + 1}`}
                    className="flex-1 p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-0 text-lg"
                  />
                  {index === improvements.length - 1 && (
                    <button
                      onClick={handleAddImprovement}
                      className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6-8: AI Generated Questions */}
        {step > 5 && step <= 5 + Math.max(aiQuestions.length, 0) && aiQuestions.length > 0 && (
          <div>
            {console.log('Rendering AI question step:', step, 'aiQuestions:', aiQuestions, 'question index:', step - 6, 'current question:', aiQuestions[step - 6])}
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight mb-6 text-center">
              {aiQuestions[step - 6]?.question || (typeof aiQuestions[step - 6] === 'string' ? aiQuestions[step - 6] : 'Reflexionsfrage')}
            </h1>
            <textarea
              value={aiAnswers[step - 6] || ''}
              onChange={(e) => handleAIAnswerChange(step - 6, e.target.value)}
              placeholder="Deine Antwort..."
              className="w-full p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:outline-0 min-h-48 text-lg"
            />
          </div>
        )}

        {/* Debug: Show if step > 5 but no questions and not generating */}
        {step > 5 && aiQuestions.length === 0 && !isGeneratingQuestions && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
              Keine Fragen verfügbar. Schritt: {step}
            </p>
            <p className="text-slate-500 dark:text-slate-500 text-sm text-center">
              Es scheint ein Problem beim Generieren der Fragen zu geben. Bitte gehe zurück und versuche es erneut.
            </p>
          </div>
        )}

        {/* Show loading state when generating questions */}
        {(step === 5 && isGeneratingQuestions) || (step === 6 && isGeneratingQuestions) ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary text-6xl animate-spin mb-4">refresh</span>
            <p className="text-slate-600 dark:text-slate-400 text-center">
              Generiere passende Reflexionsfragen...
            </p>
          </div>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-6 h-12 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Zurück
            </button>
          )}
          <div className="flex-1"></div>
          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8C8B3]/80 transition-colors"
            >
              Weiter
            </button>
          ) : step === 5 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed() || isGeneratingQuestions}
              className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8C8B3]/80 transition-colors"
            >
              {isGeneratingQuestions ? 'Generiere Fragen...' : aiQuestions.length > 0 ? 'Weiter zu Fragen' : 'Weiter'}
            </button>
          ) : step > 5 && step < 5 + Math.max(aiQuestions.length, 1) && aiQuestions.length > 0 ? (
            <button
              onClick={handleNext}
              className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold hover:bg-[#F8C8B3]/80 transition-colors"
            >
              Weiter
            </button>
          ) : step === 5 + Math.max(aiQuestions.length, 0) || (step === 6 && aiQuestions.length === 0) ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8C8B3]/80 transition-colors"
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
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center justify-center rounded-full bg-[#F8C8B3] text-slate-900 px-6 h-12 font-bold hover:bg-[#F8C8B3]/80 transition-colors"
            >
              Weiter
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Journal
