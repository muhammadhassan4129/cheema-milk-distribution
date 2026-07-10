import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { useLabContext } from '../../contexts/LabContext';

export default function LabReports() {
  const { labReports: labReportsContext } = useLabContext();
  
  const reports = [
    { id: 'SMP-20231012-05', date: '2023-10-12', fat: 4.5, snf: 8.5, status: 'Passed' },
    { id: 'SMP-20231012-04', date: '2023-10-12', fat: 4.2, snf: 8.3, status: 'Passed' },
    { id: 'SMP-20231011-03', date: '2023-10-11', fat: 3.1, snf: 7.9, status: 'Failed' },
    { id: 'SMP-20231011-02', date: '2023-10-11', fat: 4.8, snf: 8.6, status: 'Passed' },
    { id: 'SMP-20231010-01', date: '2023-10-10', fat: 4.0, snf: 8.4, status: 'Passed' },
    ...labReportsContext.map(r => ({
      id: r.batchNo,
      date: r.date,
      fat: r.fat,
      snf: r.snf,
      status: r.result
    }))
  ];

  return (
    <div className="space-y-6"> <div className="flex justify-between items-center"> <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historical Lab Reports</h1> <div className="flex space-x-2"> <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"> <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export All (Excel)</span> </button> </div> </div> <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full text-left border-collapse"> <thead> <tr className="bg-gray-50 dark:bg-gray-900/50"> <th className="py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-300">Sample Number</th> <th className="py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-300">Date Logged</th> <th className="py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-300">FAT %</th> <th className="py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-300">SNF %</th> <th className="py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-300">Quality Status</th> <th className="py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-300">Actions</th> </tr> </thead> <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50"> <td className="py-3 px-4 text-sm font-mono text-blue-600 dark:text-blue-400">{report.id}</td> <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{report.date}</td> <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{report.fat}%</td> <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{report.snf}%</td> <td className="py-3 px-4 text-sm"> <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'Passed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30'
                    }`}>
                      {report.status}
                    </span> </td> <td className="py-3 px-4 text-sm"> <div className="flex space-x-2"> <button className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400" title="View Full Report"> <Eye className="w-4 h-4" /> </button> <button className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" title="Download PDF"> <FileText className="w-4 h-4" /> </button> </div> </td> </tr>
              ))}
            </tbody> </table> </div> </div> </div>
  );
}
