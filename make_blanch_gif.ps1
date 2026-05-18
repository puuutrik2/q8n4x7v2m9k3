Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.Serialization.Formatters.Soap

$out = Join-Path $PSScriptRoot "blanch-title.gif"
$framesDir = Join-Path $PSScriptRoot "gif-frames"
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null

$width = 960
$height = 320
$frameCount = 40
$text = "BLANCH"
$fontFamily = New-Object System.Drawing.FontFamily "Times New Roman"
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

function New-PropertyItem([int]$id, [int16]$type, [byte[]]$value) {
    $item = [System.Runtime.Serialization.FormatterServices]::GetUninitializedObject([System.Drawing.Imaging.PropertyItem])
    $item.Id = $id
    $item.Type = $type
    $item.Len = $value.Length
    $item.Value = $value
    return $item
}

function Draw-PathShift($gfx, $path, $dx, $dy, $brush, $pen) {
    $state = $gfx.Save()
    $gfx.TranslateTransform($dx, $dy)
    if ($brush -ne $null) { $gfx.FillPath($brush, $path) }
    if ($pen -ne $null) { $gfx.DrawPath($pen, $path) }
    $gfx.Restore($state)
}

for ($i = 0; $i -lt $frameCount; $i++) {
    $t = $i / ($frameCount - 1)
    $pulse = [Math]::Sin($t * [Math]::PI * 2)
    $glitch = if ($i -eq 9 -or $i -eq 23 -or $i -eq 31) { 8 } elseif ($i -eq 10 -or $i -eq 24) { -7 } else { 0 }

    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $bgRect = New-Object System.Drawing.Rectangle 0,0,$width,$height
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        [System.Drawing.Color]::FromArgb(255, 0, 0, 0),
        [System.Drawing.Color]::FromArgb(255, 9, 10, 12),
        90
    )
    $gfx.FillRectangle($bg, $bgRect)

    $vignette = New-Object System.Drawing.Drawing2D.GraphicsPath
    $vignette.AddEllipse(-120, -80, $width + 240, $height + 160)
    $pathBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $vignette
    $pathBrush.CenterColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
    $pathBrush.SurroundColors = [System.Drawing.Color[]]([System.Drawing.Color]::FromArgb(210, 0, 0, 0))
    $gfx.FillRectangle($pathBrush, $bgRect)

    $redGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int](28 + 22 * [Math]::Abs($pulse)), 175, 0, 15))
    $gfx.FillEllipse($redGlow, 210, 62, 540, 170)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $layout = New-Object System.Drawing.RectangleF 0,42,$width,190
    $path.AddString($text, $fontFamily, [int][System.Drawing.FontStyle]::Bold, 132, $layout, $format)
    $bounds = $path.GetBounds()

    $chrome = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bounds,
        [System.Drawing.Color]::FromArgb(255, 252, 253, 255),
        [System.Drawing.Color]::FromArgb(255, 25, 27, 32),
        90
    )
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend 8
    $blend.Positions = [single[]](0, .1, .22, .35, .52, .67, .82, 1)
    $blend.Colors = [System.Drawing.Color[]](
        [System.Drawing.Color]::FromArgb(255, 255,255,255),
        [System.Drawing.Color]::FromArgb(255, 135,141,150),
        [System.Drawing.Color]::FromArgb(255, 255,255,255),
        [System.Drawing.Color]::FromArgb(255, 70,74,82),
        [System.Drawing.Color]::FromArgb(255, 230,234,241),
        [System.Drawing.Color]::FromArgb(255, 108,114,124),
        [System.Drawing.Color]::FromArgb(255, 246,248,252),
        [System.Drawing.Color]::FromArgb(255, 18,20,24)
    )
    $chrome.InterpolationColors = $blend

    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(205, 0, 0, 0))
    $redBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(105, 255, 18, 32))
    $blueBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(45, 130, 200, 255))
    $outlinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(245, 245, 248, 252)), 2
    $darkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 0, 0, 0)), 7

    Draw-PathShift $gfx $path 0 12 $shadowBrush $null
    Draw-PathShift $gfx $path (4 + $glitch) 1 $redBrush $null
    Draw-PathShift $gfx $path (-3 - $glitch) -1 $blueBrush $null
    $gfx.DrawPath($darkPen, $path)
    $gfx.FillPath($chrome, $path)
    $gfx.DrawPath($outlinePen, $path)

    $shineX = -220 + $t * ($width + 440)
    $shine = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = New-Object 'System.Drawing.PointF[]' 4
    $pts[0] = New-Object System.Drawing.PointF ([single]$shineX), ([single]55)
    $pts[1] = New-Object System.Drawing.PointF ([single]($shineX + 70)), ([single]55)
    $pts[2] = New-Object System.Drawing.PointF ([single]($shineX - 65)), ([single]230)
    $pts[3] = New-Object System.Drawing.PointF ([single]($shineX - 135)), ([single]230)
    $shine.AddPolygon($pts)
    $shineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(135, 255,255,255))
    $gfx.SetClip($path)
    $gfx.FillPath($shineBrush, $shine)
    $gfx.ResetClip()

    $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 245,248,252)), 1
    $redPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb([int](90 + 40 * [Math]::Abs($pulse)), 225,18,32)), 2
    $gfx.DrawLine($linePen, 165, 248, 795, 248)
    $gfx.DrawLine($redPen, 330, 262, 630, 262)
    $gfx.DrawLine($linePen, 480, 32, 480, 68)
    $gfx.DrawLine($linePen, 480, 234, 480, 292)

    if ($glitch -ne 0) {
        $gPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(185, 255, 28, 42)), 3
        $gfx.DrawLine($gPen, 170, 146 + $glitch, 790, 146 + $glitch)
        $gfx.DrawLine($gPen, 235, 194 - $glitch, 725, 194 - $glitch)
        $gPen.Dispose()
    }

    $smallFont = New-Object System.Drawing.Font "Arial", 12, ([System.Drawing.FontStyle]::Bold)
    $smallBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(165, 184,190,198))
    $gfx.DrawString("GTA 5 RP FAMILY", $smallFont, $smallBrush, 411, 276)

    $grainPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(12, 255,255,255)), 1
    for ($y = ($i % 4); $y -lt $height; $y += 4) { $gfx.DrawLine($grainPen, 0, $y, $width, $y) }

    $frame = Join-Path $framesDir ("frame_{0:D2}.png" -f $i)
    $bmp.Save($frame, [System.Drawing.Imaging.ImageFormat]::Png)

    $grainPen.Dispose()
    $smallBrush.Dispose()
    $smallFont.Dispose()
    $linePen.Dispose()
    $redPen.Dispose()
    $shineBrush.Dispose()
    $shine.Dispose()
    $outlinePen.Dispose()
    $darkPen.Dispose()
    $shadowBrush.Dispose()
    $redBrush.Dispose()
    $blueBrush.Dispose()
    $chrome.Dispose()
    $path.Dispose()
    $redGlow.Dispose()
    $pathBrush.Dispose()
    $vignette.Dispose()
    $bg.Dispose()
    $gfx.Dispose()
    $bmp.Dispose()
}

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/gif" }
$enc = [System.Drawing.Imaging.Encoder]::SaveFlag
$first = [System.Drawing.Image]::FromFile((Join-Path $framesDir "frame_00.png"))

$delayBytes = New-Object byte[] ($frameCount * 4)
for ($i = 0; $i -lt $frameCount; $i++) {
    [BitConverter]::GetBytes([int]6).CopyTo($delayBytes, $i * 4)
}
$first.SetPropertyItem((New-PropertyItem 0x5100 4 $delayBytes))
$first.SetPropertyItem((New-PropertyItem 0x5101 3 ([byte[]](0,0))))

$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $enc, ([long][System.Drawing.Imaging.EncoderValue]::MultiFrame)
$first.Save($out, $codec, $params)

for ($i = 1; $i -lt $frameCount; $i++) {
    $img = [System.Drawing.Image]::FromFile((Join-Path $framesDir ("frame_{0:D2}.png" -f $i)))
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $enc, ([long][System.Drawing.Imaging.EncoderValue]::FrameDimensionTime)
    $first.SaveAdd($img, $params)
    $img.Dispose()
}

$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $enc, ([long][System.Drawing.Imaging.EncoderValue]::Flush)
$first.SaveAdd($params)
$first.Dispose()

Write-Output $out
