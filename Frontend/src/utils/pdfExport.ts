import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

interface PdfColumn {
  header: string;
  dataKey: string;
}

export const downloadTransactionsPDF = (
  title: string,
  columns: PdfColumn[],
  data: any[],
  filename: string
) => {
  const doc = new jsPDF();

  // Print Header
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Use the autoTable plugin
  autoTable(doc, {
    startY: 30,
    head: [columns.map(c => c.header)],
    body: data.map(item => columns.map(c => item[c.dataKey])),
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 118, 110] }, // Tailwind emerald-700
  });

  doc.save(`${filename}.pdf`);
};
