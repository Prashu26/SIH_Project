# Batch Certificate Generation Guide

## Overview

The Batch Certificate Generation feature allows institutions to create multiple certificates at once by uploading a CSV file. This automated process:

1. ✅ Creates user accounts for new learners
2. ✅ Generates PDF certificates using your template
3. ✅ Sends emails with certificate PDFs and login credentials
4. ✅ Stores certificates in the database for verification

## Features

### What Gets Created:
- **User Accounts**: Automatically creates learner accounts with secure random passwords
- **PDF Certificates**: Generates certificates using your selected template
- **Email Delivery**: Sends personalized emails containing:
  - Certificate PDF attachment
  - Login credentials (for new users)
  - Certificate ID and verification instructions
  - Welcome message from your institution

### What Gets Sent via Email:
```
Subject: 🎓 Your Certificate from [Institution Name]

Dear [Learner Name],

Congratulations! 🎉

You have been awarded a certificate for completing: [Course Name]

Certificate Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Certificate ID: CERT-XXX-YYY
📧 Recipient: user@example.com
🏛️  Issued by: [Institution]
📚 Course: [Course Name]
📅 Issue Date: [Date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 YOUR LOGIN CREDENTIALS: (for new users only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: user@example.com
🔑 Temporary Password: Abc123Xyz!@#
🌐 Login URL: https://your-platform.com/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Please change your password after first login.

📎 Your certificate PDF is attached to this email.

🔍 To verify your certificate:
1. Visit: https://your-platform.com/verify
2. Upload the attached PDF file
3. The system will verify its authenticity

Best regards,
[Institution Name]
```

## How to Use

### Step 1: Prepare Your CSV File

Create a CSV file with the following structure:

**Required Columns:**
- `name` - Full name of the learner (required)
- `email` - Email address of the learner (required)

**Optional Columns:**
You can include any additional fields that match your template fields:
- `course` - Course name
- `grade` - Grade or score
- `completionDate` - Date of completion
- `institution` - Institution name
- ... any other fields used in your template

**Example CSV:**
```csv
name,email,course,grade,completionDate
John Doe,john@example.com,Full Stack Development,A+,2025-01-15
Jane Smith,jane@example.com,Data Science,A,2025-01-15
Bob Johnson,bob@example.com,Cloud Computing,B+,2025-01-15
```

### Step 2: Upload CSV via UI

1. Navigate to **Certificate Template Editor**
2. Select or create a template
3. Scroll down to **Batch Certificate Generation** section
4. (Optional) Enter course name
5. Click "Choose File" and select your CSV
6. Click **"🚀 Generate Batch Certificates"**

### Step 3: Wait for Processing

The system will:
- Parse your CSV file
- Validate each row
- Create user accounts for new email addresses
- Generate PDF certificates using your template
- Send emails with PDFs and credentials
- Report success/failure for each entry

### Step 4: Review Results

After processing, you'll see:
```
✅ Batch Processing Complete!

Total: 50
✓ Succeeded: 48
✗ Failed: 2

📧 Emails sent with:
• Certificate PDFs
• Login credentials for new users

Failed entries:
• Row 15: invalid@email - Invalid email format
• Row 32: duplicate@email.com - User already has certificate
```

## CSV Template Fields

### Required Fields
| Field | Description | Example |
|-------|-------------|---------|
| `name` | Learner's full name | `John Doe` |
| `email` | Learner's email address | `john@example.com` |

### Template-Specific Fields
Include any fields that your template uses:
| Field | Description | Example |
|-------|-------------|---------|
| `course` | Course name | `Web Development` |
| `grade` | Grade or score | `A+` |
| `completionDate` | Completion date | `2025-01-15` |
| `duration` | Course duration | `6 months` |
| `instructor` | Instructor name | `Dr. Smith` |

**Tip:** Your template fields (defined as `{{fieldName}}`) will be automatically populated from CSV columns with matching names.

## User Account Creation

### For New Users:
- **Email**: From CSV `email` column
- **Password**: Auto-generated secure password (12 characters)
- **Role**: Learner
- **Learner ID**: Auto-generated (format: `LRN-timestamp-random`)
- **Courses**: Automatically enrolled in specified course

### For Existing Users:
- **No new account created**
- **Enrolled** in course if not already
- **No credentials sent** in email (already have login)
- **Certificate PDF sent** via email

## Security Features

### Password Generation:
- **Length**: 12 characters minimum
- **Complexity**: Mix of uppercase, lowercase, numbers, and special characters
- **Example**: `aB3$xY9!mN2@`
- **Hashing**: BCrypt with salt rounds

### PDF Hash Verification:
- Each PDF is hashed using SHA-256
- Hash stored in database: `artifactHash`, `pdfHash`, `sha256`, `metadataHash`
- Can be verified by uploading PDF to verification page

## API Endpoint

### POST `/api/templates/:templateId/batch-generate`

**Authentication:** Required (Institute/Institution role)

**Request:**
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**:
  - `csvFile` (file): CSV file with certificate data
  - `courseName` (string, optional): Course name for all certificates
  - `courseId` (string, optional): Existing course ID

**Response:**
```json
{
  "success": true,
  "message": "Processed 50 certificates",
  "results": {
    "total": 50,
    "succeeded": 48,
    "failed": 2,
    "successDetails": [
      {
        "rowIndex": 1,
        "email": "john@example.com",
        "certificateId": "CERT-1234567890-ABC123DEF",
        "userCreated": true,
        "password": "aB3$xY9!mN2@"
      }
    ],
    "failedDetails": [
      {
        "rowIndex": 15,
        "email": "invalid@email",
        "error": "Invalid email format"
      }
    ]
  }
}
```

## Error Handling

### Common Errors:

1. **Missing Required Columns**
   - Error: `CSV must contain "name" and "email" columns`
   - Solution: Ensure your CSV has both columns

2. **Invalid Email Format**
   - Error: `Invalid email address`
   - Solution: Check email format (must be valid@domain.com)

3. **Template Not Found**
   - Error: `Template not found or access denied`
   - Solution: Save template before batch processing

4. **Course Not Specified**
   - Error: `Course ID or Course Name is required`
   - Solution: Provide either courseId or courseName

5. **Email Delivery Failed**
   - Error: `Email delivery failed: [reason]`
   - Solution: Check SMTP configuration, verify recipient email

### Partial Success:
- System continues processing even if some rows fail
- Successful certificates are created and emailed
- Failed entries are reported with specific errors
- No rollback (successful operations are committed)

## Best Practices

### 1. Test with Small Batch First
- Start with 2-3 entries
- Verify emails are received
- Check PDF quality
- Confirm credentials work

### 2. Validate CSV Data
- Check for duplicate emails
- Validate email formats
- Ensure all required fields are present
- Remove empty rows

### 3. Template Preparation
- Test template with single generation first
- Ensure all fields are correctly mapped
- Verify PDF renders properly
- Check single-page output

### 4. Email Considerations
- Verify SMTP settings are configured
- Test with your own email first
- Check spam folders
- Consider email rate limits (if processing thousands)

### 5. Monitoring
- Watch logs during batch processing
- Note any failed entries
- Keep record of generated certificates
- Save CSV file for reference

## Troubleshooting

### Emails Not Received?

**Check:**
1. SMTP configuration in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

2. Gmail App Password (if using Gmail):
   - Enable 2FA on Google account
   - Generate App Password
   - Use App Password (not regular password)

3. Spam/Junk folder
4. Email address validity
5. Backend logs for email errors

### PDFs Not Generating?

**Check:**
1. Puppeteer/Chrome installation:
   ```bash
   PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   ```

2. Template is saved
3. Template has valid HTML/CSS
4. Backend logs for rendering errors

### User Accounts Not Created?

**Check:**
1. Database connection
2. Duplicate emails in CSV
3. Backend logs for user creation errors
4. Email format validity

## Performance Considerations

### Processing Time:
- **Per certificate**: ~2-5 seconds
- **100 certificates**: ~3-8 minutes
- **Factors**: PDF generation, email sending, network speed

### Recommendations:
- **Small batches**: Up to 50 at once
- **Large batches**: Split into multiple files
- **Very large**: Consider running during off-peak hours

### System Resources:
- **CPU**: PDF generation is CPU-intensive
- **Memory**: Each PDF requires ~5-10 MB
- **Network**: Email sending requires stable connection

## Example Use Cases

### 1. Course Completion Certificates
Generate certificates for all students who completed a course:
```csv
name,email,course,completionDate,grade
John Doe,john@example.com,Python Programming,2025-01-15,A+
Jane Smith,jane@example.com,Python Programming,2025-01-15,A
```

### 2. Event Participation Certificates
Create certificates for workshop/webinar participants:
```csv
name,email,event,date,duration
Alice Johnson,alice@example.com,AI Workshop,2025-01-20,8 hours
Bob Williams,bob@example.com,AI Workshop,2025-01-20,8 hours
```

### 3. Skill Certifications
Issue skill-based certificates:
```csv
name,email,skill,level,validUntil
Charlie Brown,charlie@example.com,JavaScript,Advanced,2026-01-15
Diana Prince,diana@example.com,React,Expert,2026-01-15
```

## Support

For issues or questions:
1. Check backend logs: `backend/logs/combined.log`
2. Review failed entries in batch results
3. Test with single certificate first
4. Verify template and CSV format

---

**Feature Status**: ✅ Production Ready

**Last Updated**: December 9, 2025
