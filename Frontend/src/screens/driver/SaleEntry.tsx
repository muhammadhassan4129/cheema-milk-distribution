import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useTransactionContext } from '../../contexts/TransactionContext';

export default function SaleEntry() {
  const [liters, setLiters] = useState('');
  const [rate, setRate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const { addSale } = useTransactionContext();

  const totalAmount = parseFloat((parseFloat(liters || '0') * parseFloat(rate || '0')).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !location || !liters || !rate) return;
    
    addSale({
      customerName,
      location,
      liters: parseFloat(liters),
      rate: parseFloat(rate),
      total: totalAmount
    });

    alert('Sale Recorded Successfully!');
    setLiters('');
    setRate('');
    setCustomerName('');
    setLocation('');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto"> <div className="flex justify-between items-center"> <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Sale Entry</h1> </div> <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8"> <form className="space-y-6" onSubmit={handleSubmit}> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label> <input 
                type="text" 
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Location</label> <input 
                type="text" 
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter delivery location"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Milk Quantity (Liters)</label> <input 
                type="number" 
                required
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Per Liter Price ($)</label> <input 
                type="number" 
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              /> </div> </div> <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between border border-blue-100 dark:border-blue-900/30"> <span className="font-medium text-blue-800 dark:text-blue-300">Total Sale Amount:</span> <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">${totalAmount}</span> </div> <button 
            type="submit"
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          > <Package className="w-5 h-5" /> <span>Confirm Sale</span> </button> </form> </div> </div>
  );
}
