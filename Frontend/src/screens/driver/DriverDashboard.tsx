import React from 'react';
import { Truck, Wallet, Database, ArrowDown, ArrowUp } from 'lucide-react';
import { useAdvanceContext } from '../../contexts/AdvanceContext';
import { useRouteCollectionContext } from '../../contexts/RouteCollectionContext';
import { useAuth } from '../../contexts/AuthContext';

export default function DriverDashboard() {
  const { user } = useAuth();
  const { getDriverBalance } = useAdvanceContext();
  const { collections } = useRouteCollectionContext();
  
  if (!user) return null;

  const { totalAdvance, totalExpense, balance } = getDriverBalance(user.id);
  const myCollections = collections.filter(c => c.status !== 'Draft'); // example

  return (
    <div className="space-y-6"> <h1 className="text-2xl font-bold text-slate-800">Milk Tester Dashboard</h1> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center"> <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3"> <ArrowDown className="w-6 h-6" /> </div> <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Advanced</span> <span className="text-2xl font-bold text-slate-800">Rs. {totalAdvance.toLocaleString()}</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center"> <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3"> <ArrowUp className="w-6 h-6" /> </div> <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Spent</span> <span className="text-2xl font-bold text-slate-800">Rs. {totalExpense.toLocaleString()}</span> </div> <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center"> <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${balance >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}> <Wallet className="w-6 h-6" /> </div> <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Remaining Balance</span> <span className={`text-2xl font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Rs. {balance.toLocaleString()}</span> </div> </div> </div>
  );
}
