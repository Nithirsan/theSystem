# 🚀 Quick Start Guide - Habit Tracker

## ✅ **Sofort starten**

### Schritt 1: Docker installieren
```bash
# Docker Desktop herunterladen und installieren
# https://www.docker.com/products/docker-desktop/

# Verifikation
docker --version
docker-compose --version
```

### Schritt 2: Anwendung starten
```bash
# Repository klonen (falls noch nicht geschehen)
git clone <repository-url>
cd theSystem

# Umgebungsvariablen konfigurieren
copy docker.env .env
# .env bearbeiten und OpenAI API Key eintragen

# Alle Services starten
make up

# Oder mit Docker Compose
docker-compose up -d
```

### Schritt 3: Anwendung testen
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Nginx Proxy**: http://localhost:80

### Schritt 4: Erste Schritte
1. **Benutzer registrieren** auf der Anmeldungsseite
2. **Dashboard erkunden** - Übersicht über alle Features
3. **Gewohnheit erstellen** - Erste Gewohnheit hinzufügen
4. **Aufgabe erstellen** - Todo-Liste nutzen
5. **AI Coach testen** - Unterhaltung mit dem AI Coach
6. **Journal-Eintrag** - Tägliche Reflexion

## 🔧 **Konfiguration**

### OpenAI API Key
```bash
# In .env Datei eintragen
OPENAI_API_KEY=your-openai-api-key-here
```

### Externe Datenbank (Optional)
```bash
# Falls externe MySQL-Datenbank verwendet werden soll
# In .env die lokale MySQL-Konfiguration auskommentieren
# und externe Konfiguration aktivieren:

# DB_HOST=w01e619c.kasserver.com
# DB_PORT=3306
# DB_USER=d045301c
# DB_PASSWORD=Passwort0815
# DB_NAME=d045301c
```

## 📋 **Verfügbare Befehle**

```bash
# Hilfe anzeigen
make help

# Services starten/stoppen
make up          # Starten
make down        # Stoppen
make restart     # Neustart

# Logs und Monitoring
make logs        # Alle Logs
make health      # Health Check

# Entwicklung
make dev         # Development mit Hot Reloading
make frontend    # Nur Frontend
make backend     # Nur Backend + MySQL

# Wartung
make build       # Images neu bauen
make clean       # Alles bereinigen
make backup      # Datenbank-Backup
```

## 🎯 **Features erkunden**

### Dashboard
- Tagesfortschritt anzeigen
- Heutige Gewohnheiten abhaken
- Heutige Aufgaben verwalten
- Aktive Ziele verfolgen

### Gewohnheiten-Tracker
- Neue Gewohnheiten erstellen
- Kategorien wählen (Morgen, Nachmittag, Abend)
- Täglich abhaken
- Fortschritt verfolgen

### Aufgaben-Management
- Aufgaben mit Prioritäten erstellen
- Fälligkeitsdaten setzen
- Aufgaben abhaken
- Prioritäts-basierte Sortierung

### AI Coach
- Neue Unterhaltung starten
- Mit AI Coach chatten
- Intelligente Vorschläge erhalten
- Gesprächsverlauf verfolgen

### Journal
- Tägliche Einträge erstellen
- Stimmung tracken
- Tags hinzufügen
- Durch verschiedene Tage navigieren

## 🔒 **Sicherheit**

### Standard-Konfiguration
- Sichere Passwort-Hashes (bcrypt)
- JWT-Tokens mit Ablaufzeit
- CORS-Konfiguration
- Rate Limiting (API: 10 req/s, Login: 5 req/min)
- Input-Validierung
- SQL-Injection-Schutz

### Produktions-Deployment
1. **Starke Passwörter** in .env verwenden
2. **SSL-Zertifikate** konfigurieren
3. **Firewall** einrichten
4. **Backup-Strategie** implementieren

## 📊 **Monitoring**

### Health Checks
```bash
# Service-Status prüfen
make health

# Einzelne Services testen
curl http://localhost:8080/health  # Backend
curl http://localhost:3000          # Frontend
curl http://localhost:80            # Nginx
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

## 🐛 **Troubleshooting**

### Häufige Probleme

1. **Port-Konflikte**:
   ```bash
   # Andere Ports verwenden
   docker-compose down
   # Ports in docker-compose.yml ändern
   docker-compose up -d
   ```

2. **Datenbank-Verbindung**:
   ```bash
   # MySQL-Status prüfen
   docker-compose logs mysql
   
   # Datenbank-Verbindung testen
   docker-compose exec mysql mysql -u root -p$MYSQL_ROOT_PASSWORD
   ```

3. **Frontend-Build-Fehler**:
   ```bash
   # Node-Modules neu installieren
   docker-compose exec frontend npm install
   
   # Cache leeren
   docker-compose exec frontend npm run build -- --force
   ```

4. **Backend-Start-Fehler**:
   ```bash
   # Go-Modules aktualisieren
   docker-compose exec backend go mod tidy
   
   # Dependencies neu laden
   docker-compose exec backend go mod download
   ```

### Debugging
```bash
# Service-Status prüfen
make health

# Logs analysieren
make logs

# Services neu starten
make restart

# Alles bereinigen und neu starten
make clean && make up
```

## 📈 **Performance**

### Optimierungen aktiviert
- Multi-stage Docker Builds
- Nginx Caching für statische Dateien
- Database Indexing
- Lazy Loading im Frontend
- API Response Caching

### Ressourcenverbrauch
```bash
# Docker Stats anzeigen
docker stats

# Container-Status
docker-compose ps
```

## 🔄 **Updates**

### Anwendung aktualisieren
```bash
# Code aktualisieren
git pull

# Images neu bauen
make build

# Services neu starten
make restart
```

### Datenbank-Updates
```bash
# Migrationen ausführen
docker-compose exec backend ./main migrate

# Backup vor Updates
make backup
```

## 📞 **Support**

### Bei Problemen
1. **Logs prüfen**: `make logs`
2. **Health Check**: `make health`
3. **Services neu starten**: `make restart`
4. **Alles bereinigen**: `make clean && make up`

### Dokumentation
- **README.md**: Vollständige Dokumentation
- **DOCKER_INSTALL.md**: Docker-Installation
- **DOCKER_README.md**: Docker-Setup Details
- **FINAL_SUMMARY.md**: Implementierte Features

## 🎉 **Fertig!**

**Die Habit Tracker Anwendung ist jetzt vollständig funktionsfähig und bereit für den produktiven Einsatz!**

### Was du jetzt tun kannst:
1. ✅ **Anwendung starten** mit `make up`
2. ✅ **Benutzer registrieren** und anmelden
3. ✅ **Alle Features erkunden** - Dashboard, Gewohnheiten, Aufgaben, AI Coach, Journal
4. ✅ **Daten hinzufügen** und verwalten
5. ✅ **AI Coach testen** mit OpenAI-Integration
6. ✅ **Journal führen** für tägliche Reflexion

**Viel Erfolg mit deiner neuen Habit Tracker Anwendung!** 🚀✨
