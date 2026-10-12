<#
.SYNOPSIS
  Dựng tệp APK Android của app "Học di sản" ngay trên máy này (không cần tài khoản Expo), chạy tay bằng tài khoản người dùng.

.DESCRIPTION
  Cần Android SDK (ANDROID_HOME hoặc %LOCALAPPDATA%\Android\Sdk), Java 17, Node, và bật đường dẫn dài của Windows
  (LongPathsEnabled = 1; không bật thì ninja báo "build.ninja still dirty").
  Các bước: npm ci (nếu chưa có node_modules) -> expo prebuild -> gradlew assembleRelease (chỉ arm64-v8a)
  -> chép APK ra apps/app-mobile/dist-apk/hoc-di-san-<phiên bản>-<yyyyMMdd>.apk -> trả lại package.json.
  Runner của GitHub trên máy demo chạy bằng NETWORK SERVICE, không có Android SDK, nên APK không dựng trong workflow.

.PARAMETER ApiBaseUrl
  Địa chỉ API công khai mà app gọi (đã gồm /api/v1). Mặc định là đường hầm ngrok của máy demo.

.PARAMETER WebBaseUrl
  Địa chỉ web học tập công khai, nơi app nhúng bản đồ và mô hình 3D.

.PARAMETER AdMobAndroidAppId
  Mã ứng dụng AdMob (ca-app-pub-...~...). Mặc định lấy biến môi trường ADMOB_ANDROID_APP_ID; không có thì dùng mã ứng dụng thử của Google trong app.json.

.PARAMETER TestDeviceIds
  Danh sách mã băm thiết bị thử của AdMob, cách nhau bằng dấu phẩy (tuỳ chọn).

.PARAMETER TaiLenRelease
  Tên tag của GitHub Release để tải APK lên (tuỳ chọn), ví dụ v0.1.

.PARAMETER LamSach
  Thêm --clean cho expo prebuild: xoá và sinh lại thư mục android/.

.EXAMPLE
  ./scripts/dung-apk.ps1
  ./scripts/dung-apk.ps1 -TaiLenRelease v0.1
#>
[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'https://maynard-unphysical-planographically.ngrok-free.dev/api/v1',
    [string]$WebBaseUrl = 'https://maynard-unphysical-planographically.ngrok-free.dev',
    [string]$AdMobAndroidAppId = $env:ADMOB_ANDROID_APP_ID,
    [string]$TestDeviceIds,
    [string]$TaiLenRelease,
    [switch]$LamSach
)

$ErrorActionPreference = 'Stop'
$KhoGitHub = 'Nho2708/FE_Cultural_Heritage-'
$ThuMucApp = Join-Path (Split-Path -Parent $PSScriptRoot) 'apps\app-mobile'

function Ghi([string]$noiDung) { Write-Host "[dung-apk] $noiDung" }

# Chạy lệnh ngoài và dừng nếu mã thoát khác 0.
function Chay([string]$mota, [scriptblock]$lenh) {
    Ghi $mota
    & $lenh
    if ($LASTEXITCODE -ne 0) { throw "$mota thất bại (mã thoát $LASTEXITCODE)." }
}

if (-not (Test-Path -LiteralPath $ThuMucApp -PathType Container)) { throw "Không thấy thư mục app: $ThuMucApp" }
Set-Location -LiteralPath $ThuMucApp

# Gradle cần biết Android SDK ở đâu.
if (-not $env:ANDROID_HOME) {
    $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (-not (Test-Path -LiteralPath $sdk)) { throw "Không thấy Android SDK. Cài Android Studio hoặc đặt biến ANDROID_HOME." }
    $env:ANDROID_HOME = $sdk
}
if (-not $env:JAVA_HOME -and -not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Không thấy Java 17 (JAVA_HOME).' }
$dai = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -ErrorAction SilentlyContinue).LongPathsEnabled
if ($dai -ne 1) { Ghi 'CẢNH BÁO: Windows chưa bật đường dẫn dài (LongPathsEnabled), bước biên dịch có thể lỗi "build.ninja still dirty".' }

$appJson = (Get-Content -LiteralPath (Join-Path $ThuMucApp 'app.json') -Raw -Encoding UTF8 | ConvertFrom-Json).expo
$phienBan = $appJson.version
if (-not $phienBan) { throw 'app.json không có expo.version.' }

# Mã ứng dụng AdMob: không đặt thì để app.config.ts rơi về mã thử trong app.json.
$maThu = $null
foreach ($p in $appJson.plugins) {
    if ($p -is [System.Array] -and $p[0] -eq 'react-native-google-mobile-ads') { $maThu = $p[1].androidAppId }
}

# package.json bị expo prebuild sửa script android/ios; nếu đang có sửa đổi của người dùng thì không dám trả lại bằng git checkout.
git diff --quiet -- package.json
if ($LASTEXITCODE -ne 0) { throw 'apps/app-mobile/package.json đang có thay đổi chưa commit; hãy commit hoặc hoàn tác trước khi dựng.' }

$bienCu = @{}
foreach ($ten in 'EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_WEB_BASE_URL', 'ADMOB_ANDROID_APP_ID', 'EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS') {
    $bienCu[$ten] = [Environment]::GetEnvironmentVariable($ten, 'Process')
}

$batDau = Get-Date
try {
    if (-not (Test-Path -LiteralPath (Join-Path $ThuMucApp 'node_modules'))) {
        Chay 'Cài thư viện (npm ci)' { npm ci }
    }

    $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
    $env:EXPO_PUBLIC_WEB_BASE_URL = $WebBaseUrl
    if ($AdMobAndroidAppId) {
        $env:ADMOB_ANDROID_APP_ID = $AdMobAndroidAppId
        Ghi "Mã ứng dụng AdMob Android: $AdMobAndroidAppId"
    }
    else {
        Remove-Item Env:\ADMOB_ANDROID_APP_ID -ErrorAction SilentlyContinue
        Ghi "Mã ứng dụng AdMob Android: mã thử của Google trong app.json ($maThu)"
    }
    if ($TestDeviceIds) { $env:EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS = $TestDeviceIds }
    else { Remove-Item Env:\EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS -ErrorAction SilentlyContinue }
    Ghi "API: $ApiBaseUrl"
    Ghi "Web nhúng: $WebBaseUrl"

    if ($LamSach) { Chay 'Sinh thư mục android (expo prebuild --clean)' { npx expo prebuild --platform android --no-install --clean } }
    else { Chay 'Sinh thư mục android (expo prebuild)' { npx expo prebuild --platform android --no-install } }

    Push-Location (Join-Path $ThuMucApp 'android')
    try {
        Chay 'Dựng APK bằng Gradle (có thể mất 10 đến 20 phút)' { .\gradlew.bat assembleRelease '-PreactNativeArchitectures=arm64-v8a' }
    }
    finally { Pop-Location }

    $apkGoc = Join-Path $ThuMucApp 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $apkGoc)) { throw "Gradle chạy xong nhưng không thấy $apkGoc" }

    $thuMucRa = Join-Path $ThuMucApp 'dist-apk'
    New-Item -ItemType Directory -Force -Path $thuMucRa | Out-Null
    $apk = Join-Path $thuMucRa ("hoc-di-san-{0}-{1}.apk" -f $phienBan, (Get-Date -Format 'yyyyMMdd'))
    Copy-Item -LiteralPath $apkGoc -Destination $apk -Force

    $tep = Get-Item -LiteralPath $apk
    $bam = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
    Ghi "Đường dẫn: $($tep.FullName)"
    Ghi ("Kích thước: {0} MB ({1} byte)" -f [math]::Round($tep.Length / 1MB, 1), $tep.Length)
    Ghi "SHA-256: $bam"

    if ($TaiLenRelease) {
        Chay "Tải APK lên Release $TaiLenRelease" { gh release upload $TaiLenRelease $apk --clobber -R $KhoGitHub }
    }
    Ghi ("Xong sau {0} phút." -f [math]::Round(((Get-Date) - $batDau).TotalMinutes, 1))
}
finally {
    # prebuild sửa script android/ios trong package.json: luôn trả lại.
    Set-Location -LiteralPath $ThuMucApp
    git checkout -- package.json
    foreach ($ten in $bienCu.Keys) { [Environment]::SetEnvironmentVariable($ten, $bienCu[$ten], 'Process') }
}
