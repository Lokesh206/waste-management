const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for SWMS...');

  // Clean existing data in reverse relational order
  await prisma.auditLog.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.ecoReward.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.ward.deleteMany();
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

  // Wards
  await prisma.ward.createMany({
    data: [
      { ward_number: 101, name: 'North Central Commercial Ward', target_recycling_rate: 75.0, cleanliness_index: 91.2 },
      { ward_number: 102, name: 'Academic & University District', target_recycling_rate: 80.0, cleanliness_index: 94.5 },
      { ward_number: 103, name: 'High-Tech Industrial Belt', target_recycling_rate: 70.0, cleanliness_index: 87.0 },
      { ward_number: 104, name: 'Botanical Gardens & Residential', target_recycling_rate: 85.0, cleanliness_index: 96.0 },
      { ward_number: 105, name: 'Sports Stadium & Recreation Corridor', target_recycling_rate: 68.0, cleanliness_index: 84.0 },
    ],
  });

  // Fleet Vehicles
  const vehicle = await prisma.vehicle.create({
    data: {
      vehicle_code: 'TRUCK-01',
      plate_number: 'KA-01-WM-2026',
      collector_id: collector.id,
      capacity_kg: 1800.0,
      current_load_kg: 350.0,
      status: 'On Route',
      latitude: 12.9690,
      longitude: 77.5920,
      speed: 32.0,
      heading: 90.0,
    },
  });

  // Bins
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
      gas_level_ppm: 78.0,
      battery_level: 95,
      ward: 'Ward 101',
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
      gas_level_ppm: 42.0,
      battery_level: 88,
      ward: 'Ward 101',
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
      gas_level_ppm: 18.0,
      battery_level: 92,
      ward: 'Ward 102',
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
      gas_level_ppm: 34.0,
      battery_level: 84,
      ward: 'Ward 102',
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
      gas_level_ppm: 55.0,
      battery_level: 90,
      ward: 'Ward 103',
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
      gas_level_ppm: 12.0,
      battery_level: 98,
      ward: 'Ward 103',
    },
    {
      bin_code: 'BIN-007',
      location_name: 'Student Center Courtyard',
      latitude: 12.9682,
      longitude: 77.5974,
      capacity: 100.0,
      current_fill_percentage: 55.0,
      waste_type: 'Organic',
      status: 'Moderate',
      gas_level_ppm: 26.0,
      battery_level: 91,
      ward: 'Ward 104',
    },
    {
      bin_code: 'BIN-008',
      location_name: 'Chemistry Research Labs',
      latitude: 12.9768,
      longitude: 77.5915,
      capacity: 100.0,
      current_fill_percentage: 15.0,
      waste_type: 'Plastic',
      status: 'Normal',
      gas_level_ppm: 14.0,
      battery_level: 96,
      ward: 'Ward 104',
    },
    {
      bin_code: 'BIN-009',
      location_name: 'Sports Complex Main Gate',
      latitude: 12.9675,
      longitude: 77.5901,
      capacity: 100.0,
      current_fill_percentage: 82.0,
      waste_type: 'Paper',
      status: 'Almost Full',
      gas_level_ppm: 62.0,
      battery_level: 82,
      ward: 'Ward 105',
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
      gas_level_ppm: 16.0,
      battery_level: 94,
      ward: 'Ward 105',
    },
  ];

  const createdBins = [];
  for (const b of binsData) {
    const createdBin = await prisma.bin.create({ data: b });
    createdBins.push(createdBin);

    // Initial reading
    await prisma.binReading.create({
      data: {
        bin_id: createdBin.id,
        fill_percentage: createdBin.current_fill_percentage,
        distance_cm: Math.round(100 - createdBin.current_fill_percentage),
        sensor_status: 'OK',
        gas_level_ppm: createdBin.gas_level_ppm || 20.0,
        battery_level: createdBin.battery_level || 90,
      },
    });
  }

  // Active Critical Collection Request for BIN-001
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

  // Completed Collection Request with Traceable Batch for Recycling Center
  const bin004 = createdBins[3];
  const completedReq = await prisma.collectionRequest.create({
    data: {
      bin_id: bin004.id,
      priority: 'High',
      status: 'Completed',
      assigned_collector_id: collector.id,
      notes: 'Completed scheduled collection and safely emptied chamber.',
      requested_at: new Date(Date.now() - 14400 * 1000),
      assigned_at: new Date(Date.now() - 12000 * 1000),
      completed_at: new Date(Date.now() - 3600 * 1000),
    },
  });

  const batchCode = 'BATCH-SWMS-2026-10042';
  const collectionRecord = await prisma.collectionRecord.create({
    data: {
      collection_request_id: completedReq.id,
      collector_id: collector.id,
      collected_quantity: 45.0,
      unit: 'kg',
      collection_latitude: bin004.latitude,
      collection_longitude: bin004.longitude,
      is_verified: true,
      fraud_flag: null,
      collected_at: new Date(Date.now() - 3600 * 1000),
    },
  });

  // Traceable Recycling Record for GreenCycle Plant
  await prisma.recyclingRecord.create({
    data: {
      batch_number: batchCode,
      collection_record_id: collectionRecord.id,
      recycling_center_id: recyclingCenter.id,
      waste_type: 'Glass & Recyclable Polymers',
      quantity: 45.0,
      unit: 'kg',
      recovery_rate: 88.0,
      status: 'Processing',
      processed_quantity: 40.0,
      processed_at: new Date(),
    },
  });

  // Citizen Complaint
  await prisma.complaint.create({
    data: {
      user_id: citizen.id,
      title: 'Illegal dumping behind Commercial Complex',
      description: 'Multiple sacks of mixed commercial and plastic waste left near the stormwater drain.',
      latitude: 12.9712,
      longitude: 77.5940,
      category: 'Plastic Dumping',
      severity: 'High',
      status: 'Pending',
      sla_deadline: new Date(Date.now() + 24 * 3600 * 1000),
      created_at: new Date(Date.now() - 7200 * 1000),
    },
  });

  // Eco-Rewards for Citizen
  await prisma.ecoReward.createMany({
    data: [
      { user_id: citizen.id, points: 50, reason: 'Verified illegal dumping cleanup report', reference_type: 'complaint' },
      { user_id: citizen.id, points: 20, reason: 'AI plastic scan & responsible segregation', reference_type: 'classification' },
      { user_id: citizen.id, points: 10, reason: 'E-waste deposit bonus at Smart Bin BIN-006', reference_type: 'deposit' },
    ],
  });

  // Sensor Anomalies
  await prisma.anomaly.createMany({
    data: [
      {
        bin_id: bin001.id,
        anomaly_type: 'Fill_Spike_Surge',
        severity: 'CRITICAL',
        description: 'Ultrasonic sensor registered rapid fill spike (+38% in single cycle). Imminent overflow risk.',
      },
      {
        bin_id: createdBins[1].id,
        anomaly_type: 'Gas_Decomposition_Spike',
        severity: 'WARNING',
        description: 'VOC / Methane air sensor detected elevated gas levels (42 ppm) in organic chamber.',
      },
    ],
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'COLLECTION_VERIFIED',
        user_id: collector.id,
        entity_type: 'CollectionRequest',
        entity_id: completedReq.id,
        details: JSON.stringify({ distance_meters: 42, threshold_max: 350, batch_number: batchCode }),
        ip_address: '127.0.0.1 (Field Telemetry)',
      },
      {
        action: 'SYSTEM_BOOT',
        user_id: admin.id,
        entity_type: 'Platform',
        details: 'SWMS Enterprise Engine v1.0.0 initialized with Socket.IO Real-Time Stream',
        ip_address: '127.0.0.1',
      },
    ],
  });

  // Notifications
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
        message: 'Ready to receive processed batch records from collectors.',
        notification_type: 'system',
      },
    ],
  });

  console.log('✅ Seeding completed with rich multi-role municipal data!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
