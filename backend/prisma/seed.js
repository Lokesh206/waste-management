const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for SWMS...');

  // Clean existing data
  await prisma.predictionRecord.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.recyclingRecord.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.collectionRecord.deleteMany();
  await prisma.collectionRequest.deleteMany();
  await prisma.wasteClassification.deleteMany();
  await prisma.binReading.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // Create Users with hashed passwords
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const collectorPassword = await bcrypt.hash('collector123', salt);
  const citizenPassword = await bcrypt.hash('citizen123', salt);
  const recyclingPassword = await bcrypt.hash('recycling123', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@swms.com',
      phone: '+1-555-0100',
      password_hash: adminPassword,
      role: 'admin',
    },
  });

  const collector = await prisma.user.create({
    data: {
      name: 'Alex Collector (Team Alpha)',
      email: 'collector@swms.com',
      phone: '+1-555-0101',
      password_hash: collectorPassword,
      role: 'collector',
    },
  });

  const citizen = await prisma.user.create({
    data: {
      name: 'Jane Citizen',
      email: 'citizen@swms.com',
      phone: '+1-555-0102',
      password_hash: citizenPassword,
      role: 'citizen',
    },
  });

  const recyclingCenter = await prisma.user.create({
    data: {
      name: 'GreenCycle Processing Plant',
      email: 'recycling@swms.com',
      phone: '+1-555-0103',
      password_hash: recyclingPassword,
      role: 'recycling_center',
    },
  });

  console.log('👤 Created default user accounts for 4 roles:');
  console.log('   - Admin: admin@swms.com / admin123');
  console.log('   - Collector: collector@swms.com / collector123');
  console.log('   - Citizen: citizen@swms.com / citizen123');
  console.log('   - Recycling Center: recycling@swms.com / recycling123');

  // Realistic city center / campus coordinates (centered around 12.9716, 77.5946)
  const binsData = [
    {
      bin_code: 'BIN-001',
      location_name: 'Central Plaza North Wing',
      latitude: 12.9719,
      longitude: 77.5937,
      capacity: 100.0,
      current_fill_percentage: 92.0,
      waste_type: 'Plastic',
      status: 'Critical',
    },
    {
      bin_code: 'BIN-002',
      location_name: 'Science Quadrangle Garden',
      latitude: 12.9734,
      longitude: 77.5951,
      capacity: 100.0,
      current_fill_percentage: 78.0,
      waste_type: 'Organic',
      status: 'Almost Full',
    },
    {
      bin_code: 'BIN-003',
      location_name: 'Library Building Entrance',
      latitude: 12.9698,
      longitude: 77.5912,
      capacity: 100.0,
      current_fill_percentage: 45.0,
      waste_type: 'Paper',
      status: 'Normal',
    },
    {
      bin_code: 'BIN-004',
      location_name: 'Cafeteria Recycling Bay',
      latitude: 12.9705,
      longitude: 77.5968,
      capacity: 100.0,
      current_fill_percentage: 65.0,
      waste_type: 'Glass',
      status: 'Moderate',
    },
    {
      bin_code: 'BIN-005',
      location_name: 'Engineering Workshop Area',
      latitude: 12.9742,
      longitude: 77.5925,
      capacity: 100.0,
      current_fill_percentage: 88.0,
      waste_type: 'Metal',
      status: 'Almost Full',
    },
    {
      bin_code: 'BIN-006',
      location_name: 'IT Tech Park Block A',
      latitude: 12.9755,
      longitude: 77.5982,
      capacity: 100.0,
      current_fill_percentage: 20.0,
      waste_type: 'E-Waste',
      status: 'Normal',
    },
    {
      bin_code: 'BIN-007',
      location_name: 'Student Center Courtyard',
      latitude: 12.9682,
      longitude: 77.5974,
      capacity: 100.0,
      current_fill_percentage: 55.0,
      waste_type: 'General',
      status: 'Moderate',
    },
    {
      bin_code: 'BIN-008',
      location_name: 'Chemistry Research Labs',
      latitude: 12.9768,
      longitude: 77.5915,
      capacity: 100.0,
      current_fill_percentage: 15.0,
      waste_type: 'Hazardous',
      status: 'Normal',
    },
    {
      bin_code: 'BIN-009',
      location_name: 'Sports Complex Main Gate',
      latitude: 12.9675,
      longitude: 77.5901,
      capacity: 100.0,
      current_fill_percentage: 82.0,
      waste_type: 'Plastic',
      status: 'Almost Full',
    },
    {
      bin_code: 'BIN-010',
      location_name: 'Botanical Park Walkway',
      latitude: 12.9728,
      longitude: 77.6002,
      capacity: 100.0,
      current_fill_percentage: 30.0,
      waste_type: 'Organic',
      status: 'Normal',
    },
  ];

  const createdBins = [];
  for (const b of binsData) {
    const bin = await prisma.bin.create({ data: b });
    createdBins.push(bin);

    // Create 3 historical readings per bin for time series
    const baseDate = new Date();
    for (let i = 3; i >= 0; i--) {
      const readingDate = new Date(baseDate.getTime() - i * 3600 * 1000);
      const readingFill = Math.max(5, bin.current_fill_percentage - i * 12);
      await prisma.binReading.create({
        data: {
          bin_id: bin.id,
          fill_percentage: readingFill,
          distance_cm: Math.round(((100 - readingFill) / 100) * bin.capacity),
          temperature: 24.5 + (Math.random() * 4 - 2),
          sensor_status: 'OK',
          recorded_at: readingDate,
        },
      });
    }
  }
  console.log(`🗑️  Created ${createdBins.length} smart bins with historical sensor readings.`);

  // Create an initial collection request for BIN-001 (Critical)
  const bin001 = createdBins[0];
  const req001 = await prisma.collectionRequest.create({
    data: {
      bin_id: bin001.id,
      priority: 'Critical',
      status: 'Assigned',
      assigned_collector_id: collector.id,
      notes: 'Automatic alert: Sensor reported fill level 92%. Immediate collection required.',
      requested_at: new Date(Date.now() - 3600 * 1000),
      assigned_at: new Date(Date.now() - 1800 * 1000),
    },
  });

  // Create an initial complaint by citizen
  const sampleComplaint = await prisma.complaint.create({
    data: {
      user_id: citizen.id,
      title: 'Illegal dumping behind Market Complex',
      description: 'Multiple sacks of mixed commercial and plastic waste left near the stormwater drain.',
      latitude: 12.9712,
      longitude: 77.5940,
      status: 'Pending',
      created_at: new Date(Date.now() - 7200 * 1000),
    },
  });

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        user_id: admin.id,
        title: 'Critical Alert',
        message: 'Bin BIN-001 has crossed critical threshold (92%). Collection request generated.',
        notification_type: 'alert',
      },
      {
        user_id: collector.id,
        title: 'New Task Assigned',
        message: 'High priority task assigned for BIN-001 at Central Plaza North Wing.',
        notification_type: 'task',
      },
      {
        user_id: citizen.id,
        title: 'Report Received',
        message: 'Your dumping report #1 has been logged and assigned for municipal review.',
        notification_type: 'complaint',
      },
      {
        user_id: recyclingCenter.id,
        title: 'Recycling Portal Active',
        message: 'Welcome to SWMS. Ready to receive processed batch records from collectors.',
        notification_type: 'system',
      },
    ],
  });

  console.log('🔔 Created initial collection tasks, complaints, and role notifications.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

