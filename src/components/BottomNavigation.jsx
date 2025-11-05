import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const BottomNavigation = () => {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  const getLinkClasses = (path) => {
    const active = isActive(path)
    return `flex flex-col items-center gap-1 ${
      active 
        ? 'text-primary' 
        : 'text-text-light-secondary dark:text-text-dark-secondary'
    }`
  }

  const getTextClasses = (path) => {
    const active = isActive(path)
    return `text-xs ${active ? 'font-bold' : 'font-medium'}`
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-light/80 dark:bg-card-dark/80 backdrop-blur-lg border-t border-border-light dark:border-border-dark h-20 z-40">
      <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
        <Link to="/" className={getLinkClasses('/')}>
          <span className="material-symbols-outlined">home</span>
          <span className={getTextClasses('/')}>Home</span>
        </Link>
        <Link to="/habits" className={getLinkClasses('/habits')}>
          <span className="material-symbols-outlined">flag</span>
          <span className={getTextClasses('/habits')}>Gewohnheiten</span>
        </Link>
        <Link to="/todos" className={getLinkClasses('/todos')}>
          <span className="material-symbols-outlined">checklist</span>
          <span className={getTextClasses('/todos')}>Todos</span>
        </Link>
        <Link to="/journal" className={getLinkClasses('/journal')}>
          <span className="material-symbols-outlined">edit_square</span>
          <span className={getTextClasses('/journal')}>Journal</span>
        </Link>
        <Link to="/team" className={getLinkClasses('/team')}>
          <span className="material-symbols-outlined">groups</span>
          <span className={getTextClasses('/team')}>Team</span>
        </Link>
        <Link to="/coach" className={getLinkClasses('/coach')}>
          <span className="material-symbols-outlined">smart_toy</span>
          <span className={getTextClasses('/coach')}>Coach</span>
        </Link>
      </div>
    </nav>
  )
}

export default BottomNavigation

