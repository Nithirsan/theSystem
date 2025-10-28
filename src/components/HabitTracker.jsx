import React, { useState } from 'react'

const HabitTracker = () => {
  const [activeTab, setActiveTab] = useState('today')
  const [habits, setHabits] = useState([
    { id: 1, name: 'Meditieren', category: 'morning', completed: true, streak: '3/7' },
    { id: 2, name: '10 Minuten lesen', category: 'morning', completed: false, streak: '5/7' },
    { id: 3, name: 'Wasser trinken', category: 'afternoon', completed: true, streak: '6/7' },
    { id: 4, name: 'Tagebuch schreiben', category: 'evening', completed: false, streak: '2/7' }
  ])

  const toggleHabit = (id) => {
    setHabits(habits.map(habit => 
      habit.id === id ? { ...habit, completed: !habit.completed } : habit
    ))
  }

  const getHabitsByCategory = (category) => {
    return habits.filter(habit => habit.category === category)
  }

  const getIconForHabit = (name) => {
    const icons = {
      'Meditieren': 'self_improvement',
      '10 Minuten lesen': 'auto_stories',
      'Wasser trinken': 'water_drop',
      'Tagebuch schreiben': 'edit_note'
    }
    return icons[name] || 'check_circle'
  }

  const getColorForHabit = (name) => {
    const colors = {
      'Meditieren': 'primary',
      '10 Minuten lesen': 'secondary',
      'Wasser trinken': 'primary',
      'Tagebuch schreiben': 'accent'
    }
    return colors[name] || 'primary'
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col mx-auto max-w-lg pb-24">
      {/* Top App Bar */}
      <header className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex size-12 shrink-0 items-center justify-start">
          {/* Placeholder for a menu icon if needed */}
        </div>
        <h1 className="text-lg font-bold">Meine Gewohnheiten</h1>
        <div className="flex w-12 items-center justify-end">
          <button className="flex cursor-pointer items-center justify-center rounded-full h-10 w-10 text-text-light-primary dark:text-dark-primary">
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
                : 'border-b-transparent text-text-light-secondary dark:text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Heute</p>
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'all' 
                ? 'border-b-primary text-primary' 
                : 'border-b-transparent text-text-light-secondary dark:text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Alle</p>
          </button>
          <button 
            onClick={() => setActiveTab('weekly')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'weekly' 
                ? 'border-b-primary text-primary' 
                : 'border-b-transparent text-text-light-secondary dark:text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Wöchentlich</p>
          </button>
        </div>
      </nav>

      <main className="flex-grow px-4">
        {/* Morning Habits */}
        <h2 className="text-lg font-bold leading-tight pt-6 pb-2">Morgens</h2>
        {getHabitsByCategory('morning').map(habit => (
          <div key={habit.id} className="flex items-center gap-4 bg-background-light dark:bg-background-dark py-2">
            <div className="flex items-center gap-4 flex-grow">
              <div className={`text-white flex items-center justify-center rounded-lg bg-${getColorForHabit(habit.name)}/30 shrink-0 size-12`}>
                <span className={`material-symbols-outlined text-${getColorForHabit(habit.name)} text-3xl`}>
                  {getIconForHabit(habit.name)}
                </span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-base font-medium">{habit.name}</p>
                <p className="text-text-light-secondary dark:text-dark-secondary text-sm font-normal">{habit.streak} mal diese Woche</p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button 
                onClick={() => toggleHabit(habit.id)}
                className={`flex size-10 items-center justify-center rounded-full ${
                  habit.completed 
                    ? `bg-${getColorForHabit(habit.name)}/20 text-${getColorForHabit(habit.name)}` 
                    : 'border-2 border-slate-300 dark:border-slate-600'
                }`}
              >
                {habit.completed && <span className="material-symbols-outlined">done</span>}
              </button>
            </div>
          </div>
        ))}

        {/* Afternoon Habits */}
        <h2 className="text-lg font-bold leading-tight pt-6 pb-2">Mittags</h2>
        {getHabitsByCategory('afternoon').map(habit => (
          <div key={habit.id} className="flex items-center gap-4 bg-background-light dark:bg-background-dark py-2">
            <div className="flex items-center gap-4 flex-grow">
              <div className={`text-white flex items-center justify-center rounded-lg bg-${getColorForHabit(habit.name)}/30 shrink-0 size-12`}>
                <span className={`material-symbols-outlined text-${getColorForHabit(habit.name)} text-3xl`}>
                  {getIconForHabit(habit.name)}
                </span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-base font-medium">{habit.name}</p>
                <p className="text-text-light-secondary dark:text-dark-secondary text-sm font-normal">{habit.streak} mal diese Woche</p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button 
                onClick={() => toggleHabit(habit.id)}
                className={`flex size-10 items-center justify-center rounded-full ${
                  habit.completed 
                    ? `bg-${getColorForHabit(habit.name)}/20 text-${getColorForHabit(habit.name)}` 
                    : 'border-2 border-slate-300 dark:border-slate-600'
                }`}
              >
                {habit.completed && <span className="material-symbols-outlined">done</span>}
              </button>
            </div>
          </div>
        ))}

        {/* Evening Habits */}
        <h2 className="text-lg font-bold leading-tight pt-6 pb-2">Abends</h2>
        {getHabitsByCategory('evening').map(habit => (
          <div key={habit.id} className="flex items-center gap-4 bg-background-light dark:bg-background-dark py-2">
            <div className="flex items-center gap-4 flex-grow">
              <div className={`text-white flex items-center justify-center rounded-lg bg-${getColorForHabit(habit.name)}/30 shrink-0 size-12`}>
                <span className={`material-symbols-outlined text-${getColorForHabit(habit.name)} text-3xl`}>
                  {getIconForHabit(habit.name)}
                </span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-base font-medium">{habit.name}</p>
                <p className="text-text-light-secondary dark:text-dark-secondary text-sm font-normal">{habit.streak} mal diese Woche</p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button 
                onClick={() => toggleHabit(habit.id)}
                className={`flex size-10 items-center justify-center rounded-full ${
                  habit.completed 
                    ? `bg-${getColorForHabit(habit.name)}/20 text-${getColorForHabit(habit.name)}` 
                    : 'border-2 border-slate-300 dark:border-slate-600'
                }`}
              >
                {habit.completed && <span className="material-symbols-outlined">done</span>}
              </button>
            </div>
          </div>
        ))}

        {/* Progress Visualization Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold leading-tight mb-4">Dein Fortschritt</h2>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Wochenübersicht</h3>
              <span className="text-sm text-text-light-secondary dark:text-dark-secondary">Diese Woche</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <p className={`text-xs ${index === 4 ? 'font-bold text-primary' : 'text-text-light-secondary dark:text-dark-secondary'}`}>
                    {day}
                  </p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < 4 ? 'bg-secondary text-white' : 
                    index === 4 ? 'border-2 border-primary' : 
                    'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    {(index < 4 || index === 4) && <span className="material-symbols-outlined text-base">done</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-around">
              <div className="text-center">
                <p className="text-xl font-bold text-accent">3 <span className="text-sm font-normal">Tage</span></p>
                <p className="text-xs text-text-light-secondary dark:text-dark-secondary">Aktueller Streak</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">12 <span className="text-sm font-normal">Tage</span></p>
                <p className="text-xs text-text-light-secondary dark:text-dark-secondary">Bester Streak</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-1/2 translate-x-1/2">
        <button className="flex items-center justify-center gap-2 h-14 w-auto px-6 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-200">
          <span className="material-symbols-outlined">add</span>
          <span>Neue Gewohnheit</span>
        </button>
      </div>
    </div>
  )
}

export default HabitTracker
