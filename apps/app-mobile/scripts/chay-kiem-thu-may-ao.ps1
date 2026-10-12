# Kiểm thử app trên máy ảo Android: bật máy ảo, backend trên cơ sở dữ liệu TẠM, nạp dữ liệu thử, web học tập, Metro, chạy các luồng Maestro, dọn dẹp.
#
# Dùng:
#   pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1                       # chạy mọi luồng
#   pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1 -Flows khach-tham-quan # chỉ một luồng (tên tệp trong e2e, không đuôi .yaml)
#   pwsh -File ... -KeepRunning                                                        # chạy xong không tắt dịch vụ, không xoá cơ sở dữ liệu tạm
#
# Cần sẵn: Android SDK (%LOCALAPPDATA%\Android\Sdk) có emulator và system image, AVD (script tự tạo nếu chưa có), .NET SDK, Node, Python, SQL Server LocalDB, Java 17.
# Maestro: script tự tải bản mới nhất từ GitHub (mobile-dev-inc/maestro) vào %USERPROFILE%\tools\maestro nếu chưa có.
# Quan trọng: script CHỈ thao tác trên máy ảo (emulator-5554), không đụng tới điện thoại thật đang cắm hoặc kết nối không dây.
[CmdletBinding()]
param(
    [string[]] $Flows = @('khach-tham-quan', 'hoc-sinh-dang-nhap-sai', 'hoc-sinh-khoi-3', 'hoc-sinh-khoi-11'),
    [string] $AvdName = 'dsvhvn_pixel',
    [string] $Serial = 'emulator-5554',
    [switch] $KeepRunning
)

$ErrorActionPreference = 'Stop'
$Flows = @($Flows | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$appDir = Split-Path -Parent $PSScriptRoot
$feRoot = Resolve-Path (Join-Path $appDir '..\..')
$beRoot = Resolve-Path (Join-Path $feRoot '..\BE_Cultural_Heritage-')
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$maestroHome = Join-Path $env:USERPROFILE 'tools\maestro\maestro'
$work = Join-Path $env:TEMP ("dsvhvn-e2e-" + (Get-Date -Format 'yyyyMMddHHmmss'))
New-Item -ItemType Directory -Force $work | Out-Null
$started = New-Object System.Collections.Generic.List[int]
$startedEmulator = $false
$dbName = 'dsvhvn_tam_app_' + (Get-Date -Format 'yyyyMMddHHmm')
$adminPassword = 'Tm' + ([guid]::NewGuid().ToString('N').Substring(0, 10)) + 'Aa1'

$env:ANDROID_HOME = $sdk
$env:ANDROID_SERIAL = $Serial
$env:PATH = "$sdk\platform-tools;$sdk\emulator;$maestroHome\bin;$env:PATH"
$env:JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8'
$env:MAESTRO_CLI_NO_ANALYTICS = '1'
$env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'
$env:PYTHONIOENCODING = 'utf-8'

function Step([string] $text) { Write-Host "`n== $text" -ForegroundColor Cyan }

function Wait-Until([scriptblock] $test, [int] $seconds, [string] $what) {
    $end = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $end) {
        try { if (& $test) { return } } catch { }
        Start-Sleep -Seconds 2
    }
    throw "Hết thời gian chờ: $what"
}

function Ensure-Maestro {
    if (Test-Path "$maestroHome\bin\maestro.bat") { return }
    Step 'Tải Maestro (bản phát hành mới nhất trên GitHub)'
    $dl = Join-Path $env:USERPROFILE 'tools\_tai-maestro'
    New-Item -ItemType Directory -Force $dl, (Split-Path -Parent $maestroHome) | Out-Null
    $release = Invoke-RestMethod 'https://api.github.com/repos/mobile-dev-inc/maestro/releases/latest'
    $zip = ($release.assets | Where-Object { $_.name -eq 'maestro.zip' }).browser_download_url
    Invoke-WebRequest $zip -OutFile "$dl\maestro.zip"
    Expand-Archive "$dl\maestro.zip" -DestinationPath (Split-Path -Parent $maestroHome) -Force
}

function Ensure-Emulator {
    $running = (& adb devices) -match "^$Serial\s+device"
    if ($running) { Write-Host "Máy ảo $Serial đã chạy sẵn, dùng lại."; return }
    $avds = & "$sdk\emulator\emulator.exe" -list-avds
    if ($avds -notcontains $AvdName) {
        Step "Tạo AVD $AvdName"
        'no' | & "$sdk\cmdline-tools\latest\bin\avdmanager.bat" create avd -n $AvdName -k 'system-images;android-36;google_apis_playstore;x86_64' -d pixel_7 --force | Out-Null
    }
    Step "Bật máy ảo $AvdName"
    # -gpu host cho WebGL (trình xem 3D) chạy được; swiftshader làm tiến trình vẽ của WebView sập.
    Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList "-avd $AvdName -no-audio -no-snapshot -gpu host -memory 3072" `
        -RedirectStandardOutput "$work\emulator.log" -RedirectStandardError "$work\emulator.err" -WindowStyle Minimized | Out-Null
    $script:startedEmulator = $true
    Wait-Until { (& adb -s $Serial shell getprop sys.boot_completed 2>$null) -match '1' } 240 'máy ảo khởi động xong'
}

function Prepare-Emulator {
    foreach ($setting in 'verifier_verify_adb_installs', 'package_verifier_enable') { & adb -s $Serial shell settings put global $setting 0 | Out-Null }
    foreach ($setting in 'window_animation_scale', 'transition_animation_scale', 'animator_duration_scale') { & adb -s $Serial shell settings put global $setting 0 | Out-Null }
}

function Ensure-ExpoGo {
    if ((& adb -s $Serial shell pm list packages host.exp.exponent) -match 'host.exp.exponent') { return }
    # Không dùng `expo start --android`: khi có điện thoại thật cắm adb, Expo CLI mở Expo Go trên điện thoại thay vì máy ảo.
    $apk = Get-ChildItem (Join-Path $env:USERPROFILE '.expo\android-apk-cache') -Filter 'Expo-Go-*.apk' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $apk) { throw 'Máy ảo chưa có Expo Go và chưa có tệp APK trong %USERPROFILE%\.expo\android-apk-cache. Rút điện thoại thật, chạy `npx expo start --port 8083 --android` một lần để Expo CLI tải và cài, rồi chạy lại script.' }
    Step "Cài Expo Go ($($apk.Name)) vào máy ảo"
    & adb -s $Serial install -r $apk.FullName | Out-Null
}

function Start-Background([string] $file, [string] $arguments, [string] $dir, [string] $log) {
    $p = Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $dir -RedirectStandardOutput "$log.out" -RedirectStandardError "$log.err" -WindowStyle Hidden -PassThru
    $script:started.Add($p.Id)
    return $p
}

function Stop-Tree([int] $processId) {
    & taskkill /PID $processId /T /F 2>$null | Out-Null
}

function Stop-Port([int] $port) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Cleanup {
    if ($KeepRunning) { Write-Host "`nGiữ nguyên dịch vụ và cơ sở dữ liệu tạm $dbName (-KeepRunning)."; return }
    Step 'Dọn dẹp'
    foreach ($id in $started) { Stop-Tree $id }
    foreach ($port in 5080, 5174, 8083) { Stop-Port $port }
    if ($startedEmulator) { & adb -s $Serial emu kill 2>$null | Out-Null }
    & sqlcmd -S '(localdb)\MSSQLLocalDB' -Q "IF DB_ID('$dbName') IS NOT NULL BEGIN ALTER DATABASE [$dbName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$dbName]; END" 2>$null | Out-Null
    Write-Host "Đã tắt tiến trình đã bật và xoá cơ sở dữ liệu tạm $dbName."
}

$results = @()
foreach ($port in 5080, 5174, 8083) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Cổng $port đang bị dùng: tắt dịch vụ đang chạy rồi chạy lại script." }
}
try {
    Ensure-Maestro
    & adb start-server | Out-Null
    Ensure-Emulator
    Prepare-Emulator

    Step "Backend trên cơ sở dữ liệu tạm $dbName"
    $env:ConnectionStrings__Default = "Server=(localdb)\MSSQLLocalDB;Database=$dbName;Trusted_Connection=True;TrustServerCertificate=True"
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:Email__Mode = 'Log'
    $env:Ai__Mode = 'Simulated'
    $env:Storage__Provider = 'Local'
    $env:Seed__AdminPassword = $adminPassword
    $env:Cors__AllowedOrigins__0 = 'http://localhost:5173'
    $env:Cors__AllowedOrigins__1 = 'http://localhost:5174'
    $env:Cors__AllowedOrigins__2 = 'http://10.0.2.2:5174'
    $beLog = Join-Path $work 'backend'
    Start-Background 'dotnet' 'run --project src/DSVHVN.Api --launch-profile http --urls http://0.0.0.0:5080' $beRoot $beLog | Out-Null
    Wait-Until { (Invoke-WebRequest 'http://localhost:5080/api/v1/public/languages' -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } 240 'backend sẵn sàng'

    Step 'Nạp dữ liệu thử'
    $fixture = Join-Path $work 'du-lieu-thu.json'
    $env:BASE = 'http://localhost:5080'
    $env:API_LOG = "$beLog.out"
    $env:ADMIN_PASSWORD = $adminPassword
    $env:OUT = $fixture
    & python (Join-Path $PSScriptRoot 'seed-du-lieu-thu.py')
    if ($LASTEXITCODE -ne 0) { throw 'Nạp dữ liệu thử thất bại' }
    $data = Get-Content $fixture -Raw -Encoding utf8 | ConvertFrom-Json

    Step 'Web học tập (trang nhúng bản đồ, 3D)'
    $env:VITE_API_BASE_URL = 'http://10.0.2.2:5080/api/v1'
    Start-Background 'cmd' '/c npm run dev:hoc-tap -- --host' $feRoot (Join-Path $work 'web') | Out-Null
    Wait-Until { (Invoke-WebRequest 'http://localhost:5174/' -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } 120 'web học tập sẵn sàng'

    Step 'Metro (Expo) cho app'
    $env:EXPO_PUBLIC_API_BASE_URL = 'http://10.0.2.2:5080/api/v1'
    $env:EXPO_PUBLIC_WEB_BASE_URL = 'http://10.0.2.2:5174'
    $env:EXPO_NO_TELEMETRY = '1'
    Ensure-ExpoGo
    Start-Background 'cmd' '/c npx expo start --port 8083' $appDir (Join-Path $work 'metro') | Out-Null
    Wait-Until { (Get-Content "$work\metro.out" -Raw -ErrorAction SilentlyContinue) -match 'Waiting on http://localhost:8083' } 300 'Metro sẵn sàng (gói được dựng khi luồng đầu tiên mở app)'

    $e2e = Join-Path $appDir 'e2e'
    $envFor = @{
        'khach-tham-quan'        = @()
        'hoc-sinh-dang-nhap-sai' = @("STUDENT_CODE=$($data.students.quen3.studentCode)")
        'hoc-sinh-khoi-3'        = @("STUDENT_CODE=$($data.students.moi3.studentCode)", "STUDENT_PASSWORD=$($data.students.moi3.password)", 'NEW_PASSWORD=EmHocDiSan2026', "LESSON_CODE=$($data.lessons.'3'.code)")
        'hoc-sinh-khoi-11'       = @("STUDENT_CODE=$($data.students.moi11.studentCode)", "STUDENT_PASSWORD=$($data.students.moi11.password)", 'NEW_PASSWORD=EmHocDiSan2026', "LESSON_CODE=$($data.lessons.'11'.code)")
    }
    foreach ($flow in $Flows) {
        Step "Luồng $flow"
        $outDir = Join-Path $work "ket-qua\$flow"
        $maestroArgs = @('--device', $Serial, 'test', '--test-output-dir', $outDir)
        foreach ($pair in $envFor[$flow]) { $maestroArgs += @('-e', $pair) }
        $maestroArgs += (Join-Path $e2e "$flow.yaml")
        $passed = $false
        for ($attempt = 1; $attempt -le 3 -and -not $passed; $attempt++) {
            & adb -s $Serial shell pm clear host.exp.exponent | Out-Null
            $log = Join-Path $work "maestro-$flow-$attempt.txt"
            & "$maestroHome\bin\maestro.bat" @maestroArgs *> $log
            if ($LASTEXITCODE -eq 0) { $passed = $true; break }
            $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
            # Có bước "FAILED" là lỗi thật của app; không có thì là máy ảo hoặc trình điều khiển Maestro rớt kết nối, chạy lại.
            if (($text -match 'FAILED' -and $text -notmatch 'device offline') -or $text -match 'Đặt mật khẩu') { break }
            Write-Host "Lần $attempt rớt kết nối, chạy lại..." -ForegroundColor Yellow
            # Luồng học sinh dùng tài khoản một lần nên đã qua bước đổi mật khẩu thì không chạy lại.
        }
        $results += [pscustomobject]@{ Flow = $flow; Result = $(if ($passed) { 'DAT' } else { 'KHONG DAT' }); Output = $outDir }
    }
}
finally {
    Write-Host "`nTệp tạm và ảnh chụp: $work"
    if ($results.Count -gt 0) { $results | Format-Table -AutoSize | Out-String | Write-Host }
    Cleanup
}
if ($results | Where-Object { $_.Result -ne 'DAT' }) { exit 1 }
