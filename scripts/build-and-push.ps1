<#
.SYNOPSIS
    Build the TinaDocs Docker image and push it to the project's ACR.

.DESCRIPTION
    Reads the ACR login server from `terraform output` in the shared
    infrastructure repo. Tags the image with `:<git-short-sha>` and
    `:latest`, builds, and pushes both tags. Returns the full image ref.

.PARAMETER Tag
    Tag for the image. Defaults to the short git SHA.

.PARAMETER IacDir
    Path to the Terraform directory. Defaults to the sibling
    tina-selfhosting-infrastructure/iac folder.

.EXAMPLE
    pwsh ./scripts/build-and-push.ps1
#>
[CmdletBinding()]
param(
    [string]$ImageRepository = "tina-docs",
    [string]$Tag,
    [string]$IacDir,
    [string]$SiteUrl
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $Tag) {
    $Tag = (git rev-parse --short HEAD 2>$null).Trim()
    if (-not $Tag) {
        throw "Could not derive an image tag. Pass -Tag explicitly or run inside a git working tree."
    }
}

if (-not $IacDir) {
    # Default: sibling infrastructure repo
    $IacDir = Resolve-Path (Join-Path $repoRoot "..\..\edci\Prototypes\tina-selfhosting-infrastructure\iac")
}

Push-Location $IacDir
try {
    $registry = (terraform output -raw container_registry_login_server).Trim()
    $registryName = (terraform output -raw container_registry_name).Trim()
}
finally {
    Pop-Location
}

if (-not $registry -or -not $registryName) {
    throw "Could not read container_registry_* outputs. Has 'terraform apply' completed?"
}

$imageBase = "$registry/$ImageRepository"
$imageTagged = "${imageBase}:${Tag}"
$imageLatest = "${imageBase}:latest"

Write-Host "Logging in to ACR '$registryName'..." -ForegroundColor Cyan
az acr login --name $registryName | Out-Null
if ($LASTEXITCODE -ne 0) { throw "az acr login failed (exit $LASTEXITCODE)." }

Write-Host "Building image $imageTagged (also tagged :latest)..." -ForegroundColor Cyan
$buildArgs = @("build","--tag",$imageTagged,"--tag",$imageLatest)
if ($SiteUrl) {
    $buildArgs += "--build-arg","NEXT_PUBLIC_SITE_URL=$SiteUrl"
}
$buildArgs += $repoRoot
$proc = Start-Process -FilePath docker -ArgumentList $buildArgs -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) { throw "docker build failed (exit $($proc.ExitCode))." }

Write-Host "Pushing $imageTagged..." -ForegroundColor Cyan
$proc = Start-Process -FilePath docker -ArgumentList "push",$imageTagged -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) { throw "docker push (tagged) failed (exit $($proc.ExitCode))." }

Write-Host "Pushing $imageLatest..." -ForegroundColor Cyan
$proc = Start-Process -FilePath docker -ArgumentList "push",$imageLatest -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) { throw "docker push (latest) failed (exit $($proc.ExitCode))." }

Write-Host "Pushed: $imageTagged" -ForegroundColor Green
return $imageTagged
