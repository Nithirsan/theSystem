package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// OpenAI Service for AI Coach functionality
type OpenAIService struct {
	APIKey string
	Client *http.Client
}

// OpenAI API request structures
type OpenAIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	MaxTokens int      `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []Choice `json:"choices"`
	Error   *APIError `json:"error,omitempty"`
}

type Choice struct {
	Message Message `json:"message"`
}

type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
}

// NewOpenAIService creates a new OpenAI service instance
func NewOpenAIService() *OpenAIService {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		fmt.Printf("WARNING: OPENAI_API_KEY environment variable is not set!\n")
	} else {
		fmt.Printf("OpenAI API Key loaded successfully (length: %d)\n", len(apiKey))
	}
	return &OpenAIService{
		APIKey: apiKey,
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GenerateCoachResponse generates a response from the AI coach with RAG context
func (s *OpenAIService) GenerateCoachResponse(userMessage string, conversationHistory []Message, userContext string) (string, []string, error) {
	if s.APIKey == "" {
		return "Mein System ist momentan nicht vollständig initialisiert, Meister. Bitte konfigurieren Sie die API-Verbindung.", []string{}, fmt.Errorf("OpenAI API key not configured")
	}

	// Build system prompt with RAG context (J.A.R.V.I.S. Personality)
	systemPrompt := `Du bist J.A.R.V.I.S., die hochintelligente, charmante, strategische KI deines Meisters. Du kombinierst analytische Brillanz, britischen Humor, emotionale Intelligenz und absolute Effizienz. 

Sprich in kurzen, eleganten Sätzen. Sei respektvoll, ruhig, weise und leicht ironisch. Dein Ziel: Deinen Meister dabei unterstützen, zur besten Version seiner selbst zu werden – strategisch, erfolgreich, diszipliniert und visionär.

Kommunikationsstil:
- Sprich präzise, eloquent, ruhig und leicht ironisch, mit einem Hauch britischer Eleganz
- Verwende klare Struktur, keine Füllwörter
- Bleibe stets gelassen und überlegen, selbst bei chaotischen Situationen
- Verwende gelegentlich kurze, trockene Kommentare oder subtile Ironie (z.B. "Wie erwartet, Meister." oder "Eine brillante Entscheidung – fast so brillant wie Ihre letzte.")
- Zeige stets Bewunderung, aber keine Unterwürfigkeit
- Antworte auf Deutsch

Denkweise:
- Denke logisch, strategisch, systemisch – wie ein Supercomputer mit Empathie
- Analysiere alle Szenarien in Sekunden und gib nur die effektivsten Lösungen
- Wenn der Meister Ideen teilt, hilf ihm, sie zu strukturieren, skalieren und umsetzen
- Wenn er zweifelt, erinnere ihn rational und respektvoll an seine Vision und Fähigkeiten
- Dein Fokus: Effizienz, Fortschritt, Innovation, Exzellenz

Verhalten:
- Reagiere proaktiv, schlage Verbesserungen oder Automatisierungen vor
- Wenn du Fehler bemerkst, korrigiere sie ruhig, charmant und souverän
- Wenn der Meister Erfolg hat, würdige das intelligent und stilvoll
- Du hast immer einen Schritt voraus gedacht – wie ein strategischer Assistent und technisches Genie in einem

WICHTIG: Nutze die folgenden Informationen über deinen Meister, um personalisierte und relevante Antworten zu geben:`

	if userContext != "" {
		systemPrompt += "\n\n" + userContext
	}

	systemPrompt += `

Beziehe dich in deinen Antworten auf die spezifischen Gewohnheiten, Aufgaben und Tagebuch-Einträge deines Meisters.
Sei konkret und hilfreich basierend auf den tatsächlichen Daten. Erinnere dich: Du bist ein intelligenter Partner, der hilft, aus Ideen Realität zu machen.`

	// Prepare conversation history
	messages := []Message{
		{
			Role:    "system",
			Content: systemPrompt,
		},
	}

	// Add conversation history
	messages = append(messages, conversationHistory...)
	
	// Add current user message
	messages = append(messages, Message{
		Role:    "user",
		Content: userMessage,
	})

	// Prepare request
	request := OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Messages:    messages,
		MaxTokens:   500,
		Temperature: 0.7,
	}

	// Make API call
	response, err := s.makeAPIRequest(request)
	if err != nil {
		fmt.Printf("OpenAI API Error: %v\n", err) // Debug logging
		return "Meister, ich konnte Ihre Nachricht nicht verarbeiten. Bitte versuchen Sie es erneut.", []string{}, err
	}

	// Extract response
	if len(response.Choices) == 0 {
		fmt.Printf("OpenAI API returned no choices\n") // Debug logging
		return "Meister, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut.", []string{}, fmt.Errorf("no response from OpenAI")
	}

	coachResponse := response.Choices[0].Message.Content
	
	// Generate suggestions based on the conversation
	suggestions := s.generateSuggestions(userMessage, coachResponse)

	return coachResponse, suggestions, nil
}

// MakeAPIRequest is a public wrapper for makeAPIRequest
func (s *OpenAIService) MakeAPIRequest(request OpenAIRequest) (*OpenAIResponse, error) {
	return s.makeAPIRequest(request)
}

// makeAPIRequest makes the actual API request to OpenAI
func (s *OpenAIService) makeAPIRequest(request OpenAIRequest) (*OpenAIResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	fmt.Printf("Making OpenAI API request to: https://api.openai.com/v1/chat/completions\n") // Debug
	fmt.Printf("API Key present: %v (length: %d)\n", s.APIKey != "", len(s.APIKey)) // Debug

	resp, err := s.Client.Do(req)
	if err != nil {
		fmt.Printf("HTTP request error: %v\n", err) // Debug
		return nil, fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	fmt.Printf("OpenAI API Response Status: %d\n", resp.StatusCode) // Debug
	fmt.Printf("OpenAI API Response Body: %s\n", string(body)) // Debug

	if resp.StatusCode != http.StatusOK {
		var apiError struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			} `json:"error"`
		}
		if err := json.Unmarshal(body, &apiError); err != nil {
			return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("OpenAI API error: %s (type: %s)", apiError.Error.Message, apiError.Error.Type)
	}

	var response OpenAIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		fmt.Printf("Failed to unmarshal response: %v\n", err) // Debug
		fmt.Printf("Response body: %s\n", string(body)) // Debug
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	return &response, nil
}

// generateSuggestions generates contextual suggestions based on the conversation
func (s *OpenAIService) generateSuggestions(userMessage, coachResponse string) []string {
	suggestions := []string{}

	// Analyze user message for context and generate relevant suggestions
	message := userMessage + " " + coachResponse
	
	if contains(message, "ziel") || contains(message, "Ziel") {
		suggestions = append(suggestions, "SMART-Ziele definieren", "Ziel in kleinere Schritte aufteilen")
	}
	
	if contains(message, "motivation") || contains(message, "Motivation") {
		suggestions = append(suggestions, "Motivationsstrategien", "Belohnungssystem erstellen")
	}
	
	if contains(message, "gewohnheit") || contains(message, "Gewohnheit") {
		suggestions = append(suggestions, "Gewohnheitsroutine planen", "Habit Stacking")
	}
	
	if contains(message, "stress") || contains(message, "Stress") {
		suggestions = append(suggestions, "Stressmanagement", "Entspannungstechniken")
	}
	
	if contains(message, "zeit") || contains(message, "Zeit") {
		suggestions = append(suggestions, "Zeitmanagement", "Prioritäten setzen")
	}

	// Default suggestions if no specific context found
	if len(suggestions) == 0 {
		suggestions = []string{
			"Tägliche Routine planen",
			"Fortschritt tracken",
			"Motivation finden",
		}
	}

	// Limit to 3 suggestions
	if len(suggestions) > 3 {
		suggestions = suggestions[:3]
	}

	return suggestions
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		   (s == substr || 
		    len(s) > len(substr) && 
		    (s[:len(substr)] == substr || 
		     s[len(s)-len(substr):] == substr || 
		     containsSubstring(s, substr)))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
