const Course = require('../models/Course');
const User = require('../models/User');

const TEMPLATE_COURSES = [
  {
    title: 'Full Stack Development',
    courseCode: 'C1001',
    description: 'Comprehensive program covering fundamental web development skills.',
    modules: ['HTML Fundamentals', 'CSS Layouts', 'JavaScript Essentials'],
    duration: 120,
    ncvqLevel: 'Level 4'
  },
  {
    title: 'Machine Learning Foundations',
    courseCode: 'C1002',
    description: 'Core machine learning concepts with practical model-building exercises.',
    modules: ['Python for ML', 'Model Training', 'Model Evaluation'],
    duration: 140,
    ncvqLevel: 'Level 5'
  },
  {
    title: 'Cloud Computing Specialist',
    courseCode: 'C1003',
    description: 'Deploy and manage cloud-native workloads on modern platforms.',
    modules: ['Cloud Fundamentals', 'Virtualization Concepts', 'Deployment Automation'],
    duration: 110,
    ncvqLevel: 'Level 4'
  },
  {
    title: 'Cybersecurity Operations',
    courseCode: 'C1004',
    description: 'Hands-on cybersecurity training for defensive and offensive techniques.',
    modules: ['Network Security', 'Threat Analysis', 'Incident Response'],
    duration: 130,
    ncvqLevel: 'Level 5'
  },
  {
    title: 'UI/UX Design Essentials',
    courseCode: 'C1005',
    description: 'Designing intuitive interfaces and user experiences for digital products.',
    modules: ['User Research', 'Wireframing Techniques', 'Interface Prototyping'],
    duration: 100,
    ncvqLevel: 'Level 4'
  }
];

async function seedCoursesFromTemplate() {
  const institute = await User.findOne({ email: 'institute@example.com', role: { $in: ['institute', 'institution'] } });

  if (!institute) {
    console.warn('⚠️  Cannot seed template courses: demo institute user not found');
    return;
  }

  for (const courseData of TEMPLATE_COURSES) {
    const existing = await Course.findOne({
      institute: institute._id,
      $or: [
        { courseCode: courseData.courseCode },
        { title: new RegExp(`^${courseData.title}$`, 'i') }
      ]
    });

    if (existing) {
      // Update existing course to ensure metadata stays in sync
      existing.description = courseData.description;
      existing.modules = courseData.modules;
      existing.duration = courseData.duration;
      existing.ncvqLevel = courseData.ncvqLevel;
      existing.courseCode = courseData.courseCode;
      await existing.save();
      console.log(`🔄 Updated course ${courseData.title}`);
      continue;
    }

    const course = new Course({
      ...courseData,
      institute: institute._id,
      createdBy: institute._id
    });

    await course.save();
    console.log(`✅ Created course ${courseData.title}`);
  }
}

module.exports = { seedCoursesFromTemplate };
