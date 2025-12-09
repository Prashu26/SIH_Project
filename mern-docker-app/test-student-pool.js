const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Certificate = require('./backend/models/Certificate');
const Course = require('./backend/models/Course');

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://prashugowda179_db_user:e6r64i4grlSD5yxd@cluster0.antybto.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    console.log('Running aggregation pipeline...');
    
    const pipeline = [
      {
        $match: { role: 'learner' }
      },
      // Lookup certificates with nested info
      {
        $lookup: {
          from: 'certificates',
          let: { learnerId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$learner', '$$learnerId'] } } },
            // Lookup Course info
            {
              $lookup: {
                from: 'courses',
                localField: 'course',
                foreignField: '_id',
                as: 'course'
              }
            },
            {
              $unwind: {
                path: '$course',
                preserveNullAndEmptyArrays: true
              }
            },
            // Lookup Institute info
            {
              $lookup: {
                from: 'users',
                localField: 'institute',
                foreignField: '_id',
                as: 'institute'
              }
            },
            {
              $unwind: {
                path: '$institute',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: 'certificates'
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
          learnerId: '$learnerProfile.learnerId',
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

    const students = await User.aggregate(pipeline);
    console.log(`Found ${students.length} students`);
    if (students.length > 0) {
      console.log('Sample student:', JSON.stringify(students[0], null, 2));
    }

  } catch (error) {
    console.error('Error running pipeline:', error);
  } finally {
    mongoose.disconnect();
  }
});
