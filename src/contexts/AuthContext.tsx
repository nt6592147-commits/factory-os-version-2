import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  enqueueOfflineOperation,
  getQueuedOperations,
  removeQueuedOperation,
  updateQueuedOperationStatus,
} from '../lib/offlineQueue';
import {
  createFactoryRecord,
  ensureUserFactoryWorkspace,
  updateFactoryRecord,
  upsertUserPrivateProfile,
} from '../services/factoryService';
import {
  AuditLog,
  DocumentRecord,
  DowntimeRecord,
  FactoryConfig,
  FactoryMember,
  Machine,
  MachineIncident,
  MaintenanceRecord,
  Material,
  MaterialInspection,
  MaterialMovement,
  NotificationItem,
  OfflineQueueItem,
  PreventiveSchedule,
  ProductionRecord,
  QualityInspection,
  ROLE_DEFINITIONS,
  RoleDefinition,
  RoleId,
  ShiftReport,
  SparePart,
} from '../types/factory';

export interface FactoryDataset {
  members: FactoryMember[];
  materials: Material[];
  materialInspections: MaterialInspection[];
  materialMovements: MaterialMovement[];
  machines: Machine[];
  productionRecords: ProductionRecord[];
  machineIncidents: MachineIncident[];
  electricalMaintenance: MaintenanceRecord[];
  mechanicalMaintenance: MaintenanceRecord[];
  preventiveSchedules: PreventiveSchedule[];
  spareParts: SparePart[];
  downtimeRecords: DowntimeRecord[];
  qualityInspections: QualityInspection[];
  shiftReports: ShiftReport[];
  documents: DocumentRecord[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

const EMPTY_DATASET: FactoryDataset = {
  members: [],
  materials: [],
  materialInspections: [],
  materialMovements: [],
  machines: [],
  productionRecords: [],
  machineIncidents: [],
  electricalMaintenance: [],
  mechanicalMaintenance: [],
  preventiveSchedules: [],
  spareParts: [],
  downtimeRecords: [],
  qualityInspections: [],
  shiftReports: [],
  documents: [],
  notifications: [],
  auditLogs: [],
};

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  factory: FactoryConfig | null;
  member: FactoryMember | null;
  roleDef: RoleDefinition;
  isMaintenanceHead: boolean;
  dataset: FactoryDataset;
  dataLoading: boolean;
  offlineQueue: OfflineQueueItem[];
  isSyncingQueue: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  submitRecord: (
    collectionName: string,
    docId: string,
    payload: Record<string, unknown>,
    auditSummary?: string
  ) => Promise<{ queued: boolean }>;
  patchRecord: (
    collectionName: string,
    docId: string,
    updates: Record<string, unknown>,
    previousSummary?: string,
    newSummary?: string
  ) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [factory, setFactory] = useState<FactoryConfig | null>(null);
  const [member, setMember] = useState<FactoryMember | null>(null);
  const [dataset, setDataset] = useState<FactoryDataset>(EMPTY_DATASET);
  const [dataLoading, setDataLoading] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  const refreshQueue = useCallback(async () => {
    const items = await getQueuedOperations();
    setOfflineQueue(items);
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError(null);
      if (!firebaseUser) {
        setUser(null);
        setFactory(null);
        setMember(null);
        setDataset(EMPTY_DATASET);
        setAuthLoading(false);
        return;
      }

      setUser(firebaseUser);
      setDataLoading(true);
      try {
        const email = firebaseUser.email || '';
        const displayName = firebaseUser.displayName || email.split('@')[0] || 'Factory User';
        await upsertUserPrivateProfile(firebaseUser.uid, email, displayName);
        const factoryCfg = await ensureUserFactoryWorkspace(firebaseUser.uid, displayName, email);
        setFactory(factoryCfg);
      } catch (err) {
        console.error('Bootstrap error:', err);
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize factory workspace.');
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Attach real-time Firestore listeners once user + factory are ready
  useEffect(() => {
    if (!user || !factory) return;

    setDataLoading(true);
    const unsubscribers: Unsubscribe[] = [];

    // Listen to factory root updates
    const factoryUnsub = onSnapshot(
      doc(db, 'factories', factory.id),
      (snap) => {
        if (snap.exists()) {
          setFactory(snap.data() as FactoryConfig);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `factories/${factory.id}`)
    );
    unsubscribers.push(factoryUnsub);

    // Listen to current user's member document
    const memberUnsub = onSnapshot(
      doc(db, 'factories', factory.id, 'members', user.uid),
      (snap) => {
        if (snap.exists()) {
          setMember({ id: snap.id, ...(snap.data() as Omit<FactoryMember, 'id'>) });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `factories/${factory.id}/members/${user.uid}`)
    );
    unsubscribers.push(memberUnsub);

    const collectionKeys: (keyof FactoryDataset)[] = [
      'members',
      'materials',
      'materialInspections',
      'materialMovements',
      'machines',
      'productionRecords',
      'machineIncidents',
      'electricalMaintenance',
      'mechanicalMaintenance',
      'preventiveSchedules',
      'spareParts',
      'downtimeRecords',
      'qualityInspections',
      'shiftReports',
      'documents',
      'notifications',
      'auditLogs',
    ];

    let loadedCount = 0;
    for (const key of collectionKeys) {
      const path = `factories/${factory.id}/${key}`;
      const q = query(
        collection(db, 'factories', factory.id, key),
        where('accessUids', 'array-contains', user.uid)
      );
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const rows = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setDataset((prev) => ({
            ...prev,
            [key]: rows,
          }));
          loadedCount += 1;
          if (loadedCount >= collectionKeys.length) {
            setDataLoading(false);
          }
        },
        (error) => {
          setDataLoading(false);
          handleFirestoreError(error, OperationType.LIST, path);
        }
      );
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [user, factory?.id]);

  const roleId: RoleId = member?.role || 'super_admin';
  const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.machine_operator;
  const isMaintenanceHead =
    Boolean(member?.isMaintenanceHead) ||
    roleId === 'super_admin' ||
    roleId === 'factory_admin' ||
    roleId === 'factory_manager';

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const submitRecord = useCallback(
    async (
      collectionName: string,
      docId: string,
      payload: Record<string, unknown>,
      auditSummary?: string
    ): Promise<{ queued: boolean }> => {
      if (!user || !factory) {
        throw new Error('Authentication and factory context are required.');
      }

      if (!navigator.onLine) {
        await enqueueOfflineOperation({
          clientRequestId: docId,
          collectionName,
          payload,
          queuedAt: new Date().toISOString(),
          status: 'pending',
        });
        await refreshQueue();
        return { queued: true };
      }

      const actorName = member?.displayName || user.displayName || user.email || 'Operator';
      await createFactoryRecord(
        factory,
        collectionName,
        docId,
        payload,
        { uid: user.uid, name: actorName, role: roleId },
        auditSummary
      );
      return { queued: false };
    },
    [user, factory, member, roleId, refreshQueue]
  );

  const patchRecord = useCallback(
    async (
      collectionName: string,
      docId: string,
      updates: Record<string, unknown>,
      previousSummary?: string,
      newSummary?: string
    ): Promise<void> => {
      if (!user || !factory) {
        throw new Error('Authentication and factory context are required.');
      }
      const actorName = member?.displayName || user.displayName || user.email || 'Operator';
      await updateFactoryRecord(
        factory,
        collectionName,
        docId,
        updates,
        { uid: user.uid, name: actorName, role: roleId },
        previousSummary,
        newSummary
      );
    },
    [user, factory, member, roleId]
  );

  const syncOfflineQueue = useCallback(async () => {
    if (!user || !factory || !navigator.onLine) return;
    setIsSyncingQueue(true);
    try {
      const items = await getQueuedOperations();
      const actorName = member?.displayName || user.displayName || user.email || 'Operator';
      for (const item of items) {
        if (item.status === 'conflict') continue;
        await updateQueuedOperationStatus(item.clientRequestId, 'syncing');
        try {
          const existingRef = doc(db, 'factories', factory.id, item.collectionName, item.clientRequestId);
          const existingSnap = await getDoc(existingRef);
          if (existingSnap.exists()) {
            await updateQueuedOperationStatus(
              item.clientRequestId,
              'conflict',
              'Duplicate or server conflict detected: record ID already exists.'
            );
            continue;
          }
          await createFactoryRecord(
            factory,
            item.collectionName,
            item.clientRequestId,
            item.payload,
            { uid: user.uid, name: actorName, role: roleId },
            `Synced from offline queue (${item.queuedAt})`
          );
          await removeQueuedOperation(item.clientRequestId);
        } catch (err) {
          await updateQueuedOperationStatus(
            item.clientRequestId,
            'failed',
            err instanceof Error ? err.message : 'Sync failed'
          );
        }
      }
      await refreshQueue();
    } finally {
      setIsSyncingQueue(false);
    }
  }, [user, factory, member, roleId, refreshQueue]);

  // Automatically attempt sync when browser regains connectivity
  useEffect(() => {
    const onOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [syncOfflineQueue]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authError,
        factory,
        member,
        roleDef,
        isMaintenanceHead,
        dataset,
        dataLoading,
        offlineQueue,
        isSyncingQueue,
        signInWithGoogle,
        signOutUser,
        submitRecord,
        patchRecord,
        syncOfflineQueue,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
