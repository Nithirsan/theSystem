// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// API Service for Authentication
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return response.json();
  },

  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    return response.json();
  },

  // Get current user
  getMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user info');
    }
    
    return response.json();
  },
};

// API Service for Habits
export const habitsAPI = {
  // Get all habits
  getHabits: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/habits`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch habits');
    }
    
    return response.json();
  },

  // Create a new habit
  createHabit: async (habitData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/habits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(habitData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create habit');
    }
    
    return response.json();
  },

  // Get habit completions for a week
  getHabitCompletions: async (habitId = null, startDate = null) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    let url = `${API_BASE_URL}/habits/completions`;
    const params = new URLSearchParams();
    if (habitId) {
      params.append('habit_id', habitId);
    }
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (params.toString()) {
      url += '?' + params.toString();
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      const errorMessage = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Failed to fetch completions');
      console.error('Get completions API error:', errorMessage, errorData);
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  // Complete a habit
  completeHabit: async (habitId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/habits/${habitId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      const errorMessage = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Failed to complete habit');
      console.error('Complete habit API error:', errorMessage, errorData);
      throw new Error(errorMessage);
    }
    
    return response.json();
  },
};

// API Service for Tasks
export const tasksAPI = {
  // Get all tasks
  getTasks: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch tasks');
    }
    
    return response.json();
  },

  // Create a new task
  createTask: async (taskData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create task');
    }
    
    return response.json();
  },

  // Complete a task
  completeTask: async (taskId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete task');
    }
    
    return response.json();
  },
};

// API Service for Journal
export const journalAPI = {
  // Get all journal entries
  getJournalEntries: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch journal entries');
    }
    
    return response.json();
  },

  // Get journal entry by date
  getJournalEntryByDate: async (date) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal/${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // 404 means no entry exists for this date - this is normal
      if (response.status === 404) {
        throw new Error('Journal entry not found');
      }
      const error = await response.json().catch(() => ({ error: 'Failed to fetch journal entry' }));
      throw new Error(error.error || 'Failed to fetch journal entry');
    }
    
    return response.json();
  },

  // Create or update journal entry
  createOrUpdateJournalEntry: async (entryData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entryData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save journal entry');
    }
    
    return response.json();
  },

  // Update journal entry
  updateJournalEntry: async (entryId, entryData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal/${entryId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entryData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update journal entry');
    }
    
    return response.json();
  },

  // Delete journal entry
  deleteJournalEntry: async (entryId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal/${entryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete journal entry');
    }
    
    return response.json();
  },

  // Generate AI questions for journal
  generateJournalQuestions: async (contextData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal/generate-questions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contextData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate questions');
    }
    
    return response.json();
  },

  // Generate summary of journal entries
  generateSummary: async (entries, days) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/journal/summarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entries, days }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }
    
    const data = await response.json();
    return data.summary;
  },
};
export const chatAPI = {
  // Get all chat sessions
  getChatSessions: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chat sessions');
    }
    
    return response.json();
  },

  // Create a new chat session
  createChatSession: async (title) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create chat session');
    }
    
    return response.json();
  },

  // Get messages for a chat session
  getChatMessages: async (sessionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch messages');
    }
    
    return response.json();
  },

  // Send a message to AI coach
  sendMessage: async (sessionId, content) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
    
    return response.json();
  },
};

// Utility functions
export const authUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Store auth data
  storeAuthData: (authResponse) => {
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// API Service for Notes/Plans
export const notesAPI = {
  // Get all notes
  getNotes: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Read response as text first (can only be read once)
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to fetch notes');
    }
    
    // Parse successful response
    if (!responseText || responseText.trim() === '') {
      return [];
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Response text:', responseText);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
    }
  },

  // Create a new note
  createNote: async (noteData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteData),
    });
    
    // Read response as text first (can only be read once)
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to create note');
    }
    
    // Parse successful response
    if (!responseText || responseText.trim() === '') {
      // Empty response - return empty object
      return {};
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Response text:', responseText);
      console.error('Response status:', response.status);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
    }
  },

  // Update a note
  updateNote: async (noteId, noteData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update note');
    }
    
    return response.json();
  },

  // Delete a note
  deleteNote: async (noteId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete note');
    }
    
    return response.json();
  },

  // Create a checklist item
  createChecklistItem: async (noteId, itemData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/checklist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(itemData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checklist item');
    }
    
    return response.json();
  },

  // Update a checklist item
  updateChecklistItem: async (noteId, itemId, itemData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/checklist/${itemId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(itemData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update checklist item');
    }
    
    return response.json();
  },

  // Delete a checklist item
  deleteChecklistItem: async (noteId, itemId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/checklist/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete checklist item');
    }
    
    return response.json();
  },

  // Get plan data for a note
  getPlanData: async (noteId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/plan`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to fetch plan data');
    }
    
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Save plan answers and generate plan
  savePlanAnswers: async (noteId, answers) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/plan/answers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answers),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to save plan answers');
    }
    
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Update plan via chat
  updatePlanViaChat: async (noteId, message) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/plan/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to update plan via chat');
    }
    
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Adopt plan into note content
  adoptPlan: async (noteId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/plan/adopt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to adopt plan');
    }
    
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Generate checklist from plan
  generateChecklist: async (noteId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/plan/generate-checklist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to generate checklist');
    }
    
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Upload media file
  uploadMedia: async (noteId, file, fileType) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to upload media');
    }
    
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Get media attachments for a note
  getMediaAttachments: async (noteId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to fetch media attachments');
    }
    
    if (!responseText || responseText.trim() === '') {
      return [];
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error(`Invalid JSON response from server`);
    }
  },

  // Delete media attachment
  deleteMediaAttachment: async (noteId, attachmentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/media/${attachmentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to delete media attachment');
    }
    
    return { success: true };
  },
};

// API Service for Meditation/Reflection
export const meditationAPI = {
  // Get all meditation sessions
  getSessions: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/meditation`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch meditation sessions');
    }
    
    return response.json();
  },

  // Start a new meditation session
  startMeditation: async (data) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/meditation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start meditation');
    }
    
    return response.json();
  },

  // Get a specific meditation session
  getSession: async (sessionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/meditation/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch meditation session');
    }
    
    return response.json();
  },

  // Send a message in meditation session
  sendMessage: async (sessionId, data) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/meditation/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
    
    return response.json();
  },

  // End meditation session
  endMeditation: async (sessionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/meditation/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to end meditation');
    }
    
    return response.json();
  },
};