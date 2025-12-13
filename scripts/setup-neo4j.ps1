<#
.SYNOPSIS
    Neo4j Setup Script for Kilocode
.DESCRIPTION
    Automated setup script for Neo4j Community Edition on Windows Server 2019.
    Checks Java requirements, downloads Neo4j, installs as Windows Service, and configures firewall.
.PARAMETER Password
    Password for Neo4j database (default: "neo4j")
.PARAMETER InstallPath
    Installation directory for Neo4j (default: "C:\Neo4j")
.EXAMPLE
    .\setup-neo4j.ps1 -Password "mypassword" -InstallPath "C:\Neo4j"
#>

param(
    [string]$Password = "neo4j",
    [string]$InstallPath = "C:\Neo4j"
)

# Ensure script is running with administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script requires administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Neo4j Setup for Kilocode ===" -ForegroundColor Green
Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
Write-Host ""

# 1. Check Java
Write-Host "Step 1: Checking Java installation..." -ForegroundColor Yellow

try {
    $javaVersion = & java -version 2>&1 | Select-String "version"
    if ($javaVersion) {
        Write-Host "✅ Java is installed: $javaVersion" -ForegroundColor Green
        
        # Extract version number
        $versionMatch = $javaVersion -match '\"(\d+)'
        if ($matches) {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -lt 17) {
                Write-Host "⚠️  Warning: Neo4j requires Java 17 or later. Current version may be incompatible." -ForegroundColor Yellow
            }
        }
    }
}
catch {
    Write-Host "❌ Java is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Java 17 or 21 from one of these sources:" -ForegroundColor Cyan
    Write-Host "  - OpenJDK: https://adoptium.net/" -ForegroundColor White
    Write-Host "  - Oracle JDK: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, add Java to your PATH and run this script again." -ForegroundColor Cyan
    exit 1
}

# 2. Create installation directory
Write-Host "`nStep 2: Preparing installation directory..." -ForegroundColor Yellow

if (Test-Path $InstallPath) {
    Write-Host "⚠️  Directory $InstallPath already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to continue? This may overwrite existing files (y/n)"
    if ($response -ne 'y') {
        Write-Host "Installation cancelled" -ForegroundColor Red
        exit 0
    }
} else {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "✅ Created directory: $InstallPath" -ForegroundColor Green
}

# 3. Download Neo4j
Write-Host "`nStep 3: Downloading Neo4j Community Edition..." -ForegroundColor Yellow

$neo4jVersion = "5.27.0"
$neo4jUrl = "https://dist.neo4j.org/neo4j-community-$neo4jVersion-windows.zip"
$zipPath = Join-Path $env:TEMP "neo4j-community-$neo4jVersion-windows.zip"

Write-Host "Downloading from: $neo4jUrl" -ForegroundColor Cyan

try {
    # Try to download
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $neo4jUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ Downloaded Neo4j $neo4jVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to download from official source" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative options:" -ForegroundColor Yellow
    Write-Host "1. Download manually from: https://neo4j.com/download-center/#community" -ForegroundColor White
    Write-Host "2. Use a VPN if CloudFront is blocked in your region" -ForegroundColor White
    Write-Host "3. Download from alternative mirrors" -ForegroundColor White
    Write-Host ""
    Write-Host "After manual download, extract to: $InstallPath" -ForegroundColor Cyan
    exit 1
}

# 4. Extract Neo4j
Write-Host "`nStep 4: Extracting Neo4j..." -ForegroundColor Yellow

try {
    Expand-Archive -Path $zipPath -DestinationPath $InstallPath -Force
    
    # Move files from nested directory to root
    $extractedDir = Get-ChildItem -Path $InstallPath -Directory | Where-Object { $_.Name -like "neo4j-*" } | Select-Object -First 1
    if ($extractedDir) {
        Get-ChildItem -Path $extractedDir.FullName | Move-Item -Destination $InstallPath -Force
        Remove-Item $extractedDir.FullName -Recurse -Force
    }
    
    Write-Host "✅ Extracted Neo4j to $InstallPath" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to extract Neo4j" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # Cleanup temp file
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
}

# 5. Configure Neo4j
Write-Host "`nStep 5: Configuring Neo4j..." -ForegroundColor Yellow

$configPath = Join-Path $InstallPath "conf\neo4j.conf"
if (Test-Path $configPath) {
    # Backup original config
    Copy-Item $configPath "$configPath.backup" -Force
    
    # Update configuration
    $config = Get-Content $configPath
    $config = $config -replace '#server.default_listen_address=0.0.0.0', 'server.default_listen_address=127.0.0.1'
    $config = $config -replace '#server.bolt.enabled=true', 'server.bolt.enabled=true'
    $config = $config -replace '#server.http.enabled=true', 'server.http.enabled=true'
    $config | Set-Content $configPath
    
    Write-Host "✅ Neo4j configured (listening on localhost)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Configuration file not found at $configPath" -ForegroundColor Yellow
}

# 6. Install as Windows Service
Write-Host "`nStep 6: Installing Neo4j as Windows Service..." -ForegroundColor Yellow

$neo4jBat = Join-Path $InstallPath "bin\neo4j.bat"
if (Test-Path $neo4jBat) {
    try {
        & $neo4jBat install-service
        Write-Host "✅ Neo4j service installed" -ForegroundColor Green
        
        # Start the service
        Start-Service Neo4j
        Write-Host "✅ Neo4j service started" -ForegroundColor Green
        
        # Wait for Neo4j to be ready
        Write-Host "Waiting for Neo4j to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
    }
    catch {
        Write-Host "⚠️  Service installation warning: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "You may need to start Neo4j manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Neo4j executable not found at $neo4jBat" -ForegroundColor Red
    exit 1
}

# 7. Configure Firewall
Write-Host "`nStep 7: Configuring Windows Firewall..." -ForegroundColor Yellow

try {
    # Allow HTTP (7474) and Bolt (7687)
    New-NetFirewallRule -DisplayName "Neo4j HTTP" -Direction Inbound -LocalPort 7474 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "Neo4j Bolt" -Direction Inbound -LocalPort 7687 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "✅ Firewall rules created for ports 7474 (HTTP) and 7687 (Bolt)" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Could not create firewall rules: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "You may need to configure firewall manually" -ForegroundColor Yellow
}

# 8. Change default password
Write-Host "`nStep 8: Changing default password..." -ForegroundColor Yellow

$cypherShell = Join-Path $InstallPath "bin\cypher-shell.bat"
if (Test-Path $cypherShell) {
    try {
        # Try to connect and change password
        $changePasswordQuery = "ALTER CURRENT USER SET PASSWORD FROM 'neo4j' TO '$Password'"
        & $cypherShell -u neo4j -p neo4j $changePasswordQuery 2>&1 | Out-Null
        Write-Host "✅ Password changed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Could not change password automatically" -ForegroundColor Yellow
        Write-Host "Please change it manually via Neo4j Browser at http://localhost:7474" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️  Cypher Shell not found, skipping password change" -ForegroundColor Yellow
}

# 9. Verify installation
Write-Host "`nStep 9: Verifying installation..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:7474" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Neo4j is running and accessible at http://localhost:7474" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Could not verify Neo4j is running" -ForegroundColor Yellow
    Write-Host "Please check the service status or visit http://localhost:7474 manually" -ForegroundColor Cyan
}

# Summary
Write-Host "`n=== Installation Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Neo4j Community Edition $neo4jVersion has been installed!" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Neo4j Browser at http://localhost:7474" -ForegroundColor White
Write-Host "  2. Login with username: neo4j" -ForegroundColor White
Write-Host "  3. Password: $Password" -ForegroundColor White
Write-Host ""
Write-Host "Service Management:" -ForegroundColor Cyan
Write-Host "  Start:   Start-Service Neo4j" -ForegroundColor White
Write-Host "  Stop:    Stop-Service Neo4j" -ForegroundColor White
Write-Host "  Status:  Get-Service Neo4j" -ForegroundColor White
Write-Host ""
Write-Host "Installation directory: $InstallPath" -ForegroundColor Cyan
Write-Host ""