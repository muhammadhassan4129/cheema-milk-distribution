import React, { createContext, useContext, useState } from 'react';

export interface SaleRecord {
  id: string;
  customerName: string;
  location: string;
  liters: number;
  rate: number;
  total: number;
  date: string;
}

export interface PurchaseRecord {
  id: string;
  source: string;
  location: string;
  liters: number;
  rate: number;
  total: number;
  date: string;
}

interface TransactionContextType {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  addSale: (sale: Omit<SaleRecord, 'id' | 'date'>) => void;
  addPurchase: (purchase: Omit<PurchaseRecord, 'id' | 'date'>) => void;
  totalSalesLiters: number;
  totalPurchaseLiters: number;
  totalSalesAmount: number;
  totalPurchaseAmount: number;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  React.useEffect(() => {
    const handleReset = () => {
      setSales([]);
      setPurchases([]);
    };
    window.addEventListener('dairy-reset', handleReset);
    return () => window.removeEventListener('dairy-reset', handleReset);
  }, []);

  const addSale = (sale: Omit<SaleRecord, 'id' | 'date'>) => {
    setSales(prev => [...prev, { ...sale, id: `S-${Date.now()}`, date: new Date().toISOString() }]);
  };

  const addPurchase = (purchase: Omit<PurchaseRecord, 'id' | 'date'>) => {
    setPurchases(prev => [...prev, { ...purchase, id: `P-${Date.now()}`, date: new Date().toISOString() }]);
  };

  const totalSalesLiters = sales.reduce((acc, sale) => acc + sale.liters, 0);
  const totalPurchaseLiters = purchases.reduce((acc, p) => acc + p.liters, 0);
  
  const totalSalesAmount = sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalPurchaseAmount = purchases.reduce((acc, p) => acc + p.total, 0);

  return (
    <TransactionContext.Provider value={{ 
      sales, purchases, addSale, addPurchase,
      totalSalesLiters, totalPurchaseLiters, totalSalesAmount, totalPurchaseAmount
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
}
