$ErrorActionPreference = "Stop"

$loginBody = @{
  email    = "manager@local"
  password = "manager"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8084/api/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 15
$token = $login.accessToken

Write-Host ("tokenLen=" + $token.Length)

$reports = Invoke-RestMethod -Method Get -Uri "http://localhost:8084/api/reports" -Headers @{ Authorization = ("Bearer " + $token) } -TimeoutSec 15

if (-not $reports -or $reports.Count -eq 0) {
  Write-Host "No reports found"
  exit 0
}

$id = $reports[0].id
Write-Host ("deleteId=" + $id)

try {
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromSeconds(15)
  $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)

  $resp = $client.DeleteAsync(("http://localhost:8084/api/reports/" + $id)).Result
  $body = $resp.Content.ReadAsStringAsync().Result
  Write-Host ("status=" + [int]$resp.StatusCode)
  if ($body) { Write-Host $body }
} catch {
  Write-Host ("deleteError=" + $_.Exception.Message)
  throw
}

