import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar, Phone, Clock, Plus, Save, Trash2,
  UserCheck, DollarSign, BarChart2, CheckCircle, Smartphone, User, MessageCircle, AlertCircle, Search, Edit2, Check, Eye, X, Filter, TrendingUp, RefreshCw, Send, CheckCircle2, ChevronRight, HelpCircle, FileDown
} from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import { downloadTransactionsPDF } from '../../utils/pdfExport';
import { useAccountContext } from '../../contexts/AccountContext';
import { useMilkTransactionContext } from '../../contexts/MilkTransactionContext';
import { syncSaleEntryToBackend, syncDeleteSaleEntry, syncCustomerProfilesToBackend } from '../../services/ledgerSync';
import { ledgerApi, isOnline } from '../../services/api';
import { addToQueue } from '../../services/offlineSync';

// Customer Profile interface
interface CustomerProfile {
  id: string;
  customerName: string;
  phoneNumber: string;
  driverId: string; // Deliverer driver
  driverName: string;
  location: string;
  openingBalance: number; // Initial persistent starting dues
  whatsappName?: string;
  cnicNumber?: string;
  deliveryType?: 'Direct Self' | 'Driver Delivery' | 'Other';
}

// Sale Entry representing active transaction log
interface SaleEntry {
  id: string;
  customerProfileId: string; // Links to CustomerProfile
  customerName: string;
  date: string; // e.g., '2026-06-14'
  time: string; // e.g., '10:30 AM'
  phoneNumber: string;
  milkUnit?: 'Liters' | 'Kg';
  milkLiter: number; // Optional fallback
  rate: number; // Optional fallback
  totalAmount: number; // Milk sold in PKR
  advanceAmount: number; // Advance received
  paymentReceived: number; // Net cash received
  remainingBalance: number; // Previous Balance + Milk Amount - Advance - Cash Received
  notes: string;
  isManual: boolean;
  driverId: string;
  driverName: string;
  paymentType?: string; // payment type (Cash, Bank Transfer, JazzCash, EasyPaisa)
  bankName?: string;     // bank name (Meezan, HBL, UBL, Alfalah, etc.)
  fat?: number;
  lr?: number;
  snf?: number;
  totalTs?: number;
  discountAmount?: number;
  isSpoiled?: boolean;
  spoiledAmount?: number;
  spoiledLiters?: number;
  spoiledRate?: number;
  spoiledFat?: number;
  spoiledLr?: number;
  spoiledSnf?: number;
  spoiledTs?: number;
}

// Bilingual English / Urdu translations mapping
const translations = {
  en: {
    title: "Sale Customer Details",
    subtitle: "Real-time milk balance accounting and automated customer folders",
    tabCustomers: "Customers",
    tabDailySales: "Daily Entries",
    tabAddCustomer: "Add Customer",
    details: "Details",
    searchPlaceholder: "Search by customer name or phone...",
    totalSystemBalance: "Total Outstanding Balance",
    totalBalanceDesc: "Cumulative remaining dues of all buyer accounts",
    addNewBuyer: "Register New Customer Profile",
    customerName: "Customer Name *",
    namePlaceholder: "Enter full name / Shop brand",
    phoneNumber: "WhatsApp Phone Number *",
    phonePlaceholder: "e.g., 03001234567",
    location: "Delivery Location / Shop Area Address",
    locationPlaceholder: "e.g., Green Town Sector C",
    openingBalance: "Opening Balance (Initial Dues) *",
    openingPlaceholder: "e.g., 15000 (0 if clean start)",
    driver: "Deliverer Driver Account",
    directWalkin: "Direct / Self-Walkin",
    saveProfile: "Create Customer Profile",
    dailySalesFor: "Daily Sales Matrix for",
    dailySummary: "Daily Sales Summary",
    totalMilkSold: "Total Milk Sold",
    cashReceived: "Net Cash Received",
    advanceReceived: "Advances Held",
    totalCustomers: "Total Accounts",
    entryStatus: "Delivery Grid & Status",
    completed: "Saved",
    pending: "Pending",
    editEntry: "Modify Entry",
    recordEntry: "Record Sale",
    modalSaleTitle: "Daily Entry Form",
    date: "Transaction Date *",
    previousBalance: "Previous Balance (Read-Only)",
    milkAmtPKR: "Milk Sold (Amount in PKR) *",
    advanceReceivedField: "Advance Received (Rs.) [Deducts Balance]",
    cashReceivedField: "Net Cash Received (Paid Cash)",
    notes: "Notes / Action Description",
    notesPlaceholder: "e.g., Evening delivery, high thickness",
    calculateFromLiters: "Liters & Rate Calculator",
    liters: "Milk Liters",
    rate: "Rate / Liter",
    previewNewBalance: "Projected Balance Preview",
    formulaNote: "Formula: New Balance = Prev Balance + Milk Sold - Advance - Cash Paid",
    saveTransaction: "Save Sale Entry",
    close: "Close Dialog",
    ledgerDetails: "Ledger Activity Ledger Sheet",
    statementFor: "Date-wise statement timeline for",
    baseOpeningBalance: "Persistent Opening Balance",
    adjustOpeningBalance: "Edit Opening Balance Base",
    monthFilter: "Report Month Select",
    allMonths: "All Months",
    summaryTitle: "Filtered Monthly Totals",
    whatsappLedger: "Dispatch Ledger on WhatsApp",
    dateWiseStatement: "Chronological Date-Wise Statement Log",
    dateTime: "Date & Time",
    workDone: "Work Done / Delivery detail",
    pkrSummary: "Financial Ledger Process",
    runningBal: "Running Balance",
    noEntriesFound: "No historical sales ledger entries found.",
    recordDealHelp: "Record sales entries to construct a dynamic date-wise grid statement.",
    successSave: "Successfully saved transaction!",
    successProfile: "Created profile updated!",
    successDelete: "Successfully deleted transaction!",
    confirmDelete: "Are you sure you want to delete this sale entry?",
    whatsappOptionTitle: "Update WhatsApp Ledger Option",
    sendPrompt: "A sales entry has been successfully recorded. Ready to update their WhatsApp ledger?",
    sendReceiptBtn: "Send WhatsApp Receipt",
    showLedgerBtn: "Show Account Ledger Details",
    skipBtn: "Skip and Stay",
    pkr: "Rs."
  }
};

export default function SaleLedger() {
  const { user } = useAuth();
  const { users } = useUserContext();
  const { addAccountRecord } = useAccountContext();
  const { removeRecord } = useMilkTransactionContext();
  const drivers = users.filter(u => u.role === 'Driver' || u.role === 'MilkTester');

  // Details Modal States
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedProfileForDetails, setSelectedProfileForDetails] = useState<CustomerProfile | null>(null);
  const [showHistoryInModal, setShowHistoryInModal] = useState<boolean>(false);

  type DateFilterStr = '1D' | '5D' | '7D' | '1M' | 'CUSTOM' | 'ALL';
  const [detailsDateFilter, setDetailsDateFilter] = useState<DateFilterStr>('1M');
  const [detailsCustomStartDate, setDetailsCustomStartDate] = useState<string>('');
  const [detailsCustomEndDate, setDetailsCustomEndDate] = useState<string>('');

  const location = useLocation();
  const navigate = useNavigate();

  // Interface Language Mode state (Urdu vs English)
  const isUrdu = false;

  // Tab Management State
  const [activeTab, setActiveTab] = useState<'customers' | 'daily' | 'add'>('customers');
  const [isEntryReadOnly, setIsEntryReadOnly] = useState<boolean>(false);

  // Active dates for ledger listings
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Custom states
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>(() => {
    // Instantly localStorage se load karo — page switch pe delay nahi hoga
    try {
      const stored = localStorage.getItem('cheema_saved_customers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Daily Entry Form states
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [activeProfileForEntry, setActiveProfileForEntry] = useState<CustomerProfile | null>(null);
  const [isAutoImported, setIsAutoImported] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Form input states
  const [entryDate, setEntryDate] = useState<string>('');
  const [entryAdvance, setEntryAdvance] = useState<string>('');
  const [entryMilkPKR, setEntryMilkPKR] = useState<string>('');
  const [entryCashPaid, setEntryCashPaid] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [entryPaymentType, setEntryPaymentType] = useState<string>('Cash');
  const [entryBankName, setEntryBankName] = useState<string>('None');

  // Lite calculator helper states
  const [useCalc, setUseCalc] = useState<boolean>(false);
  const [milkUnit, setMilkUnit] = useState<'Liters' | 'Kg'>('Liters');
  const [calcLiters, setCalcLiters] = useState<string>('');
  const [calcRate, setCalcRate] = useState<string>('');
  const [entryFat, setEntryFat] = useState<number | undefined>(undefined);
  const [entryLr, setEntryLr] = useState<number | undefined>(undefined);
  const [entrySnf, setEntrySnf] = useState<number | undefined>(undefined);
  const [entryTs, setEntryTs] = useState<number | undefined>(undefined);

  const [entryDiscount, setEntryDiscount] = useState<string>('');
  const [entryIsSpoiled, setEntryIsSpoiled] = useState<boolean>(false);
  const [entrySpoiledAmount, setEntrySpoiledAmount] = useState<string>('');
  const [spoiledUnit, setSpoiledUnit] = useState<'Liters' | 'Kg'>('Liters');
  const [spoiledLiters, setSpoiledLiters] = useState<string>('');
  const [spoiledRate, setSpoiledRate] = useState<string>('');
  const [spoiledFat, setSpoiledFat] = useState<string>('');
  const [spoiledLr, setSpoiledLr] = useState<string>('');
  const [spoiledSnf, setSpoiledSnf] = useState<number | undefined>(undefined);
  const [spoiledTs, setSpoiledTs] = useState<number | undefined>(undefined);

  // WhatsApp Post-Save Notification Dialog
  const [showWhatsappModal, setShowWhatsappModal] = useState<boolean>(false);
  const [whatsappEntry, setWhatsappEntry] = useState<SaleEntry | null>(null);

  // Main Daily view filters
  const [showOnlyEntered, setShowOnlyEntered] = useState<boolean>(false);

  type DailyFilterStr = 'TODAY' | '10D' | '15D' | 'CUSTOM';
  const [dailyDateFilter, setDailyDateFilter] = useState<DailyFilterStr>('TODAY');
  const [dailyCustomStartDate, setDailyCustomStartDate] = useState<string>('');
  const [dailyCustomEndDate, setDailyCustomEndDate] = useState<string>('');

  // Add Customer Form Inputs
  const [addName, setAddName] = useState<string>('');
  const [addPhone, setAddPhone] = useState<string>('');
  const [addLocation, setAddLocation] = useState<string>('');
  const [addWhatsappName, setAddWhatsappName] = useState<string>('');
  const [addCnic, setAddCnic] = useState<string>('');
  const [addDeliveryType, setAddDeliveryType] = useState<'Direct Self' | 'Driver Delivery' | 'Other'>('Direct Self');
  const [addOpeningBalance, setAddOpeningBalance] = useState<string>('');
  const [addDriverId, setAddDriverId] = useState<string>('DIRECT');
  const [resetCount, setResetCount] = useState<number>(0);

  // Load and seed customer profiles from localStorage on component mount
  useEffect(() => {
    const defaultProfilesKey = 'cheema_saved_customers';
    const stored = localStorage.getItem(defaultProfilesKey);
    let resolved: CustomerProfile[] = [];

    if (stored) {
      try {
        resolved = JSON.parse(stored);
      } catch (err) {
        console.error("Failed to parse", err);
      }
    }

    // Sirf jo aapne khud add kiya — koi fake default nahi
    setCustomerProfiles(resolved);
  }, [resetCount]);

  useEffect(() => {
    const handleReset = () => {
      setResetCount(prev => prev + 1);
    };
    window.addEventListener('dairy-reset', handleReset);
    window.addEventListener('dairy-customers-updated', handleReset);
    return () => {
      window.removeEventListener('dairy-reset', handleReset);
      window.removeEventListener('dairy-customers-updated', handleReset);
    };
  }, []);

  useEffect(() => {
    if (location.state && location.state.preselectProfileName && customerProfiles.length > 0) {
      const pName = location.state.preselectProfileName;
      const profile = customerProfiles.find(p => p.customerName.toLowerCase() === pName.toLowerCase());
      if (profile) {
        if (location.state.openEntryModal) {
          setActiveProfileForEntry(profile);
          const targetDate = location.state.entryDate || new Date().toISOString().split('T')[0];
          setEntryDate(targetDate);
          setIsAutoImported(true);

          setCalcLiters('');
          setEntryMilkPKR('');
          setCalcRate('');

          // CRITICAL: Clear payment inputs so previous entries' data is not leaked/reused
          setEntryAdvance('');
          setEntryCashPaid('');
          setEntryNotes('');
          setEntryPaymentType('Cash');
          setEntryBankName('None');

          setEntryFat(undefined);
          setEntryLr(undefined);
          setEntrySnf(undefined);
          setEntryTs(undefined);

          setEntryDiscount('');
          setEntryIsSpoiled(false);
          setEntrySpoiledAmount('');

          setUseCalc(true);
          setShowEntryModal(true);

          // Clear history state so it does not keep re-triggering on page refresh
          window.history.replaceState({}, document.title)
        } else {
          // USER REQUIREMENT: Open Daily Entry Form instead of ledger
          setActiveProfileForEntry(profile);
          setEntryDate(new Date().toISOString().split('T')[0]);
          setEditingEntryId(null);
          setUseCalc(true);

          setCalcLiters('');
          setCalcRate('');
          setEntryFat(undefined);
          setEntryLr(undefined);
          setEntrySnf(undefined);
          setEntryTs(undefined);

          setEntryAdvance('');
          setEntryCashPaid('');
          setEntryNotes('');
          setEntryDiscount('');

          setEntryIsSpoiled(false);
          setEntrySpoiledAmount('');
          setSpoiledLiters('');
          setSpoiledRate('');

          setShowEntryModal(true);
          setActiveTab('daily');

          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [location.state, customerProfiles, navigate, location.pathname]);

  // Calculation Logic for Spoiled Milk
  useEffect(() => {
    if (entryIsSpoiled) {
      const lit = Number(spoiledLiters) || 0;
      const rt = Number(spoiledRate) || 0;
      const fat = Number(spoiledFat) || 0;
      const lr = Number(spoiledLr) || 0;

      if (lit > 0 && rt > 0) {
        if (spoiledUnit === 'Liters' && fat > 0 && lr > 0) {
          const calculatedSnf = (0.25 * lr) + (0.22 * fat) + 0.72;
          const calculatedTotalTs = ((fat + calculatedSnf) * lit) / 13;
          setSpoiledSnf(calculatedSnf);
          setSpoiledTs(calculatedTotalTs);
          setEntrySpoiledAmount((calculatedTotalTs * rt).toFixed(2));
        } else {
          setSpoiledSnf(undefined);
          setSpoiledTs(undefined);
          setEntrySpoiledAmount((lit * rt).toFixed(2));
        }
      } else {
        setSpoiledSnf(undefined);
        setSpoiledTs(undefined);
        setEntrySpoiledAmount(lit === 0 && rt === 0 && spoiledLiters === '' && spoiledRate === '' ? '' : '0');
      }
    }
  }, [spoiledLiters, spoiledRate, spoiledFat, spoiledLr, entryIsSpoiled, spoiledUnit]);

  // Helper translations getter
  const labels = translations.en;

  // Helper: Recalculate metrics based on current inputs
  const syncSaleCalculator = (lit: string, rt: string, fat: number | undefined, lr: number | undefined) => {
    if (!useCalc) return;

    const l = Number(lit) || 0;
    const r = Number(rt) || 0;

    if (l > 0 && r > 0) {
      if (fat !== undefined && lr !== undefined) {
        const calculatedSnf = (0.25 * lr) + (0.22 * fat) + 0.72;
        const calculatedTs = fat + calculatedSnf;
        const calculatedTotalTs = (calculatedTs * l) / 13;
        setEntrySnf(calculatedSnf);
        setEntryTs(calculatedTotalTs);
        setEntryMilkPKR((calculatedTotalTs * r).toFixed(2));
      } else {
        setEntrySnf(undefined);
        setEntryTs(undefined);
        setEntryMilkPKR((l * r).toFixed(2));
      }
    }
  };

  const [allSaleEntries, setAllSaleEntries] = useState<SaleEntry[]>([]);
  // Cache se instant load karo — page switch pe loading nahi dikhegi
  const [loadingEntries, setLoadingEntries] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('cheema_saved_customers');
      return !stored;
    } catch { return true; }
  });

  // Helper: scan localStorage fallback
  const getAllSaleEntriesGlobalLS = (): SaleEntry[] => {
    const all: SaleEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cheema_sale_ledger_')) {
        const dateStr = key.replace('cheema_sale_ledger_', '');
        try {
          const raw = localStorage.getItem(key);
          const entries = JSON.parse(raw || '[]');
          if (Array.isArray(entries)) {
            entries.forEach((e: any) => {
              all.push({
                ...e,
                date: e.date || dateStr,
                totalAmount: Number(e.totalAmount) || Number(e.milkAmtPKR) || 0,
                advanceAmount: Number(e.advanceAmount) || Number(e.advanceReceived) || 0,
                paymentReceived: Number(e.paymentReceived) || Number(e.cashPaid) || 0
              });
            });
          }
        } catch (err) { }
      }
    }
    return all;
  };

  // Load and seed customer profiles and sale entries from backend API / localStorage
  useEffect(() => {
    const loadData = async () => {
      setLoadingEntries(true);
      // 1. Customer Profiles
      try {
        if (isOnline()) {
          const res: any = await ledgerApi.getCustomers();
          if (res.success && Array.isArray(res.data)) {
            const mapped = res.data.map((p: any) => ({
              id: p._id || p.id,
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
            setCustomerProfiles(mapped);
            localStorage.setItem('cheema_saved_customers', JSON.stringify(mapped));
          }
        } else {
          throw new Error('Offline');
        }
      } catch (err) {
        const stored = localStorage.getItem('cheema_saved_customers');
        if (stored) {
          try { setCustomerProfiles(JSON.parse(stored)); } catch (e) { }
        }
      }

      // 2. Global Sale Entries
      try {
        if (isOnline()) {
          const res: any = await ledgerApi.getSale();
          if (res.success && Array.isArray(res.data)) {
            const mapped = res.data.map((e: any) => ({
              id: e._id || e.id,
              customerProfileId: e.customerProfileId?._id || e.customerProfileId,
              customerName: e.customerName,
              date: e.date,
              time: e.time,
              phoneNumber: e.phoneNumber || '',
              milkUnit: e.milkUnit || 'Liters',
              milkLiter: e.milkLiter || 0,
              rate: e.rate || 0,
              totalAmount: e.totalAmount || 0,
              advanceAmount: e.advanceAmount || 0,
              paymentReceived: e.paymentReceived || 0,
              remainingBalance: e.remainingBalance || 0,
              notes: e.notes || '',
              isManual: e.isManual || false,
              driverId: e.driverId || '',
              driverName: e.driverName || '',
              paymentType: e.paymentType || 'Cash',
              bankName: e.bankName || 'None',
              discountAmount: e.discountAmount || 0,
              isSpoiled: e.isSpoiled || false,
              spoiledAmount: e.spoiledAmount || 0,
              spoiledLiters: e.spoiledLiters || 0,
              spoiledRate: e.spoiledRate || 0,
              spoiledFat: e.spoiledFat,
              spoiledLr: e.spoiledLr,
              spoiledSnf: e.spoiledSnf,
              spoiledTs: e.spoiledTs,
            }));
            setAllSaleEntries(mapped);
          }
        } else {
          throw new Error('Offline');
        }
      } catch (err) {
        setAllSaleEntries(getAllSaleEntriesGlobalLS());
      } finally {
        setLoadingEntries(false);
      }
    };

    loadData();
  }, [resetCount]);

  useEffect(() => {
    const handleReset = () => {
      setResetCount(prev => prev + 1);
    };
    window.addEventListener('dairy-reset', handleReset);
    window.addEventListener('dairy-customers-updated', handleReset);
    // dairy-purchase-saved aur dairy-sale-saved pe full reload mat karo
    // kyunki handleSaveSaleEntry directly state update karta hai
    // full reload se race condition banta hai (backend se stale data aata hai)
    return () => {
      window.removeEventListener('dairy-reset', handleReset);
      window.removeEventListener('dairy-customers-updated', handleReset);
    };
  }, []);

  // Global triggers
  const showToast = (text: string, type: 'success' | 'error') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 3500);
  };

  // FETCH ALL SALE ENTRIES FROM ALL DATES TO REBUILD SEQUENTIAL RUNNING LEDGERS
  const getAllSaleEntriesGlobal = (): SaleEntry[] => {
    return allSaleEntries;
  };

  // GET PREVIOUS OUTSTANDING BALANCE JUST BEFORE A TARGET DATE
  const getCustomerBalanceBeforeDate = (profile: CustomerProfile, dateStr: string): number => {
    const globalEntries = getAllSaleEntriesGlobal();
    const customerEntries = globalEntries.filter(
      e => e.customerProfileId === profile.id || e.customerName.trim().toLowerCase() === profile.customerName.trim().toLowerCase()
    );

    // Filter out only entries strictly BEFORE the target date dateStr
    const previousEntries = customerEntries.filter(e => e.date < dateStr);

    // Sort chronologically date-wise, then time-wise
    previousEntries.sort((a, b) => {
      const comp = a.date.localeCompare(b.date);
      if (comp !== 0) return comp;
      const aTime = a.time || '';
      const bTime = b.time || '';
      return aTime.localeCompare(bTime);
    });

    let cum = Number(profile.openingBalance) || 0;
    previousEntries.forEach(e => {
      const net = (Number(e.totalAmount) || 0) - (Number(e.discountAmount) || 0) - (Number(e.spoiledAmount) || 0);
      cum = cum + net - Number(e.advanceAmount) - Number(e.paymentReceived);
    });

    return cum;
  };

  // COMPUTE DYNAMIC RUNNING LEDGER TILL TODAY DATE (CURRENT REMAINING BALANCE)
  const getCustomerCurrentBalance = (profile: CustomerProfile): number => {
    return getCustomerBalanceBeforeDate(profile, '9999-12-31');
  };

  // ── useMemo: Har customer ka balance ek baar compute karo ─────────────────
  const customerBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of customerProfiles) {
      map.set(p.id, getCustomerCurrentBalance(p));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSaleEntries, customerProfiles]);

  // ── useMemo: selectedDate ke liye prevBalance map ─────────────────────────
  const customerPrevBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of customerProfiles) {
      map.set(p.id, getCustomerBalanceBeforeDate(p, selectedDate));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSaleEntries, customerProfiles, selectedDate]);

  // SUMMARIZE ALL SYSTEM OUTSTANDING RECEIPTS DYNAMICALLY
  const totalSystemOutstanding = useMemo(() => {
    let total = 0;
    customerBalanceMap.forEach(v => { total += v; });
    return total;
  }, [customerBalanceMap]);

  // SEARCH & FILTER PROFILES
  const filteredProfiles = customerProfiles.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.customerName.toLowerCase().includes(query) ||
      p.phoneNumber.toLowerCase().includes(query) ||
      (p.location && p.location.toLowerCase().includes(query))
    );
  });

  // GATHER ENTRIES OCCURRING ON THE ACTIVE SELECTED DATE
  const getEntriesForDate = (dateStr: string): SaleEntry[] => {
    return allSaleEntries.filter(e => e.date === dateStr);
  };

  const activeDateEntries = getEntriesForDate(selectedDate);

  // GET DYNAMIC STATISTICS FOR THE ACTIVE DATE
  const dailyTotalCustomers = customerProfiles.length;
  const dailyEntriesCount = activeDateEntries.length;

  // USER REQUIREMENT: Total Sale should be reduced by spoiled milk
  const dailyTotalGrossLiters = activeDateEntries.reduce((acc, e) => acc + (Number(e.milkLiter) || 0), 0);
  const dailyTotalSpoiledLiters = activeDateEntries.reduce((acc, e) => acc + (Number(e.spoiledLiters) || 0), 0);
  const dailyTotalNetLiters = dailyTotalGrossLiters - dailyTotalSpoiledLiters;

  const dailyTotalGrossAmount = activeDateEntries.reduce((acc, e) => acc + (Number(e.totalAmount) || 0), 0);
  const dailyTotalSpoiledAmount = activeDateEntries.reduce((acc, e) => acc + (Number(e.spoiledAmount) || 0), 0);
  const dailyTotalNetMilkSold = dailyTotalGrossAmount - dailyTotalSpoiledAmount;

  const dailyTotalCashReceived = activeDateEntries.reduce((acc, e) => acc + (Number(e.paymentReceived) || 0), 0);
  const dailyTotalAdvance = activeDateEntries.reduce((acc, e) => acc + (Number(e.advanceAmount) || 0), 0);

  const getFlatFilteredDailyEntries = (): SaleEntry[] => {
    if (dailyDateFilter === 'TODAY') return getEntriesForDate(selectedDate);

    // We need to parse all keys to find entries
    const globalEntries = getAllSaleEntriesGlobal();

    const todayDate = new Date();
    const offset = todayDate.getTimezoneOffset()
    todayDate.setMinutes(todayDate.getMinutes() - offset)
    const todayStr = todayDate.toISOString().split('T')[0];

    let filterStartDate = '0000-00-00';
    let filterEndDate = '9999-99-99';

    if (dailyDateFilter === '10D') {
      const past = new Date(todayDate);
      past.setDate(past.getDate() - 9); // 10 days including today
      filterStartDate = past.toISOString().split('T')[0];
      filterEndDate = todayStr;
    } else if (dailyDateFilter === '15D') {
      const past = new Date(todayDate);
      past.setDate(past.getDate() - 14); // 15 days including today
      filterStartDate = past.toISOString().split('T')[0];
      filterEndDate = todayStr;
    } else if (dailyDateFilter === 'CUSTOM') {
      filterStartDate = dailyCustomStartDate || '0000-00-00';
      filterEndDate = dailyCustomEndDate || '9999-99-99';
    }

    return globalEntries.filter(row => {
      return row.date && row.date >= filterStartDate && row.date <= filterEndDate;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  };

  const filteredDailyEntriesFlat = getFlatFilteredDailyEntries();

  // HANDLER: ADDING NEW CUSTOMER PROFILE
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      showToast("Customer name is required!", "error");
      return;
    }

    const defaultProfilesKey = 'cheema_saved_customers';
    const match = customerProfiles.find(
      p => p.customerName.trim().toLowerCase() === addName.trim().toLowerCase()
    );

    if (match) {
      showToast("A customer profile with this name already exists!", "error");
      return;
    }

    const assignedDriver = drivers.find(d => d.id === addDriverId);
    const driverName = assignedDriver ? assignedDriver.fullName : 'Direct Walk-in';

    const newProfile: CustomerProfile = {
      id: `cust-${Date.now()}`,
      customerName: addName.trim(),
      phoneNumber: addPhone.trim() || 'N/A',
      driverId: addDriverId,
      driverName,
      location: addLocation.trim() || 'Factory Location',
      openingBalance: Number(addOpeningBalance) || 0,
      whatsappName: addWhatsappName.trim() || undefined,
      cnicNumber: addCnic.trim() || undefined,
      deliveryType: addDeliveryType
    };

    const updated = [...customerProfiles, newProfile];
    localStorage.setItem(defaultProfilesKey, JSON.stringify(updated));
    setCustomerProfiles(updated);

    // Backend sync
    syncCustomerProfilesToBackend(updated).catch(() => { });

    // Reset fields
    setAddName('');
    setAddPhone('');
    setAddLocation('');
    setAddWhatsappName('');
    setAddCnic('');
    setAddDeliveryType('Direct Self');
    setAddOpeningBalance('');
    setAddDriverId('DIRECT');

    showToast(labels.successProfile, "success");
    setActiveTab('customers');
  };

  // HANDLER: DOWNLOAD DAILY PDF REPORT (SPECIFIC DAY)
  const handleDownloadDailyPDF = () => {
    const pdfData = customerProfiles.map(p => {
      const nameKey = p.customerName.trim().toLowerCase();
      const entry = activeDateEntries.find(
        e => e.customerProfileId === p.id || e.customerName.trim().toLowerCase() === nameKey
      );

      if (showOnlyEntered && !entry) return null;

      const prevBal = customerPrevBalanceMap.get(p.id) ?? getCustomerBalanceBeforeDate(p, selectedDate);
      const totalAmount = entry ? entry.totalAmount : 0;
      const advanceAmount = entry ? entry.advanceAmount : 0;
      const paymentReceived = entry ? entry.paymentReceived : 0;
      const calculatedRem = prevBal + totalAmount - advanceAmount - paymentReceived;

      return {
        customerName: p.customerName,
        status: entry ? 'Completed' : 'Pending',
        prevBal: `Rs. ${prevBal.toLocaleString()}`,
        totalAmount: `Rs. ${totalAmount.toLocaleString()}`,
        advanceAmount: `Rs. ${advanceAmount.toLocaleString()}`,
        paymentReceived: `Rs. ${paymentReceived.toLocaleString()}`,
        calculatedRem: `Rs. ${calculatedRem.toLocaleString()}`
      };
    }).filter(Boolean);

    const cols = [
      { header: 'Customer Name', dataKey: 'customerName' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Previous Balance', dataKey: 'prevBal' },
      { header: 'Sales Amount', dataKey: 'totalAmount' },
      { header: 'Advance Cash Received', dataKey: 'advanceAmount' },
      { header: 'Cash Paid / Recv', dataKey: 'paymentReceived' },
      { header: 'Remaining Balance', dataKey: 'calculatedRem' }
    ];

    downloadTransactionsPDF(`Daily Sales Report - ${selectedDate}`, cols, pdfData, `sales_daily_${selectedDate}`);
  };

  // HANDLER: OPEN DAILY SALE ENTRY DIALOG FOR A SPECIFIC PROFILE
  const openSaleEntryDialog = (profile: CustomerProfile, shouldAutoFill: boolean = false, readOnly: boolean = false) => {
    setActiveProfileForEntry(profile);
    setEntryDate(selectedDate);
    setIsAutoImported(false);
    setEditingEntryId(null);
    setShowHistoryInModal(shouldAutoFill);
    setIsEntryReadOnly(readOnly);

    // Default clears
    setEntryAdvance('');
    setEntryMilkPKR('');
    setEntryCashPaid('');
    setEntryDiscount('');
    setEntryNotes('');
    setEntryPaymentType('Cash');
    setEntryBankName('None');
    setEntryIsSpoiled(false);
    setEntrySpoiledAmount('');
    setSpoiledLiters('');
    setSpoiledRate('');
    setSpoiledFat('');
    setSpoiledLr('');
    setSpoiledSnf(undefined);
    setSpoiledTs(undefined);

    if (shouldAutoFill) {
      // Attempt to auto-fill configuration from history
      const globalEntries = getAllSaleEntriesGlobal();
      const customerEntries = globalEntries.filter(
        e => e.customerProfileId === profile.id || e.customerName.trim().toLowerCase() === profile.customerName.trim().toLowerCase()
      );

      // Try to find entry on the target date first
      const todayEntry = customerEntries.find(e => e.date === selectedDate);

      // If not on target date, get the latest one
      let lastEntry = todayEntry;
      if (!lastEntry) {
        customerEntries.sort((a, b) => {
          const comp = b.date.localeCompare(a.date);
          if (comp !== 0) return comp;
          const aTime = a.time || '';
          const bTime = b.time || '';
          return bTime.localeCompare(aTime);
        });
        lastEntry = customerEntries[0];
      }

      if (lastEntry) {
        setCalcLiters(lastEntry.milkLiter ? lastEntry.milkLiter.toString() : '');
        setUseCalc(true);
        setCalcRate(lastEntry.rate ? lastEntry.rate.toString() : '');
        setEntryFat(lastEntry.fat !== undefined ? lastEntry.fat : undefined);
        setEntryLr(lastEntry.lr !== undefined ? lastEntry.lr : undefined);
        setEntrySnf(lastEntry.snf !== undefined ? lastEntry.snf : undefined);
        setEntryTs(lastEntry.totalTs !== undefined ? lastEntry.totalTs : undefined);
        setEntryMilkPKR(lastEntry.totalAmount.toString());
      } else {
        setCalcLiters('');
        setCalcRate('');
        setUseCalc(true);
        setEntryFat(undefined);
        setEntryLr(undefined);
        setEntrySnf(undefined);
        setEntryTs(undefined);
        setEntryMilkPKR('');
      }
    } else {
      // Completely empty as requested for manual open
      setCalcLiters('');
      setMilkUnit('Liters');
      setCalcRate('');
      setUseCalc(true);
      setEntryFat(undefined);
      setEntryLr(undefined);
      setEntrySnf(undefined);
      setEntryTs(undefined);
      setEntryMilkPKR('');
    }

    setEntryDiscount('');
    setEntryIsSpoiled(false);
    setEntrySpoiledAmount('');
    setShowEntryModal(true);
  };

  const editSaleEntryDialog = (profile: CustomerProfile, existing: SaleEntry, readOnly: boolean = false) => {
    setActiveProfileForEntry(profile);
    setEntryDate(existing.date);
    setIsAutoImported(!existing.isManual);
    setEditingEntryId(existing.id);
    setIsEntryReadOnly(readOnly);

    setEntryAdvance(existing.advanceAmount ? existing.advanceAmount.toString() : '');
    setEntryCashPaid(existing.paymentReceived ? existing.paymentReceived.toString() : '');
    setEntryNotes(existing.notes || '');
    setEntryPaymentType(existing.paymentType || 'Cash');
    setEntryBankName(existing.bankName || 'None');
    setEntryMilkPKR(existing.totalAmount ? existing.totalAmount.toString() : '');
    setMilkUnit(existing.milkUnit || 'Liters');

    if (existing.milkLiter) {
      setCalcLiters(existing.milkLiter.toString());
      setUseCalc(true);
    } else {
      setCalcLiters('');
      setUseCalc(false);
    }
    setCalcRate(existing.rate ? existing.rate.toString() : '');
    setEntryFat(existing.fat !== undefined ? existing.fat : undefined);
    setEntryLr(existing.lr !== undefined ? existing.lr : undefined);
    setEntrySnf(existing.snf !== undefined ? existing.snf : undefined);
    setEntryTs(existing.totalTs !== undefined ? existing.totalTs : undefined);
    setEntryDiscount(existing.discountAmount ? existing.discountAmount.toString() : '');

    if (existing.isSpoiled || existing.spoiledAmount) {
      setEntryIsSpoiled(true);
      setEntrySpoiledAmount(existing.spoiledAmount ? existing.spoiledAmount.toString() : '');
      setSpoiledLiters(existing.spoiledLiters ? existing.spoiledLiters.toString() : '');
      setSpoiledRate(existing.spoiledRate ? existing.spoiledRate.toString() : '');
      setSpoiledFat(existing.spoiledFat !== undefined ? existing.spoiledFat.toString() : '');
      setSpoiledLr(existing.spoiledLr !== undefined ? existing.spoiledLr.toString() : '');
      setSpoiledSnf(existing.spoiledSnf !== undefined ? existing.spoiledSnf : undefined);
      setSpoiledTs(existing.spoiledTs !== undefined ? existing.spoiledTs : undefined);
    } else {
      setEntryIsSpoiled(false);
      setEntrySpoiledAmount('');
      setSpoiledLiters('');
      setSpoiledRate('');
      setSpoiledFat('');
      setSpoiledLr('');
      setSpoiledSnf(undefined);
      setSpoiledTs(undefined);
    }

    setShowEntryModal(true);
  };


  // HANDLER: SUBMIT / SAVE SALE ENTRY
  const handleSaveSaleEntry = () => {
    if (!activeProfileForEntry) return;

    const hasMilkVolume = Number(calcLiters) > 0;
    const entryMilkValue = Number(entryMilkPKR) || 0;
    const advanceValue = Number(entryAdvance) || 0;
    const cashValue = Number(entryCashPaid) || 0;
    const discountValue = Number(entryDiscount) || 0;

    if (!hasMilkVolume && entryMilkValue > 0) {
      showToast('Please enter milk liters before saving milk value.', 'error');
      return;
    }

    if (!hasMilkVolume && entryMilkValue === 0 && advanceValue === 0 && cashValue === 0 && discountValue === 0 && !entryIsSpoiled) {
      showToast('No transaction provided. Enter milk volume or payment details to save.', 'error');
      return;
    }

    // Generate consistent entry ID for this save cycle to prevent duplicates
    const entryId = editingEntryId || `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const milkValue = entryMilkValue;

    // Calculate spoiled value based on inputs or total
    let spoiledValue = 0;
    if (entryIsSpoiled) {
      if (spoiledLiters && spoiledRate) {
        spoiledValue = Number(spoiledLiters) * Number(spoiledRate);
      } else {
        spoiledValue = Number(entrySpoiledAmount) || 0;
      }
    }

    const actualMilkAddedToBalance = milkValue - discountValue - spoiledValue;
    const netMilkValue = actualMilkAddedToBalance;
    const netMilkLiter = (Number(calcLiters) || 0) - (Number(spoiledLiters) || 0);

    // Retrieve previous outstanding balance for that exact customer profile up to this exact moment
    const prevBalance = getCustomerCurrentBalance(activeProfileForEntry);
    const calculatedRemaining = prevBalance + actualMilkAddedToBalance - advanceValue - cashValue;

    // Add company expenses
    if (discountValue > 0) {
      addAccountRecord({
        type: 'Expense',
        category: 'Discount',
        amount: discountValue,
        method: entryPaymentType || 'Cash',
        payer: 'Company Main',
        payee: activeProfileForEntry.customerName,
        note: `Sale discount given to customer ${activeProfileForEntry.customerName} on date ${entryDate}`,
        date: entryDate
      });
    }

    if (spoiledValue > 0) {
      addAccountRecord({
        type: 'Expense',
        category: 'Spoiled Milk Loss',
        amount: spoiledValue,
        method: 'Cash',
        payer: 'Company Main',
        payee: activeProfileForEntry.customerName,
        note: `Milk spoiled (Loss) from customer ${activeProfileForEntry.customerName} on date ${entryDate} (${spoiledLiters || 'N/A'} ${spoiledUnit})`,
        date: entryDate
      });
    }

    // NOTE: addRecords call hata diya — woh milkRecordsApi.createBulk call karta tha
    // jo MilkRecord + SaleLedger dono mein entry banata tha.
    // syncSaleEntryToBackend already SaleLedger mein save karta hai — duplicate hoti thi.
    // Dashboard stats ke liye syncFromBackend() rely karo jo 15s mein refresh hoti hai.

    const key = `cheema_sale_ledger_${entryDate}`;
    let entriesList: SaleEntry[] = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        entriesList = JSON.parse(raw);
      }
    } catch (e) {
      // ignore empty key
    }

    // Filter out existing entry with the exact same ID before adding/updating to prevent duplicates
    const existingEntry = entriesList.find(e => e.id === entryId);
    entriesList = entriesList.filter(e => e.id !== entryId);

    const now = new Date();
    const timeFormatted = existingEntry?.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const updatedEntry: SaleEntry = {
      id: entryId,
      customerProfileId: activeProfileForEntry.id,
      customerName: activeProfileForEntry.customerName,
      date: entryDate,
      time: timeFormatted,
      phoneNumber: activeProfileForEntry.phoneNumber,
      milkUnit: milkUnit,
      milkLiter: Number(calcLiters) || 0,
      rate: Number(calcRate) || 0,
      totalAmount: milkValue,
      advanceAmount: advanceValue,
      paymentReceived: cashValue,
      remainingBalance: calculatedRemaining,
      notes: entryNotes,
      isManual: true,
      driverId: activeProfileForEntry.driverId,
      driverName: activeProfileForEntry.driverName,
      paymentType: entryPaymentType,
      bankName: entryPaymentType === 'Bank Transfer' ? entryBankName : undefined,
      fat: entryFat,
      lr: entryLr,
      snf: entrySnf,
      totalTs: entryTs,
      discountAmount: discountValue,
      isSpoiled: entryIsSpoiled,
      spoiledAmount: spoiledValue,
      spoiledLiters: entryIsSpoiled ? (Number(spoiledLiters) || undefined) : undefined,
      spoiledRate: entryIsSpoiled ? (Number(spoiledRate) || undefined) : undefined,
      spoiledFat: entryIsSpoiled ? (Number(spoiledFat) || undefined) : undefined,
      spoiledLr: entryIsSpoiled ? (Number(spoiledLr) || undefined) : undefined,
      spoiledSnf: entryIsSpoiled ? (spoiledSnf || undefined) : undefined,
      spoiledTs: entryIsSpoiled ? (spoiledTs || undefined) : undefined
    };

    entriesList.push(updatedEntry);

    localStorage.setItem(key, JSON.stringify(entriesList));

    // ── FIX: allSaleEntries state foran update karo ──
    // Bina is ke naya entry UI mein nazar nahi aata jab tak page reload na ho
    setAllSaleEntries(prev => {
      const withoutOld = prev.filter(e => e.id !== updatedEntry.id);
      return [...withoutOld, updatedEntry];
    });

    // Backend sync
    syncSaleEntryToBackend(updatedEntry as any).catch(() => { });
    showToast(labels.successSave, "success");
    setShowEntryModal(false);

    // Trigger WhatsApp notification options modal!
    setWhatsappEntry(updatedEntry);
    setShowWhatsappModal(true);
  };

  // HANDLER: DELETE CUSTOMER PROFILE AND ALL ASSOCIATED LEDGER ENTRIES
  const handleDeleteCustomerProfile = (profileId: string, profileName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete customer profile "${profileName}"?\n\nAll associated sale entries will be removed from the ledger.`)) {
      return;
    }

    try {
      // Remove from customer profiles
      const updated = customerProfiles.filter(p => p.id !== profileId);
      setCustomerProfiles(updated);
      localStorage.setItem('cheema_saved_customers', JSON.stringify(updated));

      // Remove all ledger entries for this customer from all dates
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cheema_sale_ledger_')) {
          const entries: SaleEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = entries.filter(e => e.customerProfileId !== profileId);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }

      // Backend: actual DELETE call (not update/sync)
      const isMongoId = /^[a-f\d]{24}$/i.test(profileId);
      if (isMongoId) {
        if (isOnline()) {
          ledgerApi.deleteCustomer(profileId).catch(() => {
            addToQueue(`/ledger/customers/${profileId}`, 'DELETE', undefined, `Delete customer: ${profileName}`);
          });
        } else {
          addToQueue(`/ledger/customers/${profileId}`, 'DELETE', undefined, `Delete customer: ${profileName}`);
        }
      }

      showToast(`Customer profile "${profileName}" has been deleted successfully.`, "success");
    } catch (error) {
      console.error('Error deleting profile:', error);
      showToast('Error deleting profile', 'error');
    }
  };

  // INTERACTIVE DELETE SALE TRANS
  const handleDeleteSale = (saleId: string) => {
    if (!window.confirm(labels.confirmDelete)) return;

    // localStorage se hatao
    const key = `cheema_sale_ledger_${selectedDate}`;
    const entries = getEntriesForDate(selectedDate);
    const filtered = entries.filter(e => e.id !== saleId);
    localStorage.setItem(key, JSON.stringify(filtered));

    // allSaleEntries state se bhi hatao
    setAllSaleEntries(prev => prev.filter(e => e.id !== saleId));

    // Dashboard stats se hatao
    removeRecord(saleId);

    // Backend: sirf EK call — ledger delete (jo MilkRecord bhi cascade delete karta hai)
    // removeRecord already milk-records/:id call karta hai agar valid MongoDB ID ho
    // Ledger entry alag delete karo (agar MongoDB ID hai)
    const isMongoId = /^[a-f\d]{24}$/i.test(saleId);
    if (isMongoId) {
      syncDeleteSaleEntry(saleId).catch(() => { });
    }

    showToast(labels.successDelete, "success");
  };

  // RECALCULATE DYNAMIC STATEMENT PROGRESS TIMELINE FOR CUSTOMER (DATE-WISE SORTED)
  const getCustomerTransactionsTimeline = (profile: CustomerProfile): any[] => {
    const globalEntries = getAllSaleEntriesGlobal();
    const filtered = globalEntries.filter(
      e => e.customerProfileId === profile.id || e.customerName.trim().toLowerCase() === profile.customerName.trim().toLowerCase()
    );

    // Sort chronologically date-wise
    filtered.sort((a, b) => {
      const comp = a.date.localeCompare(b.date);
      if (comp !== 0) return comp;
      const aTime = a.time || '';
      const bTime = b.time || '';
      return aTime.localeCompare(bTime);
    });

    let running = Number(profile.openingBalance) || 0;
    const finalTimeline: any[] = [];

    filtered.forEach(item => {
      const start = running;
      const net = (Number(item.totalAmount) || 0) - (Number(item.discountAmount) || 0) - (Number(item.spoiledAmount) || 0);
      const end = start + net - Number(item.advanceAmount) - Number(item.paymentReceived);

      finalTimeline.push({
        ...item,
        openingBalanceState: start,
        remainingBalanceState: end,
      });
      running = end;
    });

    return finalTimeline;
  };

  // DYNAMIC COMPUTE WHATSAPP MSG receipts string
  const getWhatsAppMessageText = (sale: SaleEntry) => {
    let metrics = '';
    if (sale.fat || sale.lr || sale.snf || sale.totalTs) {
      metrics = `- Today's Quality: Fat ${sale.fat || '-'}% | LR ${sale.lr || '-'} | SNF ${sale.snf || '-'}% | TS ${sale.totalTs || '-'}%0A`;
    }

    let discountDetails = '';
    if (sale.discountAmount && sale.discountAmount > 0) {
      discountDetails = `- Customer Discount given: Rs. ${sale.discountAmount.toLocaleString()}%0A`;
    }

    let spoilageDetails = '';
    if (sale.isSpoiled && sale.spoiledAmount) {
      spoilageDetails = `*âš  SPOILED MILK RETURNED*:%0A` +
        `- Qty: ${sale.spoiledLiters || '0'} ${sale.milkUnit || 'Liters'}%0A` +
        `- Fat %: ${sale.spoiledFat || '0'}%%0A` +
        `- LLR (Lal): ${sale.spoiledLr || '0'}%0A` +
        `- TS %: ${sale.spoiledTs?.toFixed(2) || '0'}%%0A` +
        `- ASN (SNF) %: ${sale.spoiledSnf?.toFixed(2) || '0'}%%0A` +
        `- Total Spoilage Deduction: Rs. ${sale.spoiledAmount.toLocaleString()}%0A` +
        `-----------------------------%0A`;
    }

    return `*CHEEMA DAIRY - LEDGER INVOICE RECEIPT*%0A` +
      `-----------------------------%0A` +
      `*Date*: ${sale.date}%0A` +
      `*Client*: ${sale.customerName}%0A%0A` +
      `*Deals Statistics*:%0A` +
      (sale.milkLiter ? `- Qty: ${sale.milkLiter} ${sale.milkUnit || 'Liters'}%0A` : '') +
      metrics +
      discountDetails +
      spoilageDetails +
      `- Today Net Milk Sold: Rs. ${sale.totalAmount.toLocaleString()}%0A` +
      `- Advance Collected: Rs. ${sale.advanceAmount.toLocaleString()}%0A` +
      `- Net Cash Paid: Rs. ${sale.paymentReceived.toLocaleString()}%0A` +
      `-----------------------------%0A` +
      `*CUMULATIVE REMAINING BALANCE*%0A` +
      `*Rs. ${sale.remainingBalance.toLocaleString()}*%0A` +
      `-----------------------------%0A` +
      `_Thank you for trading with Cheema Dairy. For details contact Accounts department._`;
  };

  const getWhatsAppProfileText = (profile: CustomerProfile, balance: number) => {
    return `*CHEEMA DAIRY*%0A` +
      `-----------------------------%0A` +
      `*Client Profile*: ${profile.customerName}%0A` +
      `*Phone*: ${profile.phoneNumber}%0A%0A` +
      `*ALL-TIME DUES SUMMARY*:%0A` +
      `- *TOTAL OUTSTANDING BALANCE*: *Rs. ${balance.toLocaleString()}*%0A%0A` +
      `_Please settle outstanding dues at your earliest convenience. Thank you!_`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 md:px-6" dir="ltr">

      {/* Dynamic Header Toolbar layout */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> <div className="text-left w-full"> <div className="flex flex-wrap items-center justify-between gap-2"> <div className="flex items-center space-x-3 "> <span className="p-3 bg-emerald-600 text-white rounded-xl shadow-md"> <BarChart2 className="w-6 h-6" /> </span> <div className="text-left"> <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"> <span>{labels.title}</span> <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 font-bold uppercase font-sans">
        Dairy Special
      </span> </h1> <p className="text-xs text-slate-500 mt-1">{labels.subtitle}</p> </div> </div> </div> </div> </div>

      {/* Prominent Balance Stat Widget */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-950 to-slate-900 rounded-2xl p-6 border border-emerald-900 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6"> <div className="flex items-center space-x-4  text-left"> <div className="p-4.5 bg-white/10 rounded-2xl border border-white/20 text-emerald-400"> <DollarSign className="w-8 h-8" /> </div> <div> <span className="text-[10px] text-emerald-300 font-black uppercase tracking-widest block font-sans">
        {labels.totalSystemBalance}
      </span> <h2 className="text-3.5xl font-black tracking-tight font-mono text-white flex items-center space-x-2  mt-1"> <span>{labels.pkr} {totalSystemOutstanding.toLocaleString()}</span>
          {totalSystemOutstanding > 0 && (
            <span className="text-[10px] bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse font-sans">
              Collection Queue
            </span>
          )}
        </h2> <p className="text-xs text-emerald-200 mt-1">{labels.totalBalanceDesc}</p> </div> </div> <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto text-emerald-100 text-xs"> <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex-1 md:w-44 text-left"> <span className="text-[10px] text-emerald-300 font-bold block mb-1">{labels.totalCustomers}</span> <span className="font-extrabold text-white text-base font-mono">{customerProfiles.length} Accounts</span> </div> <div className="bg-emerald-900/40 border border-emerald-800/40 p-4 rounded-xl flex-1 md:w-56 text-left"> <span className="text-[10px] text-emerald-300 font-bold block mb-1">Today Entries Complete</span> <div className="flex items-center justify-between gap-1 mt-1"> <span className="font-bold text-white font-sans">{dailyEntriesCount} / {customerProfiles.length} Profiles</span> <span className="text-[10px] text-emerald-300 bg-teal-500/20 px-2 py-0.5 rounded font-bold font-mono">
          {((dailyEntriesCount / Math.max(customerProfiles.length, 1)) * 105).toFixed(0).replace("105", "100")}% Done
        </span> </div> </div> </div> </div>

      {/* Responsive Toast Notification */}
      {notice && (
        <div className={`p-4 rounded-xl shadow-lg border text-sm font-semibold flex items-center justify-between animate-fade-in ${notice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}> <div className="flex items-center space-x-2 "> <CheckCircle className="w-5 h-5" /> <span>{notice.text}</span> </div> <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button> </div>
      )}

      {/* Main Bottom Tabs Controller */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden min-h-[500px]">

        {/* Horizontal Navigation on Desktop / Tab Selector Header */}
        <div className="bg-slate-55 border-b border-slate-200 flex px-2 md:px-4 w-full">

          {/* Tab 1: Customers */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-3 md:py-4 px-2 md:px-6 font-space font-black text-[11px] md:text-xs transition-all relative flex flex-1 flex-col md:flex-row items-center justify-center gap-1 md:gap-2 cursor-pointer text-center whitespace-nowrap ${activeTab === 'customers'
              ? 'text-emerald-750 border-b-2 border-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>{labels.tabCustomers}</span>
          </button>

          {/* Tab 2: Daily Sales */}
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-3 md:py-4 px-2 md:px-6 font-space font-black text-[11px] md:text-xs transition-all relative flex flex-1 flex-col md:flex-row items-center justify-center gap-1 md:gap-2 cursor-pointer text-center whitespace-nowrap ${activeTab === 'daily'
              ? 'text-emerald-750 border-b-2 border-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{labels.tabDailySales}</span>
          </button>

          {/* Tab 3: Add Customer */}
          <button
            onClick={() => setActiveTab('add')}
            className={`py-3 md:py-4 px-2 md:px-6 font-space font-black text-[11px] md:text-xs transition-all relative flex flex-1 flex-col md:flex-row items-center justify-center gap-1 md:gap-2 cursor-pointer text-center whitespace-nowrap ${activeTab === 'add'
              ? 'text-emerald-750 border-b-2 border-emerald-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{labels.tabAddCustomer}</span>
          </button>

        </div>

        {/* Dynamic Display Panels based on active selection */}
        <div className="p-6">

          {/* TAB 1: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">

              {/* Profile search & filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between"> <div className="relative w-full sm:max-w-md"> <Search className="absolute right-3 top-2.5 text-slate-400 w-4 h-4" /> <input
                type="text"
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-slate-50/50 text-slate-800 font-sans"
              /> </div> <div className="text-xs text-slate-400 font-medium">
                  Matches found: <span className="font-bold text-slate-700">{filteredProfiles.length} customers</span> </div> </div>

              {/* Grid of customer profile cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfiles.map(p => {
                  const balance = customerBalanceMap.get(p.id) ?? getCustomerCurrentBalance(p);
                  return (
                    <div
                      key={p.id}
                      className="border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-emerald-300 transition-all bg-white flex flex-col justify-between"
                    >
                      {/* Name & phone lines */}
                      <div> <div className="flex justify-between items-start gap-2"> <div className="text-left"> <h3
                        onClick={() => {
                          openSaleEntryDialog(p, true, false);
                        }}
                        className="font-black text-slate-800 text-sm hover:text-emerald-700 hover:underline cursor-pointer"
                        title="Click to view/edit entry details"
                      >
                        {p.customerName}
                      </h3> <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                          📍 {p.location || "N/A"}
                        </span> </div>

                        {/* Live Balance tag for customer */}
                        <div className={`text-left p-2.5 rounded-xl border font-mono ${balance > 0
                            ? 'bg-rose-50 border-rose-100 text-rose-800'
                            : balance < 0
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                              : 'bg-slate-50 border-slate-150 text-slate-500'
                          }`}> <span className="text-[8px] font-bold block uppercase pb-0.5 text-slate-400">Current Balance</span> <span className="text-xs font-black">{labels.pkr} {balance.toLocaleString()}</span> </div> </div>

                        {/* Contact details */}
                        <div className="mt-4 space-y-1.5 text-left border-t border-slate-100 pt-3 text-xs text-slate-500"> <p className="flex items-center space-x-1  "> <Smartphone className="w-3.5 h-3.5 text-slate-400" /> <span>{p.phoneNumber || "N/A"}</span> </p> <p className="flex items-center space-x-1  "> <User className="w-3.5 h-3.5 text-slate-400" /> <span>{labels.driver}: <strong className="text-slate-700 font-semibold">{p.driverName}</strong></span> </p>
                          {p.whatsappName && (
                            <p className="text-[11px] text-slate-600">
                              WhatsApp Name: <span className="font-bold text-slate-800">{p.whatsappName}</span> </p>
                          )}
                          {p.cnicNumber && (
                            <p className="text-[11px] text-slate-600">
                              CNIC: <span className="font-bold text-slate-800">{p.cnicNumber}</span> </p>
                          )}
                          {p.deliveryType && (
                            <span className="inline-block text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md mt-1">
                              {p.deliveryType}
                            </span>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            Base Opening Balance: <span className="font-bold font-mono text-slate-600">Rs. {p.openingBalance.toLocaleString()}</span> </p> </div> </div>

                      {/* Action buttons footer for profile card */}
                      <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100">
                        {/* New Quick Daily Entry */}
                        <button
                          onClick={() => openSaleEntryDialog(p, false, false)}
                          className="py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl text-[10px] font-black tracking-tight transition cursor-pointer flex items-center justify-center space-x-1 "
                        > <Plus className="w-3 h-3" /> <span>{labels.recordEntry}</span> </button>

                        {/* Audit Log / Details */}
                        <button
                          onClick={() => {
                            setSelectedProfileForDetails(p);
                            setShowDetailsModal(true);
                          }}
                          className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black tracking-tight transition cursor-pointer flex items-center justify-center space-x-1 "
                        > <Eye className="w-3 h-3" /> <span>{labels.details}</span> </button>

                        {/* WhatsApp Statement link */}
                        <a
                          href={`https://wa.me/${p.phoneNumber.replace(/\D/g, '') || ''}?text=${getWhatsAppProfileText(p, balance)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-[10px] font-black tracking-tight text-center transition flex items-center justify-center space-x-1  cursor-pointer"
                        > <MessageCircle className="w-3 h-3" /> <span>WhatsApp</span> </a>

                        {/* Delete Profile Button */}
                        {user?.role === 'Admin' && (
                          <button
                            onClick={() => handleDeleteCustomerProfile(p.id, p.customerName)}
                            className="py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-[10px] font-black tracking-tight transition cursor-pointer flex items-center justify-center space-x-1 "
                            title="Delete this customer profile and all associated ledger entries"
                          > <Trash2 className="w-3 h-3" /> <span>Delete</span> </button>
                        )} </div> </div>
                  );
                })}

                {filteredProfiles.length === 0 && (
                  <div className="col-span-full bg-slate-50 text-slate-500 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200"> <User className="w-12 h-12 text-slate-300 mx-auto mb-4" /> <p className="font-bold">{labels.noEntriesFound}</p> <p className="text-xs text-slate-400 mt-1">Add a new customer profile using the third navigation tab.</p> </div>
                )}
              </div> </div>
          )}

          {/* TAB 2: DAILY SALES & ENTRIES */}
          {activeTab === 'daily' && (
            <div className="space-y-6">

              {/* Daily View Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200"> <div className="flex items-center space-x-3 "> <Calendar className="w-5 h-5 text-emerald-600" /> <div className="text-left flex flex-col gap-2"> <h3 className="text-sm font-bold text-slate-800">{labels.dailySalesFor}</h3> <div className="flex flex-wrap items-center gap-2"> <select
                value={dailyDateFilter}
                onChange={(e) => setDailyDateFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-55"
              > <option value="TODAY">Active Date (Data Entry)</option> <option value="10D">Last 10 Days</option> <option value="15D">Last 15 Days</option> <option value="CUSTOM">Custom Range</option> </select>

                {dailyDateFilter === 'TODAY' && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-700 bg-emerald-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}

                {dailyDateFilter === 'CUSTOM' && (
                  <> <input
                    type="date"
                    value={dailyCustomStartDate}
                    onChange={(e) => setDailyCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-55"
                  /> <span className="text-xs font-bold text-slate-400">TO</span> <input
                      type="date"
                      value={dailyCustomEndDate}
                      onChange={(e) => setDailyCustomEndDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-350 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-55"
                    /> </>
                )}
              </div> </div> </div>

                {dailyDateFilter === 'TODAY' && (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 w-full lg:w-auto text-left"> <div className="bg-white p-3 border border-slate-150 rounded-xl"> <span className="text-[10px] text-slate-400 block font-bold">NET VOLUME</span> <span className="font-black font-mono text-slate-700 text-xs">{dailyTotalNetLiters.toFixed(2)} Qty</span> </div> <div className="bg-white p-3 border border-slate-150 rounded-xl"> <span className="text-[10px] text-slate-400 block font-bold">{labels.totalMilkSold} (NET)</span> <span className="font-black font-mono text-emerald-800 text-xs">{labels.pkr} {dailyTotalNetMilkSold.toLocaleString()}</span> </div> <div className="bg-white p-3 border border-slate-150 rounded-xl"> <span className="text-[10px] text-slate-400 block font-bold">{labels.cashReceived}</span> <span className="font-black font-mono text-teal-800 text-xs">{labels.pkr} {dailyTotalCashReceived.toLocaleString()}</span> </div> <div className="bg-white p-3 border border-slate-150 rounded-xl"> <span className="text-[10px] text-slate-400 block font-bold">{labels.advanceReceived}</span> <span className="font-black font-mono text-indigo-850 text-xs">{labels.pkr} {dailyTotalAdvance.toLocaleString()}</span> </div> <div className="bg-white p-3 border border-slate-150 rounded-xl"> <span className="text-[10px] text-slate-400 block font-bold">TOTAL ACCOUNTS</span> <span className="font-black font-mono text-slate-500 text-xs">{dailyTotalCustomers} profiles</span> </div> </div>
                )}
              </div>

              {/* Delivery Grid & Customer List */}
              <div>
                {dailyDateFilter === 'TODAY' ? (
                  <> <div className="flex justify-between flex-wrap items-center gap-3 mb-3"> <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider text-left">
                    {labels.entryStatus} ({selectedDate})
                  </h4>
                    <div className="block md:flex items-center space-x-2"> <button
                      onClick={handleDownloadDailyPDF}
                      className="flex w-full md:w-auto justify-center items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                      title="Download all entries for this active date as PDF report"
                    > <FileDown className="w-3.5 h-3.5" /> <span>Download Daily PDF</span> </button> <div className="flex mt-2 md:mt-0 items-center space-x-2 bg-white border border-slate-200 rounded-lg p-1"> <button
                      onClick={() => setShowOnlyEntered(false)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${!showOnlyEntered ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      All Customers
                    </button> <button
                      onClick={() => setShowOnlyEntered(true)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${showOnlyEntered ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                          Only Entered Today
                        </button> </div> </div>

                  </div> <div className="overflow-x-auto border border-slate-200 rounded-2xl"> <table className="w-full text-left text-xs text-slate-600"> <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-250"> <tr> <th className="px-4 py-3 text-left">Customer</th> <th className="px-4 py-3 text-center">Status</th> <th className="px-4 py-3 text-left">Previous Balance</th> <th className="px-4 py-3 text-left">Milk Sold (PKR)</th> <th className="px-4 py-3 text-left">Advance Received</th> <th className="px-4 py-3 text-left">Cash Paid</th> <th className="px-4 py-3 text-left font-black text-emerald-800">Remaining Balance</th> <th className="px-4 py-3 text-center w-40">Actions</th> </tr> </thead> <tbody className="divide-y divide-slate-100 bg-white">
                    {customerProfiles.map(p => {
                      // Find matching entry for this date
                      const nameKey = p.customerName.trim().toLowerCase();
                      const entry = activeDateEntries.find(
                        e => e.customerProfileId === p.id || e.customerName.trim().toLowerCase() === nameKey
                      );

                      if (showOnlyEntered && !entry) return null;

                      // Previous Outstanding auto-loads prior to the selection date. Read-only.
                      const prevBal = customerPrevBalanceMap.get(p.id) ?? getCustomerBalanceBeforeDate(p, selectedDate);

                      // Calculated remaining: Previous outstanding + Milk - Advance - Cash
                      const calculatedRem = entry
                        ? prevBal + entry.totalAmount - entry.advanceAmount - entry.paymentReceived
                        : prevBal;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          {/* Profile details */}
                          <td className="px-4 py-3.5 text-left font-bold text-slate-800 whitespace-nowrap"> <button
                            type="button"
                            onClick={() => {
                              if (entry) {
                                editSaleEntryDialog(p, entry, false);
                              } else {
                                openSaleEntryDialog(p, true, false);
                              }
                            }}
                            className="font-bold text-slate-800 hover:text-emerald-700 hover:underline cursor-pointer text-left block bg-transparent border-0 p-0 outline-none"
                            title="Click to view/edit entry details"
                          >
                            {p.customerName}
                          </button> <span className="text-[10px] text-slate-400 font-medium">📍 {p.location}</span> </td>

                          {/* Status tag */}
                          <td className="px-4 py-3.5 text-center">
                            {entry ? (
                              <span className="inline-flex items-center space-x-1  px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold text-[10px]"> <span>{labels.completed}</span> </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1  px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-bold text-[10px]"> <span>⏳</span> <span>{labels.pending}</span> </span>
                            )}
                          </td>

                          {/* Previous Balance */}
                          <td className="px-4 py-3.5 font-mono text-slate-500 text-left">
                            Rs. {prevBal.toLocaleString()}
                          </td>

                          {/* Milk PKR Cost */}
                          <td className="px-4 py-3.5 font-mono text-slate-800 font-bold text-left text-xs">
                            {entry ? `Rs. ${entry.totalAmount.toLocaleString()}` : '—'}
                          </td>

                          {/* Advance amount */}
                          <td className="px-4 py-3.5 font-mono text-indigo-700 text-left">
                            {entry && entry.advanceAmount > 0 ? `- Rs. ${entry.advanceAmount.toLocaleString()}` : '—'}
                          </td>

                          {/* Cash Net Paid */}
                          <td className="px-4 py-3.5 font-mono text-emerald-700 text-left">
                            {entry && entry.paymentReceived > 0 ? `- Rs. ${entry.paymentReceived.toLocaleString()}` : '—'}
                          </td>

                          {/* Remaining Balance calculated sequentially */}
                          <td className="px-4 py-3.5 font-mono text-left"> <span className={`px-2 py-1 rounded text-xs font-black select-none ${calculatedRem > 0
                              ? 'bg-rose-50 border border-rose-100 text-rose-700'
                              : calculatedRem < 0
                                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                                : 'bg-slate-150 text-slate-500'
                            }`}>
                            Rs. {calculatedRem.toLocaleString()}
                          </span> </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap"> <div className="flex items-center justify-center gap-1.5"> <button
                            onClick={() => {
                              if (entry) {
                                editSaleEntryDialog(p, entry, false);
                              } else {
                                openSaleEntryDialog(p, false, false);
                              }
                            }}
                            className={`px-3 py-1.5 font-bold text-[11px] rounded transition cursor-pointer flex items-center gap-1 leading-none ${entry
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              }`}
                          >
                            {entry ? (
                              <> <Edit2 className="w-3 h-3" /> <span>{labels.editEntry}</span> </>
                            ) : (
                              <> <Plus className="w-3 h-3" /> <span>{labels.recordEntry}</span> </>
                            )}
                          </button>

                            {entry && (
                              <>
                                {user?.role === 'Admin' && (
                                  <button
                                    onClick={() => handleDeleteSale(entry.id)}
                                    className="p-1.5 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition border border-slate-100 hover:border-rose-100"
                                    title="Delete entries list log for today"
                                  > <Trash2 className="w-3.5 h-3.5" /> </button>
                                )}
                                <a
                                  href={`https://wa.me/${p.phoneNumber.replace(/\D/g, '')}?text=${getWhatsAppMessageText(entry)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer transition border border-emerald-100"
                                  title="Dispatch individual bill receipt"
                                > <MessageCircle className="w-3.5 h-3.5" /> </a> </>
                            )}
                          </div> </td> </tr>
                      );
                    })}
                  </tbody> </table> </div> </>
                ) : (
                  <> <div className="flex justify-between flex-wrap items-center mb-3"> <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider text-left">
                    Filtered Entries Report (PDF Extractor)
                  </h4> <button
                    onClick={() => {
                      const cols = [
                        { header: 'Date', dataKey: 'date' },
                        { header: 'Time', dataKey: 'time' },
                        { header: 'Customer Name', dataKey: 'customerName' },
                        { header: 'Qty', dataKey: 'milkQtyStr' },
                        { header: 'Milk Value (+Rs.)', dataKey: 'totalAmount' },
                        { header: 'Advance (-Rs.)', dataKey: 'advanceAmount' },
                        { header: 'Cash Net (-Rs.)', dataKey: 'paymentReceived' }
                      ];
                      const enrichedList = filteredDailyEntriesFlat.map(e => ({
                        ...e,
                        milkQtyStr: e.milkLiter > 0 ? `${e.milkLiter} ${e.milkUnit || 'Liters'}` : '-'
                      }));
                      downloadTransactionsPDF('Sales History Report', cols, enrichedList, 'sales_report');
                    }}
                    className="flex flex-row items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  > <FileDown className="w-4 h-4" />
                      Download PDF Data
                    </button> </div> <div className="overflow-x-auto border border-slate-200 rounded-2xl"> <table className="w-full text-left text-xs text-slate-600"> <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-250"> <tr> <th className="px-4 py-3 text-left">Date & Time</th> <th className="px-4 py-3 text-left">Customer</th> <th className="px-4 py-3 text-left">Milk Value</th> <th className="px-4 py-3 text-left">Advance Deduct</th> <th className="px-4 py-3 text-left">Cash Net Paid</th> </tr> </thead> <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredDailyEntriesFlat.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition"> <td className="px-4 py-3"> <span className="font-bold text-slate-700 block">{item.date}</span> <span className="text-[10px] text-slate-400 font-mono">{item.time}</span> </td> <td className="px-4 py-3 font-bold"> <button
                          type="button"
                          onClick={() => {
                            const prof = customerProfiles.find(s =>
                              (s.id === item.customerProfileId) ||
                              (s.customerName.trim().toLowerCase() === (item.customerName || '').trim().toLowerCase())
                            );
                            if (prof) {
                              editSaleEntryDialog(prof, item, false);
                            }
                          }}
                          className="text-left font-bold text-emerald-800 hover:text-emerald-600 hover:underline cursor-pointer bg-transparent border-0 p-0 outline-none"
                          title="Click to open daily entry"
                        >
                          {item.customerName}
                        </button> </td> <td className="px-4 py-3 font-mono text-slate-800"> <div> <span className="font-bold block">+Rs.{item.totalAmount.toLocaleString()}</span>
                          {item.milkLiter > 0 && (
                            <span className="text-[10px] text-slate-500 block">
                              {item.milkLiter} {item.milkUnit || 'Liters'} {item.rate > 0 ? `@ Rs.${item.rate}` : ''}
                            </span>
                          )}
                          {(item.fat !== undefined || item.lr !== undefined || item.totalTs !== undefined) && (
                            <span className="text-[9px] bg-slate-50 text-slate-550 border border-slate-100 rounded px-1 py-0.5 inline-block mt-0.5">
                              Fat: {item.fat?.toFixed(1)}% | LR: {item.lr?.toFixed(0)} | TS: {item.totalTs?.toFixed(2)}
                            </span>
                          )}
                        </div> </td> <td className="px-4 py-3 font-mono text-indigo-700">-Rs.{item.advanceAmount.toLocaleString()}</td> <td className="px-4 py-3"> <span className="font-mono text-emerald-700 font-bold block">-Rs.{item.paymentReceived.toLocaleString()}</span>
                            {item.paymentType && (
                              <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-550 border border-slate-200 rounded px-1.5 py-0.5 inline-block mt-0.5">
                                {item.paymentType} {item.bankName && item.bankName !== 'None' ? `(${item.bankName})` : ''}
                              </span>
                            )}
                          </td> </tr>
                      ))}
                      {filteredDailyEntriesFlat.length === 0 && (
                        <tr> <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">
                          No entries found for this chronological scope.
                        </td> </tr>
                      )}
                    </tbody> </table> </div> </>
                )}
              </div> </div>
          )}

          {/* TAB 3: REGISTER NEW CUSTOMER PROFILE */}
          {activeTab === 'add' && (
            <div className="max-w-2xl mx-auto py-4 text-left"> <div className="mb-6"> <h3 className="text-lg font-black text-slate-800">{labels.addNewBuyer}</h3> <p className="text-xs text-slate-500 mt-1">Specify full physical address parameters and persistent outstanding bills.</p> </div> <form onSubmit={handleAddCustomer} className="space-y-4"> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">{labels.customerName}</label> <input
              type="text"
              required
              placeholder={labels.namePlaceholder}
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-700 bg-white"
            /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">{labels.phoneNumber}</label> <input
              type="text"
              required
              placeholder={labels.phonePlaceholder}
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 bg-white"
            /> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">{labels.openingBalance}</label> <input
              type="number"
              required
              placeholder={labels.openingPlaceholder}
              value={addOpeningBalance}
              onChange={(e) => setAddOpeningBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 font-mono font-bold bg-white"
            /> </div> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">{labels.location}</label> <input
              type="text"
              placeholder={labels.locationPlaceholder}
              value={addLocation}
              onChange={(e) => setAddLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 bg-white"
            /> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">{labels.driver}</label> <select
              value={addDriverId}
              onChange={(e) => setAddDriverId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 bg-white"
            > <option value="DIRECT">{labels.directWalkin}</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select> </div> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3"> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">WhatsApp Name</label> <input
              type="text"
              placeholder="e.g. Imran WhatsApp"
              value={addWhatsappName}
              onChange={(e) => setAddWhatsappName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 bg-white"
            /> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">CNIC Name/Number (Optional)</label> <input
              type="text"
              placeholder="e.g. 35202-xxxxx-x"
              value={addCnic}
              onChange={(e) => setAddCnic(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 bg-white"
            /> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5">Delivery Type Relation</label> <select
              value={addDeliveryType}
              onChange={(e) => setAddDeliveryType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-705 bg-white"
            > <option value="Direct Self">Direct Self</option> <option value="Driver Delivery">Driver Delivery</option> <option value="Other">Other</option> </select> </div> </div> <div className="pt-4 text-left"> <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-extrabold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer inline-flex"
            > <Save className="w-4 h-4" /> <span>{labels.saveProfile}</span> </button> </div> </form> </div>
          )}

        </div> </div>

      {/* RECORD SALE ENTRY / MODAL SHEET */}
      {showEntryModal && activeProfileForEntry && (() => {
        // Dynamic automatic loading of PREVIOUS remaining balance (strictly read-only)
        const prevBal = customerBalanceMap.get(activeProfileForEntry.id) ?? getCustomerCurrentBalance(activeProfileForEntry);

        const milkValue = Number(entryMilkPKR) || 0;
        const advanceValue = Number(entryAdvance) || 0;
        const cashValue = Number(entryCashPaid) || 0;
        const discountValue = Number(entryDiscount) || 0;
        let spoiledValue = 0;
        if (entryIsSpoiled) {
          if (spoiledLiters && spoiledRate) {
            spoiledValue = Number(spoiledLiters) * Number(spoiledRate);
          } else {
            spoiledValue = Number(entrySpoiledAmount) || 0;
          }
        }
        const actualMilkAddedToBalance = milkValue - discountValue - spoiledValue;

        // Auto-calculating formula preview
        const calculatedRemaining = prevBal + actualMilkAddedToBalance - advanceValue - cashValue;

        // HISTORY PREVIEW DATA
        const recentHistory = getCustomerTransactionsTimeline(activeProfileForEntry).slice(0, 3);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[300] p-4 animate-fade-in text-left"> <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">

            {/* Modal Banner Header */}
            <div className="p-5.5 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex justify-between items-center"> <div className="text-left"> <h3 className="font-black text-white text-base leading-tight">
              {labels.modalSaleTitle} — {activeProfileForEntry.customerName}
            </h3> <p className="text-[10px] text-emerald-200 mt-0.5">Physical location: {activeProfileForEntry.location}</p> </div> <button
              onClick={() => setShowEntryModal(false)}
              className="p-1 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition cursor-pointer"
            >
                ✕ Close
              </button> </div>

            {/* Form entries details block */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* HISTORY PREVIEW SECTION */}
              {showHistoryInModal && recentHistory.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-2"> <h5 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1"> <Clock className="w-3 h-3" /> Recent History Preview
                </h5> <div className="space-y-1.5">
                    {recentHistory.map((h: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] font-medium border-b border-blue-50 pb-1 last:border-0 last:pb-0"> <div className="flex gap-2"> <span className="text-slate-500">{h.date}</span> <span className="text-slate-800 font-bold">{h.milkLiter ? `${h.milkLiter.toFixed(1)}L` : 'PKR'}</span> </div> <div className="flex gap-3 font-mono"> <span className="text-rose-700">Net: Rs.{h.paymentReceived}</span> <span className="text-indigo-700">Adv: Rs.{h.advanceAmount}</span> </div> </div>
                    ))}
                  </div> </div>
              )}

              {/* Previous Remaining Outstanding Area. Read-only lockout */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left flex justify-between items-center"> <div className="w-7 text-left">
                🔒
              </div> <div> <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block font-sans">
                {labels.previousBalance}
              </span> <span className="text-md font-extrabold font-mono text-slate-700 block mt-0.5">
                    Rs. {prevBal.toLocaleString()}
                  </span> <span className="text-[9px] text-slate-400 italic font-sans">Auto-loaded from real chronological history</span> </div> </div>



              {/* Input Fields */}
              <div className="space-y-3">

                {/* Date Input */}
                <div> <label className="block text-xs font-bold text-slate-600 mb-1">{labels.date}</label> <input
                  type="date"
                  disabled={isEntryReadOnly}
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                /> </div>

                {/* Milk & Quality Parameters Section (Editable & Calculated in Real Time) */}
                <div className="border border-emerald-150 bg-emerald-50/15 p-4 rounded-xl space-y-3.5 text-left"> <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">Milk & Quality Parameters</span> <div className="grid grid-cols-2 gap-3"> <div> <div className="flex justify-between items-center mb-1"> <label className="block text-[10px] text-slate-500 font-bold uppercase">{labels.liters} ({milkUnit})</label>
                  {!isEntryReadOnly && (
                    <div className="flex gap-2 text-[9px] font-bold"> <label className="text-slate-600 flex items-center gap-0.5 cursor-pointer"> <input
                      type="radio"
                      checked={milkUnit === 'Liters'}
                      onChange={() => setMilkUnit('Liters')}
                      className="w-2.5 h-2.5"
                    /> L
                    </label> <label className="text-slate-600 flex items-center gap-0.5 cursor-pointer"> <input
                      type="radio"
                      checked={milkUnit === 'Kg'}
                      onChange={() => setMilkUnit('Kg')}
                      className="w-2.5 h-2.5"
                    /> Kg
                      </label> </div>
                  )}
                </div> <input
                    type="number"
                    step="0.01"
                    disabled={isEntryReadOnly}
                    placeholder={milkUnit}
                    value={calcLiters}
                    onChange={(e) => setCalcLiters(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                  /> </div> <div> <label className="block text-[10px] text-slate-500 font-bold mb-1">{labels.rate} (Rs.)</label> <input
                    type="number"
                    step="0.1"
                    disabled={isEntryReadOnly}
                    placeholder="Rate"
                    value={calcRate}
                    onChange={(e) => setCalcRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                  /> </div> </div> <div className="grid grid-cols-2 gap-3"> <div> <label className="block text-[10px] text-slate-550 font-bold mb-1">Fat %</label> <input
                    type="number"
                    step="0.1"
                    disabled={isEntryReadOnly}
                    placeholder="e.g. 6.5"
                    value={entryFat !== undefined ? entryFat : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntryFat(val !== '' ? Number(val) : undefined);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                  /> </div> <div> <label className="block text-[10px] text-slate-550 font-bold mb-1">LR (Lal)</label> <input
                    type="number"
                    step="0.5"
                    disabled={isEntryReadOnly}
                    placeholder="e.g. 28"
                    value={entryLr !== undefined ? entryLr : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntryLr(val !== '' ? Number(val) : undefined);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:ring-1 focus:ring-emerald-500 outline-none"
                  /> </div> </div>

                  {/* Calculated Chemistry Parameters Readout - Always show if Quantity, Rate, Fat, LR are present */}
                  <div className="bg-emerald-50/50 rounded-xl p-2.5 space-y-1.5 text-[11px] border border-emerald-100"> <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 font-semibold text-slate-700"> <div> <span className="text-slate-500 font-medium">SNF %:</span>{' '}
                    <span className="font-mono font-bold text-emerald-800">
                      {entryFat !== undefined && entryLr !== undefined
                        ? (((0.25 * (entryLr || 0)) + (0.22 * (entryFat || 0)) + 0.72) || 0).toFixed(2) + '%'
                        : '—'
                      }
                    </span> </div> <div> <span className="text-slate-500 font-medium">Total TDS (TS %):</span>{' '}
                      <span className="font-mono font-bold text-indigo-900">
                        {entryFat !== undefined && entryLr !== undefined
                          ? (((entryFat || 0) + ((0.25 * (entryLr || 0)) + (0.22 * (entryFat || 0)) + 0.72)) || 0).toFixed(2) + '%'
                          : '—'
                        }
                      </span> </div> <div className="col-span-2 pt-1 border-t border-emerald-100/40 flex justify-between items-center text-xs"> <span className="text-slate-600 font-bold">Total Milk Value:</span> <span className="text-emerald-800 font-bold font-mono text-emerald-700">
                        Rs. {Number(entryMilkPKR || 0).toLocaleString()}
                      </span> </div> </div> </div>

                  {/* Manual Override for Total Milk Value if they want to override the formula */}
                  <div className="pt-1"> <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Total Milk Value Manual Override (PKR)</label> <input
                    type="number"
                    disabled={isEntryReadOnly}
                    placeholder="Automatic: Qty * Rate"
                    value={entryMilkPKR}
                    onChange={(e) => setEntryMilkPKR(e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-mono bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                  /> </div> </div>

                {/* Discount & Spillage segment as requested */}
                <div className="border border-red-100 bg-red-50/20 p-3 rounded-xl space-y-2"> <label className="block text-xs font-bold text-red-800">Discount & Spoilage Options</label> <div className="flex items-center justify-between gap-2"> <div className="flex-1"> <span className="text-[10px] text-slate-500 font-bold block uppercase pb-1">Customer Discount (Rs.)</span> <div className="relative"> <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={entryDiscount}
                  onChange={(e) => setEntryDiscount(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold focus:ring-2 focus:ring-red-300 outline-none"
                /> <button
                  type="button"
                  onClick={() => setEntryDiscount('500')}
                  className="absolute right-1 top-1 bottom-1 px-2 py-0 text-[10px] bg-red-600 text-white rounded font-bold hover:bg-red-700 focus:outline-none transition-colors"
                >
                    Apply 500
                  </button> </div> </div> <div className="flex-1 flex flex-col justify-end"> <span className="text-[10px] text-slate-500 font-bold block uppercase pb-1">Spoilt Milk Status</span> <label className="flex items-center gap-2 h-8 bg-white border border-slate-300 rounded-lg px-2.5 cursor-pointer hover:bg-slate-50 select-none"> <input
                    type="checkbox"
                    checked={entryIsSpoiled}
                    onChange={(e) => {
                      setEntryIsSpoiled(e.target.checked);
                      if (!e.target.checked) {
                        setEntrySpoiledAmount('');
                        setSpoiledLiters('');
                        setSpoiledRate('');
                        setSpoiledFat('');
                        setSpoiledLr('');
                        setSpoiledSnf(undefined);
                        setSpoiledTs(undefined);
                      }
                    }}
                    className="rounded border-slate-300 focus:ring-red-500 w-3.5 h-3.5"
                  /> <span className="text-[11px] font-bold uppercase tracking-tight">Milk Spoiled</span> </label> </div> </div>

                  {entryIsSpoiled && (
                    <div className="animate-fadeIn mt-1 p-2 bg-white border border-red-200 rounded-xl space-y-3"> <div className="flex justify-between items-center"> <span className="text-[10px] font-black uppercase text-red-700 tracking-wider block">Spoiled Milk Calculator</span> <div className="flex gap-3"> <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer"> <input type="radio" checked={spoiledUnit === 'Liters'} onChange={() => setSpoiledUnit('Liters')} /> Liters
                    </label> <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer"> <input type="radio" checked={spoiledUnit === 'Kg'} onChange={() => setSpoiledUnit('Kg')} /> Kg
                      </label> </div> </div> <div className="grid grid-cols-2 gap-2"> <div> <label className="block text-[9px] font-bold text-slate-500 uppercase">Milk {spoiledUnit} *</label> <input
                        type="number"
                        step="0.01"
                        placeholder={spoiledUnit}
                        value={spoiledLiters}
                        onChange={(e) => setSpoiledLiters(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-400 outline-none font-mono"
                      /> </div> <div> <label className="block text-[9px] font-bold text-slate-500 uppercase">Milk Rate *</label> <input
                        type="number"
                        step="0.1"
                        placeholder="Rate"
                        value={spoiledRate}
                        onChange={(e) => setSpoiledRate(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-400 outline-none font-mono"
                      /> </div> </div>

                      {spoiledUnit === 'Liters' && (
                        <div className="grid grid-cols-2 gap-2"> <div> <label className="block text-[9px] font-bold text-slate-500 uppercase">Fat (%)</label> <input
                          type="number"
                          step="0.1"
                          placeholder="Fat"
                          value={spoiledFat}
                          onChange={(e) => setSpoiledFat(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-400 outline-none font-mono"
                        /> </div> <div> <label className="block text-[9px] font-bold text-slate-500 uppercase">Lal (LR)</label> <input
                          type="number"
                          step="0.5"
                          placeholder="Lal (LR)"
                          value={spoiledLr}
                          onChange={(e) => setSpoiledLr(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-400 outline-none font-mono"
                        /> </div> </div>
                      )}

                      {spoiledUnit === 'Liters' && spoiledSnf !== undefined && spoiledTs !== undefined && (
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded border border-slate-200 text-[10px] font-mono text-slate-600"> <div>SNF: <b className="text-slate-800">{spoiledSnf.toFixed(2)}%</b></div> <div>Total TS: <b className="text-slate-800">{spoiledTs.toFixed(2)}</b></div> </div>
                      )}

                      <div className="space-y-1"> <label className="block text-[10px] font-bold text-red-700">Deducted Spoiled Amt (Rs.)</label> <input
                        type="number"
                        placeholder="e.g. 5000"
                        value={entrySpoiledAmount}
                        onChange={(e) => setEntrySpoiledAmount(e.target.value)}
                        className="w-full px-3 py-1.5 border border-red-300 rounded text-xs bg-white text-red-700 font-mono font-bold focus:ring-2 focus:ring-red-200 outline-none"
                      /> <p className="text-[9px] text-slate-550">
                          Value deducted from total amount and added as expense: <b className="font-mono">Rs. {Number(entrySpoiledAmount) || 0}</b> </p> </div> </div>
                  )}
                </div>

                {/* Dynamic sub totals fields */}
                <div className="grid grid-cols-2 gap-3"> <div> <label className="block text-xs font-bold text-slate-600 mb-1">{labels.advanceReceivedField}</label> <input
                  type="number"
                  disabled={isEntryReadOnly}
                  placeholder="e.g. 5000"
                  value={entryAdvance}
                  onChange={(e) => setEntryAdvance(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-710 bg-white font-mono disabled:bg-slate-50 disabled:text-slate-400"
                /> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1">{labels.cashReceivedField}</label> <input
                  type="number"
                  disabled={isEntryReadOnly}
                  placeholder="e.g. 15000"
                  value={entryCashPaid}
                  onChange={(e) => setEntryCashPaid(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-710 bg-white font-mono disabled:bg-slate-50 disabled:text-slate-400"
                /> </div> </div>

                {/* Payment Type selection */}
                <div className="grid grid-cols-2 gap-3 border border-slate-100 p-3 bg-slate-50/50 rounded-xl"> <div> <label className="block text-xs font-bold text-slate-700 mb-1">Payment Type</label> <select
                  value={entryPaymentType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEntryPaymentType(val);
                    if (val !== 'Bank Transfer') {
                      setEntryBankName('None');
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                > <option value="Cash">Cash</option> <option value="Bank Transfer">Bank Transfer</option> <option value="JazzCash">JazzCash</option> <option value="EasyPaisa">EasyPaisa</option> </select> </div>
                  {entryPaymentType === 'Bank Transfer' ? (
                    <div> <label className="block text-xs font-bold text-slate-700 mb-1">Select Bank</label> <select
                      value={entryBankName}
                      onChange={(e) => setEntryBankName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    > <option value="HBL">HBL</option> <option value="UBL">UBL</option> <option value="Meezan Bank">Meezan Bank</option> <option value="Allied Bank">Allied Bank</option> <option value="Bank Alfalah">Bank Alfalah</option> <option value="NBP">NBP</option> </select> </div>
                  ) : (
                    <div className="flex flex-col justify-center"> <span className="text-[10px] text-slate-400 font-bold uppercase">Wallet / Direct</span> <span className="text-xs text-slate-600 font-bold italic mt-1">Direct Outflow Route</span> </div>
                  )}
                </div>

                {/* Notes / description */}
                <div> <label className="block text-xs font-bold text-slate-600 mb-1">{labels.notes}</label> <input
                  type="text"
                  placeholder={labels.notesPlaceholder}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-slate-700 bg-white"
                /> </div> </div>

              {/* Real-time Dynamic Math Preview Indicator (Protected) */}
              <div className="bg-emerald-50/70 border border-emerald-250 p-4.5 rounded-2xl text-center space-y-1 mt-2"> <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-widest block font-sans">
                {labels.previewNewBalance}
              </span> <div className="text-xl font-black font-mono text-emerald-950">
                  Rs. {Math.abs(calculatedRemaining).toLocaleString()}
                </div>
                {calculatedRemaining !== 0 && (
                  <div className={`text-[13px] font-black urdu-text tracking-wide ${calculatedRemaining > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {calculatedRemaining > 0 ? "آپ نے پیسے لینے ہیں" : "آپ نے پیسے دینے ہیں"}
                  </div>
                )}
                <p className="text-[9px] text-emerald-700 italic block font-sans">
                  {labels.formulaNote}
                </p> </div> </div>

            {/* Action buttons footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-2.5"> <button
              type="button"
              onClick={() => setShowEntryModal(false)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold cursor-pointer font-sans"
            >
              {labels.close}
            </button> <div className="flex items-center gap-2">
                {isEntryReadOnly ? (
                  <button
                    type="button"
                    onClick={() => setIsEntryReadOnly(false)}
                    className="px-6 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 shadow-sm font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-sans"
                  > <Edit2 className="w-4 h-4" /> <span>Edit This Entry</span> </button>
                ) : (
                  editingEntryId !== null && user?.role !== 'Admin' && !isAutoImported ? (
                    <a
                      href={`https://wa.me/${activeProfileForEntry.phoneNumber.replace(/\D/g, '') || ''}?text=${getWhatsAppMessageText({
                        id: editingEntryId || '',
                        customerProfileId: activeProfileForEntry.id,
                        customerName: activeProfileForEntry.customerName,
                        date: entryDate,
                        time: '',
                        phoneNumber: activeProfileForEntry.phoneNumber,
                        milkUnit: milkUnit,
                        milkLiter: Number(calcLiters) || 0,
                        rate: Number(calcRate) || 0,
                        totalAmount: Number(entryMilkPKR) || 0,
                        advanceAmount: Number(entryAdvance) || 0,
                        paymentReceived: Number(entryCashPaid) || 0,
                        remainingBalance: calculatedRemaining,
                        notes: entryNotes,
                        isManual: true,
                        driverId: activeProfileForEntry.driverId,
                        driverName: activeProfileForEntry.driverName,
                        paymentType: entryPaymentType
                      })}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-sans"
                    > <MessageCircle className="w-4 h-4" /> <span>Share on WhatsApp</span> </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveSaleEntry}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-750 text-white shadow-md font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-sans"
                    > <Save className="w-4.5 h-4.5" /> <span>{labels.saveTransaction}</span> </button>
                  )
                )}
              </div> </div> </div> </div>
        );
      })()}

      {/* LEDGER ACTIVITY / DETAILS MODAL SHEET */}
      {showDetailsModal && selectedProfileForDetails && (() => {
        const profile = selectedProfileForDetails;
        const timeline = getCustomerTransactionsTimeline(profile);
        const currentBalance = getCustomerCurrentBalance(profile);

        // Filtering timeline by selected range
        let displayTimeline = [...timeline];
        const today = new Date();

        if (detailsDateFilter === '1D') {
          const dateStr = today.toISOString().split('T')[0];
          displayTimeline = timeline.filter(t => t.date === dateStr);
        } else if (detailsDateFilter === '5D') {
          const start = new Date();
          start.setDate(today.getDate() - 4);
          const startStr = start.toISOString().split('T')[0];
          displayTimeline = timeline.filter(t => t.date >= startStr);
        } else if (detailsDateFilter === '7D') {
          const start = new Date();
          start.setDate(today.getDate() - 6);
          const startStr = start.toISOString().split('T')[0];
          displayTimeline = timeline.filter(t => t.date >= startStr);
        } else if (detailsDateFilter === '1M') {
          const start = new Date();
          start.setMonth(today.getMonth() - 1);
          const startStr = start.toISOString().split('T')[0];
          displayTimeline = timeline.filter(t => t.date >= startStr);
        } else if (detailsDateFilter === 'CUSTOM') {
          if (detailsCustomStartDate) displayTimeline = displayTimeline.filter(t => t.date >= detailsCustomStartDate);
          if (detailsCustomEndDate) displayTimeline = displayTimeline.filter(t => t.date <= detailsCustomEndDate);
        }

        // Compute Totals for displayTimeline
        const totalMilk = displayTimeline.reduce((acc, t) => acc + t.totalAmount, 0);
        const totalAdvance = displayTimeline.reduce((acc, t) => acc + t.advanceAmount, 0);
        const totalCash = displayTimeline.reduce((acc, t) => acc + t.paymentReceived, 0);
        const totalSpoiled = displayTimeline.reduce((acc, t) => acc + (t.spoiledAmount || 0), 0);
        const totalDiscount = displayTimeline.reduce((acc, t) => acc + (t.discountAmount || 0), 0);

        const totalMilkLiter = displayTimeline.reduce((acc, t) => acc + (t.milkLiter || 0), 0);
        const validFatList = displayTimeline.filter(t => t.fat);
        const avgFat = validFatList.length ? validFatList.reduce((acc, t) => acc + Number(t.fat), 0) / validFatList.length : 0;
        const validLrList = displayTimeline.filter(t => t.lr);
        const avgLr = validLrList.length ? validLrList.reduce((acc, t) => acc + Number(t.lr), 0) / validLrList.length : 0;
        const validSnfList = displayTimeline.filter(t => t.snf);
        const avgSnf = validSnfList.length ? validSnfList.reduce((acc, t) => acc + Number(t.snf), 0) / validSnfList.length : 0;
        const validTsList = displayTimeline.filter(t => t.totalTs);
        const avgTs = validTsList.length ? validTsList.reduce((acc, t) => acc + Number(t.totalTs), 0) / validTsList.length : 0;

        return (
          /* Backdrop: Mobile wrapper ko overlay scrollable kiya */
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start md:items-center justify-center z-[300] p-2 md:p-4 overflow-y-auto animate-fade-in text-left">

            {/* Main Sheet Card */}
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-4 md:my-0 max-h-[92vh] md:h-[85vh] flex flex-col border border-slate-200 overflow-hidden">

              {/* Header Section */}
              <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <div className="text-left">
                  <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-emerald-600" />
                    <span>{profile.customerName} Ledger Sheet</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">📍 {profile.location} • WhatsApp: {profile.phoneNumber || 'N/A'}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition cursor-pointer flex-shrink-0"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Inner Scrollable Wrapper Container */}
              <div className="flex-1 overflow-y-auto">

                {/* Sub-Header / Summary Stats Area */}
                <div className="p-4 md:p-6 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-6 gap-3 bg-white">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-left">
                    <span className="text-[10px] text-emerald-600 font-bold block mb-1">CURRENT OUTSTANDING</span>
                    <span className="text-base md:text-lg font-black text-emerald-900 font-mono">Rs. {currentBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">PERIOD MILK AMOUNT</span>
                    <span className="text-sm md:text-base font-bold text-slate-800 font-mono">Rs. {totalMilk.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-left">
                    <span className="text-[10px] text-indigo-600 font-bold block mb-1">PERIOD ADVANCES</span>
                    <span className="text-sm md:text-base font-bold text-indigo-900 font-mono">Rs. {totalAdvance.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-left">
                    <span className="text-[10px] text-teal-600 font-bold block mb-1">PERIOD CASH PAID</span>
                    <span className="text-sm md:text-base font-bold text-teal-900 font-mono">Rs. {totalCash.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-left">
                    <span className="text-[10px] text-amber-605 font-bold block mb-1">PERIOD DISCOUNTS</span>
                    <span className="text-sm md:text-base font-bold text-amber-900 font-mono">Rs. {totalDiscount.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-left">
                    <span className="text-[10px] text-rose-600 font-bold block mb-1">PERIOD SPOILED</span>
                    <span className="text-sm md:text-base font-bold text-rose-900 font-mono">Rs. {totalSpoiled.toLocaleString()}</span>
                  </div>
                </div>

                {/* Average Parameters Grid */}
                <div className="px-4 md:px-6 py-3 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/50">
                  <div className="flex flex-col"> <span className="text-[9px] text-slate-500 font-bold uppercase">Total Qty</span> <span className="text-sm font-black text-slate-800 font-mono">{totalMilkLiter.toLocaleString()}</span> </div>
                  <div className="flex flex-col"> <span className="text-[9px] text-slate-500 font-bold uppercase">Avg Fat</span> <span className="text-sm font-black text-slate-800 font-mono">{avgFat.toFixed(2)}%</span> </div>
                  <div className="flex flex-col"> <span className="text-[9px] text-slate-500 font-bold uppercase">Avg LR</span> <span className="text-sm font-black text-slate-800 font-mono">{avgLr.toFixed(2)}</span> </div>
                  <div className="flex flex-col"> <span className="text-[9px] text-slate-500 font-bold uppercase">Avg SNF</span> <span className="text-sm font-black text-slate-800 font-mono">{avgSnf.toFixed(2)}%</span> </div>
                  <div className="flex flex-col"> <span className="text-[9px] text-slate-500 font-bold uppercase">Avg TS</span> <span className="text-sm font-black text-slate-800 font-mono">{avgTs.toFixed(2)}</span> </div>
                </div>

                {/* Filters and Actions Bar */}
                <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 mr-1" />
                    {[
                      { l: '1D', v: '1D' },
                      { l: '5D', v: '5D' },
                      { l: '7D', v: '7D' },
                      { l: '1M', v: '1M' },
                      { l: 'CUSTOM', v: 'CUSTOM' },
                      { l: 'ALL TIME', v: 'ALL' }
                    ].map(f => (
                      <button
                        key={f.v}
                        onClick={() => setDetailsDateFilter(f.v as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border cursor-pointer ${detailsDateFilter === f.v
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        {f.l}
                      </button>
                    ))}

                    {detailsDateFilter === 'CUSTOM' && (
                      <div className="flex items-center gap-2 ml-0 sm:ml-2 mt-2 sm:mt-0">
                        <input
                          type="date"
                          value={detailsCustomStartDate}
                          onChange={e => setDetailsCustomStartDate(e.target.value)}
                          className="text-[11px] p-1 border rounded bg-white font-bold"
                        />
                        <span className="text-[10px] font-bold">TO</span>
                        <input
                          type="date"
                          value={detailsCustomEndDate}
                          onChange={e => setDetailsCustomEndDate(e.target.value)}
                          className="text-[11px] p-1 border rounded bg-white font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                    <button
                      onClick={() => {
                        const cols = [
                          { header: 'Date', dataKey: 'date' },
                          { header: 'Qty', dataKey: 'milkLiter' },
                          { header: 'Fat', dataKey: 'fat' },
                          { header: 'LR', dataKey: 'lr' },
                          { header: 'SNF', dataKey: 'snf' },
                          { header: 'TS %', dataKey: 'tsPercent' },
                          { header: 'Tot. TS', dataKey: 'totalTs' },
                          { header: 'Amount', dataKey: 'totalAmount' },
                          { header: 'Discount', dataKey: 'discountAmount' },
                          { header: 'Spoiled', dataKey: 'spoiled' },
                          { header: 'Advance', dataKey: 'advanceAmount' },
                          { header: 'Paid', dataKey: 'paymentReceived' },
                          { header: 'Balance', dataKey: 'remainingBalanceState' }
                        ];
                        const pdfRows = displayTimeline.map(t => ({
                          date: t.date,
                          milkLiter: t.milkLiter ? `${t.milkLiter} ${t.milkUnit === 'Kg' ? 'Kg' : 'L'}` : '-',
                          fat: t.fat ? `${t.fat}%` : '-',
                          lr: t.lr ? `${t.lr}` : '-',
                          snf: t.snf ? `${t.snf.toFixed(2)}%` : '-',
                          tsPercent: t.fat && t.snf ? `${(t.fat + t.snf).toFixed(2)}%` : '-',
                          totalTs: t.totalTs ? t.totalTs.toFixed(2) : '-',
                          totalAmount: `Rs. ${t.totalAmount}`,
                          discountAmount: t.discountAmount ? `- Rs. ${t.discountAmount}` : '-',
                          spoiled: t.spoiledAmount ? `Rs. ${t.spoiledAmount}` : '-',
                          advanceAmount: `- Rs. ${t.advanceAmount}`,
                          paymentReceived: `- Rs. ${t.paymentReceived}`,
                          remainingBalanceState: `Rs. ${t.remainingBalanceState}`
                        }));
                        downloadTransactionsPDF(`${profile.customerName} Ledger Report`, cols, pdfRows, `${profile.customerName}_Ledger`);
                      }}
                      className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" /> <span>Download PDF</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openSaleEntryDialog(profile, true);
                      }}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> <span>Add New Entry</span>
                    </button>
                  </div>
                </div>

                {/* Transactions History Listing Panel */}
                <div className="p-4 md:p-6 bg-slate-50/10">
                  <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-4 text-left">Date/Time</th>
                          <th className="px-3 py-4 text-center">Milk Qty</th>
                          <th className="px-2 py-4 text-center">FAT %</th>
                          <th className="px-2 py-4 text-center">LR</th>
                          <th className="px-2 py-4 text-center">SNF %</th>
                          <th className="px-2 py-4 text-center">TS %</th>
                          <th className="px-3 py-4 text-center font-bold">TF (Kg)</th>
                          <th className="px-3 py-4 text-right">Milk Price</th>
                          <th className="px-3 py-4 text-center">Advance</th>
                          <th className="px-3 py-4 text-center">Net Cash</th>
                          <th className="px-3 py-4 text-center font-bold text-amber-600">Discount</th>
                          <th className="px-3 py-4 text-center">Spoiled Deduct</th>
                          <th className="px-4 py-4 text-right">Remaining Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayTimeline.length > 0 ? [...displayTimeline].reverse().map((item, idx) => {
                          const tsPercent = (item.fat || 0) + (item.snf || 0);
                          return (
                            <React.Fragment key={idx}>
                              <tr
                                onClick={() => {
                                  setShowDetailsModal(false);
                                  editSaleEntryDialog(profile, item, false);
                                }}
                                className="hover:bg-slate-50/80 transition ease-in-out cursor-pointer group text-slate-700"
                                title="Click to edit/view this entry"
                              >
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <span className="font-bold text-slate-800 block group-hover:text-emerald-700 transition-colors">{item.date}</span>
                                  <span className="text-[10px] text-slate-400 font-medium block">{item.time || 'Manual Entry'}</span>
                                </td>
                                <td className="px-3 py-4 text-center whitespace-nowrap font-black text-slate-700 font-mono">
                                  {item.milkLiter ? `${item.milkLiter} ${item.milkUnit === 'Kg' ? 'Kg' : 'L'}` : '—'}
                                </td>
                                <td className="px-2 py-4 text-center whitespace-nowrap font-bold text-slate-600 font-mono">
                                  {item.fat != null ? `${Number(item.fat).toFixed(1)}%` : '—'}
                                </td>
                                <td className="px-2 py-4 text-center whitespace-nowrap font-bold text-slate-600 font-mono">
                                  {item.lr != null ? Number(item.lr).toFixed(0) : '—'}
                                </td>
                                <td className="px-2 py-4 text-center whitespace-nowrap font-bold text-slate-600 font-mono">
                                  {item.snf != null ? `${Number(item.snf).toFixed(2)}%` : '—'}
                                </td>
                                <td className="px-2 py-4 text-center whitespace-nowrap font-bold text-indigo-600 font-mono">
                                  {item.fat != null && item.snf != null ? `${tsPercent.toFixed(2)}%` : '—'}
                                </td>
                                <td className="px-3 py-4 text-center whitespace-nowrap font-bold text-indigo-700 font-mono">
                                  {item.totalTs != null ? Number(item.totalTs).toFixed(2) : '—'}
                                </td>
                                <td className="px-3 py-4 text-right whitespace-nowrap">
                                  <span className="font-black text-slate-850 font-mono text-xs block">Rs. {item.totalAmount.toLocaleString()}</span>
                                  {item.rate > 0 && <span className="text-[9px] text-slate-400 block pb-0.5">@ Rs. {item.rate}</span>}
                                </td>
                                <td className="px-3 py-4 text-center whitespace-nowrap">
                                  {item.advanceAmount > 0 ? (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[10px] border border-indigo-100">
                                      - Rs. {item.advanceAmount.toLocaleString()}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-3 py-4 text-center whitespace-nowrap">
                                  {item.paymentReceived > 0 ? (
                                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-bold text-[10px] border border-teal-100">
                                      - Rs. {item.paymentReceived.toLocaleString()}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-3 py-4 text-center whitespace-nowrap">
                                  {item.discountAmount !== undefined && item.discountAmount > 0 ? (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px] border border-amber-100">
                                      - Rs. {item.discountAmount.toLocaleString()}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-3 py-4 text-center whitespace-nowrap">
                                  {item.isSpoiled && (item.spoiledAmount || 0) > 0 ? (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-bold text-[10px] border border-rose-100" title={`Spoiled Qty: ${item.spoiledLiters || '—'} L`}>
                                      - Rs. {item.spoiledAmount?.toLocaleString()}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-4 text-right whitespace-nowrap">
                                  <span className={`font-black font-mono text-sm ${item.remainingBalanceState > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                    Rs. {item.remainingBalanceState.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                              {((item.isSpoiled && (item.spoiledAmount || 0) > 0) || (item.discountAmount !== undefined && item.discountAmount > 0)) && (
                                <tr className="bg-rose-50/10 text-[10.5px] border-b border-rose-100 text-left">
                                  <td colSpan={1} className="pl-3 py-2 text-center font-extrabold text-indigo-700 font-sans uppercase">Details</td>
                                  <td colSpan={12} className="px-4 py-2 leading-relaxed text-slate-700 text-left space-y-1">
                                    {item.discountAmount !== undefined && item.discountAmount > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase"> Customer Discount</span>
                                        <span>Customer discount given on this sale invoice:</span>
                                        <span className="font-mono font-black text-amber-900 bg-amber-50 px-1 border border-amber-200 rounded">
                                          Rs. {item.discountAmount.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    {item.isSpoiled && (item.spoiledAmount || 0) > 0 && (
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-0.5">
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-black uppercase"> ⚠️ Returned Spoilage</span>
                                        <span>Returned Spoiled Quantity:</span>
                                        <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-100 text-rose-800">
                                          {item.spoiledLiters || '0'} {item.milkUnit || 'Liters'}
                                        </span>
                                        {item.spoiledRate != null && Number(item.spoiledRate) > 0 && (
                                          <span>@ <span className="font-mono font-bold">Rs. {item.spoiledRate}</span></span>
                                        )}
                                        <span className="text-slate-300">|</span> <span>Fat: <span className="font-mono font-bold text-slate-800">{item.spoiledFat != null ? `${Number(item.spoiledFat).toFixed(1)}%` : '—'}</span></span>
                                        <span className="text-slate-300">|</span> <span>LR: <span className="font-mono font-bold text-slate-800">{item.spoiledLr != null ? Number(item.spoiledLr).toFixed(0) : '—'}</span></span>
                                        <span className="text-slate-300">|</span> <span>TS %: <span className="font-mono font-bold text-slate-800">{item.spoiledTs != null ? `${Number(item.spoiledTs).toFixed(2)}%` : '—'}</span></span>
                                        <span className="text-slate-300">|</span> <span>SNF %: <span className="font-mono font-bold text-slate-800">{item.spoiledSnf != null ? `${Number(item.spoiledSnf).toFixed(2)}%` : '—'}</span></span>
                                        <span className="ml-auto font-black text-rose-700 font-mono bg-rose-100/40 px-2 py-0.5 rounded border border-rose-200">
                                          Deducted Spoilage: Rs. {item.spoiledAmount.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        }) : (
                          <tr>
                            <td colSpan={13} className="px-5 py-12 text-center text-slate-400 font-medium italic">
                              No historical entries found for this customer within the filtered period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div> {/* Inner Scrollable Container Ends */}

            </div>
          </div>
        );
      })()}

      {/* WHATSAPP PROMPT OVERLAY MODAL */}
      {showWhatsappModal && whatsappEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[300] p-4 animate-fade-in text-left"> <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-emerald-100 border-t-8 border-t-emerald-600"> <div className="p-6"> <div className="flex items-center space-x-3.5  mb-4 "> <span className="p-3 bg-emerald-50 text-emerald-650 rounded-2xl"> <MessageCircle className="w-6 h-6 animate-bounce" /> </span> <h4 className="font-extrabold text-slate-800 text-base">{labels.whatsappOptionTitle}</h4> </div> <p className="text-xs text-slate-600 leading-relaxed font-sans block mb-5">
          {labels.sendPrompt}
          <br /><strong className="text-slate-800 mt-2 block">
            Outstanding Balance: Rs. {whatsappEntry.remainingBalance.toLocaleString()}
          </strong> </p> <div className="flex flex-col gap-2.5"> <a
            href={`https://wa.me/${whatsappEntry.phoneNumber.replace(/\D/g, '') || ''}?text=${getWhatsAppMessageText(whatsappEntry)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setShowWhatsappModal(false)}
            className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          > <MessageCircle className="w-4 h-4" /> <span>{labels.sendReceiptBtn}</span> </a> <button
            onClick={() => {
              const prof = customerProfiles.find(p => p.id === whatsappEntry.customerProfileId);
              if (prof) {
                setSelectedProfileForDetails(prof);
                setShowDetailsModal(true);
              }
              setShowWhatsappModal(false);
            }}
            className="w-full px-5 py-3 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
          > <Eye className="w-4 h-4" /> <span>{labels.showLedgerBtn}</span> </button> <button
            onClick={() => setShowWhatsappModal(false)}
            className="w-full px-5 py-3 bg-white hover:bg-slate-50 text-slate-400 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer border border-slate-150"
          >
              {labels.skipBtn}
            </button> </div> </div> </div> </div>
      )}



    </div>
  );
}
