Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "photos"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$width = 1280
$height = 800
$titles = @(
    "NIGHT RIDE",
    "FAMILY MEET",
    "BLACKOUT",
    "DOWNTOWN",
    "GARAGE",
    "RED LINE",
    "CITY LIGHTS",
    "BLANCH CREW"
)

for ($i = 1; $i -le 8; $i++) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $accent = switch ($i % 4) {
        0 { [System.Drawing.Color]::FromArgb(230, 100, 210, 255) }
        1 { [System.Drawing.Color]::FromArgb(230, 230, 28, 42) }
        2 { [System.Drawing.Color]::FromArgb(230, 230, 230, 235) }
        default { [System.Drawing.Color]::FromArgb(230, 165, 95, 255) }
    }

    $rect = New-Object System.Drawing.Rectangle 0,0,$width,$height
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255,0,0,0)), ([System.Drawing.Color]::FromArgb(255,22,5,10)), (25 + $i*7)
    $gfx.FillRectangle($bg, $rect)

    $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, $accent.R, $accent.G, $accent.B))
    $gfx.FillEllipse($glow, 690 - $i*25, 60, 560, 460)
    $gfx.FillEllipse($glow, -200, 360 - $i*10, 460, 330)

    $roadBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 0,500,$width,300), ([System.Drawing.Color]::FromArgb(255,8,9,11)), ([System.Drawing.Color]::FromArgb(255,38,40,46)), 90
    $road = @(
        (New-Object System.Drawing.Point 0,560),
        (New-Object System.Drawing.Point $width,450),
        (New-Object System.Drawing.Point $width,800),
        (New-Object System.Drawing.Point 0,800)
    )
    $gfx.FillPolygon($roadBrush, [System.Drawing.Point[]]$road)

    $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(45,255,255,255)), 2
    for ($x = -140; $x -lt $width + 180; $x += 120) {
        $gfx.DrawLine($linePen, $x, 0, $x - 145, $height)
    }
    for ($y = 80; $y -lt 520; $y += 110) {
        $gfx.DrawLine($linePen, 0, $y, $width, $y - 70)
    }

    $dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 5,5,7))
    $metal = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 82,88,98))
    $light = New-Object System.Drawing.SolidBrush $accent
    $outline = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(170,235,240,248)), 3

    if ($i -in @(1,3,5,7)) {
        $car = New-Object System.Drawing.Drawing2D.GraphicsPath
        $car.AddBezier(220, 505, 380, 435, 760, 430, 940, 510)
        $car.AddLine(1010, 585, 145, 585)
        $car.CloseFigure()
        $gfx.FillPath($dark, $car)
        $gfx.DrawPath($outline, $car)
        $gfx.FillPolygon($metal, [System.Drawing.Point[]]@(
            (New-Object System.Drawing.Point 400,465),
            (New-Object System.Drawing.Point 690,462),
            (New-Object System.Drawing.Point 785,510),
            (New-Object System.Drawing.Point 315,512)
        ))
        $gfx.FillRectangle($light, 890, 535, 82, 18)
        $gfx.FillRectangle($light, 170, 540, 58, 14)
        foreach ($wx in @(300,805)) {
            $gfx.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,0,0,0))), $wx, 548, 108, 108)
            $gfx.DrawEllipse((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(205,210,218,230), 5)), $wx + 22, 570, 64, 64)
        }
        $car.Dispose()
    } else {
        for ($p = 0; $p -lt 5; $p++) {
            $px = 215 + $p * 135
            $py = 360 + (($p + $i) % 2) * 22
            $gfx.FillEllipse($dark, $px + 26, $py, 48, 48)
            $gfx.FillRectangle($dark, $px + 12, $py + 45, 76, 145)
            $gfx.DrawLine((New-Object System.Drawing.Pen $accent, 4), $px + 12, $py + 50, $px + 88, $py + 50)
        }
        $gfx.FillRectangle($light, 165, 585, 710, 4)
    }

    $font = New-Object System.Drawing.Font "Georgia", 62, ([System.Drawing.FontStyle]::Bold)
    $small = New-Object System.Drawing.Font "Arial", 17, ([System.Drawing.FontStyle]::Bold)
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235,245,248,252))
    $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(175,180,186,196))
    $gfx.DrawString("BLANCH", $font, $white, 58, 52)
    $gfx.DrawString($titles[$i-1], $small, $light, 66, 132)
    $gfx.DrawString(("0{0}" -f $i), $small, $muted, 1120, 690)

    $scanPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(14,255,255,255)), 1
    for ($y = 0; $y -lt $height; $y += 5) {
        $gfx.DrawLine($scanPen, 0, $y, $width, $y)
    }

    $file = Join-Path $outDir ("photo-{0}.jpg" -f $i)
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Jpeg)

    $scanPen.Dispose()
    $font.Dispose()
    $small.Dispose()
    $white.Dispose()
    $muted.Dispose()
    $dark.Dispose()
    $metal.Dispose()
    $light.Dispose()
    $outline.Dispose()
    $linePen.Dispose()
    $roadBrush.Dispose()
    $glow.Dispose()
    $bg.Dispose()
    $gfx.Dispose()
    $bmp.Dispose()
}

Write-Output $outDir
