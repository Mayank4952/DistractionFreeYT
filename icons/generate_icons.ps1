# Generate simple PNG icons for the extension using PowerShell + System.Drawing
# Creates 16x16, 48x48, and 128x128 icons with a red circle and white crosshair

Add-Type -AssemblyName System.Drawing

function New-Icon {
    param([int]$Size, [string]$Path)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Red circle background
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(231, 76, 60))
    $g.FillEllipse($brush, 0, 0, $Size - 1, $Size - 1)

    # White crosshair / target
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(1, $Size / 12))
    $center = $Size / 2
    $r1 = $Size * 0.3
    $r2 = $Size * 0.15

    # Outer ring
    $g.DrawEllipse($pen, ($center - $r1), ($center - $r1), ($r1 * 2), ($r1 * 2))
    # Inner dot
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($dotBrush, ($center - $r2), ($center - $r2), ($r2 * 2), ($r2 * 2))

    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Created $Path ($Size x $Size)"
}

New-Icon -Size 16  -Path "d:\DistractionFreeYT\icons\icon16.png"
New-Icon -Size 48  -Path "d:\DistractionFreeYT\icons\icon48.png"
New-Icon -Size 128 -Path "d:\DistractionFreeYT\icons\icon128.png"
