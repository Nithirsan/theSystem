package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"
)

// MediaService handles media file conversion to text
type MediaService struct {
	OpenAIService    *OpenAIService
	GoogleVisionKey  string
	Client           *http.Client
}

// NewMediaService creates a new media service instance
func NewMediaService() *MediaService {
	googleVisionKey := os.Getenv("GOOGLE_VISION_API_KEY")
	if googleVisionKey == "" {
		fmt.Printf("WARNING: GOOGLE_VISION_API_KEY environment variable is not set!\n")
	} else {
		fmt.Printf("Google Vision API Key loaded successfully (length: %d)\n", len(googleVisionKey))
	}
	return &MediaService{
		OpenAIService:   NewOpenAIService(),
		GoogleVisionKey: googleVisionKey,
		Client: &http.Client{
			Timeout: 120 * time.Second, // Longer timeout for media processing
		},
	}
}

// ConvertAudioToText converts audio file to text using Whisper API
func (s *MediaService) ConvertAudioToText(audioData []byte, fileName string) (string, error) {
	if s.OpenAIService.APIKey == "" {
		return "", fmt.Errorf("OpenAI API key not configured")
	}

	// Create multipart form data
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add file field
	part, err := writer.CreateFormFile("file", fileName)
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %v", err)
	}
	_, err = part.Write(audioData)
	if err != nil {
		return "", fmt.Errorf("failed to write file data: %v", err)
	}

	// Add model field
	err = writer.WriteField("model", "whisper-1")
	if err != nil {
		return "", fmt.Errorf("failed to write model field: %v", err)
	}

	// Add language field (optional, can be auto-detected)
	err = writer.WriteField("language", "de")
	if err != nil {
		return "", fmt.Errorf("failed to write language field: %v", err)
	}

	err = writer.Close()
	if err != nil {
		return "", fmt.Errorf("failed to close writer: %v", err)
	}

	// Create request
	req, err := http.NewRequest("POST", "https://api.openai.com/v1/audio/transcriptions", &requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.OpenAIService.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Make request
	resp, err := s.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiError struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			} `json:"error"`
		}
		if err := json.Unmarshal(body, &apiError); err != nil {
			return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
		}
		return "", fmt.Errorf("OpenAI API error: %s (type: %s)", apiError.Error.Message, apiError.Error.Type)
	}

	var response struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %v", err)
	}

	return response.Text, nil
}

// ConvertImageToText converts image to text using Google Cloud Vision API
func (s *MediaService) ConvertImageToText(imageData []byte, mimeType string) (string, error) {
	if s.GoogleVisionKey == "" {
		return "", fmt.Errorf("Google Vision API key not configured")
	}

	// Encode image to base64
	base64Image := base64.StdEncoding.EncodeToString(imageData)

	// Prepare request for Google Cloud Vision API
	type Image struct {
		Content string `json:"content"`
	}

	type Feature struct {
		Type       string `json:"type"`
		MaxResults int    `json:"maxResults"`
	}

	type Request struct {
		Image    Image    `json:"image"`
		Features []Feature `json:"features"`
	}

	type VisionRequest struct {
		Requests []Request `json:"requests"`
	}

	visionRequest := VisionRequest{
		Requests: []Request{
			{
				Image: Image{
					Content: base64Image,
				},
				Features: []Feature{
					{
						Type:       "TEXT_DETECTION",
						MaxResults: 10,
					},
					{
						Type:       "DOCUMENT_TEXT_DETECTION",
						MaxResults: 10,
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(visionRequest)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	// Google Cloud Vision API endpoint
	url := fmt.Sprintf("https://vision.googleapis.com/v1/images:annotate?key=%s", s.GoogleVisionKey)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiError struct {
			Error struct {
				Message string `json:"message"`
				Status  string `json:"status"`
			} `json:"error"`
		}
		if err := json.Unmarshal(body, &apiError); err != nil {
			return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
		}
		return "", fmt.Errorf("Google Vision API error: %s (status: %s)", apiError.Error.Message, apiError.Error.Status)
	}

	var response struct {
		Responses []struct {
			TextAnnotations []struct {
				Description string `json:"description"`
			} `json:"textAnnotations"`
			FullTextAnnotation struct {
				Text string `json:"text"`
			} `json:"fullTextAnnotation"`
		} `json:"responses"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %v", err)
	}

	if len(response.Responses) == 0 {
		return "", fmt.Errorf("no response from Google Vision API")
	}

	// Extract text from response
	// Prefer fullTextAnnotation if available (better for documents)
	text := ""
	if response.Responses[0].FullTextAnnotation.Text != "" {
		text = response.Responses[0].FullTextAnnotation.Text
	} else if len(response.Responses[0].TextAnnotations) > 0 {
		// Use first text annotation (contains all detected text)
		text = response.Responses[0].TextAnnotations[0].Description
	}

	if text == "" {
		return "", fmt.Errorf("no text detected in image")
	}

	return text, nil
}

// ConvertPDFToText converts PDF to text using multiple methods
func (s *MediaService) ConvertPDFToText(pdfData []byte) (string, error) {
	// Create a temporary file to read the PDF
	tmpFile, err := os.CreateTemp("", "pdf_*.pdf")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Write PDF data to temp file
	if _, err := tmpFile.Write(pdfData); err != nil {
		return "", fmt.Errorf("failed to write PDF data: %v", err)
	}
	tmpFile.Close()

	// Method 1: Try to extract text using manual extraction
	extractedText, err := s.extractTextWithPdfcpu(tmpFile.Name())
	if err == nil && len(extractedText) > 50 {
		fmt.Printf("PDF text extracted successfully using manual method, length: %d\n", len(extractedText))
		return extractedText, nil
	}
	
	if err != nil {
		fmt.Printf("Manual PDF extraction failed: %v\n", err)
	} else {
		fmt.Printf("Manual PDF extraction returned too little text: %d characters\n", len(extractedText))
	}

	// Method 2: Try OpenAI Vision API as fallback
	fmt.Printf("Attempting PDF extraction using OpenAI Vision API...\n")
	visionText, err := s.convertPDFWithVisionAPI(pdfData)
	if err == nil && len(visionText) > 50 {
		fmt.Printf("PDF text extracted successfully using Vision API, length: %d\n", len(visionText))
		return visionText, nil
	}
	
	if err != nil {
		fmt.Printf("Vision API PDF extraction failed: %v\n", err)
	} else {
		fmt.Printf("Vision API returned too little text: %d characters\n", len(visionText))
	}

	// If both methods failed, return error
	return "", fmt.Errorf("PDF-Text-Extraktion fehlgeschlagen. Bitte konvertiere die PDF-Seiten zu Bildern (PNG/JPG) und lade diese stattdessen hoch, oder kopiere den Text manuell in die Notiz.")
}

// extractTextWithPdfcpu extracts text from PDF using improved text extraction
func (s *MediaService) extractTextWithPdfcpu(pdfPath string) (string, error) {
	// Read the PDF file
	pdfBytes, err := os.ReadFile(pdfPath)
	if err != nil {
		return "", err
	}

	// Improved text extraction from PDF structure
	var result strings.Builder
	content := string(pdfBytes)
	
	// Method 1: Extract text between BT (Begin Text) and ET (End Text) markers
	btIndex := 0
	for {
		btPos := strings.Index(content[btIndex:], "BT")
		if btPos == -1 {
			break
		}
		btPos += btIndex
		etPos := strings.Index(content[btPos:], "ET")
		if etPos == -1 {
			break
		}
		etPos += btPos
		
		textBlock := content[btPos+2 : etPos]
		// Extract text strings (usually in parentheses or brackets)
		lines := strings.Split(textBlock, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			// Look for text in parentheses: (text)
			if strings.Contains(line, "(") && strings.Contains(line, ")") {
				start := strings.Index(line, "(")
				end := strings.LastIndex(line, ")")
				if start < end {
					text := line[start+1 : end]
					// Decode PDF text encoding (basic)
					text = s.decodePDFText(text)
					if len(text) > 2 {
						result.WriteString(text)
						result.WriteString(" ")
					}
				}
			}
			// Look for text in brackets: <hex>
			if strings.Contains(line, "<") && strings.Contains(line, ">") && len(line) > 10 {
				start := strings.Index(line, "<")
				end := strings.LastIndex(line, ">")
				if start < end {
					hexText := line[start+1 : end]
					// Try to decode hex text
					if decoded, err := s.decodeHexText(hexText); err == nil && len(decoded) > 2 {
						result.WriteString(decoded)
						result.WriteString(" ")
					}
				}
			}
		}
		btIndex = etPos + 2
	}
	
	// Method 2: Extract readable text from stream objects
	// Look for /FlateDecode or other stream content
	streamIndex := 0
	for {
		streamPos := strings.Index(content[streamIndex:], "stream")
		if streamPos == -1 {
			break
		}
		streamPos += streamIndex
		endStreamPos := strings.Index(content[streamPos:], "endstream")
		if endStreamPos == -1 {
			break
		}
		endStreamPos += streamPos
		
		// Try to extract readable text from stream
		streamContent := content[streamPos+6 : endStreamPos]
		// Look for readable text patterns
		words := strings.Fields(streamContent)
		for _, word := range words {
			if len(word) > 3 {
				readableChars := 0
				for _, char := range word {
					if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || 
					   (char >= '0' && char <= '9') {
						readableChars++
					}
				}
				if float64(readableChars)/float64(len(word)) > 0.7 {
					result.WriteString(word)
					result.WriteString(" ")
				}
			}
		}
		streamIndex = endStreamPos + 9
	}
	
	extractedText := strings.TrimSpace(result.String())
	// Clean up: remove duplicate spaces and normalize
	extractedText = strings.Join(strings.Fields(extractedText), " ")
	
	if len(extractedText) > 50 {
		return extractedText, nil
	}
	
	return "", fmt.Errorf("could not extract text from PDF")
}

// decodePDFText decodes PDF text encoding (basic implementation)
func (s *MediaService) decodePDFText(text string) string {
	// PDF text can have escape sequences like \(, \), \\, etc.
	text = strings.ReplaceAll(text, "\\(", "(")
	text = strings.ReplaceAll(text, "\\)", ")")
	text = strings.ReplaceAll(text, "\\\\", "\\")
	text = strings.ReplaceAll(text, "\\n", "\n")
	text = strings.ReplaceAll(text, "\\r", "\r")
	text = strings.ReplaceAll(text, "\\t", "\t")
	return text
}

// decodeHexText decodes hexadecimal text from PDF
func (s *MediaService) decodeHexText(hexText string) (string, error) {
	// Remove whitespace
	hexText = strings.ReplaceAll(hexText, " ", "")
	hexText = strings.ReplaceAll(hexText, "\n", "")
	hexText = strings.ReplaceAll(hexText, "\r", "")
	
	if len(hexText)%2 != 0 {
		return "", fmt.Errorf("invalid hex length")
	}
	
	var result strings.Builder
	for i := 0; i < len(hexText); i += 2 {
		var b byte
		_, err := fmt.Sscanf(hexText[i:i+2], "%02x", &b)
		if err != nil {
			continue
		}
		// Only include printable ASCII characters
		if b >= 32 && b <= 126 {
			result.WriteByte(b)
		}
	}
	
	return result.String(), nil
}

// convertPDFWithVisionAPI converts PDF to text using Google Cloud Vision API
// Google Cloud Vision API supports PDF files directly via the files:asyncBatchAnnotate endpoint
func (s *MediaService) convertPDFWithVisionAPI(pdfData []byte) (string, error) {
	if s.GoogleVisionKey == "" {
		return "", fmt.Errorf("Google Vision API key not configured")
	}

	// Encode PDF to base64
	base64PDF := base64.StdEncoding.EncodeToString(pdfData)

	// Google Cloud Vision API supports PDFs via the images:annotate endpoint
	// We'll use DOCUMENT_TEXT_DETECTION which is optimized for PDFs
	type Image struct {
		Content string `json:"content"`
	}

	type Feature struct {
		Type       string `json:"type"`
		MaxResults int    `json:"maxResults"`
	}

	type Request struct {
		Image    Image    `json:"image"`
		Features []Feature `json:"features"`
		ImageContext struct {
			LanguageHints []string `json:"languageHints,omitempty"`
		} `json:"imageContext,omitempty"`
	}

	type VisionRequest struct {
		Requests []Request `json:"requests"`
	}

	visionRequest := VisionRequest{
		Requests: []Request{
			{
				Image: Image{
					Content: base64PDF,
				},
				Features: []Feature{
					{
						Type:       "DOCUMENT_TEXT_DETECTION",
						MaxResults: 1,
					},
				},
				ImageContext: struct {
					LanguageHints []string `json:"languageHints,omitempty"`
				}{
					LanguageHints: []string{"de", "en"},
				},
			},
		},
	}

	jsonData, err := json.Marshal(visionRequest)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	// Google Cloud Vision API endpoint
	url := fmt.Sprintf("https://vision.googleapis.com/v1/images:annotate?key=%s", s.GoogleVisionKey)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiError struct {
			Error struct {
				Message string `json:"message"`
				Status  string `json:"status"`
			} `json:"error"`
		}
		if err := json.Unmarshal(body, &apiError); err != nil {
			return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
		}
		
		// Check if PDF format is not supported
		if strings.Contains(apiError.Error.Message, "Invalid image data") || 
		   strings.Contains(apiError.Error.Message, "Invalid image format") {
			// PDF might need to be sent differently - try alternative approach
			return "", fmt.Errorf("PDF-Format wird möglicherweise nicht direkt unterstützt. Versuche alternative Methode...")
		}
		
		return "", fmt.Errorf("Google Vision API error: %s (status: %s)", apiError.Error.Message, apiError.Error.Status)
	}

	var response struct {
		Responses []struct {
			TextAnnotations []struct {
				Description string `json:"description"`
			} `json:"textAnnotations"`
			FullTextAnnotation struct {
				Text string `json:"text"`
			} `json:"fullTextAnnotation"`
		} `json:"responses"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %v", err)
	}

	if len(response.Responses) == 0 {
		return "", fmt.Errorf("no response from Google Vision API")
	}

	// Extract text from response
	// Prefer fullTextAnnotation for PDFs (better structure preservation)
	text := ""
	if response.Responses[0].FullTextAnnotation.Text != "" {
		text = response.Responses[0].FullTextAnnotation.Text
	} else if len(response.Responses[0].TextAnnotations) > 0 {
		// Use first text annotation (contains all detected text)
		text = response.Responses[0].TextAnnotations[0].Description
	}

	if text == "" {
		return "", fmt.Errorf("no text detected in PDF")
	}

	return text, nil
}

// ConvertMediaToText converts media file to text based on file type
func (s *MediaService) ConvertMediaToText(mediaData []byte, fileType, fileName, mimeType string) (string, error) {
	switch strings.ToLower(fileType) {
	case "audio":
		return s.ConvertAudioToText(mediaData, fileName)
	case "image":
		return s.ConvertImageToText(mediaData, mimeType)
	case "pdf":
		return s.ConvertPDFToText(mediaData)
	default:
		return "", fmt.Errorf("unsupported file type: %s", fileType)
	}
}

// GetMediaStoragePath returns the path where media files should be stored
func GetMediaStoragePath() string {
	storagePath := os.Getenv("MEDIA_STORAGE_PATH")
	if storagePath == "" {
		storagePath = "./uploads"
	}
	return storagePath
}

// EnsureStoragePath ensures the storage directory exists
func EnsureStoragePath() error {
	path := GetMediaStoragePath()
	if err := os.MkdirAll(path, 0755); err != nil {
		return fmt.Errorf("failed to create storage directory: %v", err)
	}
	return nil
}

