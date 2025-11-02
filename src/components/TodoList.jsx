import React, { useState, useEffect } from 'react'
import { tasksAPI } from '../services/api'

const TodoList = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    is_recurring: false,
    recurrence_interval_weeks: 1,
    recurrence_end_date: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const tasksData = await tasksAPI.getTasks()
      setTasks(Array.isArray(tasksData) ? tasksData : [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = async (id) => {
    try {
      await tasksAPI.completeTask(id)
      // Reload tasks to get updated completion status
      await loadTasks()
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.title.trim()) {
      setError('Bitte gib einen Titel für die Aufgabe ein')
      return
    }

    if (formData.is_recurring) {
      if (!formData.due_date) {
        setError('Bei wiederholenden Todos ist ein Startdatum erforderlich')
        return
      }
      if (!formData.recurrence_end_date) {
        setError('Bei wiederholenden Todos ist ein Enddatum erforderlich')
        return
      }
      if (!formData.recurrence_interval_weeks || formData.recurrence_interval_weeks < 1) {
        setError('Der Rhythmus muss mindestens 1 Woche betragen')
        return
      }
    }

    setIsSaving(true)
    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        is_recurring: formData.is_recurring,
        recurrence_interval_weeks: formData.is_recurring ? parseInt(formData.recurrence_interval_weeks) : undefined,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? new Date(formData.recurrence_end_date).toISOString() : undefined
      }
      
      await tasksAPI.createTask(taskData)
      
      // Reload tasks
      await loadTasks()
      
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        is_recurring: false,
        recurrence_interval_weeks: 1,
        recurrence_end_date: ''
      })
      setShowModal(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      setError(error.message || 'Fehler beim Erstellen der Aufgabe')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'recurrence_interval_weeks' ? parseInt(value) || 1 : value)
    }))
  }

  const getPriorityColorClass = (priority) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    }
    return colors[priority] || 'bg-yellow-500'
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    const taskDate = new Date(date)
    return taskDate.toDateString() === today.toDateString()
  }

  const isTomorrow = (date) => {
    if (!date) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const taskDate = new Date(date)
    return taskDate.toDateString() === tomorrow.toDateString()
  }

  const getTasksByDate = (dateType) => {
    if (dateType === 'today') {
      return tasks.filter(task => !task.completed_at && isToday(task.due_date))
    } else if (dateType === 'tomorrow') {
      return tasks.filter(task => !task.completed_at && isTomorrow(task.due_date))
    }
    return []
  }

  const completedTasks = tasks.filter(task => task.completed_at !== null)

  const getDueDateText = (dueDate) => {
    if (!dueDate) return ''
    const date = new Date(dueDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Fällig: Heute'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Fällig: Morgen'
    } else if (date < today) {
      return `Fällig: ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
    } else {
      return `Fällig: ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden pb-24">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-light dark:bg-background-dark z-10">
        <div className="flex size-12 shrink-0 items-center justify-start">
          <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">menu</span>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center text-gray-900 dark:text-white">Meine Aufgaben</h2>
        <div className="flex w-12 items-center justify-end">
          <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-transparent text-gray-700 dark:text-gray-300 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Chips for Filtering */}
      <div className="flex gap-3 px-4 py-2 overflow-x-auto whitespace-nowrap">
        <button 
          onClick={() => setActiveFilter('all')}
          className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-4 ${
            activeFilter === 'all' 
              ? 'bg-primary/20 dark:bg-primary/30' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <p className={`text-sm font-medium leading-normal ${
            activeFilter === 'all' 
              ? 'text-primary' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>Alle</p>
        </button>
        <button 
          onClick={() => setActiveFilter('due')}
          className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-4 ${
            activeFilter === 'due' 
              ? 'bg-primary/20 dark:bg-primary/30' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <p className={`text-sm font-medium leading-normal ${
            activeFilter === 'due' 
              ? 'text-primary' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>Fälligkeitsdatum</p>
        </button>
        <button 
          onClick={() => setActiveFilter('priority')}
          className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-4 ${
            activeFilter === 'priority' 
              ? 'bg-primary/20 dark:bg-primary/30' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <p className={`text-sm font-medium leading-normal ${
            activeFilter === 'priority' 
              ? 'text-primary' 
              : 'text-gray-700 dark:text-gray-300'
          }`}>Priorität</p>
        </button>
      </div>

      <div className="px-4 flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          </div>
        ) : (
          <>
            {/* Today's Tasks */}
            <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] py-4">Heute</h3>
            {getTasksByDate('today').length > 0 ? (
              <div className="flex flex-col gap-3">
                {getTasksByDate('today').map(task => (
                  <div key={task.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                    <div className={`w-1.5 h-12 ${getPriorityColorClass(task.priority)} rounded-full`}></div>
                    <div className="flex items-center gap-3 flex-grow">
                      <div className="flex size-7 items-center justify-center">
                        <input 
                          checked={task.completed_at !== null}
                          onChange={() => toggleTask(task.id)}
                          className="h-6 w-6 rounded-md border-gray-400 dark:border-gray-500 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none" 
                          type="checkbox"
                        />
                      </div>
                      <div className="flex flex-col justify-center flex-grow">
                        <p className={`text-gray-800 dark:text-white text-base font-medium leading-normal line-clamp-1 ${
                          task.completed_at ? 'line-through' : ''
                        }`}>{task.title}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">
                          {task.description || getDueDateText(task.due_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-2">Keine Aufgaben für heute</p>
            )}

            {/* Tomorrow's Tasks */}
            <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pt-6 pb-4">Morgen</h3>
            {getTasksByDate('tomorrow').length > 0 ? (
              <div className="flex flex-col gap-3">
                {getTasksByDate('tomorrow').map(task => (
                  <div key={task.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                    <div className={`w-1.5 h-12 ${getPriorityColorClass(task.priority)} rounded-full`}></div>
                    <div className="flex items-center gap-3 flex-grow">
                      <div className="flex size-7 items-center justify-center">
                        <input 
                          checked={task.completed_at !== null}
                          onChange={() => toggleTask(task.id)}
                          className="h-6 w-6 rounded-md border-gray-400 dark:border-gray-500 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none" 
                          type="checkbox"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className={`text-gray-800 dark:text-white text-base font-medium leading-normal line-clamp-1 ${
                          task.completed_at ? 'line-through' : ''
                        }`}>{task.title}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">
                          {task.description || getDueDateText(task.due_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-2">Keine Aufgaben für morgen</p>
            )}

            {/* Completed Tasks */}
            <div className="pt-6">
              <details>
                <summary 
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center justify-between cursor-pointer py-4 list-none"
                >
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                    Erledigt ({completedTasks.length})
                  </h3>
                  <span className={`material-symbols-outlined text-gray-500 dark:text-gray-400 transition-transform duration-300 transform ${
                    showCompleted ? 'rotate-180' : ''
                  }`}>expand_more</span>
                </summary>
                {showCompleted && (
                  <div className="flex flex-col gap-3">
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 opacity-60">
                        <div className="w-1.5 h-12 bg-gray-400 rounded-full"></div>
                        <div className="flex items-center gap-3 flex-grow">
                          <div className="flex size-7 items-center justify-center">
                            <input 
                              checked={task.completed_at !== null}
                              onChange={() => toggleTask(task.id)}
                              className="h-6 w-6 rounded-md border-gray-400 dark:border-gray-500 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none" 
                              type="checkbox"
                            />
                          </div>
                          <div className="flex flex-col justify-center">
                            <p className="text-gray-800 dark:text-white text-base font-medium leading-normal line-clamp-1 line-through">{task.title}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">
                              {task.description || getDueDateText(task.due_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>
          </>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-28 right-1/2 translate-x-1/2 z-50">
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 h-14 w-auto px-6 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-200"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Neue Aufgabe</span>
        </button>
      </div>

      {/* Create Task Modal */}
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
                Neue Aufgabe
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

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="z.B. Design-Meeting vorbereiten"
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
                  placeholder="Optional: Beschreibung der Aufgabe"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Priorität *
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  {formData.is_recurring ? 'Startdatum *' : 'Fälligkeitsdatum'}
                </label>
                <input
                  type="datetime-local"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  required={formData.is_recurring}
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Recurring Checkbox */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                    className="w-5 h-5 rounded border-border-light dark:border-border-dark text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                    Wiederholend
                  </span>
                </label>
              </div>

              {/* Recurring Options - Only show if is_recurring is true */}
              {formData.is_recurring && (
                <>
                  {/* Recurrence Interval */}
                  <div>
                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                      Rhythmus (in Wochen) *
                    </label>
                    <input
                      type="number"
                      name="recurrence_interval_weeks"
                      value={formData.recurrence_interval_weeks}
                      onChange={handleInputChange}
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Recurrence End Date */}
                  <div>
                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                      Letztes Datum *
                    </label>
                    <input
                      type="datetime-local"
                      name="recurrence_end_date"
                      value={formData.recurrence_end_date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </>
              )}

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
    </div>
  )
}

export default TodoList
