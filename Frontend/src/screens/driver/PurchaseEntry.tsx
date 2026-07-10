import React, { useState } from 'react';
import { Droplets } from 'lucide-react';
import { useTransactionContext } from '../../contexts/TransactionContext';

export default function PurchaseEntry() {
  const [liters, setLiters] = useState('');
  const [rate, setRate] = useState('');
  const [source, setSource] = useState('');
  const [location, setLocation] = useState('');
  const { addPurchase } = useTransactionContext();

  const totalAmount = parseFloat((parseFloat(liters || '0') * parseFloat(rate || '0')).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !location || !liters || !rate) return;
    
    addPurchase({
      source,
      location,
      liters: parseFloat(liters),
      rate: parseFloat(rate),
      total: totalAmount
    });

    alert('Purchase Recorded Successfully!');
    setLiters('');
    setRate('');
    setSource('');
    setLocation('');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto"> <div className="flex justify-between items-center"> <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Purchase Entry</h1> </div> <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8"> <form className="space-y-6" onSubmit={handleSubmit}> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier / Farm Name</label> <input 
                type="text" 
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Enter supplier name"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Location</label> <input 
                type="text" 
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Milk Quantity (Liters)</label> <input 
                type="number" 
                required
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Per Liter Cost ($)</label> <input 
                type="number" 
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> </div> <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center justify-between border border-green-100 dark:border-green-900/30"> <span className="font-medium text-green-800 dark:text-green-300">Total Purchase Amount:</span> <span className="text-2xl font-bold text-green-700 dark:text-green-400">${totalAmount}</span> </div> <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          > <Droplets className="w-5 h-5" /> <span>Confirm Purchase</span> </button> </form> </div> </div>
  );
}
