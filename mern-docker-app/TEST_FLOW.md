# End-to-End Test Flow: Student Login → Dashboard

## Current Status
✅ **Backend**: Running on `http://localhost:8080`  
✅ **Frontend**: Running on `http://localhost:3000`  
✅ **MongoDB**: Connected  
✅ **Demo Learners**: Seeded and ready  

---

## How to Test the Full Flow

### Step 1: Start Backend & Frontend (if not running)

**Terminal 1 - Backend:**
```powershell
cd 'C:\Users\Aishwarya I N\SIH_Project\mern-docker-app\backend'
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd 'C:\Users\Aishwarya I N\SIH_Project\mern-docker-app\frontend'
npm start
```

Both will be ready after ~10-15 seconds.

---

### Step 2: Test via Browser

1. Open `http://localhost:3000` in your browser
2. Click **Login** (or navigate to `/login`)
3. Enter credentials:
   - **Email**: `learner@example.com`
   - **Password**: `password123`
4. Click **Sign In**
5. **Expected**: Redirect to `/learner` (Student Dashboard)

---

### Step 3: Available Demo Accounts

All demo learners use password: `password123`

| Email | Role | ID |
|-------|------|-----|
| `learner@example.com` | Learner | LRN-DEMO-001 |
| `emma.learner@example.com` | Learner | — |
| `liam.learner@example.com` | Learner | — |
| `sophia.learner@example.com` | Learner | — |
| `noah.learner@example.com` | Learner | — |
| `ava.learner@example.com` | Learner | — |
| `institute@example.com` | Institution | INST-DEMO-001 |
| `admin@example.com` | Admin | — |

---

### Step 4: Test API Directly (PowerShell)

**Login:**
```powershell
$body = @{ email = 'learner@example.com'; password = 'password123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -Body $body -ContentType 'application/json'
$token = $resp.token
Write-Output "Token: $token"
```

**Fetch Learner Profile:**
```powershell
Invoke-RestMethod -Uri 'http://localhost:8080/api/learner/profile' -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json
```

**List Documents:**
```powershell
Invoke-RestMethod -Uri 'http://localhost:8080/api/documents' -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json
```

---

## Student Dashboard Features

After login, the student sees:

- **Dashboard Tab**: Stats (Courses, Certificates, Badges, Job Matches), Course Cards, Recent Certificates, Activity Feed
- **My Courses Tab**: List of enrolled courses with progress bars
- **Certificates Tab**: Verified certificates issued by institutions
- **Skill Passport Tab**: (Under development)
- **Activity Tab**: Recent learning milestones
- **Profile & Settings Tab**: (Under development)
- **Documents Tab**: Upload/verify/revoke documents (Digilocker-style)

---

## Known Issues & Fixes

### Issue: "Network error. Please try again" on Login
**Cause**: Backend not running or unreachable  
**Fix**: Ensure backend is running on port 8080 and `frontend/.env` has `REACT_APP_API_URL=http://localhost:8080`

### Issue: Frontend still on port 3001 instead of 3000
**Cause**: Port 3000 already in use  
**Fix**: Change `frontend/.env` to point to the correct frontend port, or kill process on port 3000

### Issue: Anchoring service not starting
**Cause**: Missing blockchain config in `.env`  
**Fix**: Set `BLOCKCHAIN_PROVIDER_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS` or leave them unset (anchoring will be disabled)

---

## Next Steps

- [ ] Test document upload/verification flow
- [ ] Test logout functionality
- [ ] Verify role-based routing (institution users should not access `/learner`)
- [ ] Test documents anchoring with blockchain

