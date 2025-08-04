# Deploy Updated SEO Version to Azure
Write-Host "Deploying DesignDraw with SEO Optimizations" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

$resourceGroup = "rg-designdraw-855"
$registryName = "acr54239"
$containerAppName = "designdraw-web-516"

# Navigate to project directory
Set-Location "d:\myproj\DesignDraw\web"

Write-Host "Building Docker image with SEO optimizations..." -ForegroundColor Cyan
$loginServer = az acr show --name $registryName --resource-group $resourceGroup --query loginServer -o tsv
$imageName = "$loginServer/designdraw:seo-$(Get-Date -Format 'yyyyMMdd-HHmm')"

# Build new image
docker build -t $imageName .

# Push to ACR
Write-Host "Pushing new image to Azure Container Registry..." -ForegroundColor Cyan
docker push $imageName

# Update Container App with new image
Write-Host "Updating Container App with new SEO-optimized image..." -ForegroundColor Cyan
az containerapp update `
    --name $containerAppName `
    --resource-group $resourceGroup `
    --image $imageName

Write-Host "" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Your app now includes:" -ForegroundColor Yellow
Write-Host "- Enhanced meta tags and Open Graph data" -ForegroundColor White
Write-Host "- Structured data for search engines" -ForegroundColor White
Write-Host "- SEO-friendly content and pages" -ForegroundColor White
Write-Host "- Sitemap and robots.txt" -ForegroundColor White
Write-Host "- About and Features pages" -ForegroundColor White

$appUrl = az containerapp show --name $containerAppName --resource-group $resourceGroup --query properties.configuration.ingress.fqdn -o tsv
Write-Host "" -ForegroundColor Green
Write-Host "Live URL: https://$appUrl" -ForegroundColor Cyan
Write-Host "About Page: https://$appUrl/about" -ForegroundColor Cyan
Write-Host "Features Page: https://$appUrl/features" -ForegroundColor Cyan
