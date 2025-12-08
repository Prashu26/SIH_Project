# Organization Registration + Dashboard System - Complete Setup

Write-Host "🏢 Starting Organization System Demo..." -ForegroundColor Green

# Start MongoDB (assuming it's installed)
Write-Host "📁 Starting MongoDB..." -ForegroundColor Yellow
Start-Process "mongod" -ArgumentList "--dbpath", "C:\data\db" -WindowStyle Hidden

# Wait a moment for MongoDB to start
Start-Sleep -Seconds 3

# Start the backend server
Write-Host "⚡ Starting Backend Server..." -ForegroundColor Yellow
Set-Location "backend"
Start-Process "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Set-Location ".."

# Wait for backend to start
Start-Sleep -Seconds 5

# Start the frontend
Write-Host "🌐 Starting Frontend React App..." -ForegroundColor Yellow
Set-Location "frontend"
Start-Process "npm" -ArgumentList "start" -WindowStyle Normal
Set-Location ".."

Write-Host "✅ System Started Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Available URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "🏢 Organization System Features:" -ForegroundColor Cyan
Write-Host "   • Organization Registration: http://localhost:3000/organization/register" -ForegroundColor White
Write-Host "   • Organization Login: http://localhost:3000/organization/login" -ForegroundColor White  
Write-Host "   • Organization Dashboard: http://localhost:3000/organization/dashboard" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Dashboard Features:" -ForegroundColor Yellow
Write-Host "   ✓ Organization Profile Overview" -ForegroundColor Green
Write-Host "   ✓ Student Talent Pool with Verified Certificates" -ForegroundColor Green
Write-Host "   ✓ Advanced Filtering (Skills, Location, Experience)" -ForegroundColor Green
Write-Host "   ✓ Real-time Messaging System" -ForegroundColor Green
Write-Host "   ✓ Hiring Requirements Management" -ForegroundColor Green
Write-Host "   ✓ Blockchain Certificate Verification" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Test Flow:" -ForegroundColor Magenta
Write-Host "   1. Register a new organization" -ForegroundColor White
Write-Host "   2. Login to access dashboard" -ForegroundColor White
Write-Host "   3. Browse verified student certificates" -ForegroundColor White
Write-Host "   4. Filter students by skills/location" -ForegroundColor White
Write-Host "   5. Initiate conversations with candidates" -ForegroundColor White
Write-Host "   6. Manage hiring requirements" -ForegroundColor White

Read-Host "Press Enter to continue..."