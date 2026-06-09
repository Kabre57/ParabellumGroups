'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

interface PayslipMoneyRow {
  code: string | number;
  label: string;
  base?: number;
  hourDay?: number | string;
  workDays?: number | string;
  amount: number;
}

interface PayslipDeductionRow extends PayslipMoneyRow {
  rate?: number;
}

interface CompanyInfo {
  name?: string;
  sigle?: string;
  address?: string;
  immatriculationCNPS?: string;
  cnamNumber?: string;
  fdfpNumber?: string;
  idu?: string;
  rccm?: string;
  compteContribuable?: string;
  phone?: string;
  email?: string;
}

interface EmployeeInfo {
  firstName: string;
  lastName: string;
  matricule?: string;
  cnpsNumber?: string;
  cnamNumber?: string;
  position?: string;
  department?: string;
  category?: string;
  convention?: string;
  taxParts?: number;
  hireDate?: string;
  salaryType?: string;
}

interface SalaryYearCumul {
  fiscalDays?: number;
  taxableGross?: number;
  taxableBase?: number;
  incomeTax?: number;
  cmuContribution?: number;
  cnpsBase?: number;
  pensionContribution?: number;
}

interface PayslipSalary {
  id: string;
  employer?: CompanyInfo;
  employee?: EmployeeInfo;
  period: string;
  createdAt: string;
  gains?: PayslipMoneyRow[];
  deductions?: PayslipDeductionRow[] | number;
  netSalary: number;
  returnFromLeave?: string;
  leaveDaysAccumulated?: number;
  leaveBase?: number;
  yearCumul?: SalaryYearCumul;
}

interface PayslipPrintProps {
  salary: PayslipSalary;
  onClose: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  sheet: {
    border: '2px solid #222',
    color: '#111',
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
    lineHeight: 1.15,
  },
  companyTitle: {
    borderBottom: '2px solid #222',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0,
    padding: '4px 8px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 150px',
    borderBottom: '2px solid #222',
  },
  employerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },
  cell: {
    borderRight: '1px solid #222',
    padding: '4px 6px',
    minHeight: 44,
  },
  payslipBox: {
    padding: '6px',
    textAlign: 'center',
    fontWeight: 700,
  },
  employeeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    borderBottom: '2px solid #222',
  },
  employeeCell: {
    borderRight: '1px solid #222',
    padding: '4px 6px',
    minHeight: 62,
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: '82px 1fr',
    gap: 4,
    marginBottom: 2,
  },
  label: {
    fontWeight: 700,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    borderBottom: '1px solid #222',
    borderRight: '1px solid #222',
    fontSize: 9,
    padding: '2px 3px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  td: {
    borderRight: '1px solid #222',
    padding: '2px 4px',
    height: 18,
    verticalAlign: 'top',
  },
  amount: {
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  totalsRow: {
    borderTop: '1px solid #222',
    fontWeight: 700,
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderTop: '2px solid #222',
  },
  bottomCell: {
    borderRight: '1px solid #222',
    padding: '4px 6px',
    minHeight: 50,
  },
  signature: {
    border: '1px solid #222',
    height: 42,
    padding: 4,
    textAlign: 'center',
  },
  cumulGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderTop: '2px solid #222',
    padding: '4px 6px',
    minHeight: 80,
  },
  legal: {
    borderTop: '2px solid #222',
    padding: '8px 10px',
    fontSize: 10,
  },
};

export default function PayslipPrint({ salary, onClose }: PayslipPrintProps) {
  const { companyName } = useEnterpriseLogo();

  const company = salary.employer || {};
  const employee = salary.employee || { firstName: '', lastName: '' };

  const formatDate = (date?: string | Date) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount?: number) =>
    new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.round(Number(amount || 0)));

  const formatRate = (rate?: number) =>
    new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(Number(rate || 0));

  const formatPeriod = (period: string) => {
    const date = new Date(`${period}-01`);
    if (Number.isNaN(date.getTime())) return period;
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const gains = Array.isArray(salary.gains) ? salary.gains : [];
  const deductionRows = Array.isArray(salary.deductions) ? salary.deductions : [];
  const totalGains = gains.reduce((sum, gain) => sum + Number(gain.amount || 0), 0);
  const totalRetenues = Array.isArray(salary.deductions)
    ? deductionRows.reduce((sum, deduction) => sum + Number(deduction.amount || 0), 0)
    : Number(salary.deductions || 0);
  const netSalary = Number(salary.netSalary || totalGains - totalRetenues);
  const companyLabel = company.sigle || company.name || companyName || 'Parabellum Groups';
  const periodLabel = formatPeriod(salary.period);
  const year = salary.period?.slice(0, 4) || new Date().getFullYear();
  const blankRows = Math.max(0, 13 - gains.length - deductionRows.length);

  return (
    <PrintLayout
      title="BULLETIN DE PAIE"
      onClose={onClose}
      hideDefaultHeader
      showFooter={false}
    >
      <div style={styles.sheet}>
        <div style={styles.companyTitle}>{companyLabel}</div>

        <div style={styles.topGrid}>
          <div style={styles.employerGrid}>
            <div style={styles.cell}>
              <strong>ZONE INDUSTRIELLE</strong>
              <br />
              {company.address || ''}
              {company.phone ? (
                <>
                  <br />
                  Tel: {company.phone}
                </>
              ) : null}
            </div>
            <div style={{ ...styles.cell, borderRight: 0 }}>
              <div><strong>Immatriculation CNPS</strong> {company.immatriculationCNPS || ''}</div>
              <div><strong>R.C.C.M</strong> {company.rccm || ''}</div>
              <div><strong>IDU</strong> {company.idu || ''}</div>
              <div><strong>Compte Contribuable</strong> {company.compteContribuable || ''}</div>
              <div><strong>CNAM</strong> {company.cnamNumber || ''}</div>
              <div><strong>FDFP</strong> {company.fdfpNumber || ''}</div>
            </div>
          </div>
          <div style={styles.payslipBox}>
            BULLETIN DE PAIE
            <br />
            <span style={{ fontSize: 11 }}>{periodLabel}</span>
          </div>
        </div>

        <div style={styles.employeeGrid}>
          <div style={styles.employeeCell}>
            <div style={styles.infoRow}><span style={styles.label}>Affectation</span><span>{employee.position || ''}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Service</span><span>{employee.department || ''}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Fonction</span><span>{employee.position || ''}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Categories</span><span>{employee.category || ''}</span></div>
          </div>
          <div style={styles.employeeCell}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {`${employee.lastName || ''} ${employee.firstName || ''}`.trim()}
            </div>
            <div style={styles.infoRow}><span style={styles.label}>Matricule</span><span>{employee.matricule || ''}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Parts fiscales</span><span>{employee.taxParts ?? ''}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Date embauche</span><span>{formatDate(employee.hireDate)}</span></div>
          </div>
          <div style={{ ...styles.employeeCell, borderRight: 0 }}>
            <div style={styles.infoRow}><span style={styles.label}>Convention</span><span>{employee.convention || 'Industries'}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Salarie</span><span>{employee.salaryType || 'Mensuel'}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Numero CNPS</span><span>{employee.cnpsNumber || ''}</span></div>
            <div style={styles.infoRow}><span style={styles.label}>Numero CNAM</span><span>{employee.cnamNumber || ''}</span></div>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 42 }}>Codes</th>
              <th style={styles.th}>Libelles</th>
              <th style={{ ...styles.th, width: 92 }}>Bases</th>
              <th style={{ ...styles.th, width: 55 }}>Hr/Jr</th>
              <th style={{ ...styles.th, width: 92 }}>Gains</th>
              <th style={{ ...styles.th, width: 92, borderRight: 0 }}>Retenues</th>
            </tr>
          </thead>
          <tbody>
            {gains.map((gain, index) => (
              <tr key={`gain-${index}`}>
                <td style={styles.td}>{gain.code}</td>
                <td style={styles.td}>{gain.label}</td>
                <td style={{ ...styles.td, ...styles.amount }}>{gain.base !== undefined ? formatAmount(gain.base) : ''}</td>
                <td style={{ ...styles.td, ...styles.amount }}>{gain.workDays ?? gain.hourDay ?? ''}</td>
                <td style={{ ...styles.td, ...styles.amount }}>{formatAmount(gain.amount)}</td>
                <td style={{ ...styles.td, ...styles.amount, borderRight: 0 }} />
              </tr>
            ))}

            {deductionRows.map((deduction, index) => (
              <tr key={`deduction-${index}`}>
                <td style={styles.td}>{deduction.code}</td>
                <td style={styles.td}>{deduction.label}</td>
                <td style={{ ...styles.td, ...styles.amount }}>{deduction.base !== undefined ? formatAmount(deduction.base) : ''}</td>
                <td style={{ ...styles.td, ...styles.amount }}>{deduction.rate !== undefined ? `${formatRate(deduction.rate)}%` : ''}</td>
                <td style={{ ...styles.td, ...styles.amount }} />
                <td style={{ ...styles.td, ...styles.amount, borderRight: 0 }}>{formatAmount(deduction.amount)}</td>
              </tr>
            ))}

            {Array.from({ length: blankRows }).map((_, index) => (
              <tr key={`blank-${index}`}>
                <td style={styles.td}>&nbsp;</td>
                <td style={styles.td} />
                <td style={styles.td} />
                <td style={styles.td} />
                <td style={styles.td} />
                <td style={{ ...styles.td, borderRight: 0 }} />
              </tr>
            ))}

            <tr style={styles.totalsRow}>
              <td style={styles.td} />
              <td style={styles.td}>Sous totaux</td>
              <td style={styles.td} />
              <td style={styles.td} />
              <td style={{ ...styles.td, ...styles.amount }}>{formatAmount(totalGains)}</td>
              <td style={{ ...styles.td, ...styles.amount, borderRight: 0 }}>{formatAmount(totalRetenues)}</td>
            </tr>
            <tr>
              <td style={styles.td} />
              <td style={styles.td}>Salaire net</td>
              <td style={styles.td} />
              <td style={styles.td} />
              <td style={{ ...styles.td, ...styles.amount }}>{formatAmount(netSalary)}</td>
              <td style={{ ...styles.td, borderRight: 0 }} />
            </tr>
            <tr style={styles.totalsRow}>
              <td style={styles.td} />
              <td style={styles.td}>Totaux</td>
              <td style={styles.td} />
              <td style={styles.td} />
              <td style={{ ...styles.td, ...styles.amount }}>{formatAmount(totalGains)}</td>
              <td style={{ ...styles.td, ...styles.amount, borderRight: 0 }}>{formatAmount(totalRetenues)}</td>
            </tr>
            <tr style={styles.totalsRow}>
              <td style={styles.td} />
              <td style={styles.td}>Net à payer</td>
              <td style={styles.td} />
              <td style={styles.td} />
              <td style={{ ...styles.td, ...styles.amount }}>{formatAmount(netSalary)}</td>
              <td style={{ ...styles.td, borderRight: 0 }} />
            </tr>
          </tbody>
        </table>

        <div style={styles.bottomGrid}>
          <div style={styles.bottomCell}>
            <div><strong>Retour conge</strong> {salary.returnFromLeave || ''}</div>
            <div><strong>Cumul jours</strong> {salary.leaveDaysAccumulated ?? ''}</div>
            <div><strong>Base conge</strong> {salary.leaveBase !== undefined ? formatAmount(salary.leaveBase) : ''}</div>
          </div>
          <div style={{ ...styles.bottomCell, borderRight: 0 }}>
            <div style={styles.signature}>Signature</div>
          </div>
        </div>

        <div style={styles.cumulGrid}>
          <div>
            <strong>CUMUL {year}</strong>
            <div>Jours fiscaux <span style={{ float: 'right' }}>{salary.yearCumul?.fiscalDays ?? ''}</span></div>
            <div>Brut imposable <span style={{ float: 'right' }}>{salary.yearCumul?.taxableGross !== undefined ? formatAmount(salary.yearCumul.taxableGross) : ''}</span></div>
          </div>
          <div>
            <div>Base imposable <span style={{ float: 'right' }}>{salary.yearCumul?.taxableBase !== undefined ? formatAmount(salary.yearCumul.taxableBase) : ''}</span></div>
            <div>Impot sur salaires <span style={{ float: 'right' }}>{salary.yearCumul?.incomeTax !== undefined ? formatAmount(salary.yearCumul.incomeTax) : ''}</span></div>
            <br />
            <div>Cotisation CMU <span style={{ float: 'right' }}>{salary.yearCumul?.cmuContribution !== undefined ? formatAmount(salary.yearCumul.cmuContribution) : ''}</span></div>
            <div>Base CNPS <span style={{ float: 'right' }}>{salary.yearCumul?.cnpsBase !== undefined ? formatAmount(salary.yearCumul.cnpsBase) : ''}</span></div>
            <div>Cotisation retraite <span style={{ float: 'right' }}>{salary.yearCumul?.pensionContribution !== undefined ? formatAmount(salary.yearCumul.pensionContribution) : ''}</span></div>
          </div>
        </div>

        <div style={styles.legal}>
          <strong>Mentions légales (Article L.143-3 du Code du Travail):</strong>
          <br />
          Le présent bulletin de paie doit être conservé sans limitation de durée. Il constitue une pièce justificative pour le calcul des droits à la retraite.
        </div>
      </div>
    </PrintLayout>
  );
}
