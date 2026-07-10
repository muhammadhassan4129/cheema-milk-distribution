/**
 * Ledger Sync Service
 * 
 * PurchaseLedger.tsx aur SaleLedger.tsx localStorage se kaam karte hain.
 * Ye service un operations ko backend ke saath transparently sync karti hai.
 * 
 * Screen ka koi bhi code change nahi hoga - sab same rahega.
 * Ye service background mein localStorage aur backend dono update karti hai.
 */

import { ledgerApi, settingsApi, isOnline } from './api';
import { addToQueue } from './offlineSync';

// ─── Purchase Ledger Sync ─────────────────────────────────────────────────────

/**
 * Purchase entry save hone ke baad backend ko bhi bhejo
 * PurchaseLedger.tsx line ~1036: localStorage.setItem(key, JSON.stringify(entriesList))
 */
export const syncPurchaseEntryToBackend = async (entry: Record<string, unknown>) => {
  const sanitizedEntry = {
    ...entry,
    driverId: typeof entry.driverId === 'string' && isMongoObjectId(entry.driverId) ? entry.driverId : null
  };

  if (!isOnline()) {
    addToQueue('/ledger/purchase', 'POST', sanitizedEntry, 'Save purchase ledger entry (offline)');
    return;
  }
  try {
    // Sirf valid MongoDB ObjectId pe update bhejo
    const realId = entry._id || (typeof entry.id === 'string' && isMongoObjectId(entry.id as string) ? entry.id : null);
    if (realId) {
      await ledgerApi.updatePurchase(realId as string, sanitizedEntry);
      console.log(`[LedgerSync] ✓ Purchase entry updated: ${entry.supplierName}`);
    } else {
      const res: any = await ledgerApi.createPurchase(sanitizedEntry);
      console.log(`[LedgerSync] ✓ Purchase entry created: ${entry.supplierName}`);
      return res;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LedgerSync] ✗ Purchase sync failed: ${entry.supplierName} — ${msg}`);
    addToQueue('/ledger/purchase', 'POST', sanitizedEntry, `Purchase entry: ${entry.supplierName}`);
  }
};

/**
 * Purchase entry delete hone ke baad backend ko bhi batao
 */
export const syncDeletePurchaseEntry = async (id: string) => {
  if (!isOnline()) {
    addToQueue(`/ledger/purchase/${id}`, 'DELETE', undefined, 'Delete purchase entry');
    return;
  }
  try {
    await ledgerApi.deletePurchase(id);
  } catch (err) {
    addToQueue(`/ledger/purchase/${id}`, 'DELETE', undefined, 'Delete purchase entry (retry)');
  }
};

// ─── Sale Ledger Sync ─────────────────────────────────────────────────────────

export const syncSaleEntryToBackend = async (entry: Record<string, unknown>) => {
  const sanitizedEntry = {
    ...entry,
    driverId: typeof entry.driverId === 'string' && isMongoObjectId(entry.driverId) ? entry.driverId : null
  };

  if (!isOnline()) {
    addToQueue('/ledger/sale', 'POST', sanitizedEntry, 'Save sale ledger entry (offline)');
    return;
  }
  try {
    const realId = entry._id || (typeof entry.id === 'string' && isMongoObjectId(entry.id as string) ? entry.id : null);
    if (realId) {
      await ledgerApi.updateSale(realId as string, sanitizedEntry);
      console.log(`[LedgerSync] ✓ Sale entry updated: ${entry.customerName}`);
    } else {
      const res: any = await ledgerApi.createSale(sanitizedEntry);
      console.log(`[LedgerSync] ✓ Sale entry created: ${entry.customerName}`);
      return res;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LedgerSync] ✗ Sale sync failed: ${entry.customerName} — ${msg}`);
    addToQueue('/ledger/sale', 'POST', sanitizedEntry, `Sale entry: ${entry.customerName}`);
  }
};

export const syncDeleteSaleEntry = async (id: string) => {
  if (!isOnline()) {
    addToQueue(`/ledger/sale/${id}`, 'DELETE', undefined, 'Delete sale entry');
    return;
  }
  try {
    await ledgerApi.deleteSale(id);
  } catch (err) {
    addToQueue(`/ledger/sale/${id}`, 'DELETE', undefined, 'Delete sale entry (retry)');
  }
};

// ─── Supplier Profile Sync ────────────────────────────────────────────────────

// Helper: Frontend local ID hai ya real MongoDB ObjectId?
const isMongoObjectId = (id: string): boolean => /^[a-f\d]{24}$/i.test(id);

/**
 * Supplier profiles backend se sync karo.
 * - Naye profiles (cust-xxx id wale) → create karo, phir localStorage mein MongoDB _id update karo
 * - Existing profiles (_id wale) → update karo
 */
export const syncSupplierProfilesToBackend = async (profiles: unknown[]): Promise<void> => {
  if (!isOnline()) {
    addToQueue('/ledger/suppliers', 'POST', { profiles }, 'Sync supplier profiles (offline)');
    return;
  }

  // localStorage ko backend _id se update karo
  const stored = localStorage.getItem('cheema_saved_suppliers');
  let localProfiles: any[] = stored ? JSON.parse(stored) : [];
  let localUpdated = false;

  for (const profile of profiles as any[]) {
    try {
      const sanitizedProfile = {
        ...profile,
        driverId: typeof profile.driverId === 'string' && isMongoObjectId(profile.driverId) ? profile.driverId : null
      };
      const realId = profile._id || (isMongoObjectId(profile.id) ? profile.id : null);

      if (realId) {
        // Existing backend record → update karo
        await ledgerApi.updateSupplier(realId, sanitizedProfile);
        console.log(`[LedgerSync] ✓ Supplier updated: ${profile.supplierName}`);
      } else {
        // Naya record → create karo aur real _id wapas lo
        const res: any = await ledgerApi.createSupplier(sanitizedProfile);
        if (res.success && res.data?._id) {
          const backendId = res.data._id;
          // localStorage mein local id ko MongoDB _id se replace karo
          localProfiles = localProfiles.map((p: any) =>
            p.id === profile.id
              ? { ...p, _id: backendId, id: backendId }
              : p
          );
          localUpdated = true;
          console.log(`[LedgerSync] ✓ Supplier created: ${profile.supplierName} → _id: ${backendId}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[LedgerSync] ✗ Supplier sync failed: ${(profile as any).supplierName} — ${msg}`);
      const sanitizedProfile = {
        ...profile,
        driverId: typeof profile.driverId === 'string' && isMongoObjectId(profile.driverId) ? profile.driverId : null
      };
      addToQueue('/ledger/suppliers', 'POST', sanitizedProfile, `Create supplier: ${(profile as any).supplierName}`);
    }
  }

  // LocalStorage update karo agar koi naya _id mila
  if (localUpdated) {
    localStorage.setItem('cheema_saved_suppliers', JSON.stringify(localProfiles));
    window.dispatchEvent(new CustomEvent('dairy-suppliers-updated'));
  }
};

/**
 * Customer profiles backend se sync karo.
 * Same pattern: naye → create + localStorage update, existing → update
 */
export const syncCustomerProfilesToBackend = async (profiles: unknown[]): Promise<void> => {
  if (!isOnline()) {
    addToQueue('/ledger/customers', 'POST', { profiles }, 'Sync customer profiles (offline)');
    return;
  }

  const stored = localStorage.getItem('cheema_saved_customers');
  let localProfiles: any[] = stored ? JSON.parse(stored) : [];
  let localUpdated = false;

  for (const profile of profiles as any[]) {
    try {
      const sanitizedProfile = {
        ...profile,
        driverId: typeof profile.driverId === 'string' && isMongoObjectId(profile.driverId) ? profile.driverId : null
      };
      const realId = profile._id || (isMongoObjectId(profile.id) ? profile.id : null);

      if (realId) {
        await ledgerApi.updateCustomer(realId, sanitizedProfile);
        console.log(`[LedgerSync] ✓ Customer updated: ${profile.customerName}`);
      } else {
        const res: any = await ledgerApi.createCustomer(sanitizedProfile);
        if (res.success && res.data?._id) {
          const backendId = res.data._id;
          localProfiles = localProfiles.map((p: any) =>
            p.id === profile.id
              ? { ...p, _id: backendId, id: backendId }
              : p
          );
          localUpdated = true;
          console.log(`[LedgerSync] ✓ Customer created: ${profile.customerName} → _id: ${backendId}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[LedgerSync] ✗ Customer sync failed: ${(profile as any).customerName} — ${msg}`);
      const sanitizedProfile = {
        ...profile,
        driverId: typeof profile.driverId === 'string' && isMongoObjectId(profile.driverId) ? profile.driverId : null
      };
      addToQueue('/ledger/customers', 'POST', sanitizedProfile, `Create customer: ${(profile as any).customerName}`);
    }
  }

  if (localUpdated) {
    localStorage.setItem('cheema_saved_customers', JSON.stringify(localProfiles));
    window.dispatchEvent(new CustomEvent('dairy-customers-updated'));
  }
};

// ─── Settings Sync ────────────────────────────────────────────────────────────

export const syncSetting = async (key: string, value: unknown) => {
  if (!isOnline()) {
    addToQueue(`/settings/${key}`, 'PUT', { value }, `Save setting: ${key}`);
    return;
  }
  try {
    await settingsApi.set(key, value);
  } catch (err) {
    addToQueue(`/settings/${key}`, 'PUT', { value }, `Save setting: ${key} (retry)`);
  }
};

// ─── Full Sync on Internet Restore ────────────────────────────────────────────

/**
 * Internet wapas aaya - localStorage se sab data backend ko sync karo
 * Ye sab cheema_purchase_ledger_*, cheema_sale_ledger_* keys ka data backend ko bhejta hai
 */
export const fullLedgerSyncToBackend = async () => {
  if (!isOnline()) return;
  
  console.log('[LedgerSync] Starting full ledger sync...');

  // Purchase ledger keys scan karo
  const purchaseKeys: string[] = [];
  const saleKeys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('cheema_purchase_ledger_')) purchaseKeys.push(key);
    if (key?.startsWith('cheema_sale_ledger_')) saleKeys.push(key);
  }

  // Purchase entries sync
  for (const key of purchaseKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length === 0) continue;
      const date = key.replace('cheema_purchase_ledger_', '');
      await ledgerApi.bulkCreatePurchase({ date, entries });
    } catch (err) {
      console.warn('[LedgerSync] Purchase sync error for', key, err);
    }
  }

  // Sale entries sync
  for (const key of saleKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length === 0) continue;
      const date = key.replace('cheema_sale_ledger_', '');
      await ledgerApi.bulkCreateSale({ date, entries });
    } catch (err) {
      console.warn('[LedgerSync] Sale sync error for', key, err);
    }
  }

  // Supplier profiles sync
  try {
    const raw = localStorage.getItem('cheema_saved_suppliers');
    if (raw) {
      const profiles = JSON.parse(raw);
      await syncSupplierProfilesToBackend(profiles);
    }
  } catch (err) {}

  // Customer profiles sync
  try {
    const raw = localStorage.getItem('cheema_saved_customers');
    if (raw) {
      const profiles = JSON.parse(raw);
      await syncCustomerProfilesToBackend(profiles);
    }
  } catch (err) {}

  // Settings sync
  const settingKeys = ['dairy_fixed_purchase_rate', 'dairy_fixed_sales_rate', 'dairy_has_been_reset'];
  const settingsToSync: Record<string, unknown> = {};
  settingKeys.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) settingsToSync[k] = v;
  });
  if (Object.keys(settingsToSync).length > 0) {
    try { await settingsApi.bulkSet(settingsToSync); } catch (err) {}
  }

  console.log('[LedgerSync] Full sync complete');
};

/**
 * Backend se data lo aur localStorage update karo (fresh load)
 * App start hone par ya internet wapas aane par call karo
 */
export const pullLedgerFromBackend = async () => {
  if (!isOnline()) return;

  try {
    // Settings pull karo
    const settingsRes: any = await settingsApi.getAll();
    if (settingsRes.success && settingsRes.data) {
      Object.entries(settingsRes.data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, String(value));
        }
      });
    }
  } catch (err) {}

  try {
    // Supplier profiles pull karo
    const suppliersRes: any = await ledgerApi.getSuppliers();
    if (suppliersRes.success && Array.isArray(suppliersRes.data)) {
      const mapped = suppliersRes.data.map((p: any) => ({
        id: p._id,
        supplierName: p.supplierName,
        phoneNumber: p.phoneNumber || '',
        driverId: p.driverId || 'DIRECT',
        driverName: p.driverName || 'Direct',
        location: p.location || '',
        openingBalance: p.openingBalance || 0,
        cnicNumber: p.cnicNumber || '',
        areaLocation: p.areaLocation || '',
        transportRelation: p.transportRelation || null,
      }));
      localStorage.setItem('cheema_saved_suppliers', JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('dairy-suppliers-updated'));
    }
  } catch (err) {}

  try {
    // Customer profiles pull karo
    const customersRes: any = await ledgerApi.getCustomers();
    if (customersRes.success && Array.isArray(customersRes.data)) {
      const mapped = customersRes.data.map((p: any) => ({
        id: p._id,
        customerName: p.customerName,
        phoneNumber: p.phoneNumber || '',
        driverId: p.driverId || 'DIRECT',
        driverName: p.driverName || 'Direct',
        location: p.location || '',
        openingBalance: p.openingBalance || 0,
        whatsappName: p.whatsappName || '',
        cnicNumber: p.cnicNumber || '',
        deliveryType: p.deliveryType || null,
      }));
      localStorage.setItem('cheema_saved_customers', JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('dairy-customers-updated'));
    }
  } catch (err) {}

  // Today's purchase ledger pull
  try {
    const today = new Date().toISOString().split('T')[0];
    const purchaseRes: any = await ledgerApi.getPurchase({ date: today });
    if (purchaseRes.success && Array.isArray(purchaseRes.data)) {
      const key = `cheema_purchase_ledger_${today}`;
      const existing: any[] = [];
      try {
        const raw = localStorage.getItem(key);
        if (raw) existing.push(...JSON.parse(raw));
      } catch (e) {}
      
      // Backend data ko localStorage format mein convert karo
      const backendEntries = purchaseRes.data.map((e: any) => ({
        id: e._id,
        supplierProfileId: e.supplierProfileId?._id || e.supplierProfileId,
        supplierName: e.supplierName,
        date: e.date, time: e.time,
        phoneNumber: e.phoneNumber || '',
        milkLiter: e.milkLiter, fat: e.fat, lr: e.lr, snf: e.snf, totalTs: e.totalTs,
        rate: e.rate, totalAmount: e.totalAmount,
        advanceAmount: e.advanceAmount || 0,
        paymentReceived: e.paymentReceived || 0,
        remainingBalance: e.remainingBalance || 0,
        notes: e.notes || '',
        isManual: e.isManual || false,
        driverId: e.driverId || '', driverName: e.driverName || '',
        routeId: e.routeId || '', routeName: e.routeName || '',
        paymentType: e.paymentType || '', bankName: e.bankName || '',
        discountAmount: e.discountAmount || 0,
        isSpoiled: e.isSpoiled || false, spoiledAmount: e.spoiledAmount || 0,
        spoiledLiters: e.spoiledLiters || 0,
      }));

      // Merge - existing manual entries rakho, backend entries add karo
      const manualEntries = existing.filter((e: any) => e.isManual);
      const merged = [...manualEntries, ...backendEntries.filter((be: any) =>
        !manualEntries.some((me: any) => me.id === be.id)
      )];
      localStorage.setItem(key, JSON.stringify(merged));
    }
  } catch (err) {}

  // Today's sale ledger pull
  try {
    const today = new Date().toISOString().split('T')[0];
    const saleRes: any = await ledgerApi.getSale({ date: today });
    if (saleRes.success && Array.isArray(saleRes.data)) {
      const key = `cheema_sale_ledger_${today}`;
      const existing: any[] = [];
      try {
        const raw = localStorage.getItem(key);
        if (raw) existing.push(...JSON.parse(raw));
      } catch (e) {}
      
      const backendEntries = saleRes.data.map((e: any) => ({
        id: e._id || e.id,
        customerProfileId: e.customerProfileId?._id || e.customerProfileId,
        customerName: e.customerName,
        date: e.date, time: e.time,
        phoneNumber: e.phoneNumber || '',
        milkLiter: e.milkLiter,
        rate: e.rate, totalAmount: e.totalAmount,
        advanceAmount: e.advanceAmount || 0,
        paymentReceived: e.paymentReceived || 0,
        remainingBalance: e.remainingBalance || 0,
        notes: e.notes || '',
        isManual: e.isManual || false,
        driverId: e.driverId || '', driverName: e.driverName || '',
        paymentType: e.paymentType || '', bankName: e.bankName || '',
        discountAmount: e.discountAmount || 0,
      }));

      // Merge - existing manual entries rakho, backend entries add karo
      const manualEntries = existing.filter((e: any) => e.isManual);
      const merged = [...manualEntries, ...backendEntries.filter((be: any) =>
        !manualEntries.some((me: any) => me.id === be.id)
      )];
      localStorage.setItem(key, JSON.stringify(merged));
    }
  } catch (err) {}
};
