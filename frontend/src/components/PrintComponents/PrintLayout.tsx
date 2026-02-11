'use client';

import React, { useEffect } from 'react';

interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onClose: () => void;
  showFooter?: boolean;
  children: React.ReactNode;
}

export default function PrintLayout({
  title,
  subtitle,
  meta,
  onClose,
  showFooter = true,
  children,
}: PrintLayoutProps) {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-container, .print-container * {
          visibility: visible;
        }
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        @page {
          margin: 10mm;
          size: A4 portrait;
        }
        body {
          margin: 0;
          padding: 0;
        }
      }
    `;
    document.head.appendChild(style);

    const timer = setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.head.removeChild(style);
        onClose();
      }, 100);
    }, 300);

    return () => {
      clearTimeout(timer);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [onClose]);

  return (
    <div className="print-container" style={{ display: 'none' }}>
      <style jsx global>{`
        .print-container {
          font-family: Arial, sans-serif;
          color: #000;
          line-height: 1.3;
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          margin: 0 auto;
          background: #fff;
          box-sizing: border-box;
        }
        @media print {
          .print-container {
            display: block !important;
            width: 100% !important;
            min-height: 100% !important;
            padding: 10mm !important;
          }
        }
        .print-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
          gap: 12px;
        }
        .print-title {
          font-size: 18px;
          font-weight: bold;
        }
        .print-subtitle {
          font-size: 12px;
          color: #333;
          margin-top: 2px;
        }
        .print-meta {
          font-size: 11px;
          text-align: right;
          white-space: pre-line;
        }
        .print-logo {
          width: 56px;
          height: 56px;
          object-fit: contain;
        }
        .print-footer {
          margin-top: 18px;
          padding-top: 8px;
          border-top: 1px solid #000;
          font-size: 10px;
          text-align: center;
          color: #444;
        }
        .section-title {
          font-size: 13px;
          font-weight: bold;
          margin: 12px 0 6px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #000;
        }
        .table-print {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0 12px 0;
        }
        .table-print th,
        .table-print td {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 11px;
          text-align: left;
          vertical-align: top;
        }
        .table-print th {
          background: #f0f0f0;
        }
        .text-muted {
          color: #555;
          font-size: 11px;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .block {
          display: block;
        }
      `}</style>

      <div className="print-header">
        <div className="flex items-center" style={{ gap: 12 }}>
          <img
            src="/parabellum.jpg"
            alt="Parabellum Logo"
            className="print-logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <div className="print-title">PARABELLUM GROUP</div>
            <div className="print-subtitle">{title}</div>
            {subtitle && <div className="print-subtitle">{subtitle}</div>}
          </div>
        </div>
        {meta && <div className="print-meta">{meta}</div>}
      </div>

      {children}

      {showFooter && (
        <div className="print-footer">
          <div>PARABELLUM GROUP • Service Technique Professionnel</div>
          <div>Siège Social : Abidjan, Plateau • RCCM N° CI-ABJ-2024-M2-001 • NIF : 2024001A</div>
          <div>Email : contact@parabellumgroup.ci • Tél : +225 27 20 21 22 23</div>
          <div>Compte Bancaire : CI001 01010 10101010101 01 • UBA COTE D&apos;IVOIRE</div>
        </div>
      )}
    </div>
  );
}
