# 框架开发数据库关闭脚本（仅停止框架容器，不影响业务侧）
# 对应 start-framework-db.ps1

$pgContainer    = "framework-postgres"
$redisContainer = "framework-redis"
$stripeContainer = "framework-stripe"

$stopped = $false

foreach ($name in @($pgContainer, $redisContainer, $stripeContainer)) {
    $running = docker ps -q -f "name=$name" 2>$null
    if ($running) {
        docker stop $name | Out-Null
        Write-Host "Stopped '$name'" -ForegroundColor Green
        $stopped = $true
    }
}

if (-not $stopped) {
    Write-Host "No framework containers are running." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "All framework containers stopped. Data is preserved." -ForegroundColor Green
    Write-Host "Run .\start-framework-db.ps1 to restart." -ForegroundColor Gray
}
