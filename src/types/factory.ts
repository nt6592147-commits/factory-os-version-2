export type RoleId =
  | 'super_admin'
  | 'factory_admin'
  | 'factory_manager'
  | 'production_manager'
  | 'production_supervisor'
  | 'electrical_maintenance'
  | 'mechanical_maintenance'
  | 'material_checker'
  | 'storekeeper'
  | 'quality_control'
  | 'machine_operator';

export type NavSectionId =
  | 'overview'
  | 'production'
  | 'materials'
  | 'machines'
  | 'incidents'
  | 'electrical-maintenance'
  | 'mechanical-maintenance'
  | 'preventive-maintenance'
  | 'downtime'
  | 'quality-control'
  | 'shift-reports'
  | 'document-archive'
  | 'factory-ai'
  | 'analytics'
  | 'notifications'
  | 'user-management'
  | 'settings';

export type RecordOrigin = 'operational' | 'sample';

export interface RoleDefinition {
  id: RoleId;
  label: string;
  department: string;
  description: string;
  navAccess: NavSectionId[];
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageMachines: boolean;
  canLogProduction: boolean;
  canManageMaterials: boolean;
  canInspectMaterials: boolean;
  canReportIncidents: boolean;
  canLogElectrical: boolean;
  canLogMechanical: boolean;
  canManagePreventive: boolean;
  canReviewMaintenance: boolean;
  canLogQuality: boolean;
  canSubmitShiftReport: boolean;
  canReviewShiftReport: boolean;
  canViewAnalytics: boolean;
  canQueryAI: boolean;
}

const ALL_NAVS: NavSectionId[] = [
  'overview',
  'production',
  'materials',
  'machines',
  'incidents',
  'electrical-maintenance',
  'mechanical-maintenance',
  'preventive-maintenance',
  'downtime',
  'quality-control',
  'shift-reports',
  'document-archive',
  'factory-ai',
  'analytics',
  'notifications',
  'user-management',
  'settings',
];

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Administrator',
    department: 'Executive & IT',
    description: 'Full cross-plant authority, user & role provisioning, system settings, and audit oversight.',
    navAccess: ALL_NAVS,
    canManageUsers: true,
    canManageSettings: true,
    canManageMachines: true,
    canLogProduction: true,
    canManageMaterials: true,
    canInspectMaterials: true,
    canReportIncidents: true,
    canLogElectrical: true,
    canLogMechanical: true,
    canManagePreventive: true,
    canReviewMaintenance: true,
    canLogQuality: true,
    canSubmitShiftReport: true,
    canReviewShiftReport: true,
    canViewAnalytics: true,
    canQueryAI: true,
  },
  factory_admin: {
    id: 'factory_admin',
    label: 'Factory Administrator',
    department: 'Plant Administration',
    description: 'Manage plant users, departments, machine registry, and operational settings.',
    navAccess: ALL_NAVS,
    canManageUsers: true,
    canManageSettings: true,
    canManageMachines: true,
    canLogProduction: true,
    canManageMaterials: true,
    canInspectMaterials: true,
    canReportIncidents: true,
    canLogElectrical: true,
    canLogMechanical: true,
    canManagePreventive: true,
    canReviewMaintenance: true,
    canLogQuality: true,
    canSubmitShiftReport: true,
    canReviewShiftReport: true,
    canViewAnalytics: true,
    canQueryAI: true,
  },
  factory_manager: {
    id: 'factory_manager',
    label: 'Factory Manager',
    department: 'Plant Management',
    description: 'Factory-wide operational oversight, maintenance report review, and management analytics.',
    navAccess: ALL_NAVS.filter((n) => n !== 'user-management'),
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: true,
    canLogProduction: true,
    canManageMaterials: true,
    canInspectMaterials: false,
    canReportIncidents: true,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: true,
    canReviewMaintenance: true,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: true,
    canViewAnalytics: true,
    canQueryAI: true,
  },
  production_manager: {
    id: 'production_manager',
    label: 'Production Manager',
    department: 'Production',
    description: 'Monitor production lines, shift targets, downtime, and maintenance coordination.',
    navAccess: [
      'overview', 'production', 'materials', 'machines', 'incidents',
      'electrical-maintenance', 'mechanical-maintenance', 'preventive-maintenance',
      'downtime', 'quality-control', 'shift-reports', 'document-archive',
      'factory-ai', 'analytics', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: true,
    canManageMaterials: true,
    canInspectMaterials: false,
    canReportIncidents: true,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: true,
    canReviewMaintenance: true,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: true,
    canViewAnalytics: true,
    canQueryAI: true,
  },
  production_supervisor: {
    id: 'production_supervisor',
    label: 'Production Supervisor',
    department: 'Production',
    description: 'Log shift output, report machine breakdowns, track material issues, and submit shift handovers.',
    navAccess: [
      'overview', 'production', 'materials', 'machines', 'incidents',
      'downtime', 'quality-control', 'shift-reports', 'document-archive',
      'factory-ai', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: true,
    canManageMaterials: true,
    canInspectMaterials: false,
    canReportIncidents: true,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: false,
    canReviewMaintenance: false,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: false,
    canQueryAI: true,
  },
  electrical_maintenance: {
    id: 'electrical_maintenance',
    label: 'Electrical Maintenance Staff',
    department: 'Electrical Maintenance',
    description: 'Respond to electrical faults, log repairs and spare parts, and submit shift-end maintenance reports.',
    navAccess: [
      'overview', 'machines', 'incidents', 'electrical-maintenance',
      'preventive-maintenance', 'downtime', 'shift-reports', 'document-archive',
      'factory-ai', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: false,
    canManageMaterials: false,
    canInspectMaterials: false,
    canReportIncidents: true,
    canLogElectrical: true,
    canLogMechanical: false,
    canManagePreventive: true,
    canReviewMaintenance: false,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: false,
    canQueryAI: true,
  },
  mechanical_maintenance: {
    id: 'mechanical_maintenance',
    label: 'Mechanical Maintenance Staff',
    department: 'Mechanical Maintenance',
    description: 'Resolve mechanical faults, track machine servicing, log spare parts, and submit shift reports.',
    navAccess: [
      'overview', 'machines', 'incidents', 'mechanical-maintenance',
      'preventive-maintenance', 'downtime', 'shift-reports', 'document-archive',
      'factory-ai', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: false,
    canManageMaterials: false,
    canInspectMaterials: false,
    canReportIncidents: true,
    canLogElectrical: false,
    canLogMechanical: true,
    canManagePreventive: true,
    canReviewMaintenance: false,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: false,
    canQueryAI: true,
  },
  material_checker: {
    id: 'material_checker',
    label: 'Material Checker',
    department: 'Materials & Receiving',
    description: 'Inspect incoming raw material batches (width, thickness, weight) and record approval or rejection.',
    navAccess: [
      'overview', 'materials', 'document-archive', 'factory-ai', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: false,
    canManageMaterials: true,
    canInspectMaterials: true,
    canReportIncidents: false,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: false,
    canReviewMaintenance: false,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: false,
    canQueryAI: true,
  },
  storekeeper: {
    id: 'storekeeper',
    label: 'Storekeeper',
    department: 'Warehouse & Stores',
    description: 'Register incoming materials, track warehouse stock, issue materials to lines, and manage spare parts.',
    navAccess: [
      'overview', 'materials', 'electrical-maintenance', 'mechanical-maintenance',
      'document-archive', 'factory-ai', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: false,
    canManageMaterials: true,
    canInspectMaterials: true,
    canReportIncidents: false,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: false,
    canReviewMaintenance: false,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: false,
    canQueryAI: true,
  },
  quality_control: {
    id: 'quality_control',
    label: 'Quality Control Staff',
    department: 'Quality Assurance',
    description: 'Conduct line quality inspections, record defects and rejections, and log corrective actions.',
    navAccess: [
      'overview', 'production', 'materials', 'quality-control',
      'shift-reports', 'document-archive', 'factory-ai', 'analytics', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: false,
    canManageMaterials: false,
    canInspectMaterials: true,
    canReportIncidents: true,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: false,
    canReviewMaintenance: false,
    canLogQuality: true,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: true,
    canQueryAI: true,
  },
  machine_operator: {
    id: 'machine_operator',
    label: 'Machine Operator',
    department: 'Production Floor',
    description: 'Submit machine incident reports, view production assignments, and file shift handover logs.',
    navAccess: [
      'overview', 'production', 'machines', 'incidents', 'shift-reports', 'notifications',
    ],
    canManageUsers: false,
    canManageSettings: false,
    canManageMachines: false,
    canLogProduction: true,
    canManageMaterials: false,
    canInspectMaterials: false,
    canReportIncidents: true,
    canLogElectrical: false,
    canLogMechanical: false,
    canManagePreventive: false,
    canReviewMaintenance: false,
    canLogQuality: false,
    canSubmitShiftReport: true,
    canReviewShiftReport: false,
    canViewAnalytics: false,
    canQueryAI: false,
  },
};

export interface TenantEnvelope {
  id: string;
  factoryId: string;
  factoryOwnerUid: string;
  accessUids: string[];
  recordOrigin: RecordOrigin;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateProfile {
  uid: string;
  email: string;
  displayName: string;
  defaultFactoryId?: string;
}

export interface FactoryConfig {
  id: string;
  name: string;
  companyName: string;
  location: string;
  ownerId: string;
  accessUids: string[];
  departments: string[];
  faultCategories: string[];
  materialUnits: string[];
  shifts: string[];
  hasSampleData?: boolean;
}

export interface FactoryMember {
  id: string;
  uid: string;
  factoryId: string;
  factoryOwnerUid: string;
  accessUids: string[];
  displayName: string;
  employeeCode?: string;
  role: RoleId;
  department: string;
  isMaintenanceHead?: boolean;
  active: boolean;
  createdByUid: string;
}

export interface Material extends TenantEnvelope {
  materialCode: string;
  name: string;
  category: string;
  supplier: string;
  batchNumber: string;
  expectedWidthMm: number;
  expectedThicknessMm: number;
  expectedWeightKg: number;
  quantity: number;
  remainingQty: number;
  consumedQty: number;
  wastedQty: number;
  minThreshold: number;
  unit: string;
  dateReceived: string;
  storageLocation: string;
  status: 'pending_inspection' | 'approved' | 'rejected' | 'in_production' | 'depleted' | 'archived';
  notes?: string;
}

export interface MaterialInspection extends TenantEnvelope {
  materialId: string;
  materialCode: string;
  materialName: string;
  batchNumber: string;
  expectedWidthMm: number;
  actualWidthMm: number;
  expectedThicknessMm: number;
  actualThicknessMm: number;
  expectedWeightKg: number;
  actualWeightKg: number;
  inspectionDate: string;
  inspectorName: string;
  result: 'approved' | 'rejected' | 'conditional';
  comments?: string;
}

export interface MaterialMovement extends TenantEnvelope {
  materialId: string;
  materialCode: string;
  materialName: string;
  batchNumber: string;
  movementType: 'received' | 'issued' | 'consumed' | 'wasted' | 'returned';
  quantity: number;
  unit: string;
  productionLine?: string;
  recordedByName: string;
  movementDate: string;
  notes?: string;
}

export interface Machine extends TenantEnvelope {
  machineCode: string;
  name: string;
  category: string;
  equipmentGroup: 'diaper_production' | 'supporting_equipment';
  manufacturer: string;
  model: string;
  serialNumber: string;
  department: string;
  productionLine: string;
  installationDate: string;
  status: 'running' | 'stopped' | 'maintenance' | 'standby' | 'archived';
  runningHours: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
}

export interface ProductionRecord extends TenantEnvelope {
  productionDate: string;
  productName: string;
  productionLine: string;
  machineId?: string;
  machineName: string;
  shift: string;
  targetQty: number;
  actualQty: number;
  rejectedQty: number;
  materialsConsumed: string;
  startTime: string;
  endTime: string;
  supervisorName: string;
  operatorName: string;
  notes?: string;
}

export interface MachineIncident extends TenantEnvelope {
  incidentCode: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  department: 'electrical' | 'mechanical' | 'operational';
  faultCategory: string;
  description: string;
  alarmInfo?: string;
  reportedDate: string;
  reportedTime: string;
  reportedByName: string;
  shift: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
}

export interface MaintenanceRecord extends TenantEnvelope {
  discipline: 'electrical' | 'mechanical';
  recordDate: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  incidentId?: string;
  faultCategory: string;
  faultDescription: string;
  actionTaken: string;
  sparePartsUsed: string;
  downtimeMinutes: number;
  runningHours: number;
  servicingHours: number;
  technicianName: string;
  startTime: string;
  completionTime: string;
  restorationTime: string;
  observations?: string;
  shift: string;
  status: 'in_progress' | 'completed' | 'awaiting_review' | 'approved';
}

export interface PreventiveSchedule extends TenantEnvelope {
  machineId: string;
  machineName: string;
  discipline: 'electrical' | 'mechanical';
  taskTitle: string;
  intervalType: 'daily' | 'weekly' | 'monthly' | 'custom' | 'running_hours';
  intervalValue: string;
  assignedTechnician: string;
  checklistSummary: string;
  lastCompletedDate: string;
  nextDueDate: string;
  status: 'scheduled' | 'due_soon' | 'overdue' | 'completed';
}

export interface SparePart extends TenantEnvelope {
  partCode: string;
  name: string;
  category: 'electrical' | 'mechanical' | 'general';
  stockQty: number;
  minStockLevel: number;
  unit: string;
  location: string;
}

export interface DowntimeRecord extends TenantEnvelope {
  machineId: string;
  machineName: string;
  productionLine: string;
  date: string;
  timeStopped: string;
  timeReported: string;
  maintenanceStartTime: string;
  timeResolved: string;
  timeProductionResumed: string;
  totalStoppageMinutes: number;
  activeRepairMinutes: number;
  reason: string;
  departmentResponsible: string;
  technicianAssigned: string;
  resolution: string;
}

export interface QualityInspection extends TenantEnvelope {
  productName: string;
  productionLine: string;
  inspectionDate: string;
  batchNumber: string;
  result: 'passed' | 'hold' | 'rejected';
  defectiveQty: number;
  defectCategory: string;
  rejectionReason?: string;
  inspectorName: string;
  correctiveAction?: string;
}

export interface ShiftReport extends TenantEnvelope {
  department: string;
  reportType: 'departmental' | 'electrical_shift_end' | 'mechanical_shift_end';
  shift: string;
  reportDate: string;
  supervisorName: string;
  activitiesCompleted: string;
  productionSummary?: string;
  machineIssues?: string;
  maintenanceActivities?: string;
  outstandingProblems?: string;
  unresolvedIncidentsCount?: number;
  materialsUsed?: string;
  sparePartsUsed?: string;
  totalDowntimeMinutes?: number;
  runningHours?: number;
  servicingHours?: number;
  observations?: string;
  handoverNotes?: string;
  status: 'draft' | 'submitted' | 'reviewed';
  reviewedByName?: string;
}

export interface DocumentRecord extends TenantEnvelope {
  title: string;
  reportType: string;
  department: string;
  machineName?: string;
  materialBatch?: string;
  fileName: string;
  fileType: 'pdf' | 'csv' | 'xlsx' | 'image' | 'manual';
  fileSizeBytes?: number;
  extractedSummary: string;
  reviewStatus: 'verified' | 'pending_human_review';
  uploadedByName: string;
  uploadedDate: string;
}

export interface NotificationItem extends TenantEnvelope {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  relatedModule?: string;
}

export interface AuditLog {
  id: string;
  factoryId: string;
  factoryOwnerUid: string;
  accessUids: string[];
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: 'create' | 'update' | 'archive' | 'review';
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  createdByUid: string;
  createdAt?: unknown;
}

export interface OfflineQueueItem {
  clientRequestId: string;
  collectionName: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  status: 'pending' | 'syncing' | 'conflict' | 'failed';
  errorMessage?: string;
}
