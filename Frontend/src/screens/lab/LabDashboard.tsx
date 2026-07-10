import React, { useState } from 'react';
import { TestTube, Settings, FlaskConical, Beaker, CheckCircle2, XCircle, Printer, Save, RefreshCw, Calculator, Scale } from 'lucide-react';
import { useLabContext } from '../../contexts/LabContext';
import { useAuth } from '../../contexts/AuthContext';

export default function LabDashboard() {
  const { addLabReport } = useLabContext();
  const { user } = useAuth();
  
  // Settings used for calculation silently without UI
  const settings = {
    baseRate: 180,
    tsDivisor: 13,
    minFat: 3.0,
    minSnf: 8.0,
    lrThreshold: 26
  };

  const [formData, setFormData] = useState({
    batchId: '',
    supplierName: '',
    quantity: '',
    intakeDate: new Date().toISOString().split('T')[0],
    fat: '',
    lr: '',
    temperature: '',
  });

  const [converter, setConverter] = useState({
    kg: '',
    density: '1.032',
    liters: ''
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    snf: number;
    ts: number;
    totalTs: number;
    pricePerLiter: number;
    totalPayable: number;
    fatVal: number;
    lrVal: number;
    qtyVal: number;
    tempVal: number;
    messages: string[];
  } | null>(null);

  const handleSaveToHistory = () => {
    if (!result) return;
    
    addLabReport({
      batchNo: formData.batchId,
      technician: user?.fullName || 'Milk Tester',
      supplierName: formData.supplierName,
      quantity: result.qtyVal,
      fat: result.fatVal,
      snf: parseFloat(result.snf.toFixed(2)),
      lr: result.lrVal,
      ts: parseFloat(result.ts.toFixed(2)),
      totalTs: parseFloat(result.totalTs.toFixed(2)),
      pricePerLiter: parseFloat(result.pricePerLiter.toFixed(4)),
      totalPayable: parseFloat(result.totalPayable.toFixed(2)),
      result: result.status
    });
    
    setIsLogged(true);
    alert('Report saved to history successfully!');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleConverterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newConv = { ...converter, [name]: value };
    
    if (name === 'kg' || name === 'density') {
      const kgVal = parseFloat(name === 'kg' ? value : converter.kg);
      const denVal = parseFloat(name === 'density' ? value : converter.density) || 1.032;
      newConv.liters = (!isNaN(kgVal) && denVal > 0) ? (kgVal / denVal).toFixed(2) : '';
    }
    
    setConverter(newConv);
  };

  const setConvertedLitersToForm = () => {
    if (converter.liters) {
      setFormData({ ...formData, quantity: converter.liters });
      alert(`Set quantity to ${converter.liters} Liters`);
    }
  };

  const handleProcessBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batchId || !formData.fat || !formData.lr || !formData.supplierName || !formData.quantity) {
      alert("Please fill in required fields (Batch ID, Supplier, Quantity, Fat %, LR)");
      return;
    }

    const fatVal = parseFloat(formData.fat) || 0;
    const lrVal = parseFloat(formData.lr) || 0;
    const qtyVal = parseFloat(formData.quantity) || 0;
    const tempVal = parseFloat(formData.temperature) || 0;
    
    // Exact Regional SNF calculation: (0.25 * LR) + (0.22 * Fat) + 0.72
    const snfVal = (0.25 * lrVal) + (0.22 * fatVal) + 0.72;
    // Total Solids (TS) = Fat + SNF
    const tsVal = fatVal + snfVal;
    // Total TS = (TS% * Qty) / TS Divisor
    const totalTsVal = (tsVal * qtyVal) / settings.tsDivisor;
    // Price / Liter = (TS% / TS Divisor) * Base Rate
    const pricePerLiterVal = (tsVal / settings.tsDivisor) * settings.baseRate;
    // Total Payable = Price/Liter * Quantity
    const totalPayableVal = pricePerLiterVal * qtyVal;

    const messages = [];
    let isPass = true;
    
    if (fatVal < settings.minFat) {
      isPass = false;
      messages.push(`Fat% (${fatVal}) is below minimum (${settings.minFat})`);
    }
    if (snfVal < settings.minSnf) {
      isPass = false;
      messages.push(`SNF% (${snfVal.toFixed(2)}) is below minimum (${settings.minSnf})`);
    }
    if (lrVal < settings.lrThreshold) {
      isPass = false;
      messages.push(`LR (${lrVal}) below threshold (${settings.lrThreshold})`);
    }
    if (tsVal < 11) {
      messages.push(`Warning: TS% (${tsVal.toFixed(2)}) is below good quality threshold (11%)`);
    }
    
    setResult({
      status: isPass ? 'PASSED' : 'FAILED',
      snf: snfVal,
      ts: tsVal,
      totalTs: totalTsVal,
      pricePerLiter: pricePerLiterVal,
      totalPayable: totalPayableVal,
      fatVal,
      lrVal,
      qtyVal,
      tempVal,
      messages
    });
    
    setIsSaved(true);
  };

  const resetForm = () => {
    setFormData({
      ...formData,
      batchId: '',
      supplierName: '',
      quantity: '',
      fat: '',
      lr: '',
      temperature: ''
    });
    setResult(null);
    setIsSaved(false);
    setIsLogged(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6"> <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lab / Manual Entry area */}
        <div className="lg:col-span-2 space-y-6"> <div className="bg-white border rounded-xl shadow-sm relative">
            {isSaved && (
                <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-10 flex items-center justify-center"> </div>
            )}
            
            <form onSubmit={handleProcessBatch}> <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2"> <FlaskConical className="w-4 h-4 text-blue-600" /> <h3 className="font-bold text-slate-800 text-sm"> Lab / Manual Entry</h3> </div> <div className="p-5 space-y-6">
                
                {/* Batch Info */}
                <div> <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b pb-1">Batch Info</h4> <div className="grid grid-cols-2 gap-4"> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Container / Batch ID</label> <input type="text" name="batchId" value={formData.batchId} onChange={handleChange} placeholder="e.g. CONT-5001" className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-mono text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" required /> </div> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Supplier Name</label> <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} placeholder="e.g. Farm A" className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" required /> </div> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quantity (Liters) *</label> <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="5000" className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-mono text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/20" required /> </div> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Intake Date</label> <input type="date" name="intakeDate" value={formData.intakeDate} onChange={handleChange} className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" required /> </div> </div> </div>

                {/* Lab Readings */}
                <div> <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b pb-1">Lab Readings</h4> <div className="grid grid-cols-3 gap-4"> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Fat % *</label> <input type="number" step="0.1" name="fat" value={formData.fat} onChange={handleChange} placeholder="3.5" className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm font-mono text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/30" required /> </div> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">LR (Lactometer) *</label> <input type="number" step="0.1" name="lr" value={formData.lr} onChange={handleChange} placeholder="28" className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm font-mono text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/30" required /> </div> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Temp °C (opt)</label> <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange} placeholder="4" className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-mono text-slate-700 outline-none focus:border-blue-500" /> </div> </div> </div> </div>

              {!isSaved && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end"> <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"> <Beaker className="w-4 h-4" /> <span>⚗ Process Batch Entry</span> </button> </div>
              )}
            </form> </div> </div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          {result ? (
            <div className={`bg-white border rounded-xl shadow-sm h-full flex flex-col ${result.status === 'PASSED' ? 'border-green-200' : 'border-red-200'}`}> <div className={`px-5 py-3 border-b flex items-center justify-between ${result.status === 'PASSED' ? 'bg-green-50' : 'bg-red-50'}`}> <h3 className="font-bold text-slate-800 text-sm">Testing Report</h3>
                 {result.status === 'PASSED' ? (
                   <span className="flex items-center gap-1 text-green-700 font-black text-sm"><CheckCircle2 className="w-4 h-4" /> PASSED</span>
                 ) : (
                   <span className="flex items-center gap-1 text-red-600 font-black text-sm"><XCircle className="w-4 h-4" /> FAILED</span>
                 )}
               </div> <div className="p-5 flex-1 space-y-5 overflow-y-auto max-h-[800px]">
                 
                 {/* Top Summary Grid */}
                 <div className="grid grid-cols-2 gap-3"> <div className="bg-slate-50 p-2 rounded border border-slate-100"> <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Calc. SNF %</p> <p className="text-lg font-black font-mono text-slate-800">{result.snf.toFixed(2)}%</p> </div> <div className="bg-slate-50 p-2 rounded border border-slate-100"> <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Solids %</p> <p className="text-lg font-black font-mono text-slate-800">{result.ts.toFixed(2)}%</p> </div> <div className="bg-slate-50 p-2 rounded border border-slate-100"> <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total TS</p> <p className="text-lg font-black font-mono text-slate-800">{result.totalTs.toFixed(2)}</p> </div> <div className="bg-slate-50 p-2 rounded border border-slate-100"> <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Price / Liter</p> <p className="text-lg font-black font-mono text-blue-600">Rs.{result.pricePerLiter.toFixed(2)}</p> </div> <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center"> <span className="text-xs uppercase font-bold text-blue-600">Total Payable</span> <span className="text-xl font-black font-mono text-blue-700">Rs.{result.totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> </div> </div>

                 {/* Threshold Cards */}
                 <div className="space-y-2"> <div className="flex justify-between items-center p-2 rounded border border-slate-100 text-sm"> <span className="font-semibold text-slate-700 flex flex-col">Fat % <span className="text-[10px] text-slate-400 font-normal">Standard ≥ {settings.minFat.toFixed(1)}%</span></span> <span className={`font-mono font-bold ${result.fatVal >= settings.minFat ? 'text-green-600' : 'text-red-500'}`}>{result.fatVal.toFixed(1)}%</span> </div> <div className="flex justify-between items-center p-2 rounded border border-slate-100 text-sm"> <span className="font-semibold text-slate-700 flex flex-col">SNF % <span className="text-[10px] text-slate-400 font-normal">Standard ≥ {settings.minSnf.toFixed(1)}%</span></span> <span className={`font-mono font-bold ${result.snf >= settings.minSnf ? 'text-green-600' : 'text-red-500'}`}>{result.snf.toFixed(2)}%</span> </div> <div className="flex justify-between items-center p-2 rounded border border-slate-100 text-sm"> <span className="font-semibold text-slate-700 flex flex-col">Lactometer (LR) <span className="text-[10px] text-slate-400 font-normal">Threshold ≥ {settings.lrThreshold}</span></span> <span className={`font-mono font-bold ${result.lrVal >= settings.lrThreshold ? 'text-green-600' : 'text-red-500'}`}>{result.lrVal.toFixed(1)}</span> </div> <div className="flex justify-between items-center p-2 rounded border border-slate-100 text-sm"> <span className="font-semibold text-slate-700 flex flex-col">Total Solids (TS) <span className="text-[10px] text-slate-400 font-normal">Good ≥ 11%</span></span> <span className={`font-mono font-bold ${result.ts >= 11 ? 'text-green-600' : 'text-red-500'}`}>{result.ts.toFixed(2)}%</span> </div> </div>
                 
                 {/* Calculation Breakdown */}
                 <div className="pt-4 border-t border-slate-100"> <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3"><Calculator className="w-3.5 h-3.5"/> Calculation Breakdown</h4> <div className="space-y-1.5 text-xs text-slate-600"> <div className="flex justify-between border-b border-slate-50 pb-1"><span>Fat %</span> <span className="font-mono">{result.fatVal.toFixed(2)}%</span></div> <div className="flex justify-between border-b border-slate-50 pb-1"><span>Lactometer (LR)</span> <span className="font-mono">{result.lrVal.toFixed(1)}</span></div> <div className="flex justify-between border-b border-slate-50 pb-1 text-slate-400"><span>SNF = (0.25×LR) + (0.22×Fat%) + 0.72</span> <span className="font-mono text-slate-600">{result.snf.toFixed(4)}%</span></div> <div className="flex justify-between border-b border-slate-50 pb-1 text-slate-400"><span>Total Solids (TS = Fat + SNF)</span> <span className="font-mono text-slate-600">{result.ts.toFixed(4)}%</span></div> <div className="flex justify-between border-b border-slate-50 pb-1"><span>Temperature</span> <span className="font-mono">{result.tempVal.toFixed(1)}°C</span></div> <div className="flex justify-between border-b border-slate-50 pb-1"><span>Quantity</span> <span className="font-mono">{result.qtyVal} L</span></div> <div className="flex justify-between border-b border-slate-50 pb-1 text-slate-400"><span>Total TS (TS% × Qty / {settings.tsDivisor})</span> <span className="font-mono text-slate-600">{result.totalTs.toFixed(2)}</span></div> <div className="flex justify-between border-b border-slate-50 pb-1"><span>Pricing Method</span> <span className="font-medium text-slate-700">TS-Based</span></div> <div className="flex justify-between border-b border-slate-50 pb-1 text-slate-400"><span>Formula ({result.ts.toFixed(2)} ÷ {settings.tsDivisor}) × {settings.baseRate}</span> <span className="font-mono text-slate-600">Rs. {result.pricePerLiter.toFixed(4)}</span></div> <div className="flex justify-between border-b border-slate-50 pb-1 font-bold text-slate-800"><span>Price/Liter</span> <span className="font-mono">Rs. {result.pricePerLiter.toFixed(4)}</span></div> <div className="flex justify-between pb-1 font-bold text-blue-600"><span>Total Payable</span> <span className="font-mono">Rs. {result.totalPayable.toFixed(2)}</span></div> </div> </div>

                 {result.messages.length > 0 && (
                   <div className="space-y-2 mt-4 pt-4 border-t border-slate-100"> <p className="text-[10px] uppercase font-bold text-red-500">Flags / Errors</p>
                     {result.messages.map((msg, idx) => (
                       <div key={idx} className="bg-red-50 text-red-700 px-3 py-2 rounded text-xs font-medium border border-red-100">
                         {msg}
                       </div>
                     ))}
                   </div>
                 )}
               </div> <div className="p-3 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-2"> <button className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                   🖨 Print Fat Slip
                 </button> <button 
                   onClick={handleSaveToHistory}
                   disabled={isLogged}
                   className={`px-3 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-colors ${isLogged ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'}`}
                 >
                    {isLogged ? 'Saved' : 'Save to History'}
                 </button> <button onClick={resetForm} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                    New Entry
                 </button> </div> </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl h-full flex flex-col items-center justify-center p-8 text-center text-slate-400"> <TestTube className="w-12 h-12 mb-3 text-slate-300" /> <p className="font-medium text-sm">Enter lab readings and process batch to view the quality report.</p> </div>
          )}
        </div> </div>

      {/* Utilities / Converter */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mt-6 w-full max-w-lg"> <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100"> <Scale className="w-5 h-5 text-indigo-500" /> <h3 className="font-bold text-slate-800">Kg to Liters Converter</h3> </div> <div className="grid grid-cols-2 gap-4 items-end"> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Weight (Kg)</label> <input type="number" step="0.01" name="kg" value={converter.kg} onChange={handleConverterChange} placeholder="Enter Kg" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-mono outline-none focus:border-indigo-500" /> </div> <div> <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Density</label> <input type="number" step="0.001" name="density" value={converter.density} onChange={handleConverterChange} placeholder="1.032" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-mono outline-none focus:border-indigo-500" /> </div> </div> <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between"> <div> <p className="text-[10px] uppercase font-bold text-slate-500">Result (Liters)</p> <p className="text-xl font-black font-mono text-indigo-700">{converter.liters || '0.00'}</p> </div> <button 
              type="button"
              onClick={setConvertedLitersToForm}
              disabled={!converter.liters}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use in Form
            </button> </div> </div> </div>
  );
}
