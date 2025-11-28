# Test batch certificate upload
$ErrorActionPreference = 'Stop'

# Login
Write-Output "=== LOGIN ==="
$login = Invoke-RestMethod -Uri 'http://localhost:8081/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"test@inst.com","password":"Password123!"}' -UseBasicParsing
$token = $login.token
Write-Output "Token obtained"

# Prepare multipart form data
$filePath = 'backend/test-files/working-batch.csv'
$fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $filePath).Path)
$fileName = [System.IO.Path]::GetFileName($filePath)

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
    "Content-Type: text/csv",
    "",
    [System.Text.Encoding]::UTF8.GetString($fileBytes),
    "--$boundary--",
    ""
)

$body = $bodyLines -join $LF

# Upload
Write-Output "`n=== BATCH UPLOAD ==="
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = "multipart/form-data; boundary=$boundary"
}

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:8081/api/institution/certificates/batch' -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
    
    Write-Output "SUCCESS!"
    Write-Output "Total: $($response.data.total)"
    Write-Output "Success: $($response.data.successCount)"
    Write-Output "Failed: $($response.data.failedCount)"
    Write-Output "Batch ID: $($response.data.batchId)"
    Write-Output "Message: $($response.message)"
    
    if ($response.data.results) {
        Write-Output "`nCertificates created:"
        $response.data.results | ForEach-Object {
            Write-Output "  - ID: $($_.certificateId)"
            Write-Output "    Learner: $($_.learner.name) ($($_.learner.email))"
            Write-Output "    Course: $($_.course.name)"
            Write-Output "    MerkleRoot: $($_.merkleRoot)"
            Write-Output "    BatchId: $($_.batchId)"
            Write-Output "    BlockchainTx: $($_.blockchainTxHash)"
            Write-Output ""
        }
    }
    
    if ($response.data.errors -and $response.data.errors.Count -gt 0) {
        Write-Output "`nErrors:"
        $response.data.errors | ForEach-Object {
            Write-Output "  - $($_.studentUniqueCode): $($_.error)"
        }
    }
    
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Output "Response: $responseBody"
    }
}
