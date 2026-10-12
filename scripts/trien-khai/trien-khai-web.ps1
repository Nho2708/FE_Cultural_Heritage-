<#
.SYNOPSIS
  Triển khai một web tĩnh (web quản trị hoặc web học tập) lên thư mục của site IIS, có kiểm tra và tự trả bản trước nếu hỏng.

.DESCRIPTION
  1. Kiểm gói đã build có index.html (thẻ gốc id="root") và web.config.
  2. Sao bản đang chạy sang "<Dich>-truoc".
  3. Chép gói mới vào Dich (robocopy /MIR).
  4. Gọi KiemUrl tới khi trả 200 và nội dung có thẻ gốc của ứng dụng; quá thời gian thì trả "<Dich>-truoc" về và thoát mã 1.
  Chạy được ở lần đầu (Dich chưa có hoặc đang trống). Dùng chung cho workflow và khi triển khai tay lúc runner tắt.

.EXAMPLE
  ./scripts/trien-khai/trien-khai-web.ps1 -ThuMucGoi .\apps\web-hoc-tap\dist -Dich C:\dsvhvn\web-hoc-tap -KiemUrl http://localhost:8082/
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ThuMucGoi,
    [Parameter(Mandatory = $true)][string]$Dich,
    [Parameter(Mandatory = $true)][string]$KiemUrl,
    [int]$ThoiGianChoGiay = 30
)

$ErrorActionPreference = 'Stop'
$TheGoc = 'id="root"'

function Ghi([string]$noiDung) { Write-Host "[trien-khai] $noiDung" }

# Chép thư mục bằng robocopy; mã thoát 0 đến 7 là thành công, từ 8 trở lên là lỗi.
function Sao-Chep([string]$nguon, [string]$dich) {
    New-Item -ItemType Directory -Force -Path $dich | Out-Null
    & robocopy $nguon $dich /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy lỗi (mã thoát $LASTEXITCODE) khi chép '$nguon' sang '$dich'."
    }
    $global:LASTEXITCODE = 0
}

# Gọi địa chỉ kiểm tra tới khi nhận 200 kèm thẻ gốc của ứng dụng hoặc hết thời gian.
function Cho-Web-San-Sang([string]$url, [int]$giay) {
    $han = (Get-Date).AddSeconds($giay)
    $loiCuoi = 'chưa nhận được phản hồi'
    do {
        try {
            $traLoi = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($traLoi.StatusCode -eq 200 -and $traLoi.Content.Contains($TheGoc)) { return $true }
            $loiCuoi = "mã $($traLoi.StatusCode), nội dung không có thẻ $TheGoc"
        }
        catch {
            $loiCuoi = $_.Exception.Message
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $han)
    Ghi "Lần kiểm cuối: $loiCuoi"
    return $false
}

$ThuMucGoi = [System.IO.Path]::GetFullPath($ThuMucGoi)
$Dich = [System.IO.Path]::GetFullPath($Dich).TrimEnd('\')
$Truoc = "$Dich-truoc"

Ghi "Gói mới: $ThuMucGoi"
Ghi "Thư mục đích: $Dich (bản trước giữ ở $Truoc)"

# 1. Kiểm gói
$chiMuc = Join-Path $ThuMucGoi 'index.html'
if (-not (Test-Path -LiteralPath $chiMuc -PathType Leaf)) {
    Ghi 'Gói không có index.html, dừng.'
    exit 1
}
if (-not (Get-Content -LiteralPath $chiMuc -Raw).Contains($TheGoc)) {
    Ghi "index.html của gói không có thẻ gốc $TheGoc, dừng."
    exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $ThuMucGoi 'web.config') -PathType Leaf)) {
    Ghi 'Gói không có web.config (cần cho IIS), dừng.'
    exit 1
}

$daChep = $false
try {
    # 2. Giữ bản đang chạy (thư mục đích trống hoặc chưa có thì bản trước cũng trống)
    Ghi 'Sao bản đang chạy sang thư mục bản trước.'
    New-Item -ItemType Directory -Force -Path $Dich | Out-Null
    Sao-Chep $Dich $Truoc

    # 3. Chép bản mới
    Ghi 'Chép bản mới vào thư mục đích.'
    $daChep = $true
    Sao-Chep $ThuMucGoi $Dich

    # 4. Kiểm bằng cách gọi thật
    Ghi "Kiểm $KiemUrl (chờ tối đa $ThoiGianChoGiay giây)."
    if (Cho-Web-San-Sang $KiemUrl $ThoiGianChoGiay) {
        Ghi 'Thành công: web đã chạy bản mới.'
        exit 0
    }
    throw "Web không trả 200 kèm thẻ gốc trong $ThoiGianChoGiay giây."
}
catch {
    Ghi "LỖI: $($_.Exception.Message)"
    if ($daChep) {
        Ghi 'Trả lại bản trước.'
        try {
            Sao-Chep $Truoc $Dich
            Ghi 'Đã trả lại bản trước.'
        }
        catch {
            Ghi "Không trả lại được bản trước: $($_.Exception.Message)"
        }
    }
    exit 1
}
