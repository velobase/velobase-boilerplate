# 框架开发数据库启动脚本（与业务侧 velobase_dev 完全隔离）
# PostgreSQL: localhost:5433  数据库: velobase_boilerplate
# Redis:      localhost:6380
#
# 业务侧使用:
#   PostgreSQL: localhost:5432  数据库: velobase_dev
#   Redis:      localhost:6379
#
# 用法:
#   .\start-framework-db.ps1           # 启动 PostgreSQL + Redis
#   .\start-framework-db.ps1 -Stripe   # 同上 + Stripe webhook 转发

param(
    [switch]$Stripe
)

$ErrorActionPreference = "Stop"

# ── 框架固定配置（修改这里不会影响业务侧）──────────────────────────
$dbUser      = "velobase"
$dbPassword  = "velobase"
$dbName      = "velobase_boilerplate"
$dbPort      = "5433"    # 业务侧用 5432，框架用 5433
$redisPort   = "6380"    # 业务侧用 6379，框架用 6380

$pgContainer    = "framework-postgres"
$redisContainer = "framework-redis"
$stripeContainer = "framework-stripe"
# ──────────────────────────────────────────────────────────────────

# 检查 Docker
try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# ==================== PostgreSQL ====================
Write-Host ""
Write-Host "=== PostgreSQL (framework) ===" -ForegroundColor Cyan

$running = docker ps -q -f "name=$pgContainer" 2>$null
if ($running) {
    Write-Host "Container '$pgContainer' is already running" -ForegroundColor Green
} else {
    $exists = docker ps -q -a -f "name=$pgContainer" 2>$null
    if ($exists) {
        docker start $pgContainer | Out-Null
        Write-Host "Existing container '$pgContainer' started" -ForegroundColor Green
    } else {
        $portInUse = netstat -ano | Select-String "LISTENING" | Select-String ":$dbPort\s"
        if ($portInUse) {
            Write-Host "Warning: Port $dbPort is already in use." -ForegroundColor Yellow
        } else {
            docker run -d `
                --name $pgContainer `
                -e POSTGRES_USER=$dbUser `
                -e POSTGRES_PASSWORD=$dbPassword `
                -e POSTGRES_DB=$dbName `
                -p "${dbPort}:5432" `
                postgres:16 | Out-Null
            Write-Host "Container '$pgContainer' created (user=$dbUser, db=$dbName, port=$dbPort)" -ForegroundColor Green
        }
    }
}

# ==================== Redis ====================
Write-Host ""
Write-Host "=== Redis (framework) ===" -ForegroundColor Cyan

$running = docker ps -q -f "name=$redisContainer" 2>$null
if ($running) {
    Write-Host "Container '$redisContainer' is already running" -ForegroundColor Green
} else {
    $exists = docker ps -q -a -f "name=$redisContainer" 2>$null
    if ($exists) {
        docker start $redisContainer | Out-Null
        Write-Host "Existing container '$redisContainer' started" -ForegroundColor Green
    } else {
        $portInUse = netstat -ano | Select-String "LISTENING" | Select-String ":$redisPort\s"
        if ($portInUse) {
            Write-Host "Warning: Port $redisPort is already in use." -ForegroundColor Yellow
        } else {
            docker run -d `
                --name $redisContainer `
                -p "${redisPort}:6379" `
                redis:7 | Out-Null
            Write-Host "Container '$redisContainer' created (port=$redisPort)" -ForegroundColor Green
        }
    }
}

# ==================== Stripe CLI (optional) ====================
if ($Stripe) {
    Write-Host ""
    Write-Host "=== Stripe CLI (framework) ===" -ForegroundColor Cyan

    $envFile = Join-Path $PSScriptRoot ".env"
    $stripeSecretKey = ""
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match '(?m)^STRIPE_SECRET_KEY=(.+)$') {
            $stripeSecretKey = $Matches[1].Trim().Trim('"')
        }
    }

    if (-not $stripeSecretKey) {
        Write-Host "Error: STRIPE_SECRET_KEY not found in .env." -ForegroundColor Red
    } else {
        $existing = docker ps -q -a -f "name=$stripeContainer" 2>$null
        if ($existing) { docker rm -f $stripeContainer | Out-Null }

        Write-Host "Forwarding Stripe webhooks to http://host.docker.internal:3000/api/webhooks/stripe" -ForegroundColor Yellow
        Write-Host "Copy the webhook signing secret and set STRIPE_WEBHOOK_SECRET in .env" -ForegroundColor Magenta

        docker run --rm `
            --name $stripeContainer `
            stripe/stripe-cli:latest listen `
            --api-key $stripeSecretKey `
            --forward-to http://host.docker.internal:3000/api/webhooks/stripe
    }
} else {
    # ==================== Summary ====================
    Write-Host ""
    Write-Host "=== Framework DB Ready ===" -ForegroundColor Green
    Write-Host "  PostgreSQL : localhost:$dbPort/$dbName  (user=$dbUser)"
    Write-Host "  Redis      : localhost:$redisPort"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  pnpm db:migrate    # Apply database migrations"
    Write-Host "  pnpm dev           # Start dev server"
    Write-Host ""
    Write-Host "To stop:  .\stop-framework-db.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "NOTE: Business-side containers (velobase_dev-postgres:5432, velobase_dev-redis:6379)" -ForegroundColor DarkGray
    Write-Host "      are NOT affected by this script." -ForegroundColor DarkGray
}
