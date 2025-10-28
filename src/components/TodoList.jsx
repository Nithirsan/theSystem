import React, { useState } from 'react'

const TodoList = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Design-Meeting vorbereiten',
      description: 'Fällig: 14:00 Uhr',
      priority: 'high',
      completed: false,
      dueDate: 'today'
    },
    {
      id: 2,
      title: 'Wöchentlichen Bericht fertigstellen',
      description: 'Fällig: Heute',
      priority: 'medium',
      completed: false,
      dueDate: 'today'
    },
    {
      id: 3,
      title: 'Yoga-Session planen',
      description: 'Fällig: Morgen',
      priority: 'low',
      completed: false,
      dueDate: 'tomorrow'
    },
    {
      id: 4,
      title: 'Konzept für neues Projekt',
      description: 'Erledigt: Gestern',
      priority: 'medium',
      completed: true,
      dueDate: 'completed'
    }
  ])

  const [activeFilter, setActiveFilter] = useState('all')
  const [showCompleted, setShowCompleted] = useState(false)

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low'
    }
    return colors[priority] || 'priority-medium'
  }

  const getTasksByDate = (dueDate) => {
    return tasks.filter(task => task.dueDate === dueDate)
  }

  const completedTasks = tasks.filter(task => task.completed)

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
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

      <div className="px-4 flex-grow pb-24">
        {/* Today's Tasks */}
        <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] py-4">Heute</h3>
        <div className="flex flex-col gap-3">
          {getTasksByDate('today').map(task => (
            <div key={task.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className={`w-1.5 h-12 bg-${getPriorityColor(task.priority)} rounded-full`}></div>
              <div className="flex items-center gap-3 flex-grow">
                <div className="flex size-7 items-center justify-center">
                  <input 
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="h-6 w-6 rounded-md border-gray-400 dark:border-gray-500 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none" 
                    type="checkbox"
                  />
                </div>
                <div className="flex flex-col justify-center flex-grow">
                  <p className={`text-gray-800 dark:text-white text-base font-medium leading-normal line-clamp-1 ${
                    task.completed ? 'line-through' : ''
                  }`}>{task.title}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">{task.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tomorrow's Tasks */}
        <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pt-6 pb-4">Morgen</h3>
        <div className="flex flex-col gap-3">
          {getTasksByDate('tomorrow').map(task => (
            <div key={task.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className={`w-1.5 h-12 bg-${getPriorityColor(task.priority)} rounded-full`}></div>
              <div className="flex items-center gap-3 flex-grow">
                <div className="flex size-7 items-center justify-center">
                  <input 
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="h-6 w-6 rounded-md border-gray-400 dark:border-gray-500 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none" 
                    type="checkbox"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p className={`text-gray-800 dark:text-white text-base font-medium leading-normal line-clamp-1 ${
                    task.completed ? 'line-through' : ''
                  }`}>{task.title}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">{task.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

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
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          className="h-6 w-6 rounded-md border-gray-400 dark:border-gray-500 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none" 
                          type="checkbox"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-gray-800 dark:text-white text-base font-medium leading-normal line-clamp-1 line-through">{task.title}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">{task.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </details>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </div>
  )
}

export default TodoList
