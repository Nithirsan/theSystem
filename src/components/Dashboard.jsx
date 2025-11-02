import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { habitsAPI, tasksAPI } from '../services/api'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [habits, setHabits] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

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
