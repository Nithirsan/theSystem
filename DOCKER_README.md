# Habit Tracker - Docker Setup

Dieses Repository enthält eine vollständige Docker-Konfiguration für die Habit Tracker Anwendung.

## 🚀 Schnellstart

### Voraussetzungen
- Docker und Docker Compose installiert
- Git installiert

### 1. Repository klonen
```bash
git clone <repository-url>
cd theSystem
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp docker.env .env
# Bearbeite .env mit deinen Werten
```

### 3. Anwendung starten
```bash
# Alle Services starten
make up

# Oder mit Docker Compose
docker-compose up -d
```

### 4. Anwendung testen
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Nginx Proxy: http://localhost:80

## 📋 Verfügbare Befehle

```bash
# Hilfe anzeigen
make help

# Alle Services starten
make up

# Services stoppen
make down

# Logs anzeigen
make logs

# Services neu starten
make restart

# Alles bereinigen
make clean

# Entwicklungsumgebung
make dev

# Produktionsumgebung
make prod

# Einzelne Services
make frontend
make backend
make mysql

# Health Check
make health

# Datenbank Backup
make backup

# Datenbank Restore
make restore FILE=backup_file.sql
```

## 🏗️ Architektur

### Services
- **Frontend**: React-Anwendung (Port 3000)
- **Backend**: Go API-Server (Port 8080)
- **MySQL**: Datenbank (Port 3306)
- **Nginx**: Reverse Proxy (Port 80/443)

### Netzwerk
Alle Services kommunizieren über das `habit-tracker-network`.

## 🔧 Konfiguration

### Umgebungsvariablen
```bash
# Datenbank
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=habit_tracker
MYSQL_USER=habit_user
MYSQL_PASSWORD=habit_password

# JWT
JWT_SECRET=your-super-secret-jwt-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### Externe Datenbank
Falls du eine externe MySQL-Datenbank verwendest:

```bash
# In docker.env kommentiere die lokale MySQL-Konfiguration aus
# und aktiviere die externe Konfiguration:

# DB_HOST=w01e619c.kasserver.com
# DB_PORT=3306
# DB_USER=d045301c
# DB_PASSWORD=Passwort0815
# DB_NAME=d045301c
```

## 🛠️ Entwicklung

### Hot Reloading aktivieren
```bash
# Entwicklungsumgebung mit Hot Reloading
make dev

# Oder
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Einzelne Services entwickeln
```bash
# Nur Frontend starten
make frontend

# Nur Backend starten
make backend

# Nur Datenbank starten
make mysql
```

## 📊 Monitoring

### Health Checks
```bash
# Service-Status prüfen
make health

# Einzelne Services prüfen
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

## 🔒 Sicherheit

### Produktions-Deployment
1. **SSL-Zertifikate** konfigurieren:
   ```bash
   # SSL-Zertifikate in ./ssl/ ablegen
   mkdir ssl
   # cert.pem und key.pem hinzufügen
   ```

2. **Nginx HTTPS** aktivieren:
   ```bash
   # In nginx.conf die HTTPS-Sektion aktivieren
   ```

3. **Umgebungsvariablen** sicher konfigurieren:
   ```bash
   # Starke Passwörter und Secrets verwenden
   JWT_SECRET=very-long-random-secret-key
   MYSQL_ROOT_PASSWORD=very-strong-password
   ```

### Rate Limiting
Nginx ist mit Rate Limiting konfiguriert:
- API: 10 Requests/Sekunde
- Login: 5 Requests/Minute

## 🗄️ Datenbank

### Backup
```bash
# Automatisches Backup
make backup

# Manuelles Backup
docker-compose exec mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD habit_tracker > backup.sql
```

### Restore
```bash
# Backup wiederherstellen
make restore FILE=backup.sql

# Manuell
docker-compose exec -T mysql mysql -u root -p$MYSQL_ROOT_PASSWORD habit_tracker < backup.sql
```

### Migrationen
```bash
# Datenbank-Migrationen ausführen
docker-compose exec backend ./main migrate
```

## 🐛 Troubleshooting

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

### Logs analysieren
```bash
# Detaillierte Logs
docker-compose logs --tail=100 -f

# Einzelne Services
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql
```

## 📈 Performance

### Optimierungen
- **Multi-stage Builds** für kleinere Images
- **Health Checks** für bessere Verfügbarkeit
- **Nginx Caching** für statische Dateien
- **Rate Limiting** für API-Schutz

### Monitoring
```bash
# Ressourcenverbrauch
docker stats

# Container-Status
docker-compose ps
```

## 🔄 Updates

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

# Datenbank-Backup vor Updates
make backup
```

## 📞 Support

Bei Problemen:
1. Logs prüfen: `make logs`
2. Health Check: `make health`
3. Services neu starten: `make restart`
4. Alles bereinigen: `make clean && make up`
