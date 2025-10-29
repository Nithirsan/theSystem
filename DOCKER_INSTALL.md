# Docker Installation Guide

## Windows Installation

### Option 1: Docker Desktop (Empfohlen)
1. **Docker Desktop herunterladen**:
   - Gehe zu: https://www.docker.com/products/docker-desktop/
   - Lade Docker Desktop für Windows herunter

2. **Installation**:
   - Führe die heruntergeladene `.exe` Datei aus
   - Folge den Installationsanweisungen
   - Starte Docker Desktop nach der Installation

3. **Verifikation**:
   ```powershell
   docker --version
   docker-compose --version
   ```

### Option 2: Mit Chocolatey
```powershell
# Chocolatey installieren (falls nicht vorhanden)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Docker installieren
choco install docker-desktop
```

### Option 3: Mit Winget
```powershell
winget install Docker.DockerDesktop
```

## Voraussetzungen

### Windows
- Windows 10/11 (64-bit)
- WSL 2 aktiviert
- Virtualisierung aktiviert im BIOS

### WSL 2 aktivieren
```powershell
# Als Administrator ausführen
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# WSL 2 als Standard setzen
wsl --set-default-version 2

# Neustart erforderlich
```

## Nach der Installation

### 1. Docker Desktop starten
- Docker Desktop aus dem Startmenü starten
- Warten bis Docker läuft (Icon in der Taskleiste)

### 2. Verifikation
```powershell
# Docker-Version prüfen
docker --version

# Docker-Compose-Version prüfen
docker-compose --version

# Docker-Status prüfen
docker info
```

### 3. Erste Schritte
```powershell
# Test-Container starten
docker run hello-world

# Alle Container anzeigen
docker ps -a

# Docker-Images anzeigen
docker images
```

## Troubleshooting

### Häufige Probleme

1. **"Docker is not running"**:
   - Docker Desktop starten
   - Warten bis vollständig geladen

2. **WSL 2 Fehler**:
   ```powershell
   # WSL 2 aktualisieren
   wsl --update
   
   # WSL 2 neu starten
   wsl --shutdown
   ```

3. **Virtualisierung nicht aktiviert**:
   - BIOS/UEFI-Einstellungen prüfen
   - Virtualisierung aktivieren

4. **Port-Konflikte**:
   - Andere Anwendungen auf Ports 80, 3000, 8080, 3306 prüfen
   - Ports in docker-compose.yml ändern

### Performance-Optimierungen

1. **Ressourcen in Docker Desktop**:
   - Docker Desktop öffnen
   - Settings → Resources
   - CPU und Memory erhöhen

2. **WSL 2 Backend**:
   - Docker Desktop → Settings → General
   - "Use the WSL 2 based engine" aktivieren

## Alternative: Docker ohne Desktop

### Docker Engine nur
```powershell
# Docker Engine installieren (ohne Desktop)
choco install docker-engine

# Docker-Compose separat installieren
choco install docker-compose
```

## Nächste Schritte

Nach erfolgreicher Docker-Installation:

1. **Repository klonen**:
   ```powershell
   git clone <repository-url>
   cd theSystem
   ```

2. **Umgebungsvariablen konfigurieren**:
   ```powershell
   copy docker.env .env
   # .env bearbeiten
   ```

3. **Anwendung starten**:
   ```powershell
   # Mit Makefile
   make up
   
   # Oder direkt
   docker-compose up -d
   ```

4. **Anwendung testen**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8080
   - Nginx: http://localhost:80

## Support

Bei Problemen:
1. Docker Desktop Logs prüfen
2. WSL 2 Status prüfen: `wsl --status`
3. Docker-Info: `docker info`
4. System-Ressourcen prüfen
5. Neustart versuchen
