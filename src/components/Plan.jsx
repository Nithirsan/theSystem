import React, { useState, useEffect } from 'react'
import { notesAPI } from '../services/api'
import ReactMarkdown from 'react-markdown'

const Plan = () => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    color: 'primary'
  })
  const [newChecklistItems, setNewChecklistItems] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planNote, setPlanNote] = useState(null)
  const [planData, setPlanData] = useState(null)
  const [planAnswers, setPlanAnswers] = useState({
    goal: '',
    time_and_milestones: '',
    additional_info: ''
  })
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const [planMediaAttachments, setPlanMediaAttachments] = useState([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  const colors = [
    { value: 'primary', label: 'Blau', class: 'bg-primary' },
    { value: 'secondary', label: 'Grün', class: 'bg-secondary' },
    { value: 'accent', label: 'Orange', class: 'bg-accent' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  ]

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const notesData = await notesAPI.getNotes()
      setNotes(Array.isArray(notesData) ? notesData : [])
    } catch (error) {
      console.error('Failed to load notes:', error)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.title.trim()) {
      setError('Bitte gib einen Titel für die Notiz ein')
      return
    }

    setIsSaving(true)
    try {
      await notesAPI.createNote({
        title: formData.title,
        content: formData.content,
        color: formData.color
      })
      
      await loadNotes()
      
      setFormData({ title: '', content: '', color: 'primary' })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create note:', error)
      setError(error.message || 'Fehler beim Erstellen der Notiz')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateNote = async () => {
    if (!selectedNote) return
    setError('')

    setIsSaving(true)
    try {
      await notesAPI.updateNote(selectedNote.id, {
        title: formData.title,
        content: formData.content,
        color: formData.color,
        is_pinned: selectedNote.is_pinned
      })
      
      await loadNotes()
      setShowEditModal(false)
      setSelectedNote(null)
    } catch (error) {
      console.error('Failed to update note:', error)
      setError(error.message || 'Fehler beim Aktualisieren der Notiz')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Möchtest du diese Notiz wirklich löschen?')) return

    try {
      await notesAPI.deleteNote(noteId)
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert('Fehler beim Löschen der Notiz')
    }
  }

  const handleTogglePin = async (note) => {
    try {
      await notesAPI.updateNote(note.id, {
        is_pinned: !note.is_pinned
      })
      await loadNotes()
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  const handleAddChecklistItem = async (noteId, text) => {
    if (!text || !text.trim()) return

    try {
      await notesAPI.createChecklistItem(noteId, {
        text: text,
        position: 0
      })
      setNewChecklistItems({ ...newChecklistItems, [noteId]: '' })
      await loadNotes()
    } catch (error) {
      console.error('Failed to add checklist item:', error)
      alert('Fehler beim Hinzufügen des Checklist-Elements')
    }
  }

  const handleToggleChecklistItem = async (noteId, itemId, isChecked) => {
    try {
      await notesAPI.updateChecklistItem(noteId, itemId, {
        is_checked: !isChecked
      })
      await loadNotes()
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  const handleDeleteChecklistItem = async (noteId, itemId) => {
    try {
      await notesAPI.deleteChecklistItem(noteId, itemId)
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete checklist item:', error)
      alert('Fehler beim Löschen des Checklist-Elements')
    }
  }

  const handleGenerateChecklist = async (noteId) => {
    try {
      const response = await notesAPI.generateChecklist(noteId)
      if (response && response.items) {
        // Reload notes to show new checklist items
        await loadNotes()
        alert(`Checkliste erfolgreich generiert! ${response.count} Anforderungen hinzugefügt.`)
      }
    } catch (error) {
      console.error('Failed to generate checklist:', error)
      alert(`Fehler beim Generieren der Checkliste: ${error.message}`)
    }
  }

  const openEditModal = (note) => {
    setSelectedNote(note)
    setFormData({
      title: note.title,
      content: note.content || '',
      color: note.color || 'primary'
    })
    setShowEditModal(true)
  }

  const getColorClass = (color) => {
    const colorMap = {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      accent: 'bg-accent',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500'
    }
    return colorMap[color] || 'bg-primary'
  }

  const openPlanModal = async (note) => {
    setPlanNote(note)
    setPlanAnswers({
      goal: '',
      time_and_milestones: '',
      additional_info: ''
    })
    setError('')
    setChatMessages([])
    setChatInput('')
    
    try {
      const data = await notesAPI.getPlanData(note.id)
      // Check if plan data exists and has a generated plan
      if (data && data.generated_plan && data.generated_plan.trim && data.generated_plan.trim()) {
        // Plan already exists, show it
        setPlanData(data)
        setCurrentQuestion(-1) // -1 means show plan
      } else if (data && data.generated_plan && typeof data.generated_plan === 'string' && data.generated_plan.trim()) {
        // Handle string directly
        setPlanData(data)
        setCurrentQuestion(-1)
      } else {
        // No plan yet, start with questions
        setPlanData(null)
        setCurrentQuestion(0) // Start with first question
      }
    } catch (error) {
      console.error('Failed to load plan data:', error)
      setPlanData(null)
      setCurrentQuestion(0) // Default to first question on error
    }

    // Load media attachments for this note
    try {
      const attachments = await notesAPI.getMediaAttachments(note.id)
      setPlanMediaAttachments(attachments || [])
    } catch (error) {
      console.error('Failed to load media attachments:', error)
      setPlanMediaAttachments([])
    }
    
    setShowPlanModal(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < 2) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSendChatMessage = async () => {
    if (!planNote || !chatInput.trim() || isSendingChat) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setIsSendingChat(true)
    setError('')

    // Add user message immediately
    const tempUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await notesAPI.updatePlanViaChat(planNote.id, userMessage)
      
      if (response && response.plan_data) {
        // Update plan data
        setPlanData(response.plan_data)
        
        // Add AI response message
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: 'Plan wurde erfolgreich aktualisiert!',
          created_at: new Date().toISOString()
        }
        
        // Replace temp message with real messages
        setChatMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempUserMessage.id)
          return [...filtered, tempUserMessage, aiMessage]
        })
      } else {
        throw new Error('Unerwartete Antwort vom Server')
      }
    } catch (error) {
      console.error('Failed to send chat message:', error)
      setError(error.message || 'Fehler beim Senden der Nachricht')
      // Remove temp message on error
      setChatMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
    } finally {
      setIsSendingChat(false)
    }
  }

  const handleSavePlanAnswers = async () => {
    if (!planNote) return
    
    if (!planAnswers.goal.trim() || !planAnswers.time_and_milestones.trim() || !planAnswers.additional_info.trim()) {
      setError('Bitte beantworte alle drei Fragen')
      return
    }

    setIsGeneratingPlan(true)
    setError('')
    
    try {
      const response = await notesAPI.savePlanAnswers(planNote.id, {
        goal: planAnswers.goal,
        time_and_milestones: planAnswers.time_and_milestones,
        additional_info: planAnswers.additional_info
      })
      
      if (response && response.plan_data) {
        setPlanData(response.plan_data)
        // Only show plan if generated_plan exists and is not empty
        if (response.plan_data.generated_plan && response.plan_data.generated_plan.trim()) {
          setCurrentQuestion(-1) // Show generated plan
        } else {
          // Plan generation might have failed, but answers were saved
          const errorMsg = response.error 
            ? `Antworten gespeichert, aber Plan konnte nicht generiert werden: ${response.error}`
            : 'Antworten gespeichert, aber Plan konnte nicht generiert werden. Bitte versuche es erneut.'
          setError(errorMsg)
          setCurrentQuestion(0) // Stay on questions
        }
      } else {
        setError('Unerwartete Antwort vom Server. Bitte versuche es erneut.')
        setCurrentQuestion(0)
      }
    } catch (error) {
      console.error('Failed to save plan answers:', error)
      setError(error.message || 'Fehler beim Speichern der Antworten')
      setCurrentQuestion(0) // Reset to first question on error
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  // Helper function to safely extract string value (handles sql.NullString objects)
  const getStringValue = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value.String) return value.String
    return String(value)
  }

  // Helper function to render generated plan
  const renderGeneratedPlan = () => {
    if (!planData) return null
    
    const generatedPlan = getStringValue(planData.generated_plan)
    const goal = getStringValue(planData.goal)
    const timeAndMilestones = getStringValue(planData.time_and_milestones)
    const additionalInfo = getStringValue(planData.additional_info)
    
    if (!generatedPlan || !generatedPlan.trim()) {
      return (
        <div className="text-center py-8">
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            Der Plan wird noch generiert...
          </p>
          <button
            onClick={() => {
              setCurrentQuestion(0)
              setPlanAnswers({ goal: '', time_and_milestones: '', additional_info: '' })
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Neu starten
          </button>
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Generierter Plan
          </h3>
        </div>
        <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-light-primary dark:prose-headings:text-text-dark-primary prose-p:text-text-light-primary dark:prose-p:text-text-dark-primary prose-strong:text-text-light-primary dark:prose-strong:text-text-dark-primary prose-ul:text-text-light-primary dark:prose-ul:text-text-dark-primary prose-ol:text-text-light-primary dark:prose-ol:text-text-dark-primary prose-li:text-text-light-primary dark:prose-li:text-text-dark-primary">
            <ReactMarkdown>{generatedPlan}</ReactMarkdown>
          </div>
        </div>
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-2">
          <div>
            <strong>Ziel:</strong> {goal}
          </div>
          <div>
            <strong>Zeit & Zwischenziele:</strong> {timeAndMilestones}
          </div>
          <div>
            <strong>Weitere Infos:</strong> {additionalInfo}
          </div>
        </div>

        {/* Adopt Plan Button */}
        <div className="mt-4">
          <button
            onClick={async () => {
              if (!planNote) return
              try {
                setError('')
                const response = await notesAPI.adoptPlan(planNote.id)
                if (response && response.note) {
                  // Reload notes to show updated content
                  await loadNotes()
                  // Show success message
                  alert('Plan wurde erfolgreich in die Notiz übernommen!')
                  // Close modal
                  setShowPlanModal(false)
                }
              } catch (error) {
                console.error('Failed to adopt plan:', error)
                setError(error.message || 'Fehler beim Übernehmen des Plans')
              }
            }}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            Plan übernehmen
          </button>
        </div>

        {/* Chat Interface */}
        <div className="mt-6 border-t border-border-light dark:border-border-dark pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">chat</span>
            <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Plan anpassen
            </h4>
          </div>
          
          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <div className="mb-4 space-y-3 max-h-48 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.type === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendChatMessage()
                }
              }}
              placeholder="Wie soll der Plan angepasst werden?"
              className="flex-1 input text-sm"
              disabled={isSendingChat}
            />
            <button
              onClick={handleSendChatMessage}
              disabled={isSendingChat || !chatInput.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSendingChat ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  <span className="text-sm">Wird gesendet...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span className="text-sm">Senden</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const planQuestions = [
    {
      id: 0,
      question: 'Was ist das Ziel des Plans?',
      placeholder: 'Beschreibe das Hauptziel, das du erreichen möchtest...',
      field: 'goal'
    },
    {
      id: 1,
      question: 'Wie viel Zeit haben wir und welche Zwischenziele sind schon bekannt?',
      placeholder: 'Zeitrahmen und bekannte Meilensteine...',
      field: 'time_and_milestones'
    },
    {
      id: 2,
      question: 'Welche Informationen sind noch wichtig?',
      placeholder: 'Weitere relevante Details, Einschränkungen, Ressourcen...',
      field: 'additional_info'
    }
  ]

  const pinnedNotes = notes.filter(note => note.is_pinned)
  const unpinnedNotes = notes.filter(note => !note.is_pinned)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mx-auto max-w-lg bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          <p className="mt-4 text-text-light-secondary dark:text-text-dark-secondary">Lade Notizen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col mx-auto max-w-lg group/design-root overflow-x-hidden pb-28">
      {/* Top App Bar */}
      <header className="flex items-center p-5 pt-6 pb-4 justify-between glass sticky top-0 z-10 border-b border-border-light dark:border-border-dark backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 shadow-md">
            <span className="material-symbols-outlined text-white text-xl">note_stack</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary leading-tight tracking-[-0.015em]">Pläne</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">Notizen & Checklisten</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center rounded-xl h-10 w-10 bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">add</span>
        </button>
      </header>

      <main className="flex-grow px-4 py-6">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
              note_stack
            </span>
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-base mb-4">
              Noch keine Notizen erstellt
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
            >
              Erste Notiz erstellen
            </button>
          </div>
        ) : (
          <>
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-text-light-secondary dark:text-text-dark-secondary mb-3 uppercase tracking-wide">
                  Angepinnt
                </h2>
                <div className="space-y-3">
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={() => openEditModal(note)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onTogglePin={() => handleTogglePin(note)}
                      onPlanTogether={() => openPlanModal(note)}
                      onGenerateChecklist={() => handleGenerateChecklist(note.id)}
                      onAddChecklistItem={handleAddChecklistItem}
                      onToggleChecklistItem={(itemId, isChecked) => handleToggleChecklistItem(note.id, itemId, isChecked)}
                      onDeleteChecklistItem={(itemId) => handleDeleteChecklistItem(note.id, itemId)}
                      newChecklistItem={newChecklistItems[note.id] || ''}
                      setNewChecklistItem={(text) => setNewChecklistItems({ ...newChecklistItems, [note.id]: text })}
                      getColorClass={getColorClass}
                      onLoadNotes={loadNotes}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unpinned Notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h2 className="text-sm font-bold text-text-light-secondary dark:text-text-dark-secondary mb-3 uppercase tracking-wide">
                    Weitere Notizen
                  </h2>
                )}
                <div className="space-y-3">
                  {unpinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={() => openEditModal(note)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onTogglePin={() => handleTogglePin(note)}
                      onPlanTogether={() => openPlanModal(note)}
                      onGenerateChecklist={() => handleGenerateChecklist(note.id)}
                      onAddChecklistItem={handleAddChecklistItem}
                      onToggleChecklistItem={(itemId, isChecked) => handleToggleChecklistItem(note.id, itemId, isChecked)}
                      onDeleteChecklistItem={(itemId) => handleDeleteChecklistItem(note.id, itemId)}
                      newChecklistItem={newChecklistItems[note.id] || ''}
                      setNewChecklistItem={(text) => setNewChecklistItems({ ...newChecklistItems, [note.id]: text })}
                      getColorClass={getColorClass}
                      onLoadNotes={loadNotes}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Neue Notiz
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="input"
                  placeholder="z.B. Wochenplan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Inhalt
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows="4"
                  className="input resize-none"
                  placeholder="Optional: Beschreibung oder Notizen..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Farbe
                </label>
                <div className="flex gap-3">
                  {colors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-border-light dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-full h-8 rounded mb-2 ${color.class}`}></div>
                      <span className={`text-sm ${formData.color === color.value ? 'text-primary font-bold' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                        {color.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.title.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Wird erstellt...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditModal && selectedNote && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Notiz bearbeiten
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
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
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Inhalt
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows="4"
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Farbe
                </label>
                <div className="flex gap-3">
                  {colors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-border-light dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-full h-8 rounded mb-2 ${color.class}`}></div>
                      <span className={`text-sm ${formData.color === color.value ? 'text-primary font-bold' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                        {color.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleUpdateNote}
                  disabled={isSaving || !formData.title.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Together Modal */}
      {showPlanModal && planNote && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPlanModal(false)}
        >
          <div 
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-6xl h-full md:max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-text-light-primary dark:text-text-dark-primary truncate pr-2">
                Gemeinsam Planen: {planNote.title}
              </h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content - Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Top (Mobile) / Left (Desktop): Note Content */}
              <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark p-4 md:p-6 overflow-y-auto max-h-[40vh] md:max-h-none">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                      {planNote.title}
                    </h3>
                    {planNote.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-light-primary dark:prose-headings:text-text-dark-primary prose-p:text-text-light-secondary dark:prose-p:text-text-dark-secondary prose-strong:text-text-light-primary dark:prose-strong:text-text-dark-primary prose-ul:text-text-light-secondary dark:prose-ul:text-text-dark-secondary prose-ol:text-text-light-secondary dark:prose-ol:text-text-dark-secondary prose-li:text-text-light-secondary dark:prose-li:text-text-dark-secondary">
                        <ReactMarkdown>{planNote.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {planNote.checklist_items && planNote.checklist_items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                        Checkliste
                      </h4>
                      <div className="space-y-2">
                        {planNote.checklist_items.map(item => (
                          <div key={item.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.is_checked}
                              disabled
                              className="h-4 w-4 rounded border-2 border-border-light dark:border-border-dark"
                            />
                            <span className={`text-sm ${item.is_checked ? 'line-through text-text-light-secondary dark:text-text-dark-secondary' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

                  {/* Bottom (Mobile) / Right (Desktop): Planning Interface */}
                  <div className="w-full md:w-1/2 p-4 md:p-6 overflow-y-auto flex-1">
                    {error && (
                      <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    {/* Document Upload Section */}
                    <div className="mb-6 p-4 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                          Dokumente für die KI
                        </h3>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="audio/*,image/*,.pdf"
                            onChange={async (e) => {
                              const file = e.target.files[0]
                              if (!file || !planNote) return

                              // Determine file type
                              let fileType = ''
                              if (file.type.startsWith('audio/')) {
                                fileType = 'audio'
                              } else if (file.type.startsWith('image/')) {
                                fileType = 'image'
                              } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                                fileType = 'pdf'
                              } else {
                                alert('Nicht unterstützter Dateityp. Bitte verwende Audio, Bilder oder PDF.')
                                return
                              }

                              setIsUploadingMedia(true)
                              setError('')
                              try {
                                const response = await notesAPI.uploadMedia(planNote.id, file, fileType)
                                if (response && response.attachment) {
                                  // Reload media attachments
                                  const attachments = await notesAPI.getMediaAttachments(planNote.id)
                                  setPlanMediaAttachments(attachments || [])
                                  alert('Dokument erfolgreich hochgeladen. Die Konvertierung läuft im Hintergrund und wird automatisch in die Plan-Generierung einbezogen.')
                                }
                              } catch (error) {
                                console.error('Failed to upload media:', error)
                                setError(`Fehler beim Hochladen: ${error.message}`)
                              } finally {
                                setIsUploadingMedia(false)
                                e.target.value = '' // Reset input
                              }
                            }}
                            className="hidden"
                            disabled={isUploadingMedia}
                          />
                          <div className={`px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                            isUploadingMedia 
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                              : 'bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 cursor-pointer'
                          }`}>
                            {isUploadingMedia ? (
                              <>
                                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                <span>Wird hochgeladen...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">attach_file</span>
                                <span>Dokument hinzufügen</span>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                      
                      {planMediaAttachments.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {planMediaAttachments.map(attachment => (
                            <div key={attachment.id} className="flex items-center gap-2 p-2 rounded bg-card-light dark:bg-card-dark text-xs">
                              <span className="material-symbols-outlined text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                {attachment.file_type === 'audio' ? 'audiotrack' : 
                                 attachment.file_type === 'image' ? 'image' : 
                                 attachment.file_type === 'pdf' ? 'picture_as_pdf' : 'attach_file'}
                              </span>
                              <span className="flex-1 truncate text-text-light-primary dark:text-text-dark-primary">
                                {attachment.file_name}
                              </span>
                              <span className={`text-xs ${
                                attachment.conversion_status === 'completed' ? 'text-green-500' : 
                                attachment.conversion_status === 'processing' ? 'text-yellow-500' : 
                                attachment.conversion_status === 'failed' ? 'text-red-500' : 
                                'text-gray-500'
                              }`}>
                                {attachment.conversion_status === 'completed' ? '✓' : 
                                 attachment.conversion_status === 'processing' ? '⏳' : 
                                 attachment.conversion_status === 'failed' ? '✗' : '○'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          Lade Dokumente hoch, die die KI bei der Planung berücksichtigen soll.
                        </p>
                      )}
                    </div>

                {currentQuestion === -1 && planData ? (
                  renderGeneratedPlan()
                ) : currentQuestion >= 0 && currentQuestion < planQuestions.length ? (
                  // Show Questions
                  <div className="space-y-6">
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary">psychology</span>
                        <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                          Planungsfragen
                        </h3>
                      </div>
                      <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        Frage {currentQuestion + 1} von {planQuestions.length}
                      </div>
                      <div className="mt-2 w-full bg-background-light dark:bg-background-dark rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${((currentQuestion + 1) / planQuestions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                        {planQuestions[currentQuestion]?.question || ''}
                      </label>
                      <textarea
                        value={planAnswers[planQuestions[currentQuestion]?.field] || ''}
                        onChange={(e) => setPlanAnswers({ ...planAnswers, [planQuestions[currentQuestion]?.field]: e.target.value })}
                        placeholder={planQuestions[currentQuestion]?.placeholder || ''}
                        rows="6"
                        className="input resize-none w-full"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      {currentQuestion > 0 && (
                        <button
                          onClick={handlePreviousQuestion}
                          className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                        >
                          Zurück
                        </button>
                      )}
                      {currentQuestion < planQuestions.length - 1 ? (
                        <button
                          onClick={handleNextQuestion}
                          disabled={!planAnswers[planQuestions[currentQuestion]?.field]?.trim()}
                          className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Weiter
                        </button>
                      ) : (
                        <button
                          onClick={handleSavePlanAnswers}
                          disabled={isGeneratingPlan || !planAnswers.goal.trim() || !planAnswers.time_and_milestones.trim() || !planAnswers.additional_info.trim()}
                          className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isGeneratingPlan ? (
                            <>
                              <span className="material-symbols-outlined animate-spin">refresh</span>
                              Plan wird erstellt...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">auto_awesome</span>
                              Plan erstellen
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Fallback if currentQuestion is invalid
                  <div className="text-center py-8">
                    <p className="text-text-light-secondary dark:text-text-dark-secondary">
                      Fehler beim Laden der Fragen. Bitte versuche es erneut.
                    </p>
                    <button
                      onClick={() => {
                        setCurrentQuestion(0)
                        setPlanAnswers({ goal: '', time_and_milestones: '', additional_info: '' })
                      }}
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Neu starten
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// NoteCard Component
const NoteCard = ({ 
  note, 
  onEdit, 
  onDelete, 
  onTogglePin,
  onPlanTogether,
  onGenerateChecklist,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  newChecklistItem,
  setNewChecklistItem,
  getColorClass,
  onLoadNotes
}) => {
  const [showChecklistInput, setShowChecklistInput] = useState(false)
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false)

  const handleAddItem = () => {
    if (newChecklistItem.trim()) {
      onAddChecklistItem(note.id, newChecklistItem)
      setShowChecklistInput(false)
    }
  }

  return (
    <div className={`card-hover animate-fade-in border-l-4 ${getColorClass(note.color)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {note.is_pinned && (
              <span className="material-symbols-outlined text-primary text-sm">push_pin</span>
            )}
            <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold">
              {note.title}
            </h3>
          </div>
          {/* Show plan preview if available, otherwise show note content */}
          {note.plan_preview ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                Plan-Vorschau
              </div>
              <div className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-1 prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-light-primary dark:prose-headings:text-text-dark-primary prose-p:text-text-light-primary dark:prose-p:text-text-dark-primary prose-strong:text-text-light-primary dark:prose-strong:text-text-dark-primary prose-ul:text-text-light-primary dark:prose-ul:text-text-dark-primary prose-ol:text-text-light-primary dark:prose-ol:text-text-dark-primary prose-li:text-text-light-primary dark:prose-li:text-text-dark-primary prose-headings:my-0 prose-p:my-0 prose-ul:my-0 prose-ol:my-0">
                <ReactMarkdown>{note.plan_preview}</ReactMarkdown>
              </div>
              <button
                onClick={onPlanTogether}
                className="text-xs text-primary hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1 mt-1"
              >
                Vollständigen Plan anzeigen →
              </button>
            </div>
          ) : note.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-light-primary dark:prose-headings:text-text-dark-primary prose-p:text-text-light-secondary dark:prose-p:text-text-dark-secondary prose-strong:text-text-light-primary dark:prose-strong:text-text-dark-primary prose-ul:text-text-light-secondary dark:prose-ul:text-text-dark-secondary prose-ol:text-text-light-secondary dark:prose-ol:text-text-dark-secondary prose-li:text-text-light-secondary dark:prose-li:text-text-dark-secondary prose-headings:my-1 prose-p:my-1">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePin}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary transition-colors"
            title={note.is_pinned ? 'Anpinnen entfernen' : 'Anpinnen'}
          >
            <span className={`material-symbols-outlined text-sm ${note.is_pinned ? 'text-primary' : ''}`}>
              {note.is_pinned ? 'push_pin' : 'push_pin'}
            </span>
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary transition-colors"
            title="Bearbeiten"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark text-red-500 transition-colors"
            title="Löschen"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>

      {/* Gemeinsam Planen & Checkliste generieren Buttons */}
      <div className="mt-4 mb-4 flex gap-2">
        <button
          onClick={onPlanTogether}
          className="flex-1 px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-lg font-medium hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">psychology</span>
          Gemeinsam Planen
        </button>
        <button
          onClick={onGenerateChecklist}
          className="flex-1 px-4 py-2 bg-secondary/10 dark:bg-secondary/20 text-secondary rounded-lg font-medium hover:bg-secondary/20 dark:hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">checklist</span>
          Checkliste generieren
        </button>
      </div>

      {/* Media Attachments Section */}
      {note.media_attachments && note.media_attachments.length > 0 && (
        <div className="mt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Medien-Anhänge
            </h4>
          </div>
          <div className="space-y-2">
            {note.media_attachments.map(attachment => (
              <div key={attachment.id} className="flex items-center gap-2 p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
                <span className="material-symbols-outlined text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {attachment.file_type === 'audio' ? 'audiotrack' : 
                   attachment.file_type === 'image' ? 'image' : 
                   attachment.file_type === 'pdf' ? 'picture_as_pdf' : 'attach_file'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    {attachment.conversion_status === 'completed' ? '✓ Konvertiert' : 
                     attachment.conversion_status === 'processing' ? '⏳ Wird konvertiert...' : 
                     attachment.conversion_status === 'failed' ? '✗ Fehler' : '⏳ Ausstehend'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Möchtest du diesen Anhang wirklich löschen?')) {
                      try {
                        await notesAPI.deleteMediaAttachment(note.id, attachment.id)
                        if (onLoadNotes) {
                          await onLoadNotes()
                        }
                      } catch (error) {
                        console.error('Failed to delete media attachment:', error)
                        alert('Fehler beim Löschen des Anhangs')
                      }
                    }
                  }}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                  title="Löschen"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Media Button */}
      <div className="mt-4 mb-4">
        <label className="block">
          <input
            type="file"
            accept="audio/*,image/*,.pdf"
            onChange={async (e) => {
              const file = e.target.files[0]
              if (!file) return

              // Determine file type
              let fileType = ''
              if (file.type.startsWith('audio/')) {
                fileType = 'audio'
              } else if (file.type.startsWith('image/')) {
                fileType = 'image'
              } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                fileType = 'pdf'
              } else {
                alert('Nicht unterstützter Dateityp. Bitte verwende Audio, Bilder oder PDF.')
                return
              }

              try {
                const response = await notesAPI.uploadMedia(note.id, file, fileType)
                if (response && response.attachment) {
                  if (onLoadNotes) {
                    await onLoadNotes()
                  }
                  alert('Datei erfolgreich hochgeladen. Die Konvertierung läuft im Hintergrund.')
                }
              } catch (error) {
                console.error('Failed to upload media:', error)
                alert(`Fehler beim Hochladen: ${error.message}`)
              } finally {
                e.target.value = '' // Reset input
              }
            }}
            className="hidden"
          />
          <div className="w-full px-4 py-2 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg hover:border-primary transition-colors cursor-pointer flex items-center justify-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary">
            <span className="material-symbols-outlined text-sm">attach_file</span>
            <span className="text-sm">Medien hinzufügen (Audio, PDF, Bilder)</span>
          </div>
        </label>
      </div>

      {/* Checklist Section */}
      {(note.checklist_items && note.checklist_items.length > 0) || showChecklistInput ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
              className="flex items-center gap-2 text-sm font-semibold text-text-light-primary dark:text-text-dark-primary hover:text-primary transition-colors"
            >
              <span className={`material-symbols-outlined text-sm transition-transform ${isChecklistExpanded ? 'rotate-90' : ''}`}>
                chevron_right
              </span>
              <span>Checkliste</span>
              {note.checklist_items && note.checklist_items.length > 0 && (
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  ({note.checklist_items.filter(item => item.is_checked).length}/{note.checklist_items.length})
                </span>
              )}
            </button>
            {!showChecklistInput && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowChecklistInput(true)
                  setIsChecklistExpanded(true) // Auto-expand when adding item
                }}
                className="text-xs text-primary hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Hinzufügen
              </button>
            )}
          </div>

          {/* Checklist Items */}
          {isChecklistExpanded && note.checklist_items && note.checklist_items.length > 0 && (
            <div className="space-y-2 mb-3">
              {note.checklist_items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => onToggleChecklistItem(item.id, item.is_checked)}
                    className="h-5 w-5 rounded-lg border-2 border-border-light dark:border-border-dark bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-primary/50 focus:ring-2 cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-text-light-secondary dark:text-text-dark-secondary' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => onDeleteChecklistItem(item.id)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    title="Löschen"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Checklist Item Input */}
          {isChecklistExpanded && showChecklistInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem()
                } else if (e.key === 'Escape') {
                  setShowChecklistInput(false)
                  setNewChecklistItem('')
                }
              }}
              onBlur={() => {
                if (!newChecklistItem.trim()) {
                  setShowChecklistInput(false)
                }
              }}
              placeholder="Checklist-Element hinzufügen..."
              className="flex-1 input text-sm"
              autoFocus
            />
            <button
              onClick={handleAddItem}
              className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">check</span>
            </button>
            <button
              onClick={() => {
                setShowChecklistInput(false)
                setNewChecklistItem('')
              }}
              className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}
        </div>
      ) : null}
    </div>
  )
}

export default Plan

