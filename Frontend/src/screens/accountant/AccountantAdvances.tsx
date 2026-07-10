import React, { useState, useMemo } from 'react';
import { useAdvanceContext, AdvanceTransaction, AdvanceTransactionType } from '../../contexts/AdvanceContext';
import { useUserContext, User } from '../../contexts/UserContext';
import { 
  Plus, 
  Wallet, 
  FileText, 
  Calendar, 
  DollarSign, 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  User as UserIcon, 
  Phone, 
  CreditCard,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Clock,
  Printer
} from 'lucide-react';

export default function AccountantAdvances() {
  const { transactions, addTransaction, editTransaction, deleteTransaction, getDriverBalance } = useAdvanceContext();
  const { users, addUser, updateUser, deleteUser } = useUserContext();

  // Sirf woh Drivers jo Advances se register hain (role === 'Driver')
  // MilkTesters alag hain — woh login users hain, advance drivers nahi
  const drivers = useMemo(() => {
    return users.filter(u => u.role === 'Driver');
  }, [users]);

  // Screen level states
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
  // Search & Filter state
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Driver add/edit modal states
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [driverForm, setDriverForm] = useState({
    fullName: '',
    phone: '',
    cnic: '',
    openingBalance: '0'
  });

  // Transaction add/edit states
  const [showTxForm, setShowTxForm] = useState(false);
  const [editingTx, setEditingTx] = useState<AdvanceTransaction | null>(null);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'ADVANCE' as AdvanceTransactionType,
    amount: '',
    category: 'Advance Received' as any,
    description: '',
    paymentMethod: 'Cash' as 'Cash' | 'Bank Transfer' | 'Mobile Wallet',
    bankAccount: '' as string,
    returnedByName: '' as string
  });

  // Find currently active driver
  const activeDriver = useMemo(() => {
    if (!selectedDriverId) return null;
    return drivers.find(d => d.id === selectedDriverId) || null;
  }, [drivers, selectedDriverId]);

  // Compute live statistics for active driver
  const activeDriverBalanceObj = useMemo(() => {
    if (!activeDriver) return { totalAdvance: 0, totalExpense: 0, totalIncome: 0, totalReturn: 0, balance: 0 };
    return getDriverBalance(activeDriver.id, activeDriver.openingBalance || 0);
  }, [activeDriver, getDriverBalance, transactions]);

  // Compute chronologically accurate ledger details with running balance for active driver
  const chronologicalLedger = useMemo(() => {
    if (!activeDriver) return [];
    
    // 1. Get raw transactions for this driver sorted oldest to newest
    const rawTx = transactions
      .filter(t => t.driverId === activeDriver.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 2. Chronological loop to compute running balance
    let runningBalance = Number(activeDriver.openingBalance || 0);
    const timeline = rawTx.map(tx => {
      if (tx.type === 'ADVANCE') {
        runningBalance += Number(tx.amount || 0);
      } else if (tx.type === 'EXPENSE') {
        runningBalance -= Number(tx.amount || 0);
      } else if (tx.type === 'TRIP_INCOME') {
        runningBalance += Number(tx.amount || 0);
      } else if (tx.type === 'CASH_RETURN') {
        runningBalance -= Number(tx.amount || 0);
      }
      return {
        ...tx,
        runningBalanceAfter: runningBalance
      };
    });

    // 3. Return reverse chronological order for preview (newest on top)
    return timeline.reverse();
  }, [activeDriver, transactions]);

  // Filter chronologically computed ledger entries by Date Range
  const filteredLedger = useMemo(() => {
    return chronologicalLedger.filter(tx => {
      if (ledgerStartDate && tx.date < ledgerStartDate) return false;
      if (ledgerEndDate && tx.date > ledgerEndDate) return false;
      return true;
    });
  }, [chronologicalLedger, ledgerStartDate, ledgerEndDate]);

  // Filter overall drivers directory
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchName = d.fullName.toLowerCase().includes(driverSearchQuery.toLowerCase());
      const matchPhone = (d.phone || '').includes(driverSearchQuery);
      return matchName || matchPhone;
    });
  }, [drivers, driverSearchQuery]);

  const handlePrintPDF = () => {
    if (!activeDriver) return;
    
    // Create an elegant, professionally designed printable invoice/ledger in a new popup window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print or download reports.');
      return;
    }

    const title = `${activeDriver.fullName} - Account Ledger Statement`;
    const dateRangeStr = (ledgerStartDate || ledgerEndDate) 
      ? `Period: ${ledgerStartDate || 'Beginning'} to ${ledgerEndDate || 'Present'}`
      : 'Full Historical Statement';

    // Build lists
    let rowsHtml = '';
    
    // Standard is oldest on top (chronological order)
    const printData = [...filteredLedger].reverse();

    printData.forEach(tx => {
      let typeLabel: string = tx.type;
      if (tx.type === 'ADVANCE') typeLabel = 'Disbursed Advance';
      if (tx.type === 'EXPENSE') typeLabel = `Logged Expense (${tx.category || 'N/A'})`;
      if (tx.type === 'TRIP_INCOME') typeLabel = 'Trip Earnings';
      if (tx.type === 'CASH_RETURN') typeLabel = 'Cash Returned';

      let methodStr = tx.paymentMethod ? `[${tx.paymentMethod}${tx.bankAccount ? ` - ${tx.bankAccount}` : ''}]` : '';
      let returnedStr = tx.returnedByName ? ` (Returned by ${tx.returnedByName})` : '';

      const detailNote = `${tx.description || ''} ${methodStr}${returnedStr}`.trim() || '-';
      const changePrefix = (tx.type === 'ADVANCE' || tx.type === 'TRIP_INCOME') ? '+' : '-';
      
      rowsHtml += `
        <tr style="border-bottom: 1px dotted #cbd5e1;"> <td style="padding: 10px; font-size: 11px; font-family: monospace;">${tx.date}</td> <td style="padding: 10px; font-size: 11px; max-width: 250px; word-wrap: break-word;">${detailNote}</td> <td style="padding: 10px; font-size: 11px; font-weight: bold;">${typeLabel}</td> <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold; font-family: monospace;">${changePrefix} Rs. ${tx.amount.toLocaleString()}</td> <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold; font-family: monospace;">Rs. ${tx.runningBalanceAfter ? tx.runningBalanceAfter.toLocaleString() : 'N/A'}</td> </tr>
      `;
    });

    if (!ledgerStartDate && !ledgerEndDate) {
      rowsHtml = `
        <tr style="border-bottom: 1px dotted #cbd5e1; background-color: #f8fafc;"> <td style="padding: 10px; font-size: 11px; color:#64748b; font-family: monospace;">Baseline</td> <td style="padding: 10px; font-size: 11px; color:#64748b;" colspan="2">Opening Balance baseline configuration</td> <td style="padding: 10px; font-size: 11px; text-align: right; color:#64748b; font-family: monospace;">-</td> <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold; font-family: monospace;">Rs. ${(activeDriver.openingBalance || 0).toLocaleString()}</td> </tr>
      ` + rowsHtml;
    }

    const styleHtml = `
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 25px; line-height: 1.4; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; background-color: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; }
        .meta-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .meta-value { font-size: 14px; font-weight: bold; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #1e3a8a; color: white; text-align: left; padding: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 300px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
          .footer { margin-top: 100px; }
        }
      </style>
    `;

    const incomeRow = activeDriverBalanceObj.totalIncome > 0 ? `
              <tr style="border-bottom: 1px solid #e2e8f0;"> <td style="padding: 6px 8px; font-size:11px; font-weight:bold; color:#475569;">Trip Earnings (+):</td> <td style="padding: 6px 8px; font-size:11px; text-align:right; font-family: monospace; font-weight:bold; color: #16a34a;">+ Rs. ${activeDriverBalanceObj.totalIncome.toLocaleString()}</td> </tr>
    ` : '';

    const returnRow = activeDriverBalanceObj.totalReturn > 0 ? `
              <tr style="border-bottom: 1px solid #e2e8f0;"> <td style="padding: 6px 8px; font-size:11px; font-weight:bold; color:#475569;">Settled Cash Refunds (-):</td> <td style="padding: 6px 8px; font-size:11px; text-align:right; font-family: monospace; font-weight:bold; color: #475569;">- Rs. ${activeDriverBalanceObj.totalReturn.toLocaleString()}</td> </tr>
    ` : '';

    const docContent = `
      <html> <head> <title>${title}</title>
          ${styleHtml}
        </head> <body onload="window.print()"> <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 15px;"> <div> <h1 style="color: #1e3a8a; font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">Bismillah Water Company</h1> <p style="font-size: 9px; color: #475569; margin: 2px 0 0 0; font-weight: bold; text-transform: uppercase; tracking: 1px;">Logistics & Fleet Driver Ledger Management</p> </div> <div style="text-align: right;"> <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: 0.5px;">LEDGER ACCOUNT STATEMENT</h2> <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Statement Date: ${new Date().toLocaleDateString()}</p> </div> </div> <div class="meta-grid"> <div> <div class="meta-label">Driver Account</div> <div class="meta-value">${activeDriver.fullName}</div> <div style="font-size: 11px; color: #475569; margin-top: 2px;">Phone Contact: ${activeDriver.phone || 'N/A'} | CNIC No: ${activeDriver.cnic || 'N/A'}</div> </div> <div> <div class="meta-label">Ledger Summary Balance</div> <div class="meta-value" style="color: #1a56db; font-size: 15px;">Net Remaining Due: Rs. ${activeDriverBalanceObj.balance.toLocaleString()}</div> <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                Total Disbursed: Rs. ${activeDriverBalanceObj.totalAdvance.toLocaleString()} | Logged Expenses: Rs. ${activeDriverBalanceObj.totalExpense.toLocaleString()}
              </div> </div> </div> <div style="margin-bottom: 15px; background: #fffbeb; border: 1px solid #fef3c7; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #92400e;"> <strong>Statement Date Target Period:</strong> ${dateRangeStr}
          </div> <table> <thead> <tr> <th style="width: 15%;">Date</th> <th style="width: 45%;">Notes & Settlement Details</th> <th style="width: 20%;">Adjustment Type</th> <th style="width: 10%; text-align: right;">Amount (PKR)</th> <th style="width: 10%; text-align: right;">Running Due Balance</th> </tr> </thead> <tbody>
              ${rowsHtml}
            </tbody> </table> <div style="display: flex; justify-content: flex-end; margin-top: 15px;"> <table style="width: 320px; float: right; margin-bottom: 0;"> <tr style="border-bottom: 1px solid #e2e8f0;"> <td style="padding: 6px 8px; font-size:11px; font-weight:bold; color:#475569;">Cumulative Road Advances (+):</td> <td style="padding: 6px 8px; font-size:11px; text-align:right; font-family: monospace; font-weight:bold; color: #1e3a8a;">Rs. ${activeDriverBalanceObj.totalAdvance.toLocaleString()}</td> </tr> <tr style="border-bottom: 1px solid #e2e8f0;"> <td style="padding: 6px 8px; font-size:11px; font-weight:bold; color:#475569;">Incurred Fuel & Trip Expenses (-):</td> <td style="padding: 6px 8px; font-size:11px; text-align:right; font-family: monospace; font-weight:bold; color: #b91c1c;">- Rs. ${activeDriverBalanceObj.totalExpense.toLocaleString()}</td> </tr>
              ${incomeRow}
              ${returnRow}
              <tr style="background-color: #f1f5f9; border-top: 2px solid #1e3a8a;"> <td style="padding: 8px; font-size:12px; font-weight:900; color: #1e3a8a;">Net Remaining Due:</td> <td style="padding: 8px; font-size:12px; font-weight:900; text-align:right; color: #1e3a8a; font-family: monospace;">Rs. ${activeDriverBalanceObj.balance.toLocaleString()}</td> </tr> </table> <div style="clear: both;"></div> </div> <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px;"> <div style="width: 200px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 5px; color: #475569;">
              Accountant Signature
            </div> <div style="width: 200px; border-top: 1px solid #cbd5e1; text-align: center; padding-top: 5px; color: #475569;">
              Driver Receipt Signature
            </div> </div> <div class="footer"> <p>Computer-generated statement from Bismillah Water Company Logistics Ledger engine. No physical stamp required.</p> <p style="margin-top: 2px;">Report Generated: ${new Date().toLocaleString()}</p> </div> <div class="no-print" style="margin-top: 40px; text-align: center;"> <button onclick="window.print();" style="background-color: #1e3a8a; color: white; border: none; padding: 12px 30px; font-size: 13px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); transition: all 0.2s;">
              🖨 Click to Print / Save as PDF
            </button> </div> </body> </html>
    `;

    printWindow.document.write(docContent);
    printWindow.document.close();
  };

  // Handle Driver Profile Create or Edit Submit
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.fullName || !driverForm.phone) {
      alert('Please fill out Name and Phone fields.');
      return;
    }

    const opBalNum = Number(driverForm.openingBalance || 0);

    if (editingDriver) {
      // Edit mode
      updateUser(editingDriver.id, {
        fullName: driverForm.fullName,
        phone: driverForm.phone,
        cnic: driverForm.cnic,
        openingBalance: opBalNum
      });
      alert('Driver profile updated securely.');
    } else {
      // Create mode
      const usernameGenerated = 'driver_' + driverForm.fullName.toLowerCase().replace(/\s+/g, '_');
      addUser({
        fullName: driverForm.fullName,
        phone: driverForm.phone,
        username: usernameGenerated,
        role: 'Driver',
        status: 'Active',
        cnic: driverForm.cnic,
        openingBalance: opBalNum
      });
      alert('New Driver register successful.');
    }

    // Reset state & close modal
    setShowDriverModal(false);
    setEditingDriver(null);
    setDriverForm({
      fullName: '',
      phone: '',
      cnic: '',
      openingBalance: '0'
    });
  };

  // Open Edit Driver modal
  const handleOpenEditDriver = (driver: User, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid activating select driver
    setEditingDriver(driver);
    setDriverForm({
      fullName: driver.fullName,
      phone: driver.phone,
      cnic: driver.cnic || '',
      openingBalance: String(driver.openingBalance || 0)
    });
    setShowDriverModal(true);
  };

  // Delete Driver action
  const handleDeleteDriverClick = (driver: User, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid activating select driver
    if (confirm(`Are you sure you want to permanently delete Driver: ${driver.fullName}? All associated ledgers will remain unlinked.`)) {
      deleteUser(driver.id);
      if (selectedDriverId === driver.id) {
        setSelectedDriverId(null);
      }
      alert('Driver removed from database.');
    }
  };

  // Handle Transaction Submit (Create or Edit)
  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDriver) return;

    const amountNum = Number(txForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    if (editingTx) {
      // Edit transaction
      editTransaction(editingTx.id, {
        date: txForm.date,
        type: txForm.type,
        amount: amountNum,
        category: txForm.category,
        description: txForm.description,
        paymentMethod: txForm.paymentMethod,
        bankAccount: txForm.bankAccount,
        returnedByName: txForm.returnedByName
      });
      alert('Transaction record edited successfully.');
    } else {
      // Create transaction
      addTransaction({
        driverId: activeDriver.id,
        driverName: activeDriver.fullName,
        date: txForm.date,
        type: txForm.type,
        amount: amountNum,
        category: txForm.category,
        description: txForm.description,
        paymentMethod: txForm.paymentMethod,
        bankAccount: txForm.bankAccount,
        returnedByName: txForm.returnedByName
      });
      alert('Transaction record added successfully.');
    }

    // Reset states
    setShowTxForm(false);
    setEditingTx(null);
    setTxForm({
      date: new Date().toISOString().split('T')[0],
      type: 'ADVANCE',
      amount: '',
      category: 'Advance Received',
      description: '',
      paymentMethod: 'Cash',
      bankAccount: '',
      returnedByName: ''
    });
  };

  // Initialize form for Editing a Transaction
  const handleStartEditTx = (tx: AdvanceTransaction) => {
    setEditingTx(tx);
    setTxForm({
      date: tx.date,
      type: tx.type,
      amount: String(tx.amount),
      category: tx.category || 'Advance Received',
      description: tx.description,
      paymentMethod: tx.paymentMethod || 'Cash',
      bankAccount: tx.bankAccount || '',
      returnedByName: tx.returnedByName || ''
    });
    setShowTxForm(true);
  };

  // Delete transaction action
  const handleStartDeleteTx = (tx: AdvanceTransaction) => {
    if (confirm(`Do you wish to delete this ${tx.type.toLowerCase()} record of Rs. ${tx.amount.toLocaleString()}?`)) {
      deleteTransaction(tx.id);
      alert('Transaction deleted.');
    }
  };

  // Helper categories generator
  const getCategoriesForType = (type: AdvanceTransactionType) => {
    if (type === 'EXPENSE') {
      return ['Fuel', 'Repair', 'Toll Plaza', 'Food', 'Miscellaneous', 'Other'];
    } else if (type === 'TRIP_INCOME') {
      return ['Trip Income'];
    } else if (type === 'CASH_RETURN') {
      return ['Cash Return', 'Office Return'];
    } else {
      return ['Advance Received'];
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 pb-16">
      
      {/* ----------------- DRIVERS DIRECTORY PAGE (NO DRIVER SELECTED) ----------------- */}
      {!selectedDriverId ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Action Banner */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4"> <div> <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"> <Wallet className="w-7 h-7 text-indigo-650" />
                Driver Details & Accounts Ledger
              </h1> <p className="text-slate-500 text-sm mt-1">
                Register drivers, configure opening balances, and audit live transactional ledger sheets.
              </p> </div> <button
              onClick={() => {
                setEditingDriver(null);
                setDriverForm({ fullName: '', phone: '', cnic: '', openingBalance: '0' });
                setShowDriverModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
            > <UserPlus className="w-4 h-4" /> <span>Register New Driver</span> </button> </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6"> <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col justify-between"> <span className="text-[11px] font-bold text-indigo-650 uppercase tracking-widest">Total Registered Drivers</span> <strong className="text-2xl font-black text-slate-800 mt-2">{drivers.length} Users</strong> </div> <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between"> <span className="text-[11px] font-bold text-emerald-650 uppercase tracking-widest">Active Fleet State</span> <strong className="text-2xl font-black text-slate-800 mt-2">
                {drivers.filter(d => d.status === 'Active').length} Active
              </strong> </div> <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between"> <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Local Database Mode</span> <strong className="text-2xl font-black text-indigo-900 mt-2">localStorage</strong> </div> </div>

          {/* Search Box */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"> <div className="relative max-w-md"> <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" /> <input
                type="text"
                placeholder="Search drivers by name or phone/contact..."
                value={driverSearchQuery}
                onChange={(e) => setDriverSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              /> </div> </div>

          {/* Drivers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrivers.map((driver) => {
              // Retrieve specific balance information
              const balObj = getDriverBalance(driver.id, driver.openingBalance || 0);
              
              return (
                <div 
                  key={driver.id} 
                  onClick={() => setSelectedDriverId(driver.id)}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
                > <div className="p-5 space-y-4"> <div className="flex justify-between items-start"> <div className="flex items-center gap-3"> <div className="w-12 h-12 bg-indigo-50 text-indigo-750 font-black rounded-xl flex items-center justify-center text-sm shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {driver.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </div> <div> <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-650 transition-colors">
                            {driver.fullName}
                          </h3> <span className="text-xs text-slate-400 font-mono">@{driver.username || 'n/a'}</span> </div> </div> <div className="flex items-center gap-1.5"> <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          driver.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {driver.status}
                        </span> </div> </div> <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-105"> <div className="flex justify-between items-center"> <span className="text-slate-400">Phone Contact:</span> <strong className="text-slate-700 font-mono">{driver.phone || 'Unavailable'}</strong> </div> <div className="flex justify-between items-center"> <span className="text-slate-400">CNIC Number:</span> <strong className="text-slate-700 font-mono">{driver.cnic || 'Not Configured'}</strong> </div> <div className="flex justify-between items-center"> <span className="text-slate-400">Opening Balance:</span> <strong className="text-slate-700 font-mono">Rs. {(driver.openingBalance || 0).toLocaleString()}</strong> </div> </div>

                    {/* Integrated mini totals box */}
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-lg text-center font-mono"> <div> <span className="block text-[7px] font-bold text-slate-400 uppercase">Advances</span> <strong className="text-[10px] font-black text-blue-600">Rs. {balObj.totalAdvance.toLocaleString()}</strong> </div> <div> <span className="block text-[7px] font-bold text-slate-400 uppercase">Expenses</span> <strong className="text-[10px] font-black text-rose-600">Rs. {balObj.totalExpense.toLocaleString()}</strong> </div> <div> <span className="block text-[7px] font-bold text-slate-400 uppercase">Returns</span> <strong className="text-[10px] font-black text-slate-600">Rs. {(balObj.totalReturn || 0).toLocaleString()}</strong> </div> <div> <span className="block text-[7px] font-bold text-slate-500 uppercase">Pending</span> <strong className={`text-[10px] font-black ${balObj.balance > 0 ? 'text-amber-600' : balObj.balance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          Rs. {balObj.balance.toLocaleString()}
                        </strong> </div> </div> </div>

                  {/* Profile Cards quick actions */}
                  <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-between items-center"> <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">Click to view Account Ledger &rarr;</span> <div className="flex gap-2"> <button
                        onClick={(e) => handleOpenEditDriver(driver, e)}
                        className="p-1 px-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white border hover:border-slate-300 rounded transition-all text-xs flex items-center gap-1 font-semibold"
                        title="Edit profile attributes"
                      > <Edit className="w-3 h-3" /> <span>Edit</span> </button> <button
                        onClick={(e) => handleDeleteDriverClick(driver, e)}
                        className="hidden"
                        title="Delete driver profile"
                      > <Trash2 className="w-3 h-3" /> <span>Delete</span> </button> </div> </div> </div>
              );
            })}

            {filteredDrivers.length === 0 && (
              <div className="col-span-full bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center text-slate-500"> <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" /> <p className="font-semibold text-slate-700">No driver profiles found.</p> <p className="text-xs text-slate-400 mt-1">Register drivers using the form above to inspect their journals.</p> </div>
            )}
          </div> </div>
      ) : (
        
        // ----------------- DRIVER DETAILED ACCOUNT PAGE (LEDGER VIEW) -----------------
        <div className="space-y-6 animate-fade-in">
          
          {/* Back button and profile overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"> <button
              onClick={() => {
                setSelectedDriverId(null);
                setLedgerStartDate('');
                setLedgerEndDate('');
                setShowTxForm(false);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline mb-4 font-mono uppercase tracking-wider"
            > <ArrowLeft className="w-4 h-4" /> <span>Back To Drivers Directory</span> </button> <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> <div className="flex items-center gap-4"> <div className="w-14 h-14 bg-indigo-600 text-white font-black text-lg rounded-2xl flex items-center justify-center shadow-md">
                  {activeDriver?.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                </div> <div> <h2 className="text-xl font-extrabold text-slate-800">{activeDriver?.fullName}</h2> <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1 font-mono"> <span className="flex items-center gap-1"> <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {activeDriver?.phone || 'No Phone Registered'}
                    </span> <span className="flex items-center gap-1"> <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      CNIC: {activeDriver?.cnic || 'N/A'}
                    </span> <span className="bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded text-[10px] uppercase font-black">
                      UID #{activeDriver?.id}
                    </span> </div> </div> </div>

              {/* Dynamic Action Buttons */}
              <div className="flex flex-wrap gap-2 items-center">
                {activeDriver && activeDriverBalanceObj.balance > 0 && (
                  <button
                    onClick={() => {
                      if (confirm(`Do you want to record a cash return of the remaining Rs. ${activeDriverBalanceObj.balance.toLocaleString()}? This brings the driver balance to exactly 0.`)) {
                        addTransaction({
                          driverId: activeDriver.id,
                          driverName: activeDriver.fullName,
                          date: new Date().toISOString().split('T')[0],
                          type: 'CASH_RETURN',
                          amount: activeDriverBalanceObj.balance,
                          category: 'Cash Return',
                          description: 'Returned remaining unused cash advance'
                        });
                        alert(`Returned Rs. ${activeDriverBalanceObj.balance.toLocaleString()} successfully. Balance is now 0.`);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 transition-all shadow-sm duration-150 transform active:scale-95"
                  > <span>Quick Cash Return (Rs. {activeDriverBalanceObj.balance.toLocaleString()})</span> </button>
                )}

                <button
                  onClick={() => {
                    const el = document.getElementById('direct-entry-card');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-sm"
                > <Plus className="w-3.5 h-3.5" /> <span>Go to Entry Form</span> </button> </div> </div> </div>

          {/* Current Live Formula Calculations (ALWAYS SHOWN AT TOP OF DETAILS PAGE) */}
          <div className="bg-gradient-to-r from-slate-850 to-slate-900 bg-slate-900 border border-slate-800 rounded-2xl text-white p-6 shadow-sm"> <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">
              Auto updated Live Account Balance Formula
            </h3> <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center"> <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"> <span className="block text-[9px] text-slate-400 uppercase">Opening Bal</span> <strong className="text-sm font-bold font-mono block mt-1">Rs. {(activeDriver?.openingBalance || 0).toLocaleString()}</strong> </div> <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center"> <span className="block text-[9px] text-blue-300 uppercase">Advances (+)</span> <strong className="text-sm font-bold font-mono text-blue-400 block mt-1">Rs. {activeDriverBalanceObj.totalAdvance.toLocaleString()}</strong> </div> <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center"> <span className="block text-[9px] text-rose-300 uppercase">Expenses (-)</span> <strong className="text-sm font-bold font-mono text-rose-400 block mt-1">Rs. {activeDriverBalanceObj.totalExpense.toLocaleString()}</strong> </div> <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"> <span className="block text-[9px] text-emerald-300 uppercase">Trip Income (+)</span> <strong className="text-sm font-bold font-mono text-emerald-400 block mt-1">Rs. {activeDriverBalanceObj.totalIncome.toLocaleString()}</strong> </div> <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-4 text-center"> <span className="block text-[9px] text-slate-300 uppercase">Cash Returned (-)</span> <strong className="text-sm font-bold font-mono text-slate-400 block mt-1">Rs. {(activeDriverBalanceObj.totalReturn || 0).toLocaleString()}</strong> </div> <div className={`col-span-2 md:col-span-1 rounded-xl p-4 text-center ${
                activeDriverBalanceObj.balance > 0 ? 'bg-amber-600/20 border border-amber-500/30' : activeDriverBalanceObj.balance === 0 ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-rose-600/20 border border-rose-500/30'
              }`}> <span className="block text-[9px] uppercase font-bold text-indigo-300">Pending Balance</span> <strong className={`text-xl font-black block font-mono mt-1 ${
                  activeDriverBalanceObj.balance > 0 ? 'text-amber-400' : activeDriverBalanceObj.balance === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  Rs. {activeDriverBalanceObj.balance.toLocaleString()}
                </strong> </div> </div> <div className="text-[10px] text-slate-500 text-center font-mono mt-4 pt-3 border-t border-white/5">
              Formula: Opening Balance + Total Advances - Total Expenses + Trip Earnings - Cash Returns = Pending Due Balance
            </div> </div>

          {/* TWO-COLUMN GRID LAYOUT FOR REAL-TIME OPERATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* COLUMN 1: DIRECT ACCOUNTING DESK (ALWAYS VISIBLE FORM & SPEED LOGGERS) */}
            <div id="direct-entry-card" className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"> <div className="flex justify-between items-center border-b border-slate-100 pb-3"> <div> <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    {editingTx ? '📝 Edit Ledger Entry' : '✏️ Direct Entry Desk'}
                  </h3> <p className="text-[10px] text-slate-450 font-medium">Log road advances and trip expenditures</p> </div>
                {editingTx && (
                  <button
                    onClick={() => {
                      setEditingTx(null);
                      setTxForm({
                        date: new Date().toISOString().split('T')[0],
                        type: 'ADVANCE' as const,
                        amount: '',
                        category: 'Advance Received' as any,
                        description: '',
                        paymentMethod: 'Cash' as const,
                        bankAccount: '',
                        returnedByName: ''
                      });
                    }}
                    className="text-xs font-bold text-rose-650 hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* AUTOMATIC PRESETS FOR EASY CLICKS */}
              <div className="space-y-2"> <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Quick Fill Presets
                </span> <div className="grid grid-cols-2 gap-1.5"> <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        type: 'EXPENSE',
                        category: 'Fuel',
                        description: 'PSO Fuel oil purchase'
                      });
                    }}
                    className="p-2 text-left border border-slate-200 hover:border-indigo-500 hover:bg-slate-50 rounded-xl transition-all text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                     Fuel Purchase
                  </button> <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        type: 'EXPENSE',
                        category: 'Toll Plaza',
                        description: 'Highway Toll tax fee'
                      });
                    }}
                    className="p-2 text-left border border-slate-200 hover:border-indigo-500 hover:bg-slate-50 rounded-xl transition-all text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  > <span>🚫</span> Toll Plaza Fee
                  </button> <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        type: 'EXPENSE',
                        category: 'Food',
                        description: 'Meal and tea allowances'
                      });
                    }}
                    className="p-2 text-left border border-slate-200 hover:border-indigo-500 hover:bg-slate-50 rounded-xl transition-all text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  > <span>🍲</span> Meals & Food
                  </button> <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        type: 'ADVANCE',
                        category: 'Advance Received',
                        description: 'Disbursed cash road advance'
                      });
                    }}
                    className="p-2 text-left border border-slate-200 hover:border-indigo-500 hover:bg-slate-50 rounded-xl transition-all text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                     New Road Advance
                  </button> <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        type: 'EXPENSE',
                        category: 'Repair',
                        description: 'Tire repair / sudden workshop repair'
                      });
                    }}
                    className="p-2 text-left border border-slate-200 hover:border-indigo-500 hover:bg-slate-50 rounded-xl transition-all text-xs font-semibold text-slate-700 flex items-center gap-1.5 col-span-2"
                  >
                     Vehicle Urgent Repair
                  </button> </div> </div>

              {/* THE MANUAL POSTING FORM */}
              <form onSubmit={handleTxSubmit} className="space-y-3 pt-3 border-t border-slate-100"> <div> <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Date *</label> <input
                    type="date"
                    required
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                  /> </div> <div className="grid grid-cols-2 gap-2"> <div> <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider font-sans">Type *</label> <select
                      value={txForm.type}
                      onChange={(e) => {
                        const newType = e.target.value as AdvanceTransactionType;
                        let defaultCategory = 'Advance Received';
                        if (newType === 'EXPENSE') defaultCategory = 'Fuel';
                        if (newType === 'TRIP_INCOME') defaultCategory = 'Trip Income';
                        if (newType === 'CASH_RETURN') defaultCategory = 'Cash Return';

                        setTxForm({ 
                          ...txForm, 
                          type: newType,
                          category: defaultCategory as any
                        });
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                    > <option value="ADVANCE">Advance Given</option> <option value="EXPENSE">Expense Log</option> <option value="TRIP_INCOME">Trip earnings</option> <option value="CASH_RETURN">Cash Return</option> </select> </div> <div> <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider font-sans">Category</label> <select
                      value={txForm.category}
                      onChange={(e) => setTxForm({ ...txForm, category: e.target.value as any })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                    >
                      {getCategoriesForType(txForm.type).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select> </div> </div>

                {/* PAYMENT METHOD AND BANK DETAILS FOR ADVANCES/RETURNS/TRIPS */}
                {(txForm.type === 'ADVANCE' || txForm.type === 'CASH_RETURN' || txForm.type === 'TRIP_INCOME') && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150"> <div className="col-span-2"> <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                         Settlement Method
                      </span> </div> <div> <label className="block text-[10px] font-extrabold text-slate-505 mb-1 uppercase tracking-wider">Method *</label> <select
                        value={txForm.paymentMethod}
                        onChange={(e) => setTxForm({ ...txForm, paymentMethod: e.target.value as any })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                      > <option value="Cash">Cash</option> <option value="Bank Transfer">Bank Transfer</option> <option value="Mobile Wallet">Mobile Wallet</option> </select> </div> <div>
                      {txForm.paymentMethod !== 'Cash' ? (
                        <> <label className="block text-[10px] font-extrabold text-slate-505 mb-1 uppercase tracking-wider">Bank / Wallet *</label> <select
                            value={txForm.bankAccount}
                            required
                            onChange={(e) => setTxForm({ ...txForm, bankAccount: e.target.value })}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none text-slate-700 font-bold"
                          > <option value="">-- Choose Account --</option> <option value="UBL">UBL (United Bank)</option> <option value="Meezan Bank">Meezan Bank</option> <option value="HBL">HBL Bank</option> <option value="JazzCash">JazzCash Wallet</option> <option value="EasyPaisa">EasyPaisa Wallet</option> <option value="Other">Other Account</option> </select> </>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic flex items-center justify-center h-full pt-4 font-sans text-center">
                          Physical physical cash given
                        </div>
                      )}
                    </div> </div>
                )}

                {/* PERSON WHO RETURNED THE MONEY */}
                {txForm.type === 'CASH_RETURN' && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100"> <label className="block text-[10px] font-extrabold text-amber-800 mb-1 uppercase tracking-wider">
                      Returned By (Person Name) *
                    </label> <input
                      type="text"
                      required
                      placeholder="e.g. Driver Ahmed, supervisor or assistant"
                      value={txForm.returnedByName}
                      onChange={(e) => setTxForm({ ...txForm, returnedByName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 bg-white outline-none text-slate-800 font-semibold"
                    /> </div>
                )}

                <div> <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Amount (PKR) *</label> <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                  /> </div> <div> <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">Description notes</label> <input
                    type="text"
                    required
                    placeholder="e.g. Toll plazas on M-2 Motorway"
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  /> </div> <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-widest font-mono shadow-sm transition-all duration-150 transform active:scale-95 mt-2"
                >
                  {editingTx ? 'Apply Changes to Entry' : 'Post to Ledger Sheet'}
                </button> </form> </div>

            {/* COLUMN 2: JOURNAL DATAGRID & SEARCH (2/3 WIDTH) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Search, Filter & Date Picker bounds */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4"> <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"> <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5"> <CalendarDays className="w-4 h-4 text-indigo-600" /> Filter Ledger Entries By Date Range
                  </h3> <div className="flex items-center gap-3"> <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] px-3 py-1.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
                    > <Printer className="w-3.5 h-3.5" /> <span>Download Statement (PDF)</span> </button>

                    {(ledgerStartDate || ledgerEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLedgerStartDate('');
                          setLedgerEndDate('');
                        }}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div> </div> <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div> <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1">From Date</label> <input
                      type="date"
                      value={ledgerStartDate}
                      onChange={(e) => setLedgerStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 font-mono outline-none"
                    /> </div> <div> <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1">To Date</label> <input
                      type="date"
                      value={ledgerEndDate}
                      onChange={(e) => setLedgerEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 font-mono outline-none"
                    /> </div> </div> </div>

              {/* MAIN CHRONOLOGICAL ACCOUNT LEDGER TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in"> <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"> <span className="font-extrabold text-xs text-slate-700 uppercase tracking-widest font-mono">
                    Itemized Chronological Journal
                  </span> <span className="text-[10px] bg-slate-200 text-slate-700 font-black px-2.5 py-1 rounded-full uppercase">
                    {filteredLedger.length} Records Found
                  </span> </div> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse min-w-[700px]"> <thead> <tr className="bg-slate-50 text-slate-405 text-[10px] uppercase font-black border-b border-slate-200"> <th className="px-5 py-3">Date</th> <th className="px-5 py-3">Description Notes</th> <th className="px-5 py-3">Transaction Type</th> <th className="px-5 py-3">Category</th> <th className="px-5 py-3 text-right">Amount (PKR)</th> <th className="px-5 py-3 text-right">Remaining Due balance</th> <th className="px-5 py-3 text-center">Action</th> </tr> </thead> <tbody className="divide-y divide-slate-150 text-xs font-mono">
                      
                      {/* Ledger entries loop */}
                      {filteredLedger.length > 0 ? (
                        filteredLedger.map((tx) => {
                          
                          // Identify highlight color tags
                          let typeLabel = '';
                          let typeBadgeStyle = '';
                          let amountStyle = '';

                          if (tx.type === 'ADVANCE') {
                            typeLabel = 'Disbursed Advance';
                            typeBadgeStyle = 'bg-blue-100 text-blue-800 border border-blue-200';
                            amountStyle = 'text-blue-600 font-extrabold'; // Blue for advance
                          } else if (tx.type === 'EXPENSE') {
                            typeLabel = 'Logged Expense';
                            typeBadgeStyle = 'bg-rose-100 text-rose-800 border border-rose-200';
                            amountStyle = 'text-rose-600 font-extrabold'; // Red for loss/expense
                          } else if (tx.type === 'TRIP_INCOME') {
                            typeLabel = 'Trip Earnings';
                            typeBadgeStyle = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                            amountStyle = 'text-emerald-600 font-extrabold'; // Green for profit
                          } else if (tx.type === 'CASH_RETURN') {
                            typeLabel = 'Cash Returned';
                            typeBadgeStyle = 'bg-slate-100 text-slate-850 border border-slate-200';
                            amountStyle = 'text-slate-600 font-extrabold'; // Slate for returned balance
                          }

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                              
                              {/* Date and dynamic timestamp check */}
                              <td className="px-5 py-3.5 whitespace-nowrap text-slate-600"> <span className="font-bold block text-slate-800">{tx.date}</span> <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5" title="Creation recorded timestamp"> <Clock className="w-2.5 h-2.5 text-slate-300" />
                                  {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Auto timestamp'}
                                </span> </td>

                              {/* Notes/description */}
                              <td className="px-5 py-3.5 text-slate-700 max-w-[200px] animate-pulse-once"> <div className="font-medium text-slate-800" title={tx.description}>
                                  {tx.description || <span className="text-slate-400 italic">No notes description</span>}
                                </div>
                                {tx.paymentMethod && (
                                  <div className="text-[10px] text-indigo-650 font-bold flex items-center gap-1 mt-0.5"> <span> {tx.paymentMethod}</span>
                                    {tx.bankAccount && <span>• {tx.bankAccount}</span>}
                                  </div>
                                )}
                                {tx.returnedByName && (
                                  <div className="text-[10px] text-amber-700 font-extrabold flex items-center gap-1 mt-0.5" title="Person who refunded cash"> <span>👤 Returned by: {tx.returnedByName}</span> </div>
                                )}
                              </td>

                              {/* Transaction Type */}
                              <td className="px-5 py-3.5 whitespace-nowrap"> <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${typeBadgeStyle}`}>
                                  {typeLabel}
                                </span> </td>

                              {/* Category */}
                              <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-bold">
                                {tx.category || 'Advance'}
                              </td>

                              {/* Amount */}
                              <td className={`px-5 py-3.5 text-right whitespace-nowrap text-sm ${amountStyle}`}>
                                {tx.type === 'ADVANCE' || tx.type === 'TRIP_INCOME' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                              </td>

                              {/* Chronological Running Net Balance */}
                              <td className="px-5 py-3.5 text-right whitespace-nowrap text-slate-800 font-black">
                                Rs. {tx.runningBalanceAfter ? tx.runningBalanceAfter.toLocaleString() : 'N/A'}
                              </td>

                              {/* Action Items */}
                              <td className="px-5 py-3.5 text-center whitespace-nowrap"> <div className="flex justify-center gap-1.5"> <button
                                    onClick={() => handleStartEditTx(tx)}
                                    className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-50"
                                    title="Edit Ledger Entry"
                                  > <Edit className="w-3.5 h-3.5" /> </button> <button
                                    onClick={() => handleStartDeleteTx(tx)}
                                    className="hidden"
                                    title="Delete Ledger Entry"
                                  > <Trash2 className="w-3.5 h-3.5" /> </button> </div> </td> </tr>
                          );
                        })
                      ) : (
                        <tr> <td colSpan={7} className="px-5 py-16 text-center text-slate-500 italic">
                            No transactions recorded matching criteria selection range.
                          </td> </tr>
                      )}
                      
                      {/* Initial opening balance baseline indicator row (always chronologically first row) */}
                      {!ledgerStartDate && !ledgerEndDate && activeDriver && (
                        <tr className="bg-slate-50/50"> <td className="px-5 py-3 text-slate-400 italic">Historical Baseline</td> <td className="px-5 py-3 text-slate-500 px-5" colSpan={3}>
                            Opening Balance configuration when registered
                          </td> <td className="px-5 py-3 text-right text-slate-400">Baseline</td> <td className="px-5 py-3 text-right font-black text-slate-850">
                            Rs. {(activeDriver.openingBalance || 0).toLocaleString()}
                          </td> <td className="px-5 py-3"></td> </tr>
                      )}

                    </tbody> </table> </div> </div> </div> </div> </div>
      )}

      {/* ----------------- DRIVER ADD & EDIT DIALOG MODAL ----------------- */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[300] backdrop-blur-sm animate-fade-in"> <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 overflow-hidden shadow-2xl"> <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-200"> <h3 className="font-extrabold text-slate-800 text-sm uppercase">
                {editingDriver ? `Update Details of ${editingDriver.fullName}` : 'Register New Driver Account'}
              </h3> </div> <form onSubmit={handleDriverSubmit} className="p-6 space-y-4"> <div> <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Full Name *</label> <input
                  type="text"
                  required
                  placeholder="e.g. Nadeem Ahmed"
                  value={driverForm.fullName}
                  onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                /> </div> <div> <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Phone Number *</label> <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                /> </div> <div> <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">CNIC Number (Optional)</label> <input
                  type="text"
                  placeholder="e.g. 35202-1234567-1"
                  value={driverForm.cnic}
                  onChange={(e) => setDriverForm({ ...driverForm, cnic: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                /> </div> <div> <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Opening Balance Note (PKR)</label> <input
                  type="number"
                  placeholder="0"
                  value={driverForm.openingBalance}
                  onChange={(e) => setDriverForm({ ...driverForm, openingBalance: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  disabled={!!editingDriver} // Let opening balance stay static, adjustment done from transactions
                />
                {editingDriver && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Opening balance cannot be edited on live profiles. Record ledger adjustments instead.
                  </span>
                )}
              </div> <div className="flex justify-end gap-3 pt-3 border-t border-slate-100"> <button
                  type="button"
                  onClick={() => {
                    setShowDriverModal(false);
                    setEditingDriver(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button> <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {editingDriver ? 'Update Profile' : 'Save & Register'}
                </button> </div> </form> </div> </div>
      )}

    </div>
  );
}
