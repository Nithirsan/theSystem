import React, { useState, useEffect } from 'react'
import { habitsAPI } from '../services/api'

const HabitTracker = () => {
  const [activeTab, setActiveTab] = useState('today')
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [weekCompletions, setWeekCompletions] = useState([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [weekStart, setWeekStart] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'morning',
    icon: 'check_circle',
    color: 'primary',
    target_frequency: 7
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHabits()
    loadWeekCompletions()
  }, [])

  const loadHabits = async () => {
    try {
      setLoading(true)
      const habitsData = await habitsAPI.getHabits()
      setHabits(Array.isArray(habitsData) ? habitsData : [])
    } catch (error) {
      console.error('Failed to load habits:', error)
      setHabits([])
    } finally {
      setLoading(false)
    }
  }

  const toggleHabit = async (id) => {
    try {
      await habitsAPI.completeHabit(id)
      // Reload habits to get updated completion status
      await loadHabits()
      // Reload week completions to update the week overview
      await loadWeekCompletions()
    } catch (error) {
      console.error('Failed to complete habit:', error)
    }
  }

  const loadWeekCompletions = async () => {
    try {
      const data = await habitsAPI.getHabitCompletions()
      setWeekCompletions(data.completions || [])
      setCurrentStreak(data.current_streak || 0)
      setBestStreak(data.best_streak || 0)
      setWeekStart(data.start_date)
    } catch (error) {
      console.error('Failed to load week completions:', error)
      setWeekCompletions([])
    }
  }

  // Get dates for current week
  const getWeekDates = () => {
    const dates = []
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Check if a date has completions
  const hasCompletionForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return weekCompletions.some(c => {
      // Check if completion date matches
      const completionDate = new Date(c.completion_date + 'T00:00:00')
      return completionDate.toISOString().split('T')[0] === dateStr
    })
  }

  // Get day name abbreviation
  const getDayName = (date) => {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    return days[date.getDay()]
  }

  // Check if date is today
  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) {
      setError('Bitte gib einen Namen für die Gewohnheit ein')
      return
    }

    setIsSaving(true)
    try {
      await habitsAPI.createHabit({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        target_frequency: formData.target_frequency
      })
      
      // Reload habits
      await loadHabits()
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        category: 'morning',
        icon: 'check_circle',
        color: 'primary',
        target_frequency: 7
      })
      setShowModal(false)
    } catch (error) {
      console.error('Failed to create habit:', error)
      setError(error.message || 'Fehler beim Erstellen der Gewohnheit')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'target_frequency' ? parseInt(value) || 7 : value
    }))
  }

  const getHabitsByCategory = (category) => {
    return habits.filter(habit => habit.category === category)
  }

  const getIconForHabit = (habit) => {
    return habit.icon || 'check_circle'
  }

  const getColorForHabit = (habit) => {
    return habit.color || 'primary'
  }

  const availableIcons = [
    'check_circle', 'self_improvement', 'auto_stories', 'water_drop', 
    'edit_note', 'fitness_center', 'local_dining', 'bedtime', 
    'book', 'music_note', 'sports_esports', 'nature'
  ]

  const availableColors = [
    { value: 'primary', label: 'Blau' },
    { value: 'secondary', label: 'Grün' },
    { value: 'accent', label: 'Orange' }
  ]

  return (
    <div className="relative min-h-screen w-full flex flex-col mx-auto max-w-lg pb-24">
      {/* Top App Bar */}
      <header className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex size-12 shrink-0 items-center justify-start">
          {/* Placeholder for a menu icon if needed */}
        </div>
        <h1 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Meine Gewohnheiten</h1>
        <div className="flex w-12 items-center justify-end">
          <button className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 text-text-light-primary dark:text-text-dark-primary">
            <span className="material-symbols-outlined text-2xl">calendar_today</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="px-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between">
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'today' 
                ? 'border-b-primary text-primary' 
                : 'border-b-transparent text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Heute</p>
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'all' 
                ? 'border-b-primary text-primary' 
                : 'border-b-transparent text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Alle</p>
          </button>
          <button 
            onClick={() => setActiveTab('weekly')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'weekly' 
                ? 'border-b-primary text-primary' 
                : 'border-b-transparent text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Wöchentlich</p>
          </button>
        </div>
      </nav>

      <main className="flex-grow px-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          </div>
        ) : (
          <>
            {/* Morning Habits */}
            <h2 className="text-lg font-bold leading-tight pt-6 pb-2 text-text-light-primary dark:text-text-dark-primary">Morgens</h2>
            {getHabitsByCategory('morning').map(habit => (
              <div key={habit.id} className="flex items-center gap-4 bg-background-light dark:bg-background-dark py-2">
                <div className="flex items-center gap-4 flex-grow">
                  <div className={`text-white flex items-center justify-center rounded-lg bg-${getColorForHabit(habit)}/30 shrink-0 size-12`}>
                    <span className={`material-symbols-outlined text-${getColorForHabit(habit)} text-3xl`}>
                      {getIconForHabit(habit)}
                    </span>
                  </div>
              <div className="flex flex-col justify-center">
                <p className="text-base font-medium text-text-light-primary dark:text-text-dark-primary">{habit.name}</p>
                {habit.description && (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-normal">{habit.description}</p>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
                <button 
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex size-10 items-center justify-center rounded-full ${
                    habit.completed_today
                      ? `bg-${getColorForHabit(habit)}/20 text-${getColorForHabit(habit)}` 
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {habit.completed_today && <span className="material-symbols-outlined">done</span>}
                </button>
            </div>
          </div>
        ))}
            {getHabitsByCategory('morning').length === 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm py-4">
                Noch keine morgendlichen Gewohnheiten.
              </p>
            )}

            {/* Afternoon Habits */}
            {getHabitsByCategory('afternoon').length > 0 && (
              <h2 className="text-lg font-bold leading-tight pt-6 pb-2 text-text-light-primary dark:text-text-dark-primary">Mittags</h2>
            )}
            {getHabitsByCategory('afternoon').map(habit => (
              <div key={habit.id} className="flex items-center gap-4 bg-background-light dark:bg-background-dark py-2">
                <div className="flex items-center gap-4 flex-grow">
                  <div className={`text-white flex items-center justify-center rounded-lg bg-${getColorForHabit(habit)}/30 shrink-0 size-12`}>
                    <span className={`material-symbols-outlined text-${getColorForHabit(habit)} text-3xl`}>
                      {getIconForHabit(habit)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium text-text-light-primary dark:text-text-dark-primary">{habit.name}</p>
                    {habit.description && (
                      <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-normal">{habit.description}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                <button 
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex size-10 items-center justify-center rounded-full ${
                    habit.completed_today
                      ? `bg-${getColorForHabit(habit)}/20 text-${getColorForHabit(habit)}` 
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {habit.completed_today && <span className="material-symbols-outlined">done</span>}
                </button>
                </div>
              </div>
            ))}
            {getHabitsByCategory('afternoon').length === 0 && getHabitsByCategory('morning').length > 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm py-4">
                Noch keine mittäglichen Gewohnheiten.
              </p>
            )}

            {/* Evening Habits */}
            {getHabitsByCategory('evening').length > 0 && (
              <h2 className="text-lg font-bold leading-tight pt-6 pb-2 text-text-light-primary dark:text-text-dark-primary">Abends</h2>
            )}
            {getHabitsByCategory('evening').map(habit => (
              <div key={habit.id} className="flex items-center gap-4 bg-background-light dark:bg-background-dark py-2">
                <div className="flex items-center gap-4 flex-grow">
                  <div className={`text-white flex items-center justify-center rounded-lg bg-${getColorForHabit(habit)}/30 shrink-0 size-12`}>
                    <span className={`material-symbols-outlined text-${getColorForHabit(habit)} text-3xl`}>
                      {getIconForHabit(habit)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-base font-medium text-text-light-primary dark:text-text-dark-primary">{habit.name}</p>
                    {habit.description && (
                      <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-normal">{habit.description}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                <button 
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex size-10 items-center justify-center rounded-full ${
                    habit.completed_today
                      ? `bg-${getColorForHabit(habit)}/20 text-${getColorForHabit(habit)}` 
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {habit.completed_today && <span className="material-symbols-outlined">done</span>}
                </button>
                </div>
              </div>
            ))}
            {getHabitsByCategory('evening').length === 0 && (getHabitsByCategory('afternoon').length > 0 || getHabitsByCategory('morning').length > 0) && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm py-4">
                Noch keine abendlichen Gewohnheiten.
              </p>
            )}
            {getHabitsByCategory('evening').length === 0 && getHabitsByCategory('afternoon').length === 0 && getHabitsByCategory('morning').length === 0 && (
              <div className="text-center py-12">
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-base mb-4">
                  Noch keine Gewohnheiten erstellt.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Erste Gewohnheit erstellen
                </button>
              </div>
            )}

            {/* Progress Visualization Section */}
            <div className="mt-8">
          <h2 className="text-lg font-bold leading-tight mb-4 text-text-light-primary dark:text-text-dark-primary">Dein Fortschritt</h2>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">Wochenübersicht</h3>
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Diese Woche</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {getWeekDates().map((date, index) => {
                const hasCompletion = hasCompletionForDate(date)
                const isTodayDate = isToday(date)
                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <p className={`text-xs ${isTodayDate ? 'font-bold text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                      {getDayName(date)}
                    </p>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      hasCompletion ? 'bg-secondary text-white' : 
                      isTodayDate ? 'border-2 border-primary' : 
                      'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      {hasCompletion && <span className="material-symbols-outlined text-base">done</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex justify-around">
              <div className="text-center">
                <p className="text-xl font-bold text-accent">{currentStreak} <span className="text-sm font-normal">Tage</span></p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Aktueller Streak</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{bestStreak} <span className="text-sm font-normal">Tage</span></p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Bester Streak</p>
              </div>
            </div>
          </div>
            </div>
          </>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-28 right-1/2 translate-x-1/2 z-50">
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 h-14 w-auto px-6 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-200"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Neue Gewohnheit</span>
        </button>
      </div>

      {/* Create Habit Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Neue Gewohnheit
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="z.B. Meditieren"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Beschreibung
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Optional: Beschreibung der Gewohnheit"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Kategorie *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="morning">Morgens</option>
                  <option value="afternoon">Mittags</option>
                  <option value="evening">Abends</option>
                </select>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {availableIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.icon === icon
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-border-light dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined ${formData.icon === icon ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                        {icon}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Farbe
                </label>
                <div className="flex gap-3">
                  {availableColors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-border-light dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-full h-8 rounded mb-2 bg-${color.value}`}></div>
                      <span className={`text-sm ${formData.color === color.value ? 'text-primary font-bold' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                        {color.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Frequency */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Ziel: Pro Woche (Tage)
                </label>
                <input
                  type="number"
                  name="target_frequency"
                  value={formData.target_frequency}
                  onChange={handleInputChange}
                  min="1"
                  max="7"
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.name.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Wird erstellt...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default HabitTracker
