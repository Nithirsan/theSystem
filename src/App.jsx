import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './components/Dashboard'
import HabitTracker from './components/HabitTracker'
import AICoach from './components/AICoach'
import TodoList from './components/TodoList'
import Journal from './components/Journal'
import Team from './components/Team'
import AuthPage from './components/AuthPage'
import BottomNavigation from './components/BottomNavigation'

function AppContent() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          <p className="mt-4 text-text-light-secondary dark:text-text-dark-secondary">Lade...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen">
      {/* Dark Mode Toggle */}
      <button
        onClick={() => {
          const newDarkMode = !document.documentElement.classList.contains('dark')
          if (newDarkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
          } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
          }
        }}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-card-light dark:bg-card-dark shadow-lg hover:shadow-xl transition-all duration-200"
        aria-label="Toggle dark mode"
      >
        <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">
          {document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habits" element={<HabitTracker />} />
        <Route path="/coach" element={<AICoach />} />
        <Route path="/todos" element={<TodoList />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/team" element={<Team />} />
      </Routes>
      
      {/* Bottom Navigation Bar - visible on all authenticated pages */}
      <BottomNavigation />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App