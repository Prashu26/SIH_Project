const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Types } = require("mongoose");
const Certificate = require("../models/Certificate");
const Course = require("../models/Course");
const User = require("../models/User");
const ModuleProof = require("../models/ModuleProof");
const Batch = require("../models/Batch");
const auth = require("../middleware/auth");
const certificateService = require("../services/certificateService");
const emailService = require("../services/emailService");
const { parse } = require("csv-parse/sync");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|csv|json/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only PDF, CSV, and JSON files are allowed"));
  },
});

async function generateUniqueLearnerId(preferredId) {
  const base = (preferredId && preferredId.trim()) || `LRN-${Date.now()}`;
  let counter = 0;

  while (counter < 1000) {
    const candidate = counter === 0 ? base : `${base}-${counter}`;
    const existing = await User.findOne({
      role: "learner",
      "learnerProfile.learnerId": candidate,
    });

    if (!existing) {
      return candidate;
    }

    counter += 1;
  }

  return `${base}-${Date.now()}`;
}

function generateTemporaryPassword() {
  return (
    crypto
      .randomBytes(9)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12) || "TempPass123"
  );
}

async function ensureLearnerAccount({
  email,
  learnerIdCandidate,
  displayName,
}) {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCandidate = learnerIdCandidate
    ? learnerIdCandidate.trim()
    : null;

  let learner = await User.findOne({ email: normalizedEmail, role: "learner" });
  if (!learner && trimmedCandidate) {
    learner = await User.findOne({
      role: "learner",
      "learnerProfile.learnerId": trimmedCandidate,
    });
  }

  let created = false;
  let temporaryPassword = null;

  if (!learner) {
    const learnerId = await generateUniqueLearnerId(trimmedCandidate);
    temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    learner = new User({
      name:
        (displayName && displayName.trim()) ||
        normalizedEmail.split("@")[0] ||
        "Learner",
      email: normalizedEmail,
      password: hashedPassword,
      role: "learner",
      learnerProfile: {
        learnerId,
        courses: [],
      },
    });

    await learner.save();
    created = true;
  } else {
    let needsSave = false;

    if (!learner.learnerProfile) {
      learner.learnerProfile = {};
      needsSave = true;
    }

    if (
      trimmedCandidate &&
      learner.learnerProfile.learnerId !== trimmedCandidate
    ) {
      const clash = await User.findOne({
        _id: { $ne: learner._id },
        role: "learner",
        "learnerProfile.learnerId": trimmedCandidate,
      });

      if (!clash) {
        learner.learnerProfile.learnerId = trimmedCandidate;
        needsSave = true;
      } else {
        console.warn(
          `Cannot assign learnerId "${trimmedCandidate}" - already in use by another user`
        );
      }
    }

    if (!learner.learnerProfile.learnerId) {
      learner.learnerProfile.learnerId =
        await generateUniqueLearnerId(trimmedCandidate);
      needsSave = true;
    }

    if (!learner.learnerProfile.courses) {
      learner.learnerProfile.courses = [];
      needsSave = true;
    }

    if (needsSave) {
      try {
        await learner.save();
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          console.error(
            `Duplicate key error saving learner: ${saveErr.message}`
          );
          // If we hit a duplicate, generate a new unique ID and retry
          learner.learnerProfile.learnerId = await generateUniqueLearnerId();
          await learner.save();
        } else {
          throw saveErr;
        }
      }
    }
  }

  return {
    learner,
    created,
    learnerId: learner.learnerProfile?.learnerId,
    temporaryPassword,
  };
}

async function ensureLearnerHasCourse(learnerDoc, courseId) {
  if (!learnerDoc) return;

  const courseIdString = courseId.toString();
  learnerDoc.learnerProfile = learnerDoc.learnerProfile || { courses: [] };
  learnerDoc.learnerProfile.courses = learnerDoc.learnerProfile.courses || [];

  const alreadyLinked = learnerDoc.learnerProfile.courses.some((existingId) => {
    try {
      return existingId.toString() === courseIdString;
    } catch (_err) {
      return String(existingId) === courseIdString;
    }
  });

  if (!alreadyLinked) {
    learnerDoc.learnerProfile.courses.push(courseId);
    await learnerDoc.save();
  }
}

// ============================================
// ISSUER DASHBOARD - Overview & Statistics
// ============================================

/**
 * GET /api/institute/dashboard
 * Get dashboard statistics for issuer
 */
router.get(
  "/dashboard",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const instituteId = req.user.id;

      // Get statistics
      const [
        totalCertificates,
        issuedCertificates,
        pendingCertificates,
        revokedCertificates,
        pendingProofs,
        totalCourses,
        recentCertificates,
      ] = await Promise.all([
        Certificate.countDocuments({ institute: instituteId }),
        Certificate.countDocuments({
          institute: instituteId,
          status: { $in: ["Issued", "ISSUED"] },
        }),
        Certificate.countDocuments({
          institute: instituteId,
          status: { $in: ["Pending", "PENDING"] },
        }),
        Certificate.countDocuments({
          institute: instituteId,
          status: { $in: ["Revoked", "REVOKED"] },
        }),
        ModuleProof.countDocuments({
          institute: instituteId,
          status: "Pending",
        }),
        Course.countDocuments({ institute: instituteId }),
        Certificate.find({ institute: instituteId })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("learner", "name email")
          .populate("course", "title")
          .lean(),
      ]);

      res.json({
        success: true,
        statistics: {
          totalCertificates,
          issuedCertificates,
          pendingCertificates,
          revokedCertificates,
          pendingProofs,
          totalCourses,
        },
        recentCertificates,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res
        .status(500)
        .json({ message: "Failed to load dashboard", error: error.message });
    }
  }
);

// Development/static institute dashboard (unauthenticated) - returns sample data
router.get('/dashboard/static', (req, res) => {
  const enabled = process.env.ENABLE_DEV_ENDPOINTS === 'true';
  if (!enabled) {
    return res.status(404).json({ message: 'Not found' });
  }

  const STATIC_INSTITUTE_DASH = {
    success: true,
    statistics: {
      totalCertificates: 420,
      issuedCertificates: 380,
      pendingCertificates: 25,
      revokedCertificates: 5,
      pendingProofs: 12,
      totalCourses: 8
    },
    recentCertificates: [
      { _id: 'c1', student: { name: 'Asha Rao' }, course: { title: 'Advanced Full Stack' }, createdAt: new Date() },
      { _id: 'c2', student: { name: 'Ravi Kumar' }, course: { title: 'Data Science & ML' }, createdAt: new Date() },
      { _id: 'c3', student: { name: 'Priya Singh' }, course: { title: 'Cloud Engineering (AWS)' }, createdAt: new Date() }
    ]
  };

  res.json(STATIC_INSTITUTE_DASH);
});

// ============================================
// CERTIFICATE MANAGEMENT
// ============================================

/**
 * GET /api/institute/certificates
 * Get all certificates issued by the institute
 */
router.get(
  "/certificates",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const instituteId = req.user.id;
      const { status, page = 1, limit = 20, search } = req.query;

      const query = { institute: instituteId };

      if (status) {
        query.status = new RegExp(`^${status}$`, "i");
      }

      if (search) {
        query.$or = [
          { certificateId: new RegExp(search, "i") },
          { studentUniqueCode: new RegExp(search, "i") },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [certificates, total] = await Promise.all([
        Certificate.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate("learner", "name email learnerProfile.learnerId")
          .populate("course", "title description")
          .lean(),
        Certificate.countDocuments(query),
      ]);

      res.json({
        success: true,
        certificates,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get certificates error:", error);
      res.status(500).json({
        message: "Failed to retrieve certificates",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/institute/certificates/:id
 * Get specific certificate details
 */
router.get(
  "/certificates/:id",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const certificate = await Certificate.findOne({
        _id: req.params.id,
        institute: req.user.id,
      })
        .populate("learner", "name email learnerProfile.learnerId")
        .populate("course", "title description modules")
        .populate("batch", "batchNumber createdAt")
        .lean();

      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      res.json({ success: true, certificate });
    } catch (error) {
      console.error("Get certificate error:", error);
      res.status(500).json({
        message: "Failed to retrieve certificate",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/institute/certificates
 * Issue a single certificate
 */
router.post(
  "/certificates",
  auth(["institute", "institution"]),
  upload.single("certificateFile"),
  async (req, res) => {
    try {
      // Log request for debugging
      console.log("POST /api/institute/certificates incoming body:", req.body);
      if (req.file)
        console.log("uploaded file:", {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        });

      const {
        learnerEmail,
        learnerId,
        courseName,
        courseId,
        skillsAcquired,
        validUntil,
        ncvqLevel,
        ncvqQualificationCode,
        // New Fields
        fatherName,
        motherName,
        dob,
        address,
        district,
        state,
        trade,
        duration,
        session,
        testMonth,
        testYear,
        nsqfLevel,
      } = req.body;

      // Accept alternate names used by older clients
      const normalizedLearnerEmail = (learnerEmail || req.body.email || "")
        .toString()
        .trim();
      const normalizedCourseName = (
        courseName ||
        req.body.course ||
        req.body.courseName ||
        ""
      )
        .toString()
        .trim();

      if (!normalizedLearnerEmail || (!normalizedCourseName && !courseId)) {
        console.warn("Missing learnerEmail or course info", {
          normalizedLearnerEmail,
          normalizedCourseName,
          courseId,
        });
        return res.status(400).json({
          message: "Learner email and course information are required",
        });
      }

      const normalizedEmail = normalizedLearnerEmail.toLowerCase();
      const modulesList = skillsAcquired
        ? skillsAcquired
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const providedUniqueCode = (
        learnerId ||
        req.body.studentUniqueCode ||
        req.body.student_id ||
        ""
      )
        .toString()
        .trim();

      // Find or create course
      let course;
      if (courseId) {
        course = await Course.findById(courseId);
      } else {
        course = await Course.findOne({
          title: new RegExp(`^${courseName}$`, "i"),
          institute: req.user.id,
        });

        if (!course) {
          course = new Course({
            title: normalizedCourseName,
            description: `Certificate course for ${normalizedCourseName}`,
            institute: req.user.id,
            modules: modulesList.length > 0 ? modulesList : ["Core Module"],
          });

          // Defensive: ensure we do not persist an explicit null/empty courseCode value.
          // Existing data may have documents with `courseCode: null` which can trigger
          // unique-index duplicate key errors when inserting another doc that also
          // ends up storing an explicit null. Delete the property if it's null/empty.
          if (Object.prototype.hasOwnProperty.call(course, "courseCode")) {
            if (course.courseCode === null || course.courseCode === "") {
              delete course.courseCode;
            }
          }

          try {
            await course.save();
          } catch (saveErr) {
            // If we hit a duplicate key error complaining about courseCode:null,
            // try removing the courseCode field and retry saving. This can occur
            // if historical records explicitly stored `courseCode: null` and the
            // sparse unique index treats null as a value.
            if (saveErr && saveErr.code === 11000 && saveErr.keyPattern && saveErr.keyPattern.courseCode) {
              if (Object.prototype.hasOwnProperty.call(course, "courseCode")) {
                delete course.courseCode;
              }
              try {
                await course.save();
              } catch (retryErr) {
                console.error("Create course retry error:", retryErr);
                throw retryErr;
              }
            } else {
              console.error("Create course error:", saveErr);
              throw saveErr;
            }
          }
        }
      }

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const {
        learner,
        created: learnerCreated,
        learnerId: finalLearnerId,
        temporaryPassword,
      } = await ensureLearnerAccount({
        email: normalizedEmail,
        learnerIdCandidate: providedUniqueCode,
        displayName: req.body.learnerName,
      });

      await ensureLearnerHasCourse(learner, course._id);

      // Check for existing certificate
      const existingCert = await Certificate.findOne({
        learner: learner._id,
        course: course._id,
        institute: req.user.id,
        status: { $nin: ["Revoked", "REVOKED"] },
      });

      if (existingCert) {
        return res.status(400).json({
          message: "Certificate already exists for this learner and course",
        });
      }

      const certificateId = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const templateIdToUse = req.body.templateId || req.body.template || null;

      const { certificate } = await certificateService.issueCertificate({
        certificateId,
        studentUniqueCode: finalLearnerId,
        learner: learner._id,
        learnerName: learner.name,
        institute: req.user.id,
        instituteName: req.user?.name,
        course: course._id,
        courseName: course.title,
        modulesAwarded: modulesList,
        validUntil: validUntil || null,
        ncvqLevel: ncvqLevel || null,
        ncvqQualificationCode: ncvqQualificationCode || null,
        ncvqQualificationTitle: null,
        ncvqQualificationType: null,
        status: "Issued",
        templateId: templateIdToUse,
      });

      // Attempt to send congratulation email with PDF attachment
      (async () => {
        try {
          const pdfFileId = certificate?.storage?.artifacts?.pdf?.fileId;
          const pdfFilename =
            certificate?.storage?.artifacts?.pdf?.filename ||
            `${certificate.certificateId}.pdf`;
          const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify/${certificate.certificateId}`;

          const subject = `Congratulations! Your certificate ${certificate.certificateId}`;
          const html = `<p>Dear ${learner.name || finalLearnerId},</p>
          <p>Congratulations! You have been awarded the certificate <strong>${certificate.certificateId}</strong> for the course <strong>${course.title}</strong>.</p>
          <p>You can download the certificate from the attachment or verify it online <a href="${verifyUrl}">here</a>.</p>
          ${learnerCreated ? `<p>Your account was created. Login with email <strong>${learner.email}</strong> and temporary password <strong>${temporaryPassword}</strong>. Please change your password after first login.</p>` : ""}
          <p>Best regards,<br/>${req.user?.name || "Issuing Institution"}</p>`;
          console.log(
            "hiii 13e3r33433333333333333333333333333333333333333333333333333333333333333333333333333333333333333333"
          );
          await emailService.sendCertificateEmail({
            to: learner.email,
            subject,
            html,
            pdfFileId,
            pdfFilename,
          });

          console.log(
            `Certificate email sent to ${learner.email} for certificate ${certificate.certificateId}`
          );
        } catch (emailErr) {
          console.error(
            "Failed to send certificate email:",
            emailErr && (emailErr.message || emailErr)
          );
        }
      })();

      res.status(201).json({
        success: true,
        message: "Certificate issued successfully",
        certificate,
        newLearner: learnerCreated
          ? {
              email: learner.email,
              learnerId: finalLearnerId,
              temporaryPassword,
            }
          : undefined,
      });
    } catch (error) {
      console.error("Issue certificate error:", error);
      res
        .status(500)
        .json({ message: "Failed to issue certificate", error: error.message });
    }
  }
);

/**
 * POST /api/institute/certificates/batch
 * Issue certificates in batch from CSV/JSON
 */
router.post(
  "/certificates/batch",
  auth(["institute", "institution"]),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const fileContent = await fs.readFile(req.file.path, "utf-8");
      let records = [];

      // Parse CSV or JSON
      if (
        req.file.mimetype === "text/csv" ||
        req.file.originalname.endsWith(".csv")
      ) {
        records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } else if (
        req.file.mimetype === "application/json" ||
        req.file.originalname.endsWith(".json")
      ) {
        records = JSON.parse(fileContent);
        if (!Array.isArray(records)) {
          records = [records];
        }
      } else {
        return res
          .status(400)
          .json({ message: "Invalid file format. Use CSV or JSON." });
      }

      if (records.length === 0) {
        return res.status(400).json({ message: "No records found in file" });
      }

      // Process batch - resolve learner IDs and course IDs
      const certificates = [];
      const failedRecords = [];
      const newLearnerCredentials = [];
      const recordedLearnerEmails = new Set();
      for (const record of records) {
        const rawCourseIdValue = (record.courseId || record.courseCode || "")
          .toString()
          .trim();
        try {
          const learnerEmail = (record.learnerEmail || record.email || "")
            .toLowerCase()
            .trim();
          const studentUniqueCode = (
            record.studentUniqueCode ||
            record.learnerId ||
            ""
          ).trim();
          const courseName = (record.courseName || record.course || "").trim();

          if (
            !learnerEmail ||
            !studentUniqueCode ||
            (!courseName && !rawCourseIdValue)
          ) {
            console.error("Skipping record - missing required fields:", {
              learnerEmail,
              studentUniqueCode,
              courseName,
              rawCourseId: rawCourseIdValue,
            });
            failedRecords.push({
              learnerEmail,
              studentUniqueCode,
              courseName,
              courseId: rawCourseIdValue,
              reason:
                "Missing learnerEmail, studentUniqueCode, or course information",
            });
            continue;
          }
          // Find course by ID or name
          let course;
          if (rawCourseIdValue) {
            if (Types.ObjectId.isValid(rawCourseIdValue)) {
              course = await Course.findOne({
                _id: rawCourseIdValue,
                institute: req.user.id,
              });
            }

            if (!course) {
              course = await Course.findOne({
                institute: req.user.id,
                $or: [
                  { courseCode: rawCourseIdValue },
                  { title: new RegExp(`^${rawCourseIdValue}$`, "i") },
                ],
              });
            }
          } else {
            course = await Course.findOne({
              title: new RegExp(`^${courseName}$`, "i"),
              institute: req.user.id,
            });
          }

          if (!course) {
            console.error(
              `Course not found: ${courseName || rawCourseIdValue}`
            );
            failedRecords.push({
              learnerEmail,
              studentUniqueCode,
              courseName,
              courseId: rawCourseIdValue,
              reason: `Course not found for ${courseName || rawCourseIdValue}`,
            });
            continue;
          }

          // Ensure learner account exists. If missing, create account (same behavior as single-issue flow).
          let learnerCreated = false;
          let finalLearnerId = null;
          let temporaryPassword = null;
          let learner = null;

          // Normalize email
          const normalizedEmail = learnerEmail.toLowerCase().trim();

          // Check existing learner
          let existingLearner = await User.findOne({
            email: normalizedEmail,
            role: "learner",
          });

          if (!existingLearner) {
            // Create new learner account
            const learnerId = await generateUniqueLearnerId(
              studentUniqueCode || null
            );
            temporaryPassword = generateTemporaryPassword();
            const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

            const newLearner = new User({
              name:
                (record.learnerName && record.learnerName.trim()) ||
                normalizedEmail.split("@")[0] ||
                "Learner",
              email: normalizedEmail,
              password: hashedPassword,
              role: "learner",
              learnerProfile: {
                learnerId,
                courses: [],
              },
            });

            await newLearner.save();
            learner = newLearner;
            learnerCreated = true;
            finalLearnerId = learner.learnerProfile?.learnerId;

            if (!recordedLearnerEmails.has(learner.email)) {
              recordedLearnerEmails.add(learner.email);
              newLearnerCredentials.push({
                email: learner.email,
                learnerId: finalLearnerId,
                temporaryPassword,
              });
            }
          } else {
            // Ensure learner has learnerProfile and learnerId (use existing helper logic)
            const ensured = await ensureLearnerAccount({
              email: normalizedEmail,
              learnerIdCandidate: studentUniqueCode,
              displayName: record.learnerName || record.name,
            });
            learner = ensured.learner;
            learnerCreated = ensured.created;
            finalLearnerId = ensured.learnerId;
            temporaryPassword = ensured.temporaryPassword;

            if (learnerCreated && !recordedLearnerEmails.has(learner.email)) {
              recordedLearnerEmails.add(learner.email);
              newLearnerCredentials.push({
                email: learner.email,
                learnerId: finalLearnerId,
                temporaryPassword,
              });
            }
          }

          await ensureLearnerHasCourse(learner, course._id);

          const uniqueCodeForCertificate = finalLearnerId || studentUniqueCode;

          certificates.push({
            learner: learner._id,
            learnerName: learner.name,
            course: course._id,
            courseName: course.title,
            studentUniqueCode: uniqueCodeForCertificate,
            validUntil: record.validUntil || null,
            modulesAwarded: (record.skills || record.skillsAcquired || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
        } catch (error) {
          console.error("Error processing record:", error);
          failedRecords.push({
            learnerEmail: record.learnerEmail || record.email,
            studentUniqueCode: record.studentUniqueCode || record.learnerId,
            courseName: record.courseName || record.course,
            courseId: rawCourseIdValue,
            reason: error.message || "Unexpected error while processing record",
          });
        }
      }

      if (certificates.length === 0) {
        return res.status(400).json({
          message: "No valid records to process",
          errors: failedRecords,
          newLearners: newLearnerCredentials,
        });
      }

      const result = await certificateService.issueBatchCertificates({
        instituteId: req.user.id,
        certificates,
      });

      // Attempt to email each successful certificate to its learner
      try {
        const successful = Array.isArray(result.successful)
          ? result.successful
          : [];
        const learnerIds = successful
          .map((s) => (s.learner ? s.learner.toString() : null))
          .filter(Boolean);

        // Fetch learner emails/names in one query
        const learners = learnerIds.length
          ? await User.find({ _id: { $in: learnerIds } }).select("email name")
          : [];
        const learnerMap = new Map();
        learners.forEach((u) => learnerMap.set(u._id.toString(), u));

        // Map temporary passwords for newly created learners
        const tempMap = new Map();
        if (
          Array.isArray(newLearnerCredentials) &&
          newLearnerCredentials.length
        ) {
          newLearnerCredentials.forEach((item) => {
            if (item && item.email)
              tempMap.set(
                item.email.toLowerCase(),
                item.temporaryPassword || null
              );
          });
        }

        const emailPromises = successful.map(async (entry) => {
          try {
            const learnerId = entry.learner ? entry.learner.toString() : null;
            const learnerDoc = learnerId ? learnerMap.get(learnerId) : null;
            const to = learnerDoc ? learnerDoc.email : null;

            if (!to) {
              // If we couldn't find by learner id, try to find by newLearnerCredentials list (email)
              return { ok: false, reason: "No recipient email found", entry };
            }

            const pdfFileId =
              entry.storage &&
              entry.storage.artifacts &&
              entry.storage.artifacts.pdf &&
              entry.storage.artifacts.pdf.fileId;
            const pdfFilename =
              entry.storage &&
              entry.storage.artifacts &&
              entry.storage.artifacts.pdf &&
              entry.storage.artifacts.pdf.filename;

            const subject = `Congratulations! Your certificate ${entry.certificateId}`;
            const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify/${entry.certificateId}`;
            const html = `<p>Dear ${learnerDoc.name || entry.learner || ""},</p>
              <p>Congratulations! You have been awarded the certificate <strong>${entry.certificateId}</strong> for the course <strong>${entry.course || ""}</strong>.</p>
              <p>You can download the certificate from the attachment or verify it online <a href="${verifyUrl}">here</a>.</p>
              ${tempMap.has(to.toLowerCase()) ? `<p>Your account was created. Login with email <strong>${to}</strong> and temporary password <strong>${tempMap.get(to.toLowerCase())}</strong>. Please change your password after first login.</p>` : ""}
              <p>Best regards,<br/>${req.user?.name || "Issuing Institution"}</p>`;

            await emailService.sendCertificateEmail({
              to,
              subject,
              html,
              pdfFileId: pdfFileId ? pdfFileId.toString() : null,
              pdfFilename: pdfFilename || `${entry.certificateId}.pdf`,
            });

            return { ok: true, to, certificateId: entry.certificateId };
          } catch (err) {
            console.error(
              "Batch email send error for entry:",
              entry,
              err && (err.message || err)
            );
            return { ok: false, reason: err && (err.message || err), entry };
          }
        });

        const emailResults = await Promise.allSettled(emailPromises);
        const sent = emailResults.filter(
          (r) => r.status === "fulfilled" && r.value && r.value.ok
        ).length;
        console.log(
          `Batch email results: ${sent} sent, ${emailResults.length - sent} failed`
        );
      } catch (emailBatchError) {
        console.error(
          "Failed to send batch emails:",
          emailBatchError && (emailBatchError.message || emailBatchError)
        );
      }

      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);

      res.status(201).json({
        success: true,
        message: `Batch processed: ${result.successful.length} successful, ${result.failed.length} failed`,
        batchId: result.batchId,
        results: result.successful,
        errors: result.failed.length ? result.failed : failedRecords,
        newLearners: newLearnerCredentials,
        merkleRoot: result.merkleRoot,
        blockchain: result.blockchainAnchoring || null,
      });
    } catch (error) {
      console.error("Batch issue error:", error);
      res
        .status(500)
        .json({ message: "Failed to process batch", error: error.message });
    }
  }
);

/**
 * PUT /api/institute/certificates/:id/revoke
 * Revoke a certificate
 */
router.put(
  "/certificates/:id/revoke",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const { reason } = req.body;

      const certificate = await Certificate.findOne({
        _id: req.params.id,
        institute: req.user.id,
      });

      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      if (
        certificate.status === "Revoked" ||
        certificate.status === "REVOKED"
      ) {
        return res
          .status(400)
          .json({ message: "Certificate is already revoked" });
      }

      certificate.status = "Revoked";
      certificate.revokedAt = new Date();
      certificate.revocationReason = reason || "Revoked by issuer";

      await certificate.save();

      res.json({
        success: true,
        message: "Certificate revoked successfully",
        certificate,
      });
    } catch (error) {
      console.error("Revoke certificate error:", error);
      res.status(500).json({
        message: "Failed to revoke certificate",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/institute/certificates/:id/proof
 * Download certificate proof (JSON with Merkle proof)
 */
router.get(
  "/certificates/:id/proof",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const certificate = await Certificate.findOne({
        _id: req.params.id,
        institute: req.user.id,
      })
        .populate("learner", "name email")
        .populate("course", "title")
        .lean();

      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      const proof = {
        certificateId: certificate.certificateId,
        learner: {
          name: certificate.learner?.name,
          email: certificate.learner?.email,
          studentCode: certificate.studentUniqueCode,
        },
        course: certificate.course?.title,
        issueDate: certificate.issueDate,
        validUntil: certificate.validUntil,
        status: certificate.status,
        blockchain: {
          txHash: certificate.blockchainTxHash,
          merkleRoot: certificate.merkleRoot,
          merkleProof: certificate.merkleProof || [],
          batchId: certificate.batchId,
        },
        hashes: {
          metadata: certificate.metadataHash,
          artifact: certificate.artifactHash,
        },
        ipfs: {
          cid: certificate.ipfsCid,
        },
        modules: certificate.modulesAwarded,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=proof-${certificate.certificateId}.json`
      );
      res.json(proof);
    } catch (error) {
      console.error("Download proof error:", error);
      res
        .status(500)
        .json({ message: "Failed to generate proof", error: error.message });
    }
  }
);

// ============================================
// MODULE PROOF MANAGEMENT
// ============================================

/**
 * GET /api/institute/proofs
 * Get module proofs for review
 */
router.get("/proofs", auth(["institute", "institution"]), async (req, res) => {
  try {
    const { status = "Pending" } = req.query;

    const proofs = await ModuleProof.find({
      institute: req.user.id,
      status: new RegExp(`^${status}$`, "i"),
    })
      .sort({ createdAt: -1 })
      .populate("learner", "name email learnerProfile.learnerId")
      .populate("course", "title modules")
      .lean();

    res.json({ success: true, proofs });
  } catch (error) {
    console.error("Get proofs error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve proofs", error: error.message });
  }
});

/**
 * PATCH /api/institute/proofs/:proofId
 * Update proof status (approve/reject)
 */
router.patch(
  "/proofs/:proofId",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const { status, feedback } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res
          .status(400)
          .json({ message: "Status must be Approved or Rejected" });
      }

      const proof = await ModuleProof.findOne({
        _id: req.params.proofId,
        institute: req.user.id,
      });

      if (!proof) {
        return res.status(404).json({ message: "Proof not found" });
      }

      proof.status = status;
      proof.reviewedAt = new Date();
      proof.reviewedBy = req.user.id;

      if (feedback) {
        proof.feedback = feedback;
      }

      await proof.save();

      res.json({
        success: true,
        message: `Proof ${status.toLowerCase()} successfully`,
        proof,
      });
    } catch (error) {
      console.error("Update proof error:", error);
      res
        .status(500)
        .json({ message: "Failed to update proof", error: error.message });
    }
  }
);

// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * GET /api/institute/courses
 * Get courses offered by the institute
 */
router.get("/courses", auth(["institute", "institution"]), async (req, res) => {
  try {
    const courses = await Course.find({ institute: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Get certificate counts for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const certificateCount = await Certificate.countDocuments({
          course: course._id,
          institute: req.user.id,
        });

        return {
          ...course,
          certificateCount,
        };
      })
    );

    res.json({ success: true, courses: coursesWithStats });
  } catch (error) {
    console.error("Get courses error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve courses", error: error.message });
  }
});

/**
 * POST /api/institute/courses
 * Create a new course
 */
router.post(
  "/courses",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const { title, description, modules, duration, ncvqLevel, courseCode } =
        req.body;

      if (!title) {
        return res.status(400).json({ message: "Course title is required" });
      }

      const normalizedTitle = title.trim();
      const normalizedCode = courseCode ? courseCode.trim() : null;
      const moduleList = Array.isArray(modules)
        ? modules.filter(Boolean)
        : String(modules || "")
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean);

      if (moduleList.length === 0) {
        return res
          .status(400)
          .json({ message: "Provide at least one module for the course" });
      }

      const existing = await Course.findOne({
        institute: req.user.id,
        title: new RegExp(`^${normalizedTitle}$`, "i"),
      });

      if (existing) {
        return res
          .status(400)
          .json({ message: "Course with this title already exists" });
      }

      if (normalizedCode) {
        const codeCollision = await Course.findOne({
          institute: req.user.id,
          courseCode: normalizedCode,
        });
        if (codeCollision) {
          return res
            .status(400)
            .json({ message: "Course code already in use for this institute" });
        }
      }

      const course = new Course({
        title: normalizedTitle,
        courseCode: normalizedCode,
        description: description || "",
        modules: moduleList,
        duration: duration ? Number(duration) : null,
        ncvqLevel: ncvqLevel || null,
        institute: req.user.id,
        createdBy: req.user.id,
      });

      await course.save();

      res.status(201).json({
        success: true,
        message: "Course created successfully",
        course,
      });
    } catch (error) {
      console.error("Create course error:", error);
      res
        .status(500)
        .json({ message: "Failed to create course", error: error.message });
    }
  }
);

/**
 * PUT /api/institute/courses/:id
 * Update a course
 */
router.put(
  "/courses/:id",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const { title, description, modules, duration, ncvqLevel, courseCode } =
        req.body;

      const course = await Course.findOne({
        _id: req.params.id,
        institute: req.user.id,
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (title) {
        const normalized = title.trim();
        const titleClash = await Course.findOne({
          _id: { $ne: course._id },
          institute: req.user.id,
          title: new RegExp(`^${normalized}$`, "i"),
        });
        if (titleClash) {
          return res
            .status(400)
            .json({ message: "Another course with this title already exists" });
        }
        course.title = normalized;
      }

      if (courseCode !== undefined) {
        const normalizedCode = courseCode ? courseCode.trim() : null;
        if (normalizedCode) {
          const codeClash = await Course.findOne({
            _id: { $ne: course._id },
            institute: req.user.id,
            courseCode: normalizedCode,
          });
          if (codeClash) {
            return res
              .status(400)
              .json({ message: "Another course already uses this code" });
          }
        }
        course.courseCode = normalizedCode;
      }

      if (description !== undefined) course.description = description;

      if (modules !== undefined) {
        const moduleList = Array.isArray(modules)
          ? modules.filter(Boolean)
          : String(modules || "")
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean);
        if (moduleList.length === 0) {
          return res
            .status(400)
            .json({ message: "Provide at least one module for the course" });
        }
        course.modules = moduleList;
      }

      if (duration !== undefined) {
        course.duration =
          duration === null || duration === "" ? null : Number(duration);
      }

      if (ncvqLevel !== undefined) course.ncvqLevel = ncvqLevel;

      await course.save();

      res.json({
        success: true,
        message: "Course updated successfully",
        course,
      });
    } catch (error) {
      console.error("Update course error:", error);
      res
        .status(500)
        .json({ message: "Failed to update course", error: error.message });
    }
  }
);

/**
 * DELETE /api/institute/courses/:id
 * Delete a course (soft delete - only if no certificates issued)
 */
router.delete(
  "/courses/:id",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const course = await Course.findOne({
        _id: req.params.id,
        institute: req.user.id,
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if any certificates have been issued
      const certCount = await Certificate.countDocuments({
        course: course._id,
        institute: req.user.id,
      });

      if (certCount > 0) {
        return res.status(400).json({
          message:
            "Cannot delete course with issued certificates. Archive it instead.",
        });
      }

      await course.deleteOne();

      res.json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error) {
      console.error("Delete course error:", error);
      res
        .status(500)
        .json({ message: "Failed to delete course", error: error.message });
    }
  }
);

// ============================================
// BATCH MANAGEMENT
// ============================================

/**
 * GET /api/institute/batches
 * Get certificate batches
 */
router.get("/batches", auth(["institute", "institution"]), async (req, res) => {
  try {
    const batches = await Batch.find({ institute: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Get certificate counts for each batch
    const batchesWithStats = await Promise.all(
      batches.map(async (batch) => {
        const certificateCount = await Certificate.countDocuments({
          batchId: batch.batchId,
          institute: req.user.id,
        });

        return {
          ...batch,
          certificateCount,
        };
      })
    );

    res.json({ success: true, batches: batchesWithStats });
  } catch (error) {
    console.error("Get batches error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve batches", error: error.message });
  }
});

/**
 * GET /api/institute/batches/:batchId/certificates
 * Get certificates in a specific batch
 */
router.get(
  "/batches/:batchId/certificates",
  auth(["institute", "institution"]),
  async (req, res) => {
    try {
      const certificates = await Certificate.find({
        batchId: req.params.batchId,
        institute: req.user.id,
      })
        .populate("learner", "name email learnerProfile.learnerId")
        .populate("course", "title")
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, certificates });
    } catch (error) {
      console.error("Get batch certificates error:", error);
      res.status(500).json({
        message: "Failed to retrieve batch certificates",
        error: error.message,
      });
    }
  }
);

// ============================================
// LEGACY ROUTE SUPPORT
// ============================================

/**
 * POST /api/institute/upload
 * Legacy single certificate upload endpoint
 */
router.post(
  "/upload",
  auth(["institute", "institution"]),
  upload.single("certificateFile"),
  async (req, res) => {
    try {
      // Redirect to new endpoint
      return router.handle(
        {
          ...req,
          url: "/certificates",
          originalUrl: "/api/institute/certificates",
        },
        res
      );
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed", error: error.message });
    }
  }
);

module.exports = router;
