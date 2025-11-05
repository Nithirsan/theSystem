import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const Team = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('goals')
  const [goals, setGoals] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    target_date: '',
    target_value: '',
    unit: ''
  })
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    email: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState({})

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      // Load from localStorage (mock data for now)
      const storedGoals = localStorage.getItem('team_goals')
      const storedMembers = localStorage.getItem('team_members')
      const storedActivities = localStorage.getItem('team_activities')

      if (storedGoals) {
        setGoals(JSON.parse(storedGoals))
      } else {
        // Initialize with sample goals
        const sampleGoals = [
          {
            id: 1,
            title: '10.000 Schritte täglich',
            description: 'Unser Team möchte gemeinsam 30 Tage lang jeden Tag 10.000 Schritte gehen',
            created_by: user?.name || 'Du',
            created_at: new Date().toISOString(),
            target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            target_value: 300000,
            current_value: 125000,
            unit: 'Schritte',
            members: ['Du', 'Anna', 'Max'],
            comments: [
              { id: 1, author: 'Anna', text: 'Gestern geschafft! 💪', time: 'vor 2 Stunden' },
              { id: 2, author: 'Max', text: 'Bin dabei!', time: 'vor 5 Stunden' }
            ],
            likes: 5
          },
          {
            id: 2,
            title: 'Bücher lesen',
            description: 'Jeder liest 4 Bücher diesen Monat',
            created_by: user?.name || 'Du',
            created_at: new Date().toISOString(),
            target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            target_value: 12,
            current_value: 7,
            unit: 'Bücher',
            members: ['Du', 'Anna', 'Max', 'Lisa'],
            comments: [
              { id: 3, author: 'Lisa', text: 'Habe gerade mein 2. Buch beendet!', time: 'vor 1 Stunde' }
            ],
            likes: 8
          }
        ]
        setGoals(sampleGoals)
        localStorage.setItem('team_goals', JSON.stringify(sampleGoals))
      }

      if (storedMembers) {
        setTeamMembers(JSON.parse(storedMembers))
      } else {
        // Initialize with sample members
        const sampleMembers = [
          { id: 1, name: 'Anna', email: 'anna@example.com', avatar: 'A', joined: '2024-01-15', goals_completed: 12 },
          { id: 2, name: 'Max', email: 'max@example.com', avatar: 'M', joined: '2024-01-10', goals_completed: 8 },
          { id: 3, name: 'Lisa', email: 'lisa@example.com', avatar: 'L', joined: '2024-01-20', goals_completed: 15 }
        ]
        setTeamMembers(sampleMembers)
        localStorage.setItem('team_members', JSON.stringify(sampleMembers))
      }

      if (storedActivities) {
        setActivities(JSON.parse(storedActivities))
      } else {
        // Initialize with sample activities
        const sampleActivities = [
          { id: 1, type: 'goal_created', user: 'Anna', goal: '10.000 Schritte täglich', time: 'vor 2 Tagen' },
          { id: 2, type: 'goal_progress', user: 'Max', goal: '10.000 Schritte täglich', progress: 75, time: 'vor 1 Tag' },
          { id: 3, type: 'goal_completed', user: 'Lisa', goal: 'Bücher lesen', time: 'vor 3 Tagen' },
          { id: 4, type: 'member_joined', user: 'Tom', time: 'vor 5 Tagen' }
        ]
        setActivities(sampleActivities)
        localStorage.setItem('team_activities', JSON.stringify(sampleActivities))
      }
    } catch (error) {
      console.error('Failed to load team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async (e) => {
    e.preventDefault()
    setError('')

    if (!goalFormData.title.trim()) {
      setError('Bitte gib einen Titel für das Ziel ein')
      return
    }

    setIsSaving(true)
    try {
      const newGoal = {
        id: Date.now(),
        title: goalFormData.title,
        description: goalFormData.description,
        created_by: user?.name || 'Du',
        created_at: new Date().toISOString(),
        target_date: goalFormData.target_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        target_value: parseInt(goalFormData.target_value) || 100,
        current_value: 0,
        unit: goalFormData.unit || '',
        members: [user?.name || 'Du'],
        comments: [],
        likes: 0
      }

      const updatedGoals = [...goals, newGoal]
      setGoals(updatedGoals)
      localStorage.setItem('team_goals', JSON.stringify(updatedGoals))

      // Add activity
      const newActivity = {
        id: Date.now(),
        type: 'goal_created',
        user: user?.name || 'Du',
        goal: goalFormData.title,
        time: 'gerade eben'
      }
      const updatedActivities = [newActivity, ...activities]
      setActivities(updatedActivities)
      localStorage.setItem('team_activities', JSON.stringify(updatedActivities))

      // Reset form
      setGoalFormData({
        title: '',
        description: '',
        target_date: '',
        target_value: '',
        unit: ''
      })
      setShowGoalModal(false)
    } catch (error) {
      console.error('Failed to create goal:', error)
      setError(error.message || 'Fehler beim Erstellen des Ziels')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setError('')

    if (!memberFormData.name.trim() || !memberFormData.email.trim()) {
      setError('Bitte fülle alle Felder aus')
      return
    }

    setIsSaving(true)
    try {
      const newMember = {
        id: Date.now(),
        name: memberFormData.name,
        email: memberFormData.email,
        avatar: memberFormData.name.charAt(0).toUpperCase(),
        joined: new Date().toISOString(),
        goals_completed: 0
      }

      const updatedMembers = [...teamMembers, newMember]
      setTeamMembers(updatedMembers)
      localStorage.setItem('team_members', JSON.stringify(updatedMembers))

      // Add activity
      const newActivity = {
        id: Date.now(),
        type: 'member_joined',
        user: memberFormData.name,
        time: 'gerade eben'
      }
      const updatedActivities = [newActivity, ...activities]
      setActivities(updatedActivities)
      localStorage.setItem('team_activities', JSON.stringify(updatedActivities))

      // Reset form
      setMemberFormData({ name: '', email: '' })
      setShowMemberModal(false)
    } catch (error) {
      console.error('Failed to add member:', error)
      setError(error.message || 'Fehler beim Hinzufügen des Mitglieds')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateProgress = (goalId, increment) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const newValue = Math.min(goal.current_value + increment, goal.target_value)
        return { ...goal, current_value: newValue }
      }
      return goal
    })
    setGoals(updatedGoals)
    localStorage.setItem('team_goals', JSON.stringify(updatedGoals))
  }

  const handleLikeGoal = (goalId) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        return { ...goal, likes: (goal.likes || 0) + 1 }
      }
      return goal
    })
    setGoals(updatedGoals)
    localStorage.setItem('team_goals', JSON.stringify(updatedGoals))
  }

  const handleAddComment = (goalId) => {
    const comment = commentText[goalId]
    if (!comment || !comment.trim()) return

    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const newComment = {
          id: Date.now(),
          author: user?.name || 'Du',
          text: comment,
          time: 'gerade eben'
        }
        return {
          ...goal,
          comments: [...(goal.comments || []), newComment]
        }
      }
      return goal
    })
    setGoals(updatedGoals)
    localStorage.setItem('team_goals', JSON.stringify(updatedGoals))
    setCommentText({ ...commentText, [goalId]: '' })
  }

  const getProgressPercentage = (current, target) => {
    if (!target || target === 0) return 0
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getDaysRemaining = (targetDate) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diff = target - today
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mx-auto max-w-lg bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-6xl animate-spin">refresh</span>
          <p className="mt-4 text-text-light-secondary dark:text-text-dark-secondary">Lade Team...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col mx-auto max-w-lg group/design-root overflow-x-hidden pb-28">
      {/* Header */}
      <header className="flex items-center p-5 pt-6 pb-4 justify-between glass sticky top-0 z-10 border-b border-border-light dark:border-border-dark backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 shadow-md">
            <span className="material-symbols-outlined text-white text-xl">groups</span>
          </div>
          <div>
            <h1 className="text-text-light-primary dark:text-text-dark-primary text-xl font-bold leading-tight tracking-[-0.015em]">
              Team
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">Gemeinsam Ziele erreichen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemberModal(true)}
            className="p-2 rounded-xl hover:bg-background-light dark:hover:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary transition-colors"
            title="Mitglied hinzufügen"
          >
            <span className="material-symbols-outlined">person_add</span>
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            className="btn-primary flex items-center justify-center gap-2 px-4 py-2 rounded-full"
          >
            <span className="material-symbols-outlined">add</span>
            <span className="text-sm font-medium">Ziel</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="px-4 border-b border-border-light dark:border-border-dark">
        <div className="flex justify-between">
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'goals'
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Ziele</p>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'members'
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Mitglieder</p>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 ${
              activeTab === 'activity'
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            <p className="text-sm font-bold">Aktivität</p>
          </button>
        </div>
      </nav>

      <main className="flex-grow px-4 py-6">
        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="flex flex-col gap-4">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
                  flag
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-base mb-4">
                  Noch keine gemeinsamen Ziele erstellt
                </p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-all"
                >
                  Erstes Ziel erstellen
                </button>
              </div>
            ) : (
              goals.map(goal => {
                const progress = getProgressPercentage(goal.current_value, goal.target_value)
                const daysRemaining = getDaysRemaining(goal.target_date)
                const isExpanded = selectedGoal === goal.id

                return (
                  <div
                    key={goal.id}
                    className="card-hover animate-fade-in"
                  >
                    {/* Goal Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold mb-1">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm mb-2">
                            {goal.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            {formatDate(goal.target_date)}
                          </span>
                          {daysRemaining > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {daysRemaining} Tage verbleibend
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLikeGoal(goal.id)}
                        className="flex flex-col items-center gap-1 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-primary">favorite</span>
                        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          {goal.likes || 0}
                        </span>
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                          Fortschritt
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {progress}%
                        </span>
                      </div>
                      <div className="progress-bar h-3 mb-2">
                        <div
                          className="progress-fill bg-gradient-to-r from-primary to-primary-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        <span>
                          {goal.current_value.toLocaleString()} {goal.unit && `/ ${goal.target_value.toLocaleString()} ${goal.unit}`}
                        </span>
                        <span>{goal.target_value.toLocaleString()} {goal.unit}</span>
                      </div>
                    </div>

                    {/* Members */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Mitglieder:</span>
                      <div className="flex -space-x-2">
                        {goal.members.slice(0, 4).map((member, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card-light dark:border-card-dark flex items-center justify-center text-xs font-bold text-primary"
                            title={member}
                          >
                            {member.charAt(0)}
                          </div>
                        ))}
                        {goal.members.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-background-light dark:bg-background-dark border-2 border-card-light dark:border-card-dark flex items-center justify-center text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary">
                            +{goal.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => handleUpdateProgress(goal.id, goal.target_value * 0.1)}
                        className="btn-secondary flex-1 text-sm bg-primary/10 dark:bg-primary/20 text-primary border-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30"
                      >
                        + Fortschritt
                      </button>
                      <button
                        onClick={() => setSelectedGoal(isExpanded ? null : goal.id)}
                        className="btn-secondary flex-1 text-sm"
                      >
                        {isExpanded ? 'Weniger' : 'Kommentare'}
                      </button>
                    </div>

                    {/* Comments Section */}
                    {isExpanded && (
                      <div className="pt-4 border-t border-border-light dark:border-border-dark">
                        <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                          {goal.comments && goal.comments.length > 0 ? (
                            goal.comments.map(comment => (
                              <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                  {comment.author.charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                      {comment.author}
                                    </span>
                                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                      {comment.time}
                                    </span>
                                  </div>
                                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                    {comment.text}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary text-center py-4">
                              Noch keine Kommentare
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText[goal.id] || ''}
                            onChange={(e) => setCommentText({ ...commentText, [goal.id]: e.target.value })}
                            placeholder="Kommentar schreiben..."
                            className="flex-1 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(goal.id)
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddComment(goal.id)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="flex flex-col gap-4">
            <div className="card-hover animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold">
                  Team-Mitglieder
                </h3>
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {teamMembers.length} Mitglieder
                </span>
              </div>
              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                      {member.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-text-light-primary dark:text-text-dark-primary font-medium">
                        {member.name}
                      </p>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {member.goals_completed} Ziele abgeschlossen
                      </p>
                    </div>
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      Seit {formatDate(member.joined)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="flex flex-col gap-4">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
                  timeline
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-base">
                  Noch keine Aktivitäten
                </p>
              </div>
            ) : (
              activities.map(activity => (
                <div
                  key={activity.id}
                  className="card-hover animate-fade-in"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {activity.type === 'goal_created' && (
                        <span className="material-symbols-outlined text-primary">flag</span>
                      )}
                      {activity.type === 'goal_progress' && (
                        <span className="material-symbols-outlined text-primary">trending_up</span>
                      )}
                      {activity.type === 'goal_completed' && (
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                      )}
                      {activity.type === 'member_joined' && (
                        <span className="material-symbols-outlined text-primary">person_add</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-text-light-primary dark:text-text-dark-primary text-sm mb-1">
                        {activity.type === 'goal_created' && (
                          <span>
                            <strong>{activity.user}</strong> hat das Ziel <strong>{activity.goal}</strong> erstellt
                          </span>
                        )}
                        {activity.type === 'goal_progress' && (
                          <span>
                            <strong>{activity.user}</strong> hat <strong>{activity.progress}%</strong> Fortschritt beim Ziel <strong>{activity.goal}</strong> erreicht
                          </span>
                        )}
                        {activity.type === 'goal_completed' && (
                          <span>
                            <strong>{activity.user}</strong> hat das Ziel <strong>{activity.goal}</strong> abgeschlossen 🎉
                          </span>
                        )}
                        {activity.type === 'member_joined' && (
                          <span>
                            <strong>{activity.user}</strong> ist dem Team beigetreten 👋
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Create Goal Modal */}
      {showGoalModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowGoalModal(false)}
        >
          <div
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Neues Team-Ziel
              </h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={goalFormData.title}
                  onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                  required
                  className="input"
                  placeholder="z.B. 10.000 Schritte täglich"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={goalFormData.description}
                  onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Beschreibe das gemeinsame Ziel..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    Zielwert
                  </label>
                  <input
                    type="number"
                    value={goalFormData.target_value}
                    onChange={(e) => setGoalFormData({ ...goalFormData, target_value: e.target.value })}
                    className="input"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    Einheit
                  </label>
                  <input
                    type="text"
                    value={goalFormData.unit}
                    onChange={(e) => setGoalFormData({ ...goalFormData, unit: e.target.value })}
                    className="input"
                    placeholder="z.B. Schritte"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Ziel-Datum
                </label>
                <input
                  type="date"
                  value={goalFormData.target_date}
                  onChange={(e) => setGoalFormData({ ...goalFormData, target_date: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !goalFormData.title.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Wird erstellt...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMemberModal(false)}
        >
          <div
            className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Mitglied hinzufügen
              </h2>
              <button
                onClick={() => setShowMemberModal(false)}
                className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={memberFormData.name}
                  onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                  required
                  className="input"
                  placeholder="Name des Mitglieds"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={memberFormData.email}
                  onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                  required
                  className="input"
                  placeholder="email@example.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 px-4 py-3 border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !memberFormData.name.trim() || !memberFormData.email.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Wird hinzugefügt...' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Team

