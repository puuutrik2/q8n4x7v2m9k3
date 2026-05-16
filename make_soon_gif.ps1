Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.Serialization.Formatters.Soap

$out = Join-Path $PSScriptRoot "coming-soon.gif"
$framesDir = Join-Path $PSScriptRoot "soon-frames"
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null

$width = 960
$height = 320
$frameCount = 36
$fontFamily = New-Object System.Drawing.FontFamily "Georgia"
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$soonTop = -join ([char[]](0x0412,0x0020,0x0421,0x041A,0x041E,0x0420,0x041E,0x041C))
$soonBottom = -join ([char[]](0x0412,0x0420,0x0415,0x041C,0x0415,0x041D,0x0418))

function New-PropertyItem([int]$id, [int16]$type, [byte[]]$value) {
    $item = [System.Runtime.Serialization.FormatterServices]::GetUninitializedObject([System.Drawing.Imaging.PropertyItem])
    $item.Id = $id
    $item.Type = $type
    $item.Len = $value.Length
    $item.Value = $value
    return $item
}

for ($i = 0; $i -lt $frameCount; $i++) {
    $t = $i / ($frameCount - 1)
    $pulse = [Math]::Sin($t * [Math]::PI * 2)
    $glitch = if ($i % 10 -eq 0) { 7 } elseif ($i % 13 -eq 0) { -6 } else { 0 }

    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $rect = New-Object System.Drawing.Rectangle 0,0,$width,$height
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255,0,0,0)), ([System.Drawing.Color]::FromArgb(255,18,2,6)), 18
    $gfx.FillRectangle($bg, $rect)

    $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int](38 + 42 * [Math]::Abs($pulse)), 190, 10, 24))
    $gfx.FillEllipse($glow, 210, 42, 540, 230)

    $gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(20,255,255,255)), 1
    for ($x = 0; $x -lt $width; $x += 80) { $gfx.DrawLine($gridPen, $x + (($i * 2) % 80), 0, $x - 120 + (($i * 2) % 80), $height) }

    $smallFont = New-Object System.Drawing.Font "Arial", 16, ([System.Drawing.FontStyle]::Bold)
    $smallBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 255, 45, 58))
    $gfx.DrawString("BLANCH GALLERY", $smallFont, $smallBrush, 388, 70)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $layout = New-Object System.Drawing.RectangleF 0,86,$width,132
    $path.AddString($soonTop, $fontFamily, [int][System.Drawing.FontStyle]::Bold, 64, $layout, $format)
    $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $layout2 = New-Object System.Drawing.RectangleF 0,154,$width,132
    $path2.AddString($soonBottom, $fontFamily, [int][System.Drawing.FontStyle]::Bold, 70, $layout2, $format)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245,245,248,252))
    $red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(115,255,22,36))
    $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210,0,0,0))
    $outline = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230,245,248,252)), 2

    foreach ($p in @($path, $path2)) {
        $state = $gfx.Save()
        $gfx.TranslateTransform(7, 8)
        $gfx.FillPath($shadow, $p)
        $gfx.Restore($state)

        $state = $gfx.Save()
        $gfx.TranslateTransform((4 + $glitch), 1)
        $gfx.FillPath($red, $p)
        $gfx.Restore($state)

        $gfx.FillPath($white, $p)
        $gfx.DrawPath($outline, $p)
    }

    $shineX = -200 + $t * ($width + 400)
    $shinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140,255,255,255)), 5
    $gfx.DrawLine($shinePen, $shineX, 90, $shineX - 130, 265)

    if ($glitch -ne 0) {
        $redPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(190,255,22,36)), 3
        $gfx.DrawLine($redPen, 250, 156 + $glitch, 710, 156 + $glitch)
        $gfx.DrawLine($redPen, 290, 226 - $glitch, 675, 226 - $glitch)
        $redPen.Dispose()
    }

    $scanPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(18,255,255,255)), 1
    for ($y = ($i % 4); $y -lt $height; $y += 4) { $gfx.DrawLine($scanPen, 0, $y, $width, $y) }

    $file = Join-Path $framesDir ("frame_{0:D2}.png" -f $i)
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)

    $scanPen.Dispose()
    $shinePen.Dispose()
    $outline.Dispose()
    $shadow.Dispose()
    $red.Dispose()
    $white.Dispose()
    $path.Dispose()
    $path2.Dispose()
    $smallBrush.Dispose()
    $smallFont.Dispose()
    $gridPen.Dispose()
    $glow.Dispose()
    $bg.Dispose()
    $gfx.Dispose()
    $bmp.Dispose()
}

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/gif" }
$enc = [System.Drawing.Imaging.Encoder]::SaveFlag
$first = [System.Drawing.Image]::FromFile((Join-Path $framesDir "frame_00.png"))

$delayBytes = New-Object byte[] ($frameCount * 4)
for ($i = 0; $i -lt $frameCount; $i++) {
    [BitConverter]::GetBytes([int]7).CopyTo($delayBytes, $i * 4)
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
