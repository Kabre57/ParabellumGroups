'use client';

import React, { useEffect, useRef } from 'react';

interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onClose: () => void;
  showFooter?: boolean;
  orientation?: 'portrait' | 'landscape';
  hideDefaultHeader?: boolean;
  companyName?: string;
  logoSrc?: string;
  logoAlt?: string;
  footerLines?: string[];
  children: React.ReactNode;
}

const buildPrintDocument = (content: string, origin: string, orientation: 'portrait' | 'landscape') => `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${origin}/" />
    <title></title>
    <style>
      @page {
        size: A4 ${orientation};
        margin: 10mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
      }

      body {
        font-family: Arial, sans-serif;
        color: #000;
        line-height: 1.3;
      }

      .print-sheet {
        width: ${orientation === 'landscape' ? '277mm' : '190mm'};
        min-height: ${orientation === 'landscape' ? '190mm' : '277mm'};
        margin: 0 auto;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }

      .print-body {
        flex: 1;
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
        margin-top: auto;
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
        table-layout: fixed;
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

      .table-print td {
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
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

      .flex {
        display: flex;
      }

      .items-center {
        align-items: center;
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;

export default function PrintLayout({
  title,
  subtitle,
  meta,
  onClose,
  showFooter = true,
  orientation = 'portrait',
  hideDefaultHeader = false,
  companyName = 'PROGITECK',
  logoSrc = '/progiteck.jpg',
  logoAlt = 'Logo',
  footerLines = [
    'SARL au capital de 5 000 000 FCFA Siège Social Abengourou/Treichville RCCM N° CI-ABG-2021-M2-104',
    'N°CC : 2029843Z- Email : progiteck31@gmail.com – TEL : 225 0576208494/0142649927/0143859286',
    'N° de compte Bancaire : n°CI121 01302 034304800201 24 ORABANK',
  ],
  children,
}: PrintLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const html = buildPrintDocument(node.outerHTML, window.location.origin, orientation);
    let finalized = false;
    let iframe: HTMLIFrameElement | null = document.createElement('iframe');

    const finalize = () => {
      if (finalized) return;
      finalized = true;
      if (iframe?.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = null;
      onClose();
    };

    const printFromIframe = () => {
      if (!iframe) {
        finalize();
        return;
      }

      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        finalize();
        return;
      }

      printWindow.onafterprint = finalize;
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          finalize();
        }
      }, 250);
    };

    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.onload = printFromIframe;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      finalize();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const timeout = window.setTimeout(() => {
      if (!finalized) {
        printFromIframe();
      }
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
      finalize();
    };
  }, [onClose, title, orientation]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-99999px',
        top: 0,
        width: orientation === 'landscape' ? '297mm' : '210mm',
        pointerEvents: 'none',
        opacity: 0,
      }}
    >
      <div ref={containerRef} className="print-sheet">
        {!hideDefaultHeader && (
          <div className="print-header">
            <div className="flex items-center" style={{ gap: 12 }}>
              <img
                src={logoSrc}
                alt={logoAlt}
                className="print-logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <div className="print-title">{companyName}</div>
                <div className="print-subtitle">{title}</div>
                {subtitle && <div className="print-subtitle">{subtitle}</div>}
              </div>
            </div>
            {meta && <div className="print-meta">{meta}</div>}
          </div>
        )}

        <div className="print-body">{children}</div>

        {showFooter && footerLines.length > 0 && (
          <div className="print-footer">
            {footerLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
