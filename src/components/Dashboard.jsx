import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { habitsAPI, tasksAPI } from '../services/api'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [habits, setHabits] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  })
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [habitsData, tasksData] = await Promise.all([
          habitsAPI.getHabits(),
          tasksAPI.getTasks()
        ])
        // Ensure arrays are never null/undefined
        setHabits(Array.isArray(habitsData) ? habitsData : [])
        setTasks(Array.isArray(tasksData) ? tasksData : [])
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        // Set to empty arrays on error to prevent null errors
        setHabits([])
        setTasks([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleHabitToggle = async (habitId, e) => {
    // Prevent default checkbox behavior - we handle it manually
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Ensure habitId is a number
    const id = typeof habitId === 'string' ? parseInt(habitId, 10) : habitId
    
    if (isNaN(id)) {
      console.error('Invalid habit ID:', habitId)
      alert('Ungültige Gewohnheits-ID')
      return
    }
    
    try {
      console.log('Toggling habit:', id, 'Type:', typeof id)
      // Make API call to toggle completion
      const result = await habitsAPI.completeHabit(id)
      console.log('Habit toggle API response:', result)
      
      // Reload habits to get updated completion status from server
      const updatedHabits = await habitsAPI.getHabits()
      console.log('Updated habits from server:', updatedHabits)
      
      // Check if the habit we toggled is in the updated list
      const toggledHabit = updatedHabits.find(h => h.id === id)
      console.log('Toggled habit in updated list:', toggledHabit)
      
      setHabits(updatedHabits)
      // Progress bar will update automatically based on the new habits state
    } catch (error) {
      console.error('Failed to complete habit:', error)
      // Show user-friendly error message
      const errorMessage = error.message || 'Unbekannter Fehler'
      alert(`Fehler beim Markieren der Gewohnheit: ${errorMessage}`)
    }
  }

  const handleTaskToggle = async (taskId) => {
    try {
      await tasksAPI.completeTask(taskId)
      // Reload tasks to update completion status
      const updatedTasks = await tasksAPI.getTasks()
      setTasks(updatedTasks)
      // Reload will also update progress bar automatically
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  // Safely filter with null checks
  const todayTasks = (tasks || []).filter(task => {
    if (!task || !task.due_date) return false
    const today = new Date().toDateString()
    const dueDate = new Date(task.due_date).toDateString()
    return dueDate === today
  })

  // Calculate completed habits today
  const completedHabitsToday = (habits || []).filter(habit => habit.completed_today === true).length
  
  // Calculate completed tasks today
  const completedTasksToday = (todayTasks || []).filter(task => task.completed_at !== null).length
  
  // Total items for today (habits + tasks due today)
  const totalItemsToday = (habits || []).length + todayTasks.length
  
  // Calculate progress percentage
  const completedItemsToday = completedHabitsToday + completedTasksToday
  const progressPercentage = totalItemsToday > 0 
    ? Math.round((completedItemsToday / totalItemsToday) * 100) 
    : 0

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    // Adjust for Monday as first day (0 = Monday, 6 = Sunday)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1
    
    return { daysInMonth, startingDayOfWeek: adjustedStartingDay }
  }

  const getTasksForDate = (date) => {
    if (!date || !tasks) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDateStr = new Date(task.due_date).toISOString().split('T')[0]
      return taskDateStr === dateStr && task.completed_at === null
    })
  }

  const getAllTasksForDate = (date) => {
    if (!date || !tasks) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDateStr = new Date(task.due_date).toISOString().split('T')[0]
      return taskDateStr === dateStr
    })
  }

  const getTaskCountForDate = (date) => {
    return getTasksForDate(date).length
  }

  const getHighPriorityTasksForDate = (date) => {
    return getTasksForDate(date).filter(task => task.priority === 'high').length
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSameMonth = (date1, date2) => {
    return date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear()
  }

  const handleDayClick = (date) => {
    // Tag auswählen
    setSelectedDate(date)
    // Datum für das Formular setzen (mit Uhrzeit 00:00)
    const dateStr = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 16)
    setTaskFormData(prev => ({
      ...prev,
      due_date: dateStr
    }))
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setTaskError('')
    
    if (!taskFormData.title.trim()) {
      setTaskError('Bitte gib einen Titel für die Aufgabe ein')
      return
    }

    setIsSavingTask(true)
    try {
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        priority: taskFormData.priority,
        due_date: taskFormData.due_date ? new Date(taskFormData.due_date).toISOString() : null,
        is_recurring: false
      }
      
      await tasksAPI.createTask(taskData)
      
      // Reload tasks
      const updatedTasks = await tasksAPI.getTasks()
      setTasks(updatedTasks)
      
      // Reset form and close modal
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: selectedDate ? selectedDate.toISOString().slice(0, 16) : ''
      })
      setShowTaskModal(false)
      setSelectedDate(null)
    } catch (error) {
      console.error('Failed to create task:', error)
      setTaskError(error.message || 'Fehler beim Erstellen der Aufgabe')
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatDateForDisplay = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          <p className="mt-4 text-text-light-secondary dark:text-text-dark-secondary">Lade Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden pb-28">
      {/* Top App Bar */}
      <header className="flex items-center p-4 pt-6 justify-between bg-background-light dark:bg-background-dark sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary text-3xl">partly_cloudy_day</span>
          <h1 className="text-text-light-primary dark:text-text-dark-primary text-xl font-bold leading-tight tracking-[-0.015em]">
            Guten Morgen, {user?.name || 'User'}!
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={logout}
            className="text-text-light-secondary dark:text-text-dark-secondary text-sm"
          >
            Abmelden
          </button>
          <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-card-light dark:bg-card-dark text-text-light-primary dark:text-text-dark-primary shadow-sm">
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4">
        {/* Daily Progress Card */}
        <div className="flex flex-col gap-3 p-5 bg-card-light dark:bg-card-dark rounded-xl shadow-sm">
          <div className="flex gap-6 justify-between items-center">
            <p className="text-text-light-primary dark:text-text-dark-primary text-base font-bold">Tagesfortschritt</p>
            <p className="text-primary text-base font-bold">{progressPercentage}%</p>
          </div>
          <div className="rounded-full bg-background-light dark:bg-background-dark h-2.5">
            <div className="h-2.5 rounded-full bg-primary" style={{width: `${progressPercentage}%`}}></div>
          </div>
          <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-normal leading-normal">Du schaffst das!</p>
        </div>

        {/* Calendar Card */}
        <div className="flex flex-col gap-3 bg-card-light dark:bg-card-dark rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold leading-tight tracking-[-0.015em]">Kalender</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>
          </div>
          <p className="text-text-light-primary dark:text-text-dark-primary text-sm font-medium capitalize">
            {formatMonthYear(currentDate)}
          </p>
          
          {/* Calendar Grid */}
          <div className="w-full">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, idx) => (
                <div key={idx} className="text-center text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
                const year = currentDate.getFullYear()
                const month = currentDate.getMonth()
                
                // Empty cells for days before month starts
                const emptyCells = []
                for (let i = 0; i < startingDayOfWeek; i++) {
                  emptyCells.push(
                    <div key={`empty-${i}`} className="aspect-square"></div>
                  )
                }
                
                // Days of the month
                const dayCells = []
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day)
                  const taskCount = getTaskCountForDate(date)
                  const highPriorityCount = getHighPriorityTasksForDate(date)
                  const dateIsToday = isToday(date)
                  
                  dayCells.push(
                    <button
                      type="button"
                      onClick={() => handleDayClick(date)}
                      className={`aspect-square flex flex-col items-center justify-start p-1 rounded-lg border transition-colors cursor-pointer ${
                        dateIsToday
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : selectedDate && selectedDate.toDateString() === date.toDateString()
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-transparent hover:bg-background-light dark:hover:bg-background-dark'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          dateIsToday
                            ? 'text-primary'
                            : isSameMonth(date, currentDate)
                              ? 'text-text-light-primary dark:text-text-dark-primary'
                              : 'text-text-light-secondary dark:text-text-dark-secondary opacity-50'
                        }`}
                      >
                        {day}
                      </span>
                      {taskCount > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center">
                          {highPriorityCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          )}
                          {taskCount > highPriorityCount && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          )}
                          {taskCount > 2 && (
                            <span className="text-[8px] text-text-light-secondary dark:text-text-dark-secondary font-bold">
                              +{taskCount - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                }
                
                return [...emptyCells, ...dayCells]
              })()}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 border-t border-border-light dark:border-border-dark">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Hoch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Aufgabe</span>
            </div>
            <Link to="/todos" className="text-xs text-primary font-medium ml-auto">
              Alle Todos →
            </Link>
          </div>
        </div>

        {/* Selected Day Todos */}
        {selectedDate && !showTaskModal && (() => {
          const dayTasks = getAllTasksForDate(selectedDate)
          const pendingTasks = dayTasks.filter(task => !task.completed_at)
          const completedTasks = dayTasks.filter(task => task.completed_at)
          
          return (
            <>
              {/* Selected Day Todo Button */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span>Todo für {formatDateForDisplay(selectedDate)} erstellen</span>
                </button>
              </div>

              {/* Tasks for Selected Day */}
              <div className="flex flex-col gap-2 bg-card-light dark:bg-card-dark rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold leading-tight tracking-[-0.015em]">
                    Aufgaben für {formatDateForDisplay(selectedDate)}
                  </h3>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {pendingTasks.length} offen
                    {completedTasks.length > 0 && `, ${completedTasks.length} erledigt`}
                  </span>
                </div>

                {dayTasks.length === 0 ? (
                  <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm py-4 text-center">
                    Noch keine Aufgaben für diesen Tag.
                  </p>
                ) : (
                  <div className="divide-y divide-border-light dark:divide-border-dark">
                    {/* Pending Tasks */}
                    {pendingTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-3">
                        <div className={`w-1 h-12 rounded-full ${
                          task.priority === 'high' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></div>
                        <div className="flex items-center gap-3 flex-grow">
                          <div className="flex size-7 items-center justify-center">
                            <input 
                              checked={false}
                              onChange={() => handleTaskToggle(task.id)}
                              className="h-6 w-6 rounded-lg border-2 border-border-light dark:border-border-dark bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-primary/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-light dark:focus:ring-offset-card-dark cursor-pointer" 
                              type="checkbox"
                            />
                          </div>
                          <div className="flex flex-col justify-center flex-grow">
                            <p className="text-text-light-primary dark:text-text-dark-primary text-base font-medium leading-normal">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-normal leading-normal">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                            task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                            'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          }`}>
                            {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                      <>
                        <div className="py-2">
                          <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                            Erledigt ({completedTasks.length})
                          </p>
                        </div>
                        {completedTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 py-3 opacity-60">
                            <div className="w-1 h-12 rounded-full bg-gray-400"></div>
                            <div className="flex items-center gap-3 flex-grow">
                              <div className="flex size-7 items-center justify-center">
                                <input 
                                  checked={true}
                                  onChange={() => handleTaskToggle(task.id)}
                                  className="h-6 w-6 rounded-lg border-2 border-border-light dark:border-border-dark bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-primary/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-light dark:focus:ring-offset-card-dark cursor-pointer" 
                                  type="checkbox"
                                />
                              </div>
                              <div className="flex flex-col justify-center flex-grow">
                                <p className="text-text-light-primary dark:text-text-dark-primary text-base font-medium leading-normal line-through">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm font-normal leading-normal line-through">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )
        })()}

        {/* Create Task Modal */}
        {showTaskModal && selectedDate && (
          <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowTaskModal(false)
              setSelectedDate(null)
            }}
          >
            <div 
              className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Neue Aufgabe für {formatDateForDisplay(selectedDate)}
                </h2>
                <button
                  onClick={() => {
                    setShowTaskModal(false)
                    setSelectedDate(null)
                  }}
                  className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-6 space-y-6">
                {taskError && (
                  <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                    {taskError}
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
                    value={taskFormData.title}
                    onChange={handleTaskInputChange}
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
                    value={taskFormData.description}
                    onChange={handleTaskInputChange}
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
                    value={taskFormData.priority}
                    onChange={handleTaskInputChange}
                    required
                    className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="high">Hoch</option>
                    <option value="medium">Mittel</option>
                    <option value="low">Niedrig</option>
                  </select>
                </div>

                {/* Due Date (pre-filled, but editable) */}
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    Fälligkeitsdatum
                  </label>
                  <input
                    type="datetime-local"
                    name="due_date"
                    value={taskFormData.due_date}
                    onChange={handleTaskInputChange}
                    className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskModal(false)
                      setSelectedDate(null)
                    }}
                    className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTask || !taskFormData.title.trim()}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingTask ? 'Wird erstellt...' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Today's Habits Card */}
        <div className="flex flex-col gap-2 bg-card-light dark:bg-card-dark rounded-xl p-5 shadow-sm">
          <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold leading-tight tracking-[-0.015em] pb-2">Heutige Gewohnheiten</h3>
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {(habits || []).slice(0, 3).map(habit => (
              <div key={habit.id} className="flex gap-x-4 py-3.5 items-center justify-between">
                <p className="text-text-light-primary dark:text-text-dark-primary text-base font-normal leading-normal">{habit.name}</p>
                <input 
                  checked={habit.completed_today === true}
                  onChange={(e) => {
                    console.log('Checkbox onChange triggered for habit:', habit.id, 'Current state:', habit.completed_today)
                    handleHabitToggle(habit.id, e)
                  }}
                  onClick={(e) => {
                    console.log('Checkbox onClick triggered for habit:', habit.id)
                    e.stopPropagation()
                  }}
                  className="h-6 w-6 rounded-lg border-2 border-border-light dark:border-border-dark bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-primary/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-light dark:focus:ring-offset-card-dark cursor-pointer appearance-none checked:appearance-auto" 
                  type="checkbox"
                  disabled={false}
                />
              </div>
            ))}
            {(habits || []).length === 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm py-3.5">
                Noch keine Gewohnheiten erstellt. <Link to="/habits" className="text-primary">Erste Gewohnheit hinzufügen</Link>
              </p>
            )}
          </div>
        </div>

        {/* Today's To-Dos Card */}
        <div className="flex flex-col gap-2 bg-card-light dark:bg-card-dark rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold leading-tight tracking-[-0.015em]">Heutige Aufgaben</h3>
            <Link to="/todos" className="text-primary text-sm font-bold">Alle ansehen</Link>
          </div>
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {todayTasks.slice(0, 3).map(task => (
              <label key={task.id} className="flex gap-x-4 py-3.5 items-center justify-between">
                <p className={`text-text-light-primary dark:text-text-dark-primary text-base font-normal leading-normal ${task.completed_at ? 'line-through text-text-light-secondary dark:text-text-dark-secondary' : ''}`}>
                  {task.title}
                </p>
                <input 
                  checked={!!task.completed_at}
                  onChange={() => handleTaskToggle(task.id)}
                  className="h-6 w-6 rounded-lg border-2 border-border-light dark:border-border-dark bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-primary/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-light dark:focus:ring-offset-card-dark" 
                  type="checkbox"
                />
              </label>
            ))}
            {todayTasks.length === 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm py-3.5">
                Keine Aufgaben für heute. <Link to="/todos" className="text-primary">Neue Aufgabe hinzufügen</Link>
              </p>
            )}
          </div>
        </div>

        {/* Active Goals Card */}
        <div className="flex flex-col gap-4 bg-card-light dark:bg-card-dark rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold leading-tight tracking-[-0.015em]">Zielfokus</h3>
            <Link to="/habits" className="text-primary text-sm font-bold">Details</Link>
          </div>
          <div className="flex flex-col gap-4">
            {(habits || []).slice(0, 2).map(habit => (
              <div key={habit.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-text-light-primary dark:text-text-dark-primary text-base font-medium">{habit.name}</p>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">0%</p>
                </div>
                <div className="rounded-full bg-background-light dark:bg-background-dark h-2">
                  <div className="h-2 rounded-full bg-primary" style={{width: '0%'}}></div>
                </div>
              </div>
            ))}
            {(habits || []).length === 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                Erstelle deine ersten Gewohnheiten, um deine Ziele zu verfolgen.
              </p>
            )}
          </div>
        </div>
      </main>

    </div>
  )
}

export default Dashboard
