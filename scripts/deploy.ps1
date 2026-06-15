<#
.SYNOPSIS
    Build, push, and deploy the TinaDocs image to the Azure Container App.

.DESCRIPTION
    Wraps `build-and-push.ps1` and then issues `az containerapp update
    --image <ref>`. Reads the Container App name and resource group from
    `terraform output`.

    Run `terraform apply` in the infrastructure repo first. After that,
    every code change reduces to:
        pwsh ./scripts/deploy.ps1

.PARAMETER Tag
    Tag for the new image. Defaults to the short git SHA.

.PARAMETER IacDir
    Path to the Terraform directory. Defaults to the sibling
    tina-selfhosting-infrastructure/iac folder.

.EXAMPLE
    pwsh ./scripts/deploy.ps1
#>
[CmdletBinding()]
param(
    [string]$Tag,
    [string]$IacDir
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $IacDir) {
    $IacDir = Resolve-Path (Join-Path $repoRoot "..\..\edci\Prototypes\tina-selfhosting-infrastructure\iac")
}

# Build and push the image
Push-Location $IacDir
try {
    $fqdn = (terraform output -raw tina_docs_app_fqdn).Trim()
}
finally {
    Pop-Location
}
$siteUrl = "https://$fqdn"

$imageRef = & (Join-Path $PSScriptRoot "build-and-push.ps1") -Tag $Tag -IacDir $IacDir -SiteUrl $siteUrl
if ($LASTEXITCODE -ne 0 -or -not $imageRef) {
    throw "build-and-push.ps1 did not return an image reference."
}
$imageRef = ($imageRef | Where-Object { $_ } | Select-Object -Last 1).ToString().Trim()

Push-Location $IacDir
try {
    $appName = (terraform output -raw tina_docs_app_name).Trim()
    $rgName = (terraform output -raw container_app_resource_group).Trim()
    $fqdn = (terraform output -raw tina_docs_app_fqdn).Trim()
}
finally {
    Pop-Location
}

if (-not $appName -or -not $rgName) {
    throw "Could not read tina_docs_app_* outputs. Has 'terraform apply' completed?"
}

Write-Host "Updating Container App '$appName' to image $imageRef..." -ForegroundColor Cyan
$proc = Start-Process -FilePath az -ArgumentList "containerapp","update","--name",$appName,"--resource-group",$rgName,"--image",$imageRef,"--output","none" -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) { throw "az containerapp update failed (exit $($proc.ExitCode))." }

Write-Host ""
Write-Host "Deploy complete." -ForegroundColor Green
Write-Host "App:    $appName"
Write-Host "Image:  $imageRef"
Write-Host "URL:    https://$fqdn"
Write-Host "Admin:  https://$fqdn/admin"
