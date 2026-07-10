import React, { useState } from 'react';
import { useRouteCollectionContext } from '../../contexts/RouteCollectionContext';
import { MilkCollectionStop, RouteCollection, TestResult } from '../../types';
import { TestTube, Save, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function LabRouteCollections() {
  const { collections, updateCollection } = useRouteCollectionContext();
  const [selectedCol, setSelectedCol] = useState<RouteCollection | null>(null);
  
  // Create a deep copy of stops for editing tests
  const [editingStops, setEditingStops] = useState<MilkCollectionStop[]>([]);

  const handleSelect = (col: RouteCollection) => {
    setSelectedCol(col);
    setEditingStops(JSON.parse(JSON.stringify(col.stops)));
  };

  const updateTest = (stopId: string, test: keyof MilkCollectionStop, value: TestResult) => {
    setEditingStops(prev => prev.map(s => s.id === stopId ? { ...s, [test]: value } : s));
  };

  const getTestColor = (result: TestResult) => {
    if (result === 'Pass') return 'text-green-600 bg-green-50 border-green-200';
    if (result === 'Fail') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const saveTests = () => {
    if (!selectedCol) return;
    updateCollection(selectedCol.id, { 
      stops: editingStops,
      status: 'Lab Tested'
    });
    setSelectedCol(null);
  };

  // Only show Submitted or Lab Tested for Lab panel
  const labCollections = collections.filter(c => c.status !== 'Draft');

  return (
    <div className="space-y-6"> <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200"> <div> <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2"> <TestTube className="w-6 h-6 text-indigo-600" /> <span>Lab Testing: Route Collections</span> </h2> <p className="text-slate-500 mt-1">Select a route collection to enter test results for each location.</p> </div> </div> <div className="grid grid-cols-1 lg:grid-cols-4 gap-6"> <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]"> <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700">Incoming Collections</div> <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {labCollections.map(col => (
              <div 
                key={col.id} 
                onClick={() => handleSelect(col)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedCol?.id === col.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
              > <div className="font-bold text-slate-800 text-sm mb-1">{col.routeName}</div> <div className="text-xs text-slate-500 flex justify-between"> <span>{col.date}</span> <span className={`font-semibold ${col.status === 'Lab Tested' ? 'text-green-600' : 'text-amber-600'}`}>{col.status}</span> </div> </div>
            ))}
            {labCollections.length === 0 && (
              <div className="text-center p-4 text-slate-500 text-sm font-medium">No collections available for testing.</div>
            )}
          </div> </div> <div className="lg:col-span-3">
          {selectedCol ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"> <div> <h3 className="font-bold text-slate-800 text-lg">{selectedCol.routeName}</h3> <div className="text-sm text-slate-500 mt-1 flex space-x-4"> <span>Date: <span className="font-medium text-slate-700">{selectedCol.date}</span></span> <span>Tanker: <span className="font-medium text-slate-700">{selectedCol.tankerNumber}</span></span> </div> </div> <button 
                  onClick={saveTests}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm flex items-center"
                > <Save className="w-4 h-4 mr-2" /> Save lab results
                </button> </div> <div className="p-0 overflow-x-auto"> <table className="w-full text-sm text-left"> <thead className="bg-slate-100 text-slate-600 border-b border-slate-200"> <tr> <th className="px-4 py-3 font-semibold">Location</th> <th className="px-4 py-3 font-semibold text-center w-24">Organo</th> <th className="px-4 py-3 font-semibold text-center w-24">Glucose</th> <th className="px-4 py-3 font-semibold text-center w-24">Starch</th> <th className="px-4 py-3 font-semibold text-center w-24">APT</th> <th className="px-4 py-3 font-semibold text-center w-24">AB Test</th> </tr> </thead> <tbody>
                    {editingStops.map(stop => (
                      <tr key={stop.id} className="border-b border-slate-100 hover:bg-slate-50"> <td className="px-4 py-4"> <div className="font-bold text-slate-800">{stop.locationName}</div> <div className="text-xs text-slate-500 mt-0.5">
                            {stop.milkLiter} L | {stop.fat} Fat | {stop.snf} SNF
                          </div> </td>
                        {(['organoTest', 'glucoseTest', 'starchTest', 'aptTest', 'abTest'] as const).map(test => (
                          <td key={test} className="px-2 py-4"> <select 
                              value={stop[test]}
                              onChange={(e) => updateTest(stop.id, test, e.target.value as TestResult)}
                              className={`w-full text-xs font-bold border rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${getTestColor(stop[test] as TestResult)}`}
                            > <option value="Pending">Pending</option> <option value="Pass">Pass</option> <option value="Fail">Fail</option> </select> </td>
                        ))}
                      </tr>
                    ))}
                  </tbody> </table> </div> </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]"> <TestTube className="w-16 h-16 mb-4 text-slate-300" /> <p className="font-medium text-lg text-slate-500">Select a collection route from the list to add test results.</p> </div>
          )}
        </div> </div> </div>
  );
}
