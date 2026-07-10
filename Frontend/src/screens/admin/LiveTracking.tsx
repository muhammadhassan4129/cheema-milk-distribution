import React, { useState } from 'react';
import { MapPin, Navigation, Truck } from 'lucide-react';
import { useVehicleContext } from '../../contexts/VehicleContext';

export default function LiveTracking() {
  const { vehicles } = useVehicleContext();
  
  // Get active/online tracking vehicles (On Route or Available)
  const activeVehicles = vehicles.filter(v => v.status === 'On Route' || v.status === 'Available');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(activeVehicles[0]?.id || null);

  const selectedVehicle = activeVehicles.find(v => v.id === selectedVehicleId) || activeVehicles[0];

  // Helper mock coordinate generator
  const getMockCoords = (index: number) => {
    const baseLat = 31.5204;
    const baseLng = 74.3587;
    return {
      lat: baseLat + (index * 0.015 - 0.01),
      lng: baseLng + (index * 0.02 - 0.015),
    };
  };

  return (
    <div className="space-y-6 h-full flex flex-col"> <div className="flex flex-col gap-6 flex-1 lg:flex-row">
        {/* Map Area */}
        <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden relative shadow-lg min-h-[350px]"> <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded border text-[10px] font-bold text-slate-800 shadow-sm leading-none flex items-center gap-2">
            
            ACTIVE VEHICLES MAP
          </div> <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Map Grid Pattern */}
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full opacity-25 absolute inset-0">
               {Array.from({ length: 64 }).map((_, i) => (
                 <div key={i} className="border-[0.5px] border-slate-650"></div>
               ))}
            </div>

            {/* Simulated Route Line */}
            {selectedVehicle && (
              <div className="absolute inset-x-12 inset-y-24 border border-indigo-500/10 rounded-full border-dashed pointer-events-none animate-pulse"></div>
            )}

            {/* Markers */}
            {activeVehicles.map((vehicle, index) => {
              const coords = getMockCoords(index);
              const isSelected = selectedVehicle?.id === vehicle.id;
              // Creating a pseudo-random but fixed position distribution for visual purposes on this grid map
              const leftPercent = 25 + ((index * 29) % 50);
              const topPercent = 25 + ((index * 19) % 50);
              
              return (
                <button 
                  key={vehicle.id}
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  className={`absolute flex items-center justify-center w-9 h-9 rounded-full border shadow-2xl z-20 transition-all cursor-pointer hover:scale-115 ${
                    isSelected 
                      ? 'bg-blue-600 border-white text-white font-black text-xs ring-4 ring-blue-500/30' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 ring-2 ring-slate-600 font-bold text-[10px]'
                  }`}
                  style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                > <Truck className="w-4 h-4" /> <div className={`absolute -bottom-6 bg-slate-900 border border-slate-705 text-white text-[9px] px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap transition-opacity ${
                    isSelected ? 'opacity-100 z-30 font-bold' : 'opacity-70'
                  }`}>
                    {vehicle.vehicleNumber}
                  </div> </button>
              );
            })}

            {selectedVehicle && (
              <p className="absolute text-slate-300 font-mono text-[9px] bottom-3 right-3 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg">
                {getMockCoords(vehicles.indexOf(selectedVehicle)).lat.toFixed(4)}° N, {getMockCoords(vehicles.indexOf(selectedVehicle)).lng.toFixed(4)}° E
              </p>
            )}
          </div> </div>

        {/* Info Panel */}
        <div className="w-full lg:w-72 bg-white border rounded-xl flex flex-col shadow-sm max-h-full overflow-hidden"> <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50"> <h3 className="font-bold text-slate-800 text-sm">Active Vehicle Details</h3> <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Active: {activeVehicles.length}</span> </div> <div className="flex-1 overflow-y-auto">
            {selectedVehicle ? (
              <div className="p-4 space-y-4"> <div> <p className="text-[10px] uppercase font-bold text-slate-400">Vehicle Type</p> <p className="font-semibold text-slate-700 text-sm">{selectedVehicle.name}</p> </div> <div> <p className="text-[10px] uppercase font-bold text-slate-400">Reg Number</p> <p className="font-semibold text-indigo-950 font-mono text-sm font-bold">{selectedVehicle.vehicleNumber}</p> </div> <div> <p className="text-[10px] uppercase font-bold text-slate-400">Driver Contact</p> <p className="font-semibold text-slate-700 text-xs">{selectedVehicle.driverPhone || 'N/A'}</p> </div> <div> <p className="text-[10px] uppercase font-bold text-slate-400">IMEI Tracking ID</p> <p className="font-semibold text-slate-700 font-mono text-xs">{selectedVehicle.imei || 'N/A'}</p> </div> <div> <p className="text-[10px] uppercase font-bold text-slate-400">Status</p> <span className={`inline-block text-[10px] uppercase font-black px-2 py-0.5 rounded-full mt-1 ${
                    selectedVehicle.status === 'On Route' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedVehicle.status}
                  </span> </div> <div className="pt-4 border-t border-slate-100"> <button className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 py-1.5 rounded-md text-xs font-bold transition-colors">
                    View Fleet Statistics
                  </button> </div> </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                No active fleet vehicles.
              </div>
            )}
          </div>
          
          {/* Active Vehicle List */}
          <div className="border-t border-slate-200 bg-slate-50 p-3 h-48 overflow-y-auto"> <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Fleet Online</h4> <div className="space-y-2">
               {activeVehicles.map(v => (
                 <button 
                   key={v.id} 
                   onClick={() => setSelectedVehicleId(v.id)}
                   className={`w-full text-left p-2 rounded border text-xs transition-colors ${selectedVehicleId === v.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
                 > <div className="font-bold text-slate-700">{v.vehicleNumber} ({v.name})</div> <div className="text-slate-500 text-[10px]">{v.driverPhone} • {v.status}</div> </button>
               ))}
             </div> </div> </div> </div> </div>
  );
}
