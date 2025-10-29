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
	return &OpenAIService{
		APIKey: os.Getenv("OPENAI_API_KEY"),
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GenerateCoachResponse generates a response from the AI coach
func (s *OpenAIService) GenerateCoachResponse(userMessage string, conversationHistory []Message) (string, []string, error) {
	if s.APIKey == "" {
		return "Entschuldigung, der AI Coach ist momentan nicht verfügbar.", []string{}, fmt.Errorf("OpenAI API key not configured")
	}

	// Prepare conversation history
	messages := []Message{
		{
			Role:    "system",
			Content: `Du bist ein freundlicher und motivierender AI-Coach für Gewohnheitsbildung und persönliche Entwicklung. 
			Du hilfst Benutzern dabei, ihre Ziele zu erreichen, Gewohnheiten zu entwickeln und motiviert zu bleiben.
			Antworte auf Deutsch und sei ermutigend, aber auch realistisch. 
			Gib praktische Tipps und sei ein guter Zuhörer.`,
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
		return "Entschuldigung, ich konnte deine Nachricht nicht verarbeiten.", []string{}, err
	}

	// Extract response
	if len(response.Choices) == 0 {
		return "Entschuldigung, ich konnte keine Antwort generieren.", []string{}, fmt.Errorf("no response from OpenAI")
	}

	coachResponse := response.Choices[0].Message.Content
	
	// Generate suggestions based on the conversation
	suggestions := s.generateSuggestions(userMessage, coachResponse)

	return coachResponse, suggestions, nil
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

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiError APIError
		if err := json.Unmarshal(body, &apiError); err != nil {
			return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("OpenAI API error: %s", apiError.Message)
	}

	var response OpenAIResponse
	if err := json.Unmarshal(body, &response); err != nil {
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
