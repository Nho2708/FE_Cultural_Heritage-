<#
.SYNOPSIS
  Tạo một lần khóa tải lên Google Play (upload key) cho app "DiViet", lưu ngoài repo.

.DESCRIPTION
  Google Play ký app phát hành bằng khóa ký của Google (Play App Signing); nhóm chỉ giữ khóa tải lên để ký tệp AAB trước khi tải lên.
  Script sinh mật khẩu ngẫu nhiên, tạo khoa-tai-len.jks (PKCS12, RSA 2048, hạn 10000 ngày, bí danh "upload") và khoa-tai-len.json
  (mật khẩu, bí danh) trong thư mục khóa. Mật khẩu chỉ đi qua biến môi trường của tiến trình này, không in ra màn hình.
  Đã có khóa thì dừng, không ghi đè. Sau khi tạo: chép cả thư mục khóa ra nơi cất giữ an toàn (mất khóa thì phải nhờ Google Play đặt lại).
  Dựng AAB bằng khóa này: scripts/dung-apk.ps1 -ChoGooglePlay

.PARAMETER ThuMucKhoa
  Thư mục lưu khóa, mặc định %APPDATA%\DSVHVN\google-play.
#>
[CmdletBinding()]
param(
    [string]$ThuMucKhoa = (Join-Path $env:APPDATA 'DSVHVN\google-play')
)

$ErrorActionPreference = 'Stop'
$tepKhoa = Join-Path $ThuMucKhoa 'khoa-tai-len.jks'
$tepMatKhau = Join-Path $ThuMucKhoa 'khoa-tai-len.json'
if ((Test-Path -LiteralPath $tepKhoa) -or (Test-Path -LiteralPath $tepMatKhau)) {
    throw "Đã có khóa tải lên ở $ThuMucKhoa; không tạo lại để khỏi mất khóa đang dùng."
}

$keytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\keytool.exe' } else { (Get-Command keytool -ErrorAction Stop).Source }
if (-not (Test-Path -LiteralPath $keytool)) { throw "Không thấy keytool ($keytool). Cài Java 17 và đặt JAVA_HOME." }

# PKCS12 dùng chung một mật khẩu cho kho khóa và khóa.
$bytes = [byte[]]::new(24)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$matKhau = [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_')
$biDanh = 'upload'

New-Item -ItemType Directory -Force -Path $ThuMucKhoa | Out-Null
$env:DIVIET_MAT_KHAU_KHOA_MOI = $matKhau
try {
    & $keytool -genkeypair -storetype PKCS12 -keystore $tepKhoa -alias $biDanh -keyalg RSA -keysize 2048 -validity 10000 `
        -dname 'CN=DiViet, O=DiViet, C=VN' -storepass:env DIVIET_MAT_KHAU_KHOA_MOI -keypass:env DIVIET_MAT_KHAU_KHOA_MOI 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $tepKhoa)) { throw "keytool không tạo được khóa (mã thoát $LASTEXITCODE)." }
    [ordered]@{ storePassword = $matKhau; keyAlias = $biDanh; keyPassword = $matKhau } | ConvertTo-Json |
        Set-Content -LiteralPath $tepMatKhau -Encoding UTF8
    $danhSach = (& $keytool -list -v -keystore $tepKhoa -alias $biDanh -storepass:env DIVIET_MAT_KHAU_KHOA_MOI 2>&1) -join "`n"
} finally {
    Remove-Item Env:\DIVIET_MAT_KHAU_KHOA_MOI -ErrorAction SilentlyContinue
    $matKhau = $null
}

$vanTay = [regex]::Match($danhSach, 'SHA256:\s*([0-9A-F:]+)').Groups[1].Value
$hetHan = [regex]::Match($danhSach, 'until:\s*(.+)').Groups[1].Value.Trim()
Write-Host "Đã tạo khóa tải lên: $tepKhoa" -ForegroundColor Green
Write-Host "Bí danh: $biDanh | hết hạn: $hetHan"
Write-Host "Chứng chỉ (SHA-256): $vanTay"
Write-Host "Hãy chép cả thư mục $ThuMucKhoa ra nơi cất giữ an toàn (không đưa vào git, không gửi qua chat)."
