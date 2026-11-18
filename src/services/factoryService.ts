import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  FactoryConfig,
  FactoryMember,
  RecordOrigin,
  RoleId,
  UserPrivateProfile,
} from '../types/factory';

export function generateSafeId(prefix = 'rec'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${cleanPrefix}_${ts}_${rand}`;
}

export function todayIsoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DEFAULT_FAULT_CATEGORIES = [
  'Photoelectric sensor failure',
  'Proximity sensor failure',
  'Heater failure',
  'Temperature controller failure',
  'Electrical plug failure',
  'Socket failure',
  'Power supply issue',
  'Wiring problem',
  'Other electrical fault',
  'Pneumatic actuator leak',
  'Drive belt / bearing wear',
  'Cutting blade misalignment',
];

export const DEFAULT_DEPARTMENTS = [
  'Production',
  'Electrical Maintenance',
  'Mechanical Maintenance',
  'Materials & Receiving',
  'Warehouse & Stores',
  'Quality Assurance',
  'Plant Administration',
];

export const DEFAULT_MATERIAL_UNITS = ['kg', 'rolls', 'pcs', 'boxes', 'liters', 'meters'];
export const DEFAULT_SHIFTS = ['Morning', 'Afternoon', 'Night'];

export async function upsertUserPrivateProfile(
  uid: string,
  email: string,
  displayName: string,
  defaultFactoryId?: string
): Promise<UserPrivateProfile> {
  const path = `users/${uid}/private/info`;
  const ref = doc(db, 'users', uid, 'private', 'info');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload = {
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Factory Personnel',
        defaultFactoryId: defaultFactoryId || 'factory_pilot_01',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      return {
        uid,
        email,
        displayName: payload.displayName,
        defaultFactoryId: payload.defaultFactoryId,
      };
    } else {
      const existing = snap.data() as UserPrivateProfile;
      await updateDoc(ref, {
        email,
        displayName: displayName || existing.displayName,
        updatedAt: serverTimestamp(),
      });
      return existing;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function ensureUserFactoryWorkspace(
  uid: string,
  displayName: string,
  email: string
): Promise<FactoryConfig> {
  const factoryId = `factory_${uid.slice(0, 12).replace(/[^a-zA-Z0-9]/g, '')}`;
  const pilotId = 'factory_pilot_01';

  // Check if user is already a member of the shared pilot factory or owns their own factory
  try {
    const pilotMemberRef = doc(db, 'factories', pilotId, 'members', uid);
    const pilotSnap = await getDoc(doc(db, 'factories', pilotId));
    if (pilotSnap.exists()) {
      const pilotData = pilotSnap.data() as FactoryConfig;
      const isPilotOwner = pilotData.ownerId === uid || email === 'nt6592147@gmail.com';
      const memberSnap = await getDoc(pilotMemberRef);
      if (memberSnap.exists() || isPilotOwner) {
        if (!memberSnap.exists() && isPilotOwner) {
          await setDoc(pilotMemberRef, {
            uid,
            factoryId: pilotId,
            factoryOwnerUid: pilotData.ownerId,
            accessUids: pilotData.accessUids,
            displayName,
            employeeCode: 'ADM-001',
            role: 'super_admin',
            department: 'Plant Administration',
            isMaintenanceHead: true,
            active: true,
            createdByUid: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        return pilotData;
      }
    } else if (email === 'nt6592147@gmail.com') {
      return await createAndSeedFactory(pilotId, uid, displayName, 'Apex Hygiene Manufacturing Ltd.', 'Pilot Plant 01 — Hygiene & Converting');
    }

    // Check if user already has their dedicated factory
    const userFactoriesQ = query(
      collection(db, 'factories'),
      where('accessUids', 'array-contains', uid)
    );
    const listSnap = await getDocs(userFactoriesQ);
    if (!listSnap.empty) {
      return listSnap.docs[0].data() as FactoryConfig;
    }

    // Otherwise create a dedicated factory workspace for this authenticated user
    return await createAndSeedFactory(
      factoryId,
      uid,
      displayName,
      `${displayName.split(' ')[0] || 'Industrial'} Manufacturing Corp.`,
      'Main Production Facility'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'factories');
  }
}

async function createAndSeedFactory(
  factoryId: string,
  ownerUid: string,
  ownerName: string,
  companyName: string,
  factoryName: string
): Promise<FactoryConfig> {
  const factoryConfig: FactoryConfig = {
    id: factoryId,
    name: factoryName,
    companyName,
    location: 'Industrial Zone Sector B',
    ownerId: ownerUid,
    accessUids: [ownerUid],
    departments: DEFAULT_DEPARTMENTS,
    faultCategories: DEFAULT_FAULT_CATEGORIES,
    materialUnits: DEFAULT_MATERIAL_UNITS,
    shifts: DEFAULT_SHIFTS,
    hasSampleData: true,
  };

  try {
    await setDoc(doc(db, 'factories', factoryId), {
      ...factoryConfig,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const memberPayload: Omit<FactoryMember, 'id'> = {
      uid: ownerUid,
      factoryId,
      factoryOwnerUid: ownerUid,
      accessUids: [ownerUid],
      displayName: ownerName || 'Plant Administrator',
      employeeCode: 'EMP-001',
      role: 'super_admin',
      department: 'Plant Administration',
      isMaintenanceHead: true,
      active: true,
      createdByUid: ownerUid,
    };

    await setDoc(doc(db, 'factories', factoryId, 'members', ownerUid), {
      ...memberPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await seedPilotSampleData(factoryId, ownerUid, ownerName);
    return factoryConfig;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `factories/${factoryId}`);
  }
}

export async function seedPilotSampleData(
  factoryId: string,
  ownerUid: string,
  ownerName: string
): Promise<void> {
  const batch = writeBatch(db);
  const accessUids = [ownerUid];
  const baseEnvelope = {
    factoryId,
    factoryOwnerUid: ownerUid,
    accessUids,
    recordOrigin: 'sample' as RecordOrigin,
    createdByUid: ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const today = todayIsoDate(0);
  const yesterday = todayIsoDate(-1);
  const twoDaysAgo = todayIsoDate(-2);

  // 1. Machines (Diaper Production & Supporting Equipment)
  const machines = [
    {
      id: 'm_core_01',
      machineCode: 'DP-CORE-01',
      name: 'Core Forming Unit L1',
      category: 'Core forming unit',
      equipmentGroup: 'diaper_production',
      manufacturer: 'Fameccanica',
      model: 'FMS-900',
      serialNumber: 'FM-2023-8812',
      department: 'Production',
      productionLine: 'Line 1',
      installationDate: '2023-03-14',
      status: 'running',
      runningHours: 4820,
      lastMaintenanceDate: twoDaysAgo,
      nextMaintenanceDate: todayIsoDate(12),
    },
    {
      id: 'm_sap_01',
      machineCode: 'DP-SAP-01',
      name: 'SAP Applicator L1',
      category: 'SAP applicator',
      equipmentGroup: 'diaper_production',
      manufacturer: 'Fameccanica',
      model: 'SAP-D400',
      serialNumber: 'FM-2023-8819',
      department: 'Production',
      productionLine: 'Line 1',
      installationDate: '2023-03-14',
      status: 'stopped',
      runningHours: 4795,
      lastMaintenanceDate: todayIsoDate(-10),
      nextMaintenanceDate: todayIsoDate(4),
    },
    {
      id: 'm_elastic_01',
      machineCode: 'DP-ELS-01',
      name: 'Elastic Applicator L1',
      category: 'Elastic applicator',
      equipmentGroup: 'diaper_production',
      manufacturer: 'GDM',
      model: 'EL-220',
      serialNumber: 'GDM-2022-410',
      department: 'Production',
      productionLine: 'Line 1',
      installationDate: '2022-11-02',
      status: 'running',
      runningHours: 6120,
      lastMaintenanceDate: yesterday,
      nextMaintenanceDate: todayIsoDate(20),
    },
    {
      id: 'm_frontal_02',
      machineCode: 'DP-FTU-02',
      name: 'Frontal Tape Unit L2',
      category: 'Frontal tape unit',
      equipmentGroup: 'diaper_production',
      manufacturer: 'Zuiko',
      model: 'ZK-FT80',
      serialNumber: 'ZK-2024-119',
      department: 'Production',
      productionLine: 'Line 2',
      installationDate: '2024-01-18',
      status: 'running',
      runningHours: 2340,
      lastMaintenanceDate: todayIsoDate(-5),
      nextMaintenanceDate: todayIsoDate(25),
    },
    {
      id: 'm_side_02',
      machineCode: 'DP-STU-02',
      name: 'Side Tape Unit L2',
      category: 'Side tape unit',
      equipmentGroup: 'diaper_production',
      manufacturer: 'Zuiko',
      model: 'ZK-ST90',
      serialNumber: 'ZK-2024-120',
      department: 'Production',
      productionLine: 'Line 2',
      installationDate: '2024-01-18',
      status: 'maintenance',
      runningHours: 2310,
      lastMaintenanceDate: todayIsoDate(-14),
      nextMaintenanceDate: today,
    },
    {
      id: 'm_cutting_01',
      machineCode: 'DP-CUT-01',
      name: 'Rotary Cutting Unit L1',
      category: 'Cutting unit',
      equipmentGroup: 'diaper_production',
      manufacturer: 'Curt G. Joa',
      model: 'JOA-RC55',
      serialNumber: 'JOA-2021-904',
      department: 'Production',
      productionLine: 'Line 1',
      installationDate: '2021-08-20',
      status: 'running',
      runningHours: 9410,
      lastMaintenanceDate: twoDaysAgo,
      nextMaintenanceDate: todayIsoDate(7),
    },
    {
      id: 'm_fold_02',
      machineCode: 'DP-FLD-02',
      name: 'Bi-Fold & Stacker Unit L2',
      category: 'Folding unit',
      equipmentGroup: 'diaper_production',
      manufacturer: 'Zuiko',
      model: 'ZK-FD40',
      serialNumber: 'ZK-2024-125',
      department: 'Production',
      productionLine: 'Line 2',
      installationDate: '2024-01-19',
      status: 'running',
      runningHours: 2298,
      lastMaintenanceDate: todayIsoDate(-6),
      nextMaintenanceDate: todayIsoDate(14),
    },
    {
      id: 'm_pack_01',
      machineCode: 'SUP-PKG-01',
      name: 'Auto Bagging & Sealing Machine 1',
      category: 'Packaging machines',
      equipmentGroup: 'supporting_equipment',
      manufacturer: 'Optima',
      model: 'OPT-LS12',
      serialNumber: 'OPT-2023-332',
      department: 'Production',
      productionLine: 'Line 1',
      installationDate: '2023-05-10',
      status: 'running',
      runningHours: 4510,
      lastMaintenanceDate: todayIsoDate(-4),
      nextMaintenanceDate: todayIsoDate(10),
    },
    {
      id: 'm_comp_01',
      machineCode: 'SUP-CMP-01',
      name: 'Rotary Screw Air Compressor #1',
      category: 'Air compressors',
      equipmentGroup: 'supporting_equipment',
      manufacturer: 'Atlas Copco',
      model: 'GA 75 VSD+',
      serialNumber: 'AC-2022-7741',
      department: 'Mechanical Maintenance',
      productionLine: 'Utilities',
      installationDate: '2022-04-05',
      status: 'running',
      runningHours: 11200,
      lastMaintenanceDate: yesterday,
      nextMaintenanceDate: todayIsoDate(30),
    },
    {
      id: 'm_dryer_01',
      machineCode: 'SUP-DRY-01',
      name: 'Refrigerated Air Dryer #1',
      category: 'Air dryers',
      equipmentGroup: 'supporting_equipment',
      manufacturer: 'Atlas Copco',
      model: 'FX 16',
      serialNumber: 'AC-2022-7749',
      department: 'Mechanical Maintenance',
      productionLine: 'Utilities',
      installationDate: '2022-04-05',
      status: 'running',
      runningHours: 11180,
      lastMaintenanceDate: todayIsoDate(-20),
      nextMaintenanceDate: todayIsoDate(-2),
    },
    {
      id: 'm_gen_01',
      machineCode: 'SUP-GEN-01',
      name: 'Standby Diesel Generator 500kVA',
      category: 'Power generators',
      equipmentGroup: 'supporting_equipment',
      manufacturer: 'Caterpillar',
      model: 'C15-500',
      serialNumber: 'CAT-2021-512',
      department: 'Electrical Maintenance',
      productionLine: 'Utilities',
      installationDate: '2021-06-15',
      status: 'standby',
      runningHours: 642,
      lastMaintenanceDate: todayIsoDate(-7),
      nextMaintenanceDate: todayIsoDate(21),
    },
  ];

  for (const m of machines) {
    batch.set(doc(db, 'factories', factoryId, 'machines', m.id), { ...baseEnvelope, ...m });
  }

  // 2. Materials
  const materials = [
    {
      id: 'mat_204',
      materialCode: 'MAT-NW-204',
      name: 'Hydrophilic Top-Sheet Nonwoven',
      category: 'Nonwoven Fabric',
      supplier: 'PFNonwovens Europe',
      batchNumber: '204',
      expectedWidthMm: 320,
      expectedThicknessMm: 0.18,
      expectedWeightKg: 420,
      quantity: 1200,
      remainingQty: 740,
      consumedQty: 445,
      wastedQty: 15,
      minThreshold: 300,
      unit: 'kg',
      dateReceived: yesterday,
      storageLocation: 'Bay A-04',
      status: 'in_production',
      notes: 'Primary Line 1 topsheet batch 204',
    },
    {
      id: 'mat_205',
      materialCode: 'MAT-SAP-205',
      name: 'Super Absorbent Polymer Grade S3',
      category: 'SAP Polymer',
      supplier: 'Nippon Shokubai',
      batchNumber: '205',
      expectedWidthMm: 0,
      expectedThicknessMm: 0.45,
      expectedWeightKg: 1000,
      quantity: 2000,
      remainingQty: 1380,
      consumedQty: 610,
      wastedQty: 10,
      minThreshold: 500,
      unit: 'kg',
      dateReceived: twoDaysAgo,
      storageLocation: 'Silo S-02',
      status: 'approved',
      notes: 'Moisture-controlled storage required',
    },
    {
      id: 'mat_206',
      materialCode: 'MAT-PE-206',
      name: 'Breathable PE Backsheet Film',
      category: 'Backsheet Film',
      supplier: 'Berry Global',
      batchNumber: '206',
      expectedWidthMm: 340,
      expectedThicknessMm: 0.022,
      expectedWeightKg: 380,
      quantity: 950,
      remainingQty: 210,
      consumedQty: 715,
      wastedQty: 25,
      minThreshold: 250,
      unit: 'kg',
      dateReceived: twoDaysAgo,
      storageLocation: 'Bay B-11',
      status: 'in_production',
      notes: 'Below minimum reorder threshold',
    },
  ];
  for (const mat of materials) {
    batch.set(doc(db, 'factories', factoryId, 'materials', mat.id), { ...baseEnvelope, ...mat });
  }

  // 3. Material Inspections
  const inspections = [
    {
      id: 'insp_204',
      materialId: 'mat_204',
      materialCode: 'MAT-NW-204',
      materialName: 'Hydrophilic Top-Sheet Nonwoven',
      batchNumber: '204',
      expectedWidthMm: 320,
      actualWidthMm: 320.2,
      expectedThicknessMm: 0.18,
      actualThicknessMm: 0.18,
      expectedWeightKg: 420,
      actualWeightKg: 419.4,
      inspectionDate: yesterday,
      inspectorName: 'C. Mensah (Material Checker)',
      result: 'approved',
      comments: 'Batch 204 width and 0.18 mm caliper within +/- 0.01 mm tolerance.',
    },
    {
      id: 'insp_206',
      materialId: 'mat_206',
      materialCode: 'MAT-PE-206',
      materialName: 'Breathable PE Backsheet Film',
      batchNumber: '206',
      expectedWidthMm: 340,
      actualWidthMm: 339.8,
      expectedThicknessMm: 0.022,
      actualThicknessMm: 0.023,
      expectedWeightKg: 380,
      actualWeightKg: 381.0,
      inspectionDate: yesterday,
      inspectorName: 'C. Mensah (Material Checker)',
      result: 'approved',
      comments: 'Uniform film tension verified.',
    },
  ];
  for (const insp of inspections) {
    batch.set(doc(db, 'factories', factoryId, 'materialInspections', insp.id), { ...baseEnvelope, ...insp });
  }

  // 4. Material Movements
  const movements = [
    {
      id: 'mov_1',
      materialId: 'mat_204',
      materialCode: 'MAT-NW-204',
      materialName: 'Hydrophilic Top-Sheet Nonwoven',
      batchNumber: '204',
      movementType: 'received',
      quantity: 1200,
      unit: 'kg',
      productionLine: 'Receiving Bay',
      recordedByName: 'S. Okafor (Storekeeper)',
      movementDate: yesterday,
      notes: 'Initial pallet intake',
    },
    {
      id: 'mov_2',
      materialId: 'mat_204',
      materialCode: 'MAT-NW-204',
      materialName: 'Hydrophilic Top-Sheet Nonwoven',
      batchNumber: '204',
      movementType: 'consumed',
      quantity: 445,
      unit: 'kg',
      productionLine: 'Line 1',
      recordedByName: 'D. Adeyemi (Supervisor)',
      movementDate: today,
      notes: 'Morning & Afternoon run consumption',
    },
  ];
  for (const mov of movements) {
    batch.set(doc(db, 'factories', factoryId, 'materialMovements', mov.id), { ...baseEnvelope, ...mov });
  }

  // 5. Production Records
  const prodRecords = [
    {
      id: 'prod_1',
      productionDate: today,
      productName: 'UltraDry Baby Diaper Size M',
      productionLine: 'Line 1',
      machineId: 'm_core_01',
      machineName: 'Core Forming Unit L1',
      shift: 'Morning',
      targetQty: 48000,
      actualQty: 46200,
      rejectedQty: 620,
      materialsConsumed: 'MAT-NW-204 (230 kg), MAT-SAP-205 (310 kg)',
      startTime: '06:00',
      endTime: '14:00',
      supervisorName: 'D. Adeyemi',
      operatorName: 'K. Boateng',
      notes: 'Brief 18 min pause for splice roll changeover.',
    },
    {
      id: 'prod_2',
      productionDate: today,
      productName: 'UltraDry Baby Diaper Size L',
      productionLine: 'Line 2',
      machineId: 'm_frontal_02',
      machineName: 'Frontal Tape Unit L2',
      shift: 'Morning',
      targetQty: 42000,
      actualQty: 39100,
      rejectedQty: 890,
      materialsConsumed: 'MAT-PE-206 (290 kg), MAT-SAP-205 (300 kg)',
      startTime: '06:00',
      endTime: '14:00',
      supervisorName: 'R. Patel',
      operatorName: 'M. Silva',
      notes: 'Side tape unit pulled for heater controller inspection at 11:20.',
    },
    {
      id: 'prod_3',
      productionDate: yesterday,
      productName: 'UltraDry Baby Diaper Size M',
      productionLine: 'Line 1',
      machineId: 'm_core_01',
      machineName: 'Core Forming Unit L1',
      shift: 'Afternoon',
      targetQty: 48000,
      actualQty: 47450,
      rejectedQty: 410,
      materialsConsumed: 'MAT-NW-204 (215 kg), MAT-PE-206 (240 kg)',
      startTime: '14:00',
      endTime: '22:00',
      supervisorName: 'D. Adeyemi',
      operatorName: 'T. Nguyen',
      notes: 'Nominal run.',
    },
  ];
  for (const p of prodRecords) {
    batch.set(doc(db, 'factories', factoryId, 'productionRecords', p.id), { ...baseEnvelope, ...p });
  }

  // 6. Machine Incidents
  const incidents = [
    {
      id: 'inc_101',
      incidentCode: 'INC-EL-101',
      machineId: 'm_sap_01',
      machineCode: 'DP-SAP-01',
      machineName: 'SAP Applicator L1',
      department: 'electrical',
      faultCategory: 'Photoelectric sensor failure',
      description: 'Web break photoelectric sensor S14 giving intermittent false trip during speed ramp.',
      alarmInfo: 'ALM-204: Hopper Feed Optical Interlock Fault',
      reportedDate: today,
      reportedTime: '09:15',
      reportedByName: 'K. Boateng (Operator)',
      shift: 'Morning',
      severity: 'high',
      status: 'open',
    },
    {
      id: 'inc_102',
      incidentCode: 'INC-EL-102',
      machineId: 'm_side_02',
      machineCode: 'DP-STU-02',
      machineName: 'Side Tape Unit L2',
      department: 'electrical',
      faultCategory: 'Heater failure',
      description: 'Hot-melt applicator zone 2 heater dropped 18°C below setpoint.',
      alarmInfo: 'ALM-311: Zone 2 Temp Deviation',
      reportedDate: yesterday,
      reportedTime: '16:40',
      reportedByName: 'M. Silva (Operator)',
      shift: 'Afternoon',
      severity: 'critical',
      status: 'resolved',
    },
    {
      id: 'inc_103',
      incidentCode: 'INC-MC-103',
      machineId: 'm_cutting_01',
      machineCode: 'DP-CUT-01',
      machineName: 'Rotary Cutting Unit L1',
      department: 'mechanical',
      faultCategory: 'Cutting blade misalignment',
      description: 'Minor edge fraying observed on left leg cuff trim; anvil roller gap checked.',
      alarmInfo: 'None',
      reportedDate: twoDaysAgo,
      reportedTime: '10:05',
      reportedByName: 'D. Adeyemi (Supervisor)',
      shift: 'Morning',
      severity: 'medium',
      status: 'resolved',
    },
  ];
  for (const inc of incidents) {
    batch.set(doc(db, 'factories', factoryId, 'machineIncidents', inc.id), { ...baseEnvelope, ...inc });
  }

  // 7. Electrical Maintenance Logbook
  const elecMaint = [
    {
      id: 'elm_1',
      discipline: 'electrical',
      recordDate: yesterday,
      machineId: 'm_side_02',
      machineCode: 'DP-STU-02',
      machineName: 'Side Tape Unit L2',
      incidentId: 'inc_102',
      faultCategory: 'Heater failure',
      faultDescription: 'Zone 2 glue manifold cartridge heater open circuit.',
      actionTaken: 'Isolated breaker Q12, verified LOTO, replaced 400W cartridge heater element and re-terminated fiberglass leads.',
      sparePartsUsed: 'SP-EL-09 (400W Cartridge Heater x1)',
      downtimeMinutes: 48,
      runningHours: 2304,
      servicingHours: 0.8,
      technicianName: 'E. Bello (Electrical Tech)',
      startTime: '16:45',
      completionTime: '17:25',
      restorationTime: '17:33',
      observations: 'Thermocouple calibration verified at 165°C nominal.',
      shift: 'Afternoon',
      status: 'awaiting_review',
    },
    {
      id: 'elm_2',
      discipline: 'electrical',
      recordDate: twoDaysAgo,
      machineId: 'm_core_01',
      machineCode: 'DP-CORE-01',
      machineName: 'Core Forming Unit L1',
      faultCategory: 'Proximity sensor failure',
      faultDescription: 'Drum index proximity sensor PNP output flickering.',
      actionTaken: 'Replaced M12 inductive proximity switch and secured shielded cable gland.',
      sparePartsUsed: 'SP-EL-04 (M12 Inductive Proximity Sensor x1)',
      downtimeMinutes: 25,
      runningHours: 4802,
      servicingHours: 0.4,
      technicianName: 'E. Bello (Electrical Tech)',
      startTime: '11:10',
      completionTime: '11:30',
      restorationTime: '11:35',
      observations: 'No repeat trips since replacement.',
      shift: 'Morning',
      status: 'approved',
    },
  ];
  for (const em of elecMaint) {
    batch.set(doc(db, 'factories', factoryId, 'electricalMaintenance', em.id), { ...baseEnvelope, ...em });
  }

  // 8. Mechanical Maintenance Logbook
  const mechMaint = [
    {
      id: 'mcm_1',
      discipline: 'mechanical',
      recordDate: twoDaysAgo,
      machineId: 'm_cutting_01',
      machineCode: 'DP-CUT-01',
      machineName: 'Rotary Cutting Unit L1',
      incidentId: 'inc_103',
      faultCategory: 'Cutting blade misalignment',
      faultDescription: 'Edge fraying on cuff trim at 550 pcs/min.',
      actionTaken: 'Adjusted rotary anvil pressure micrometer by 0.04 mm and torqued bearing locknut.',
      sparePartsUsed: 'None (adjustment only)',
      downtimeMinutes: 32,
      runningHours: 9395,
      servicingHours: 0.5,
      technicianName: 'J. Morales (Mechanical Tech)',
      startTime: '10:12',
      completionTime: '10:40',
      restorationTime: '10:44',
      observations: 'Sample cut check passed 100 consecutive units.',
      shift: 'Morning',
      status: 'approved',
    },
  ];
  for (const mm of mechMaint) {
    batch.set(doc(db, 'factories', factoryId, 'mechanicalMaintenance', mm.id), { ...baseEnvelope, ...mm });
  }

  // 9. Preventive Maintenance Schedules
  const pms = [
    {
      id: 'pm_1',
      machineId: 'm_side_02',
      machineName: 'Side Tape Unit L2',
      discipline: 'electrical',
      taskTitle: 'Hot-melt zone thermocouple & SSR terminal torque check',
      intervalType: 'weekly',
      intervalValue: 'Every 7 days',
      assignedTechnician: 'E. Bello',
      checklistSummary: 'Check SSR heatsink temp, inspect heater lead insulation, verify PID loop stability.',
      lastCompletedDate: todayIsoDate(-7),
      nextDueDate: today,
      status: 'due_soon',
    },
    {
      id: 'pm_2',
      machineId: 'm_dryer_01',
      machineName: 'Refrigerated Air Dryer #1',
      discipline: 'mechanical',
      taskTitle: 'Condenser fin cleaning & auto-drain valve test',
      intervalType: 'monthly',
      intervalValue: 'Every 30 days',
      assignedTechnician: 'J. Morales',
      checklistSummary: 'Blow out condenser fins, verify dew point 3°C, clean condensate trap.',
      lastCompletedDate: todayIsoDate(-32),
      nextDueDate: todayIsoDate(-2),
      status: 'overdue',
    },
  ];
  for (const pm of pms) {
    batch.set(doc(db, 'factories', factoryId, 'preventiveSchedules', pm.id), { ...baseEnvelope, ...pm });
  }

  // 10. Spare Parts
  const parts = [
    {
      id: 'sp_1',
      partCode: 'SP-EL-04',
      name: 'M12 Inductive Proximity Sensor (PNP)',
      category: 'electrical',
      stockQty: 14,
      minStockLevel: 5,
      unit: 'pcs',
      location: 'Maint Cage E-02',
    },
    {
      id: 'sp_2',
      partCode: 'SP-EL-09',
      name: '400W Cartridge Heater Element 230V',
      category: 'electrical',
      stockQty: 3,
      minStockLevel: 4,
      unit: 'pcs',
      location: 'Maint Cage E-05',
    },
    {
      id: 'sp_3',
      partCode: 'SP-MC-11',
      name: 'SKF 6206-2RS Sealed Ball Bearing',
      category: 'mechanical',
      stockQty: 18,
      minStockLevel: 6,
      unit: 'pcs',
      location: 'Maint Cage M-01',
    },
  ];
  for (const sp of parts) {
    batch.set(doc(db, 'factories', factoryId, 'spareParts', sp.id), { ...baseEnvelope, ...sp });
  }

  // 11. Downtime Records
  const downtimes = [
    {
      id: 'dt_1',
      machineId: 'm_side_02',
      machineName: 'Side Tape Unit L2',
      productionLine: 'Line 2',
      date: yesterday,
      timeStopped: '16:35',
      timeReported: '16:40',
      maintenanceStartTime: '16:45',
      timeResolved: '17:25',
      timeProductionResumed: '17:33',
      totalStoppageMinutes: 58,
      activeRepairMinutes: 40,
      reason: 'Zone 2 heater failure (ALM-311)',
      departmentResponsible: 'Electrical Maintenance',
      technicianAssigned: 'E. Bello',
      resolution: 'Replaced 400W cartridge heater and stabilized zone temperature.',
    },
    {
      id: 'dt_2',
      machineId: 'm_cutting_01',
      machineName: 'Rotary Cutting Unit L1',
      productionLine: 'Line 1',
      date: twoDaysAgo,
      timeStopped: '10:02',
      timeReported: '10:05',
      maintenanceStartTime: '10:12',
      timeResolved: '10:40',
      timeProductionResumed: '10:44',
      totalStoppageMinutes: 42,
      activeRepairMinutes: 28,
      reason: 'Cutting blade misalignment / edge fray',
      departmentResponsible: 'Mechanical Maintenance',
      technicianAssigned: 'J. Morales',
      resolution: 'Re-aligned anvil gap and verified cut quality.',
    },
  ];
  for (const dt of downtimes) {
    batch.set(doc(db, 'factories', factoryId, 'downtimeRecords', dt.id), { ...baseEnvelope, ...dt });
  }

  // 12. Quality Control Inspections
  const qcs = [
    {
      id: 'qc_1',
      productName: 'UltraDry Baby Diaper Size M',
      productionLine: 'Line 1',
      inspectionDate: today,
      batchNumber: 'LOT-2026-1118-A',
      result: 'passed',
      defectiveQty: 14,
      defectCategory: 'Minor adhesive seam',
      rejectionReason: 'Isolated startup splice',
      inspectorName: 'A. Lin (QC)',
      correctiveAction: 'Auto-ejector cleared first 14 units post-splice.',
    },
    {
      id: 'qc_2',
      productName: 'UltraDry Baby Diaper Size L',
      productionLine: 'Line 2',
      inspectionDate: yesterday,
      batchNumber: 'LOT-2026-1117-B',
      result: 'hold',
      defectiveQty: 85,
      defectCategory: 'Side tape peel strength',
      rejectionReason: 'Lower peel force prior to heater replacement',
      inspectorName: 'A. Lin (QC)',
      correctiveAction: 'Quarantined 85 packs; re-tested post electrical repair.',
    },
  ];
  for (const qc of qcs) {
    batch.set(doc(db, 'factories', factoryId, 'qualityInspections', qc.id), { ...baseEnvelope, ...qc });
  }

  // 13. Shift Reports
  const shiftReports = [
    {
      id: 'sr_1',
      department: 'Electrical Maintenance',
      reportType: 'electrical_shift_end',
      shift: 'Afternoon',
      reportDate: yesterday,
      supervisorName: 'E. Bello',
      activitiesCompleted: 'Replaced Zone 2 cartridge heater on DP-STU-02; inspected Line 1 photoelectric sensors.',
      machineIssues: 'DP-STU-02 heater failure resolved. Monitor DP-SAP-01 optical sensor S14.',
      maintenanceActivities: '1 corrective repair completed, PM thermal scan on Line 1.',
      outstandingProblems: 'DP-SAP-01 sensor sensitivity drift noted at end of shift.',
      unresolvedIncidentsCount: 1,
      sparePartsUsed: 'SP-EL-09 (1 pc)',
      totalDowntimeMinutes: 58,
      runningHours: 7.2,
      servicingHours: 1.3,
      observations: 'Recommend spare cartridge heater reorder (stock at 3 pcs).',
      handoverNotes: 'Morning shift tech to verify DP-SAP-01 S14 reflector alignment.',
      status: 'submitted',
    },
    {
      id: 'sr_2',
      department: 'Production',
      reportType: 'departmental',
      shift: 'Morning',
      reportDate: today,
      supervisorName: 'D. Adeyemi',
      activitiesCompleted: 'Line 1 produced 46,200 Size M diapers; Line 2 produced 39,100 Size L diapers.',
      productionSummary: 'Combined output 85,300 units vs 90,000 target (94.8% efficiency).',
      machineIssues: 'DP-SAP-01 stopped at 09:15 for photoelectric sensor fault.',
      outstandingProblems: 'Awaiting electrical clearance on DP-SAP-01.',
      unresolvedIncidentsCount: 1,
      materialsUsed: 'MAT-NW-204 (230 kg), MAT-SAP-205 (610 kg)',
      observations: 'PE Backsheet Batch 206 running low.',
      handoverNotes: 'Prioritize DP-SAP-01 restart for Afternoon shift.',
      status: 'submitted',
    },
  ];
  for (const sr of shiftReports) {
    batch.set(doc(db, 'factories', factoryId, 'shiftReports', sr.id), { ...baseEnvelope, ...sr });
  }

  // 14. Documents
  const docs = [
    {
      id: 'doc_1',
      title: 'Fameccanica FMS-900 Electrical Wiring & Sensor Manual',
      reportType: 'Equipment Manual',
      department: 'Electrical Maintenance',
      machineName: 'Core Forming Unit L1',
      fileName: 'FMS900_Electrical_Schematic_Rev4.pdf',
      fileType: 'pdf',
      fileSizeBytes: 2450120,
      extractedSummary: 'OEM wiring schematic for photoelectric and inductive proximity sensors, 24VDC PLC I/O map, and LOTO isolation points.',
      reviewStatus: 'verified',
      uploadedByName: ownerName || 'Plant Administrator',
      uploadedDate: yesterday,
    },
    {
      id: 'doc_2',
      title: 'Scanned Paper Logbook — Line 2 Temperature Checks (Nov)',
      reportType: 'Historical Logbook Scan',
      department: 'Production',
      machineName: 'Side Tape Unit L2',
      materialBatch: '204',
      fileName: 'line2_handwritten_temp_log_nov.csv',
      fileType: 'csv',
      fileSizeBytes: 18420,
      extractedSummary: 'Imported 14 historical shift rows from paper logbook. Requires supervisor verification before official posting.',
      reviewStatus: 'pending_human_review',
      uploadedByName: 'R. Patel',
      uploadedDate: today,
    },
  ];
  for (const d of docs) {
    batch.set(doc(db, 'factories', factoryId, 'documents', d.id), { ...baseEnvelope, ...d });
  }

  // 15. Notifications
  const notifications = [
    {
      id: 'notif_1',
      type: 'new_machine_fault',
      title: 'High Severity Fault: SAP Applicator L1',
      message: 'Photoelectric sensor failure (ALM-204) reported on DP-SAP-01 at 09:15.',
      severity: 'critical',
      isRead: false,
      relatedModule: 'incidents',
    },
    {
      id: 'notif_2',
      type: 'maintenance_overdue',
      title: 'Overdue PM: Refrigerated Air Dryer #1',
      message: 'Monthly condenser fin cleaning & drain valve test was due 2 days ago.',
      severity: 'warning',
      isRead: false,
      relatedModule: 'preventive-maintenance',
    },
    {
      id: 'notif_3',
      type: 'low_material_inventory',
      title: 'Low Inventory: Breathable PE Backsheet Film',
      message: 'Batch 206 remaining quantity (210 kg) is below minimum threshold (250 kg).',
      severity: 'warning',
      isRead: false,
      relatedModule: 'materials',
    },
    {
      id: 'notif_4',
      type: 'report_submitted_maintenance_head',
      title: 'Shift-End Report Awaiting Review',
      message: 'Electrical Maintenance Afternoon shift report submitted by E. Bello.',
      severity: 'info',
      isRead: false,
      relatedModule: 'electrical-maintenance',
    },
  ];
  for (const n of notifications) {
    batch.set(doc(db, 'factories', factoryId, 'notifications', n.id), { ...baseEnvelope, ...n });
  }

  // 16. Audit Log
  batch.set(doc(db, 'factories', factoryId, 'auditLogs', 'aud_init_01'), {
    factoryId,
    factoryOwnerUid: ownerUid,
    accessUids,
    actorUid: ownerUid,
    actorName: ownerName || 'Plant Administrator',
    actorRole: 'super_admin',
    action: 'create',
    entityType: 'factory_workspace',
    entityId: factoryId,
    newValue: 'Initialized Factory Memory OS pilot plant with sample dataset',
    createdByUid: ownerUid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function createFactoryRecord(
  factory: FactoryConfig,
  collectionName: string,
  docId: string,
  payload: Record<string, unknown>,
  actor: { uid: string; name: string; role: string },
  auditSummary?: string
): Promise<void> {
  const path = `factories/${factory.id}/${collectionName}/${docId}`;
  try {
    const record = {
      ...payload,
      factoryId: factory.id,
      factoryOwnerUid: factory.ownerId,
      accessUids: factory.accessUids?.length ? factory.accessUids : [factory.ownerId],
      recordOrigin: (payload.recordOrigin as RecordOrigin) || 'operational',
      createdByUid: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'factories', factory.id, collectionName, docId), record);

    await appendAuditLog(factory, {
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'create',
      entityType: collectionName,
      entityId: docId,
      newValue: (auditSummary || JSON.stringify(payload)).slice(0, 950),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFactoryRecord(
  factory: FactoryConfig,
  collectionName: string,
  docId: string,
  updates: Record<string, unknown>,
  actor: { uid: string; name: string; role: string },
  previousValueSummary?: string,
  newValueSummary?: string
): Promise<void> {
  const path = `factories/${factory.id}/${collectionName}/${docId}`;
  try {
    await updateDoc(doc(db, 'factories', factory.id, collectionName, docId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await appendAuditLog(factory, {
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'update',
      entityType: collectionName,
      entityId: docId,
      previousValue: previousValueSummary?.slice(0, 950),
      newValue: (newValueSummary || JSON.stringify(updates)).slice(0, 950),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function appendAuditLog(
  factory: FactoryConfig,
  entry: {
    actorUid: string;
    actorName: string;
    actorRole: string;
    action: 'create' | 'update' | 'archive' | 'review';
    entityType: string;
    entityId: string;
    previousValue?: string;
    newValue?: string;
  }
): Promise<void> {
  const logId = generateSafeId('aud');
  try {
    await setDoc(doc(db, 'factories', factory.id, 'auditLogs', logId), {
      factoryId: factory.id,
      factoryOwnerUid: factory.ownerId,
      accessUids: factory.accessUids?.length ? factory.accessUids : [factory.ownerId],
      actorUid: entry.actorUid,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ...(entry.previousValue ? { previousValue: entry.previousValue } : {}),
      ...(entry.newValue ? { newValue: entry.newValue } : {}),
      createdByUid: entry.actorUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Audit log write skipped or rejected:', error);
  }
}

export function exportRecordsToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => {
        if (!['accessUids', 'factoryOwnerUid', 'createdAt', 'updatedAt'].includes(k)) {
          set.add(k);
        }
      });
      return set;
    }, new Set<string>())
  );
  const escapeCell = (val: unknown) => {
    const s = val == null ? '' : String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const splitCsvLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? '';
    });
    return obj;
  });
  return { headers, rows };
}
