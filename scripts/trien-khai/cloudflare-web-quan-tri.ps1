<#
.SYNOPSIS
  Mở web quản trị của máy demo ra Internet qua đường hầm nhanh của Cloudflare (trycloudflare.com, không cần tài khoản).

.DESCRIPTION
  Đường hầm nhanh cấp một địa chỉ ngẫu nhiên https://<tên>.trycloudflare.com cho mỗi lần cloudflared chạy, nên địa chỉ đổi
  khi máy khởi động lại. Địa chỉ đang dùng được ghi vào <GocMay>\nhat-ky\cloudflare-web-quan-tri.txt.
  Web quản trị trên IIS đã chuyển /api sang API (cổng 8080), nên chỉ cần mở một cổng.

  Ba cách chạy (không cần quyền quản trị):
    -CaiTuDongChay  Tải cloudflared (kiểm chữ ký số của Cloudflare) vào <GocMay>\cloudflared nếu chưa có, chép script này vào đó,
                    tạo lối tắt trong thư mục Startup của người dùng để tự chạy khi đăng nhập, rồi chạy ngay.
    -GoCai          Dừng đường hầm và xoá lối tắt Startup.
    (không cờ)      Giữ đường hầm: chạy cloudflared, ghi địa chỉ, cloudflared thoát thì chạy lại sau 10 giây.

  Muốn địa chỉ cố định thì cần tài khoản Cloudflare có tên miền và dùng đường hầm có tên (named tunnel) chạy làm dịch vụ.

.EXAMPLE
  pwsh -File scripts\trien-khai\cloudflare-web-quan-tri.ps1 -CaiTuDongChay
  Get-Content C:\dsvhvn\nhat-ky\cloudflare-web-quan-tri.txt
#>
[CmdletBinding()]
param(
    [int]$Cong = 8081,
    [string]$GocMay = 'C:\dsvhvn',
    [switch]$CaiTuDongChay,
    [switch]$GoCai
)

$ErrorActionPreference = 'Stop'

$thuMuc = Join-Path $GocMay 'cloudflared'
$exe = Join-Path $thuMuc 'cloudflared.exe'
$banChay = Join-Path $thuMuc 'cloudflare-web-quan-tri.ps1'
$thuNhatKy = Join-Path $GocMay 'nhat-ky'
$tepDiaChi = Join-Path $thuNhatKy 'cloudflare-web-quan-tri.txt'
$tepLog = Join-Path $thuNhatKy 'cloudflared-web-quan-tri.log'
$loiTat = Join-Path ([Environment]::GetFolderPath('Startup')) 'DSVHVN Cloudflare web quan tri.lnk'

function Ghi([string]$noiDung) { Write-Host "[cloudflare] $noiDung" }

function Dung-DuongHam {
    Get-CimInstance Win32_Process -Filter "Name = 'pwsh.exe'" |
        Where-Object { $_.CommandLine -like "*$banChay*" -and $_.ProcessId -ne $PID } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Get-Process cloudflared -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq $exe } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}

if ($GoCai) {
    Dung-DuongHam
    Remove-Item -LiteralPath $loiTat -ErrorAction SilentlyContinue
    Ghi 'Đã dừng đường hầm và xoá lối tắt Startup.'
    return
}

if ($CaiTuDongChay) {
    New-Item -ItemType Directory -Force -Path $thuMuc, $thuNhatKy | Out-Null
    if (-not (Test-Path -LiteralPath $exe)) {
        Ghi 'Tải cloudflared bản mới nhất từ GitHub của Cloudflare...'
        $tam = Join-Path $thuMuc 'cloudflared.tai'
        Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $tam
        $chuKy = Get-AuthenticodeSignature -LiteralPath $tam
        if ($chuKy.Status -ne 'Valid' -or $chuKy.SignerCertificate.Subject -notmatch 'O="?Cloudflare, Inc\.') {
            Remove-Item -LiteralPath $tam -Force
            throw "Chữ ký của cloudflared không hợp lệ ($($chuKy.Status))."
        }
        Move-Item -LiteralPath $tam -Destination $exe -Force
    }
    Ghi "cloudflared: $((& $exe --version) -join ' ')"
    # Lối tắt trỏ tới bản chép trong thư mục máy demo, để đổi nhánh trong repo không làm hỏng việc tự chạy.
    Copy-Item -LiteralPath $PSCommandPath -Destination $banChay -Force
    $pwsh = (Get-Command pwsh).Source
    $thamSo = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$banChay`" -Cong $Cong -GocMay `"$GocMay`""
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($loiTat)
    $lnk.TargetPath = $pwsh
    $lnk.Arguments = $thamSo
    $lnk.WorkingDirectory = $thuMuc
    $lnk.WindowStyle = 7
    $lnk.Description = 'Mở web quản trị DSVHVN qua Cloudflare'
    $lnk.Save()
    Ghi "Đã tạo lối tắt Startup: $loiTat"
    Dung-DuongHam
    Start-Process -FilePath $pwsh -ArgumentList $thamSo -WindowStyle Hidden
    Ghi 'Đang mở đường hầm...'
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep -Seconds 2
        if ((Test-Path -LiteralPath $tepDiaChi) -and (Get-Item -LiteralPath $tepDiaChi).LastWriteTime -gt (Get-Date).AddMinutes(-2)) {
            Ghi "Web quản trị: $((Get-Content -LiteralPath $tepDiaChi -TotalCount 1).Trim())"
            return
        }
    }
    throw "Chưa thấy địa chỉ sau 90 giây; xem $tepLog."
}

# Vòng giữ đường hầm.
if (-not (Test-Path -LiteralPath $exe)) { throw "Chưa có $exe. Chạy với -CaiTuDongChay trước." }
New-Item -ItemType Directory -Force -Path $thuNhatKy | Out-Null
while ($true) {
    Remove-Item -LiteralPath $tepLog -ErrorAction SilentlyContinue
    $tienTrinh = Start-Process -FilePath $exe -WindowStyle Hidden -PassThru -ArgumentList @(
        'tunnel', '--no-autoupdate', '--url', "http://localhost:$Cong", '--logfile', $tepLog)
    $diaChi = $null
    for ($i = 0; $i -lt 60 -and -not $tienTrinh.HasExited -and -not $diaChi; $i++) {
        Start-Sleep -Seconds 2
        if (Test-Path -LiteralPath $tepLog) {
            $khop = Select-String -LiteralPath $tepLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -Last 1
            if ($khop) { $diaChi = $khop.Matches[0].Value }
        }
    }
    if ($diaChi) {
        Set-Content -LiteralPath $tepDiaChi -Encoding utf8 -Value @($diaChi, "Cập nhật $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), cổng $Cong")
    }
    $tienTrinh.WaitForExit()
    Start-Sleep -Seconds 10
}
