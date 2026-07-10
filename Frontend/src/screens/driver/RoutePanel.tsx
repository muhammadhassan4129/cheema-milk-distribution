import React, { useState } from 'react';
import { useRouteContext } from '../../contexts/RouteContext';
import { MapPin, Plus, Trash2, Edit, Save, X, Navigation } from 'lucide-react';
import { Route, RouteStop } from '../../types';

export default function RoutePanel() {
  const { routes, addRoute, updateRoute, deleteRoute } = useRouteContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Route, 'id'>>({
    name: '',
    stops: [],
    length: '',
    travelTime: '',
    cost: 0
  });

  const [newStopName, setNewStopName] = useState('');

  const handleAddStop = () => {
    if (!newStopName.trim()) return;
    if (formData.stops.length >= 5) {
      alert("Up to 5 locations can be added per route as requested.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, { id: Date.now().toString(), name: newStopName.trim() }]
    }));
    setNewStopName('');
  };

  const handleRemoveStop = (id: string) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== id)
    }));
  };

  const startEdit = (route: Route) => {
    setIsEditing(true);
    setEditingId(route.id);
    setFormData(route);
  };

  const startNew = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormData({
      name: '',
      stops: [],
      length: '',
      travelTime: '',
      cost: 0
    });
  };

  const save = () => {
    if (!formData.name) return;
    if (editingId) {
      updateRoute(editingId, formData);
    } else {
      addRoute(formData);
    }
    cancel();
  };

  const cancel = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6"> <div className="flex justify-between items-center"> <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2"> <Navigation className="w-6 h-6 text-indigo-600" /> <span>My Routes</span> </h2>
        {!isEditing && (
          <button
            onClick={startNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center space-x-2 transition-colors"
          > <Plus className="w-5 h-5" /> <span>Add Route</span> </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6"> <h3 className="text-lg font-bold text-slate-800 mb-4">{editingId ? 'Edit Route' : 'New Route'}</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Route Name (e.g. Lahore to Karachi)</label> <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter route name"
              /> </div> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Length (e.g. 1200 km)</label> <input 
                type="text" 
                value={formData.length} 
                onChange={(e) => setFormData({...formData, length: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. 1200 km"
              /> </div> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Travel Time (e.g. 15 hrs)</label> <input 
                type="text" 
                value={formData.travelTime} 
                onChange={(e) => setFormData({...formData, travelTime: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. 15 hrs 30 mins"
              /> </div> <div> <label className="block text-sm font-semibold text-slate-700 mb-1">Total Cost (PKR)</label> <input 
                type="number" 
                value={formData.cost} 
                onChange={(e) => setFormData({...formData, cost: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. 45000"
              /> </div> </div> <div className="mb-4"> <label className="block text-sm font-semibold text-slate-700 mb-1">Locations (Max 5)</label> <div className="flex space-x-2 mb-2"> <input 
                type="text" 
                value={newStopName} 
                onChange={(e) => setNewStopName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Add stop name (e.g. Multan)"
                disabled={formData.stops.length >= 5}
              /> <button 
                onClick={handleAddStop}
                disabled={formData.stops.length >= 5}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-medium flex items-center disabled:opacity-50"
              > <Plus className="w-4 h-4 mr-1" /> Add
              </button> </div>
            {formData.stops.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.stops.map((stop, idx) => (
                  <div key={stop.id} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full flex items-center text-sm font-medium border border-indigo-100"> <span className="w-5 h-5 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-xs mr-2">{idx + 1}</span>
                    {stop.name}
                    <button onClick={() => handleRemoveStop(stop.id)} className="ml-2 hover:text-red-500"> <X className="w-3 h-3" /> </button> </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic mt-2">No locations added yet.</p>
            )}
          </div> <div className="flex justify-start space-x-3 mt-6"> <button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md font-medium flex items-center"> <Save className="w-4 h-4 mr-2" /> Save Route
            </button> <button onClick={cancel} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-md font-medium text-sm">
              Cancel
            </button> </div> </div>
      )}

      {/* Routes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {routes.map(route => (
          <div key={route.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"> <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center"> <h3 className="font-bold text-slate-800 text-lg flex items-center"> <Navigation className="w-5 h-5 text-indigo-500 mr-2" />
                {route.name}
              </h3> <div className="flex space-x-2"> <button onClick={() => startEdit(route)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"> <Edit className="w-4 h-4" /> </button> <button onClick={() => deleteRoute(route.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"> <Trash2 className="w-4 h-4" /> </button> </div> </div> <div className="p-5"> <div className="flex flex-col mb-6 relative">
                {route.stops.map((stop, idx) => (
                  <div key={stop.id} className="flex flex-row items-stretch"> <div className="flex flex-col items-center mr-4"> <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-600 z-10">
                        {idx === 0 || idx === route.stops.length - 1 ? (
                          <MapPin className="w-3 h-3 text-indigo-700" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      {idx < route.stops.length - 1 && (
                        <div className="w-0.5 bg-indigo-200 flex-1 my-1" />
                      )}
                    </div> <div className={`pb-5 pt-0.5 text-sm ${idx === 0 ? 'font-bold text-slate-800' : idx === route.stops.length - 1 ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                      {stop.name}
                    </div> </div>
                ))}
                {route.stops.length === 0 && <span className="text-sm text-slate-500 italic">No locations configured.</span>}
              </div> <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4 border border-slate-100"> <div> <p className="text-xs uppercase font-bold text-slate-500 mb-1">Total Length</p> <p className="font-semibold text-slate-800">{route.length || 'N/A'}</p> </div> <div> <p className="text-xs uppercase font-bold text-slate-500 mb-1">Est. Time</p> <p className="font-semibold text-slate-800">{route.travelTime || 'N/A'}</p> </div> <div> <p className="text-xs uppercase font-bold text-slate-500 mb-1">Total Cost</p> <p className="font-semibold text-green-600 text-lg">Rs {route.cost.toLocaleString()}</p> </div> </div> </div> </div>
        ))}
        {routes.length === 0 && !isEditing && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300"> <Navigation className="w-12 h-12 text-slate-300 mx-auto mb-3" /> <p className="text-slate-500 font-medium">No routes configured yet.</p> <p className="text-slate-400 text-sm mt-1">Add a new route to get started.</p> </div>
        )}
      </div> </div>
  );
}
