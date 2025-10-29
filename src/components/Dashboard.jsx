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
        setHabits(habitsData)
        setTasks(tasksData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleHabitToggle = async (habitId) => {
    try {
      await habitsAPI.completeHabit(habitId)
      // Reload habits to update completion status
      const updatedHabits = await habitsAPI.getHabits()
      setHabits(updatedHabits)
    } catch (error) {
      console.error('Failed to complete habit:', error)
    }
  }

  const handleTaskToggle = async (taskId) => {
    try {
      await tasksAPI.completeTask(taskId)
      // Reload tasks to update completion status
      const updatedTasks = await tasksAPI.getTasks()
      setTasks(updatedTasks)
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const todayTasks = tasks.filter(task => {
    if (!task.due_date) return false
    const today = new Date().toDateString()
    const dueDate = new Date(task.due_date).toDateString()
    return dueDate === today
  })

  const completedToday = habits.filter(habit => {
    // This would need to be implemented based on your habit completion logic
    return false // Placeholder
  })

  const progressPercentage = habits.length > 0 ? Math.round((completedToday.length / habits.length) * 100) : 0

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
            {habits.slice(0, 3).map(habit => (
              <label key={habit.id} className="flex gap-x-4 py-3.5 items-center justify-between">
                <p className="text-text-light-primary dark:text-text-dark-primary text-base font-normal leading-normal">{habit.name}</p>
                <input 
                  onChange={() => handleHabitToggle(habit.id)}
                  className="h-6 w-6 rounded-lg border-2 border-border-light dark:border-border-dark bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-primary/50 focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-light dark:focus:ring-offset-card-dark" 
                  type="checkbox"
                />
              </label>
            ))}
            {habits.length === 0 && (
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
            {habits.slice(0, 2).map(habit => (
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
            {habits.length === 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm">
                Erstelle deine ersten Gewohnheiten, um deine Ziele zu verfolgen.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card-light/80 dark:bg-card-dark/80 backdrop-blur-lg border-t border-border-light dark:border-border-dark h-20">
        <div className="flex justify-around items-center h-full max-w-md mx-auto">
          <Link to="/" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined">home</span>
            <span className="text-xs font-bold">Home</span>
          </Link>
          <Link to="/habits" className="flex flex-col items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
            <span className="material-symbols-outlined">flag</span>
            <span className="text-xs font-medium">Ziele</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary relative -top-6">
            <div className="bg-primary rounded-full h-16 w-16 flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-4xl">add</span>
            </div>
          </button>
          <Link to="/journal" className="flex flex-col items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
            <span className="material-symbols-outlined">edit_square</span>
            <span className="text-xs font-medium">Journal</span>
          </Link>
          <Link to="/coach" className="flex flex-col items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-xs font-medium">Coach</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}

export default Dashboard
