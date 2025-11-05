import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const LoginForm = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-light via-primary-50/30 to-background-light dark:from-background-dark dark:via-primary-950/20 dark:to-background-dark p-4">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="card p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-600 shadow-lg">
                <span className="material-symbols-outlined text-white text-4xl">partly_cloudy_day</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
              Willkommen zurück
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Melde dich in deinem Konto an
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error/10 dark:bg-error/20 border border-error/30 text-error dark:text-error px-4 py-3 rounded-xl text-sm animate-slide-down">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="deine@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="Dein Passwort"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onToggleMode}
                className="text-primary hover:text-primary-600 dark:hover:text-primary-400 text-sm font-medium transition-colors"
              >
                Noch kein Konto? <span className="font-semibold">Jetzt registrieren</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const RegisterForm = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    setLoading(true)

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-light via-primary-50/30 to-background-light dark:from-background-dark dark:via-primary-950/20 dark:to-background-dark p-4">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="card p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-600 shadow-lg">
                <span className="material-symbols-outlined text-white text-4xl">partly_cloudy_day</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
              Konto erstellen
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Starte deine Reise zu besseren Gewohnheiten
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error/10 dark:bg-error/20 border border-error/30 text-error dark:text-error px-4 py-3 rounded-xl text-sm animate-slide-down">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Dein Name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="deine@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Passwort bestätigen
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="Passwort wiederholen"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? 'Wird erstellt...' : 'Konto erstellen'}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onToggleMode}
                className="text-primary hover:text-primary-600 dark:hover:text-primary-400 text-sm font-medium transition-colors"
              >
                Bereits ein Konto? <span className="font-semibold">Jetzt anmelden</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <>
      {isLogin ? (
        <LoginForm onToggleMode={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onToggleMode={() => setIsLogin(true)} />
      )}
    </>
  )
}

export default AuthPage
