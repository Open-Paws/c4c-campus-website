/**
 * ExportPanel Component
 * Agent 4: Visualization & Interaction Expert
 *
 * Export analytics data in multiple formats (CSV, PDF, Excel, PNG)
 */

import React, { useState } from 'react';
import * as XLSX from 'exceljs';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  chartId?: string;
  data: any[];
  filename?: string;
  title?: string;
}

export default function ExportPanel({
  chartId,
  data,
  filename = 'analytics-export',
  title = 'Analytics Report'
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportToCSV = async () => {
    try {
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${filename}.csv`);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, pageWidth / 2, 20, { align: 'center' });

      // Add timestamp
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

      let yPosition = 40;

      // Add chart image if chartId provided
      if (chartId) {
        const chartElement = document.getElementById(chartId);
        if (chartElement) {
          setProgress(30);
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');

          const imgWidth = pageWidth - 20;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        }
      }

      setProgress(60);

      // Add data table
      if (data && data.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data Summary', 10, yPosition);
        yPosition += 10;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');

        const headers = Object.keys(data[0]);
        const columnWidth = (pageWidth - 20) / headers.length;

        // Table headers
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, i) => {
          pdf.text(header, 10 + i * columnWidth, yPosition);
        });
        yPosition += 7;

        // Table rows
        pdf.setFont('helvetica', 'normal');
        data.slice(0, 20).forEach(row => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          headers.forEach((header, i) => {
            const value = String(row[header] || '');
            pdf.text(value.substring(0, 20), 10 + i * columnWidth, yPosition);
          });
          yPosition += 7;
        });

        if (data.length > 20) {
          pdf.text(`... and ${data.length - 20} more rows`, 10, yPosition + 5);
        }
      }

      setProgress(100);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const exportToPNG = async () => {
    if (!chartId) {
      alert('No chart available to export as image');
      return;
    }

    try {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        alert('Chart element not found');
        return;
      }

      setProgress(50);
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      setProgress(80);
      canvas.toBlob(blob => {
        if (blob) {
          downloadBlob(blob, `${filename}.png`);
          setProgress(100);
        }
      });
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('Failed to export image. Please try again.');
    }
  };

  const exportToExcel = async () => {
    try {
      const workbook = new XLSX.Workbook();
      workbook.creator = 'C4C Campus Analytics';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Analytics Data');

      // Add title
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = title;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add timestamp
      worksheet.mergeCells('A2:E2');
      const timestampCell = worksheet.getCell('A2');
      timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
      timestampCell.font = { size: 10 };
      timestampCell.alignment = { horizontal: 'center' };

      setProgress(30);

      // Add data
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);

        // Add headers
        worksheet.addRow([]);
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        setProgress(50);

        // Add data rows
        data.forEach(row => {
          const values = headers.map(h => row[h]);
          worksheet.addRow(values);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          if (column && column.eachCell) {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
              const cellValue = String(cell.value || '');
              maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = Math.min(50, Math.max(12, maxLength + 2));
          }
        });
      }

      setProgress(80);

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      downloadBlob(blob, `${filename}.xlsx`);
      setProgress(100);
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'png' | 'excel') => {
    setExporting(true);
    setProgress(0);

    try {
      switch (format) {
        case 'csv':
          await exportToCSV();
          break;
        case 'pdf':
          await exportToPDF();
          break;
        case 'png':
          await exportToPNG();
          break;
        case 'excel':
          await exportToExcel();
          break;
      }
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Export:
        </span>

        <button
          onClick={() => handleExport('csv')}
          disabled={exporting || !data?.length}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export to CSV"
        >
          📊 CSV
        </button>

        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting || !data?.length}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export to PDF"
        >
          📄 PDF
        </button>

        {chartId && (
          <button
            onClick={() => handleExport('png')}
            disabled={exporting}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export Chart as Image"
          >
            🖼️ PNG
          </button>
        )}

        <button
          onClick={() => handleExport('excel')}
          disabled={exporting || !data?.length}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export to Excel"
        >
          📈 Excel
        </button>
      </div>

      {exporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Exporting...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
