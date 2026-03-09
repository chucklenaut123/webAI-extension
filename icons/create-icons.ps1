# PowerShell script to create simple PNG icons
# This creates basic colored square icons as placeholders

$sizes = @("16", "48", "128")

foreach ($size in $sizes) {
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Create gradient brush
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(102, 126, 234),
        [System.Drawing.Color]::FromArgb(118, 75, 162),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    
    $graphics.FillEllipse($brush, 0, 0, $size, $size)
    
    # Draw simple "AI" text
    $font = New-Object System.Drawing.Font("Arial", ($size / 2), [System.Drawing.FontStyle]::Bold)
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $graphics.DrawString("AI", $font, [System.Drawing.Brushes]::White, 
        ($size / 2), ($size / 2), $stringFormat)
    
    # Save
    $bitmap.Save("$PSScriptRoot\icon${size}.png", [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Host "Icons created successfully!"
