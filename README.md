# Habit Tracker - Vollständige Anwendung

Eine moderne, vollständig funktionsfähige Habit Tracker Anwendung mit Go Backend, React Frontend, MySQL Datenbank und OpenAI Integration.

## 🎯 **Übersicht**

Die Anwendung bietet eine umfassende Lösung für persönliche Produktivität mit folgenden Hauptfunktionen:

- **Dashboard** - Übersicht über Fortschritt und Ziele
- **Gewohnheiten-Tracker** - Tägliche Gewohnheiten verfolgen
- **Aufgaben-Management** - Todo-Liste mit Prioritäten
- **AI Coach** - Intelligenter Coach mit OpenAI GPT-3.5-turbo
- **Journal** - Tägliche Reflexion und Stimmungstracking

## 🏗️ **Architektur**

### Backend (Go)
- **Framework**: Gin HTTP Framework
- **Datenbank**: MySQL 8.0
- **Authentifizierung**: JWT Tokens
- **AI Integration**: OpenAI GPT-3.5-turbo
- **API**: RESTful mit vollständigen CRUD-Operationen

### Frontend (React)
- **Framework**: React 18 mit Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React Context API
- **Icons**: Material Symbols

### Datenbank (MySQL)
- **Benutzer**: Registrierung, Authentifizierung, Profile
- **Gewohnheiten**: Tracking, Kategorien, Fortschritt
- **Aufgaben**: Prioritäten, Fälligkeitsdaten, Status
- **Journal**: Einträge, Stimmung, Tags
- **Chat**: AI Coach Unterhaltungen

## 🚀 **Features**

### ✅ **Benutzerauthentifizierung**
- Registrierung mit E-Mail und Passwort
- Sichere Passwort-Hashes (bcrypt)
- JWT-basierte Authentifizierung
- Session-Management

### ✅ **Dashboard**
- Tagesfortschritt-Anzeige
- Heutige Gewohnheiten
- Heutige Aufgaben
- Aktive Ziele mit Fortschritt
- Responsive Design mit Dark Mode

### ✅ **Gewohnheiten-Tracker**
- Gewohnheiten erstellen und verwalten
- Kategorien (Morgen, Nachmittag, Abend)
- Tägliches Abhaken
- Streak-Tracking
- Fortschrittsvisualisierung

### ✅ **Aufgaben-Management**
- Aufgaben erstellen mit Prioritäten
- Fälligkeitsdaten setzen
- Aufgaben abhaken
- Prioritäts-basierte Sortierung
- Vollständige CRUD-Operationen

### ✅ **AI Coach**
- Intelligente Unterhaltungen mit GPT-3.5-turbo
- Kontextuelle Antworten basierend auf Gesprächsverlauf
- Intelligente Vorschläge
- Session-Management
- Persistente Gespräche

### ✅ **Journal**
- Tägliche Einträge erstellen
- Stimmungstracking mit Emojis
- Tags für Kategorisierung
- Datum-Navigation
- Letzte Einträge anzeigen

### ✅ **Docker-Setup**
- Vollständige Containerisierung
- Multi-Service Architektur
- Development und Production Modi
- Nginx Reverse Proxy
- Health Checks und Monitoring

## 📁 **Projektstruktur**

```
theSystem/
├── src/                          # React Frontend
│   ├── components/              # React Komponenten
│   │   ├── Dashboard.jsx
│   │   ├── HabitTracker.jsx
│   │   ├── AICoach.jsx
│   │   ├── TodoList.jsx
│   │   ├── Journal.jsx
│   │   └── AuthPage.jsx
│   ├── contexts/                # React Context
│   │   └── AuthContext.jsx
│   ├── services/                # API Services
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── backend/                     # Go Backend
│   ├── cmd/server/             # Main Application
│   │   └── main.go
│   ├── internal/               # Internal Packages
│   │   ├── auth/               # Authentication
│   │   ├── database/           # Database Connection
│   │   ├── handlers/           # HTTP Handlers
│   │   ├── middleware/          # Middleware
│   │   ├── models/             # Data Models
│   │   └── services/           # Business Logic
│   ├── migrations/             # Database Migrations
│   ├── Dockerfile
│   ├── go.mod
│   └── config.env
├── docker-compose.yml          # Docker Compose
├── docker-compose.dev.yml      # Development Override
├── Dockerfile.frontend         # Frontend Dockerfile
├── Dockerfile.dev              # Development Dockerfile
├── nginx.conf                  # Nginx Configuration
├── Makefile                    # Build Commands
├── package.json                # Frontend Dependencies
├── tailwind.config.js          # Tailwind Configuration
└── vite.config.js              # Vite Configuration
```

## 🔧 **Installation & Setup**

### Voraussetzungen
- Node.js 18+ (für Frontend)
- Go 1.21+ (für Backend)
- MySQL 8.0+ (oder Docker)
- OpenAI API Key

### Lokale Installation

1. **Repository klonen**:
   ```bash
   git clone <repository-url>
   cd theSystem
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   go mod download
   go run cmd/server/main.go
   ```

4. **Datenbank Setup**:
   - MySQL-Server konfigurieren
   - Datenbank-Schema importieren
   - Verbindungsdaten in `config.env` eintragen

### Docker Installation

1. **Docker installieren** (siehe `DOCKER_INSTALL.md`)

2. **Anwendung starten**:
   ```bash
   make up
   ```

3. **Anwendung testen**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8080
   - Nginx: http://localhost:80

## 📊 **API-Endpunkte**

### Authentifizierung
- `POST /api/auth/register` - Benutzerregistrierung
- `POST /api/auth/login` - Benutzeranmeldung
- `GET /api/auth/me` - Benutzerinformationen

### Gewohnheiten
- `GET /api/habits` - Alle Gewohnheiten
- `POST /api/habits` - Gewohnheit erstellen
- `POST /api/habits/:id/complete` - Gewohnheit abhaken

### Aufgaben
- `GET /api/tasks` - Alle Aufgaben
- `POST /api/tasks` - Aufgabe erstellen
- `POST /api/tasks/:id/complete` - Aufgabe abhaken

### Journal
- `GET /api/journal` - Alle Einträge
- `GET /api/journal/:date` - Eintrag für Datum
- `POST /api/journal` - Eintrag erstellen/aktualisieren
- `PUT /api/journal/:id` - Eintrag aktualisieren
- `DELETE /api/journal/:id` - Eintrag löschen

### AI Coach
- `GET /api/chat/sessions` - Chat-Sessions
- `POST /api/chat/sessions` - Session erstellen
- `GET /api/chat/sessions/:id/messages` - Nachrichten
- `POST /api/chat/sessions/:id/messages` - Nachricht senden

## 🗄️ **Datenbank-Schema**

### Benutzer
```sql
users (id, email, password_hash, name, created_at, updated_at, preferences, settings)
user_sessions (id, user_id, token, expires_at, created_at)
```

### Gewohnheiten
```sql
habits (id, user_id, name, description, category, icon, color, target_frequency, is_active, created_at, updated_at)
habit_completions (id, habit_id, user_id, completed_at, streak_count)
```

### Aufgaben
```sql
tasks (id, user_id, title, description, priority, due_date, completed_at, created_at, updated_at)
```

### Journal
```sql
journal_entries (id, user_id, entry_date, mood, content, tags, created_at, updated_at)
```

### AI Coach
```sql
chat_sessions (id, user_id, title, created_at, updated_at)
chat_messages (id, session_id, type, content, suggestions, created_at)
```

## 🔒 **Sicherheit**

### Authentifizierung
- Sichere Passwort-Hashes mit bcrypt
- JWT-Tokens mit Ablaufzeit
- Middleware für geschützte Routen

### API-Sicherheit
- CORS-Konfiguration
- Rate Limiting (Nginx)
- Input-Validierung
- SQL-Injection-Schutz

### Datenbank
- Benutzer-spezifische Daten
- Foreign Key Constraints
- Sichere Verbindungen

## 🚀 **Deployment**

### Docker Deployment
```bash
# Produktionsumgebung
make prod

# Health Check
make health

# Logs überwachen
make logs
```

### Manuelle Deployment
1. **Backend** auf Server deployen
2. **Frontend** builden und auf CDN/Server
3. **MySQL** konfigurieren
4. **Nginx** als Reverse Proxy
5. **SSL-Zertifikate** konfigurieren

## 📈 **Performance**

### Optimierungen
- **Multi-stage Docker Builds** für kleinere Images
- **Nginx Caching** für statische Dateien
- **Database Indexing** für schnelle Abfragen
- **Lazy Loading** im Frontend
- **API Response Caching**

### Monitoring
- **Health Checks** für alle Services
- **Docker Stats** für Ressourcenverbrauch
- **Application Logs** für Debugging
- **Database Performance** Monitoring

## 🧪 **Testing**

### Frontend Testing
```bash
npm run test
npm run test:coverage
```

### Backend Testing
```bash
cd backend
go test ./...
go test -cover ./...
```

### API Testing
```bash
# Health Check
curl http://localhost:8080/health

# API Endpoints testen
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'
```

## 🔄 **Wartung**

### Backup
```bash
# Datenbank-Backup
make backup

# Manuelles Backup
docker-compose exec mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD habit_tracker > backup.sql
```

### Updates
```bash
# Code aktualisieren
git pull

# Images neu bauen
make build

# Services neu starten
make restart
```

### Logs
```bash
# Alle Logs
make logs

# Einzelne Services
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

## 📞 **Support**

### Häufige Probleme
1. **Port-Konflikte**: Andere Ports in docker-compose.yml verwenden
2. **Datenbank-Verbindung**: MySQL-Status und Credentials prüfen
3. **Frontend-Build**: Node-Modules neu installieren
4. **Backend-Start**: Go-Modules aktualisieren

### Debugging
```bash
# Service-Status prüfen
make health

# Logs analysieren
make logs

# Services neu starten
make restart

# Alles bereinigen
make clean && make up
```

## 🎯 **Roadmap**

### Geplante Features
- **Statistiken & Analytics** - Fortschrittsvisualisierung
- **Export/Import** - Daten portieren
- **Mobile App** - React Native Version
- **Team-Features** - Gruppen-Gewohnheiten
- **Erweiterte AI-Features** - Persönliche Empfehlungen

### Technische Verbesserungen
- **GraphQL API** - Flexiblere Datenabfragen
- **Microservices** - Service-Aufteilung
- **Caching Layer** - Redis Integration
- **Message Queue** - Asynchrone Verarbeitung
- **Monitoring** - Prometheus + Grafana

## 📄 **Lizenz**

Dieses Projekt steht unter der MIT-Lizenz. Siehe LICENSE-Datei für Details.

## 🤝 **Beitragen**

1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📧 **Kontakt**

Bei Fragen oder Problemen:
- GitHub Issues erstellen
- Dokumentation prüfen
- Community-Forum nutzen

---

**Die Habit Tracker Anwendung ist vollständig funktionsfähig und bereit für den produktiven Einsatz!** 🎉
