<#
.SYNOPSIS
  Dựng tệp APK (cài tay) hoặc AAB (tải lên Google Play) của app "DiViet" ngay trên máy này (không cần tài khoản Expo).

.DESCRIPTION
  Cần Android SDK (ANDROID_HOME hoặc %LOCALAPPDATA%\Android\Sdk), Java 17, Node, và bật đường dẫn dài của Windows
  (LongPathsEnabled = 1; không bật thì ninja báo "build.ninja still dirty").
  Các bước: npm ci (nếu chưa có node_modules) -> expo prebuild -> gradlew assembleRelease (chỉ arm64-v8a)
  -> chép APK ra apps/app-mobile/dist-apk/diviet-<phiên bản>-<yyyyMMdd>.apk -> trả lại package.json.
  Với -ChoGooglePlay: expo prebuild --clean -> gradlew bundleRelease (đủ bốn kiến trúc) ký bằng khóa tải lên
  (tạo một lần bằng scripts/tao-khoa-tai-len.ps1) -> apps/app-mobile/dist-apk/diviet-<phiên bản>-<versionCode>-<yyyyMMdd>.aab.
  Mỗi lần tải lên Google Play phải tăng expo.android.versionCode trong app.json.
  Runner của GitHub trên máy demo chạy bằng NETWORK SERVICE, không có Android SDK, nên APK không dựng trong workflow.

.PARAMETER ApiBaseUrl
  Địa chỉ API công khai mà app gọi (đã gồm /api/v1). Mặc định là máy chủ Google Cloud.

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

.PARAMETER ChoGooglePlay
  Dựng tệp AAB ký bằng khóa tải lên để đưa lên Google Play (bắt buộc mã ứng dụng AdMob thật, không nhận máy thử).

.PARAMETER ThuMucKhoa
  Thư mục chứa khóa tải lên (khoa-tai-len.jks và khoa-tai-len.json), mặc định %APPDATA%\DSVHVN\google-play.

.EXAMPLE
  ./scripts/dung-apk.ps1
  ./scripts/dung-apk.ps1 -TaiLenRelease v0.1
  ./scripts/dung-apk.ps1 -ChoGooglePlay
#>
[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'https://diviet.id.vn/api/v1',
    [string]$WebBaseUrl = 'https://diviet.id.vn',
    [string]$AdMobAndroidAppId = $env:ADMOB_ANDROID_APP_ID,
    [string]$TestDeviceIds,
    [string]$TaiLenRelease,
    [switch]$LamSach,
    [switch]$ChoGooglePlay,
    [string]$ThuMucKhoa = (Join-Path $env:APPDATA 'DSVHVN\google-play')
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

# Bản cho Google Play: kiểm trước khi chạy Gradle lâu.
$khoa = $null
if ($ChoGooglePlay) {
    if ($TestDeviceIds) { throw 'Bản cho Google Play không được khai máy thử AdMob (bỏ -TestDeviceIds).' }
    if (-not $AdMobAndroidAppId -or $AdMobAndroidAppId -eq $maThu) { throw 'Bản cho Google Play cần mã ứng dụng AdMob thật (-AdMobAndroidAppId hoặc biến ADMOB_ANDROID_APP_ID).' }
    if (-not $appJson.android.versionCode) { throw 'app.json không có expo.android.versionCode.' }
    $tepKhoa = Join-Path $ThuMucKhoa 'khoa-tai-len.jks'
    $tepMatKhau = Join-Path $ThuMucKhoa 'khoa-tai-len.json'
    if (-not (Test-Path -LiteralPath $tepKhoa) -or -not (Test-Path -LiteralPath $tepMatKhau)) {
        throw "Chưa có khóa tải lên ở $ThuMucKhoa. Chạy scripts/tao-khoa-tai-len.ps1 một lần trước."
    }
    $khoa = Get-Content -LiteralPath $tepMatKhau -Raw -Encoding UTF8 | ConvertFrom-Json
    $LamSach = $true # đổi mã gói hay cấu hình ký đều cần sinh lại android/ từ đầu
}

# package.json bị expo prebuild sửa script android/ios; nếu đang có sửa đổi của người dùng thì không dám trả lại bằng git checkout.
git diff --quiet -- package.json
if ($LASTEXITCODE -ne 0) { throw 'apps/app-mobile/package.json đang có thay đổi chưa commit; hãy commit hoặc hoàn tác trước khi dựng.' }

$bienCu = @{}
$bienKhoa = 'DIVIET_UPLOAD_STORE_FILE', 'DIVIET_UPLOAD_STORE_PASSWORD', 'DIVIET_UPLOAD_KEY_ALIAS', 'DIVIET_UPLOAD_KEY_PASSWORD'
foreach ($ten in @('EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_WEB_BASE_URL', 'ADMOB_ANDROID_APP_ID', 'EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS') + $bienKhoa) {
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
    # Mật khẩu khóa chỉ nằm trong biến môi trường của tiến trình này (Gradle đọc), không in, không ghi vào android/.
    foreach ($ten in $bienKhoa) { Remove-Item "Env:\$ten" -ErrorAction SilentlyContinue }
    if ($khoa) {
        $env:DIVIET_UPLOAD_STORE_FILE = $tepKhoa
        $env:DIVIET_UPLOAD_STORE_PASSWORD = $khoa.storePassword
        $env:DIVIET_UPLOAD_KEY_ALIAS = $khoa.keyAlias
        $env:DIVIET_UPLOAD_KEY_PASSWORD = $khoa.keyPassword
        Ghi "Ký bằng khóa tải lên: $tepKhoa (bí danh $($khoa.keyAlias)), versionCode $($appJson.android.versionCode)"
    }
    Ghi "API: $ApiBaseUrl"
    Ghi "Web nhúng: $WebBaseUrl"

    if ($LamSach) { Chay 'Sinh thư mục android (expo prebuild --clean)' { npx expo prebuild --platform android --no-install --clean } }
    else { Chay 'Sinh thư mục android (expo prebuild)' { npx expo prebuild --platform android --no-install } }

    Push-Location (Join-Path $ThuMucApp 'android')
    try {
        if ($ChoGooglePlay) { Chay 'Dựng AAB bằng Gradle, đủ bốn kiến trúc (có thể mất 30 đến 60 phút)' { .\gradlew.bat bundleRelease } }
        else { Chay 'Dựng APK bằng Gradle (có thể mất 10 đến 20 phút)' { .\gradlew.bat assembleRelease '-PreactNativeArchitectures=arm64-v8a' } }
    }
    finally { Pop-Location }

    if ($ChoGooglePlay) {
        $aabGoc = Join-Path $ThuMucApp 'android\app\build\outputs\bundle\release\app-release.aab'
        if (-not (Test-Path -LiteralPath $aabGoc)) { throw "Gradle chạy xong nhưng không thấy $aabGoc" }
        $thuMucRa = Join-Path $ThuMucApp 'dist-apk'
        New-Item -ItemType Directory -Force -Path $thuMucRa | Out-Null
        $aab = Join-Path $thuMucRa ("diviet-{0}-{1}-{2}.aab" -f $phienBan, $appJson.android.versionCode, (Get-Date -Format 'yyyyMMdd'))
        Copy-Item -LiteralPath $aabGoc -Destination $aab -Force
        # Chứng chỉ ký của tệp AAB phải là khóa tải lên, không phải khóa gỡ lỗi.
        $keytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\keytool.exe' } else { 'keytool' }
        $chungChi = (& $keytool -printcert -jarfile $aab 2>&1) -join "`n"
        if ($chungChi -match 'Android Debug') { throw 'Tệp AAB vẫn ký bằng khóa gỡ lỗi; kiểm lại cấu hình ký trong android/app/build.gradle.' }
        $vanTay = [regex]::Match($chungChi, 'SHA256:\s*([0-9A-F:]+)').Groups[1].Value
        $tep = Get-Item -LiteralPath $aab
        Ghi "Đường dẫn: $($tep.FullName)"
        Ghi ("Kích thước: {0} MB ({1} byte)" -f [math]::Round($tep.Length / 1MB, 1), $tep.Length)
        Ghi "Chứng chỉ ký (SHA-256): $vanTay"
        Ghi ("Xong sau {0} phút." -f [math]::Round(((Get-Date) - $batDau).TotalMinutes, 1))
        return
    }

    $apkGoc = Join-Path $ThuMucApp 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $apkGoc)) { throw "Gradle chạy xong nhưng không thấy $apkGoc" }

    $thuMucRa = Join-Path $ThuMucApp 'dist-apk'
    New-Item -ItemType Directory -Force -Path $thuMucRa | Out-Null
    $apk = Join-Path $thuMucRa ("diviet-{0}-{1}.apk" -f $phienBan, (Get-Date -Format 'yyyyMMdd'))
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
