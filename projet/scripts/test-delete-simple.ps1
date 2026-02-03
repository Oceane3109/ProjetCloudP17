$ErrorActionPreference = "Stop"

$loginBody = @{
  email    = "manager@local"
  password = "manager"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8084/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.accessToken

Write-Host ("tokenLen=" + $token.Length)

$reports = Invoke-RestMethod -Method Get -Uri "http://localhost:8084/api/reports" -Headers @{ Authorization = ("Bearer " + $token) }
$id = $reports[0].id
Write-Host ("deleteId=" + $id)

try {
  Invoke-RestMethod -Method Delete -Uri ("http://localhost:8084/api/reports/" + $id) -Headers @{ Authorization = ("Bearer " + $token) }
  Write-Host "status=204"
} catch {
  $resp = $_.Exception.Response
  if ($resp -ne $null) {
    $status = [int]$resp.StatusCode
    $body = ""
    try {
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $body = $sr.ReadToEnd()
    } catch {}
    Write-Host ("status=" + $status)
    if ($body) { Write-Host $body }
  } else {
    Write-Host ("error=" + $_.Exception.Message)
    throw
  }
}

