import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import HabitTracker from './components/HabitTracker'
import AICoach from './components/AICoach'
import TodoList from './components/TodoList'
import Journal from './components/Journal'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to dark mode
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Router>
      <div className="bg-background-light dark:bg-background-dark font-display min-h-screen">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-card-light dark:bg-card-dark shadow-lg hover:shadow-xl transition-all duration-200"
          aria-label="Toggle dark mode"
        >
          <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<HabitTracker />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="/todos" element={<TodoList />} />
          <Route path="/journal" element={<Journal />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App