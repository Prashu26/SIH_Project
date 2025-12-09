const mongoose = require('mongoose');
const User = require('./models/User');
const Certificate = require('./models/Certificate');
const Course = require('./models/Course');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/mernapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    const pipeline = [
      {
        $match: { role: 'learner' }
      },
      // Lookup certificates
      {
        $lookup: {
          from: 'certificates',
          localField: '_id',
          foreignField: 'learner',
          as: 'certificates'
        }
      },
      {
        $unwind: {
          path: '$certificates',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup Course info
      {
        $lookup: {
          from: 'courses',
          localField: 'certificates.course',
          foreignField: '_id',
          as: 'certificates.course'
        }
      },
      {
        $unwind: {
          path: '$certificates.course',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup Institute info
      {
        $lookup: {
          from: 'users',
          localField: 'certificates.institute',
          foreignField: '_id',
          as: 'certificates.institute'
        }
      },
      {
        $unwind: {
          path: '$certificates.institute',
          preserveNullAndEmptyArrays: true
        }
      },
      // Group back to student
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          email: { $first: '$email' },
          learnerId: { $first: '$learnerProfile.learnerId' },
          certificates: {
            $push: {
              $cond: [
                { $ifNull: ['$certificates._id', false] },
                {
                  certificateId: '$certificates.certificateId',
                  course: '$certificates.course',
                  institute: '$certificates.institute',
                  issueDate: '$certificates.issueDate',
                  modulesAwarded: '$certificates.modulesAwarded',
                  status: '$certificates.status',
                  pdfPath: '$certificates.pdfPath',
                  fatherName: '$certificates.fatherName',
                  motherName: '$certificates.motherName',
                  dob: '$certificates.dob',
                  address: '$certificates.address',
                  district: '$certificates.district',
                  state: '$certificates.state'
                },
                '$$REMOVE'
              ]
            }
          }
        }
      },
      // Add derived fields
      {
        $addFields: {
          totalCertificates: { $size: '$certificates' },
          skills: {
            $reduce: {
              input: '$certificates',
              initialValue: [],
              in: { $setUnion: ['$$value', { $ifNull: ['$$this.modulesAwarded', []] }] }
            }
          },
          institutions: {
            $reduce: {
              input: '$certificates',
              initialValue: [],
              in: { $setUnion: ['$$value', [{ $ifNull: ['$$this.institute.name', null] }]] }
            }
          },
          courses: {
            $reduce: {
              input: '$certificates',
              initialValue: [],
              in: { $setUnion: ['$$value', [{ $ifNull: ['$$this.course.title', null] }]] }
            }
          },
          personalInfo: {
            $let: {
              vars: { latestCert: { $arrayElemAt: ['$certificates', -1] } },
              in: {
                fatherName: '$$latestCert.fatherName',
                motherName: '$$latestCert.motherName',
                dob: '$$latestCert.dob',
                address: '$$latestCert.address',
                district: '$$latestCert.district',
                state: '$$latestCert.state'
              }
            }
          }
        }
      },
      // Clean up nulls in arrays
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          learnerId: 1,
          certificates: 1,
          totalCertificates: 1,
          personalInfo: 1,
          skills: 1,
          institutions: {
            $filter: {
              input: '$institutions',
              as: 'inst',
              cond: { $ne: ['$$inst', null] }
            }
          },
          courses: {
            $filter: {
              input: '$courses',
              as: 'course',
              cond: { $ne: ['$$course', null] }
            }
          }
        }
      }
    ];

    console.log('Running aggregation...');
    const students = await User.aggregate(pipeline);
    console.log('Aggregation result count:', students.length);
    console.log('First student:', JSON.stringify(students[0], null, 2));
    
  } catch (error) {
    console.error('Aggregation error:', error);
  } finally {
    mongoose.disconnect();
  }
});
