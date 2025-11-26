const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { certificateArtifactsDir } = require('./storage');

const buildCertificateContent = ({ certificate, learner, institute, course }) => {
  const learnerId = learner.learnerProfile?.learnerId || learner._id.toString();
  const instituteId = institute.instituteProfile?.registrationId || institute._id.toString();

  return [
    `Certificate ID: ${certificate.certificateId}`,
    `Learner: ${learner.name} (${learner.email})`,
    `Learner ID: ${learnerId}`,
    `Institute: ${institute.name} (${institute.email})`,
    `Institute ID: ${instituteId}`,
    `Course: ${course.title}`,
    `Modules Awarded: ${certificate.modulesAwarded.join(', ') || 'N/A'}`,
    `Issued On: ${certificate.issueDate.toISOString()}`,
  ].join('\n');
};

const generatePlaceholderPdf = async (payload) => {
  const filename = `${payload.certificate.certificateId}.txt`;
  const absolutePath = path.join(certificateArtifactsDir, filename);
  const content = buildCertificateContent(payload);
  await fs.writeFile(absolutePath, content, 'utf8');
  return absolutePath;
};

const buildMetadataHash = ({ certificate, learner, institute, course }) => {
  const core = {
    certificateId: certificate.certificateId,
    learnerId: learner.learnerProfile?.learnerId || learner._id.toString(),
    instituteId: institute.instituteProfile?.registrationId || institute._id.toString(),
    courseId: course._id.toString(),
    modulesAwarded: certificate.modulesAwarded,
    issueDate: certificate.issueDate.toISOString(),
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
  return { hash, core };
};

module.exports = {
  generatePlaceholderPdf,
  buildMetadataHash,
};
