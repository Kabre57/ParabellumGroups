// Utilitaires pour la gestion des salaires

export const salaryHelpers = {
  // Calculer le salaire net
  calculateNetSalary: (
    baseSalary: number,
    overtime: number = 0,
    bonuses: number = 0,
    allowances: number = 0,
    socialContributions: number = 0,
    taxes: number = 0,
    otherDeductions: number = 0
  ) => {
    const grossSalary = baseSalary + overtime + bonuses + allowances;
    const totalDeductions = socialContributions + taxes + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    return {
      grossSalary: Math.round(grossSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100
    };
  },

  // Calculer les cotisations sociales (exemple pour la Côte d'Ivoire)
  calculateSocialContributions: (grossSalary: number) => {
    // Taux approximatifs pour la Côte d'Ivoire
    const cnpsRate = 0.036; // 3.6% CNPS employé
    const fdfpRate = 0.012; // 1.2% FDFP
    
    return {
      cnps: Math.round(grossSalary * cnpsRate * 100) / 100,
      fdfp: Math.round(grossSalary * fdfpRate * 100) / 100,
      total: Math.round(grossSalary * (cnpsRate + fdfpRate) * 100) / 100
    };
  },

  // Calculer l'impôt sur le revenu (barème progressif simplifié)
  calculateIncomeTax: (grossSalary: number) => {
    // Barème progressif simplifié pour la Côte d'Ivoire
    const annualSalary = grossSalary * 12;
    let tax = 0;

    if (annualSalary <= 500000) {
      tax = 0; // Exonéré
    } else if (annualSalary <= 1500000) {
      tax = (annualSalary - 500000) * 0.15; // 15%
    } else if (annualSalary <= 3000000) {
      tax = 150000 + (annualSalary - 1500000) * 0.20; // 20%
    } else {
      tax = 450000 + (annualSalary - 3000000) * 0.25; // 25%
    }

    return Math.round((tax / 12) * 100) / 100; // Mensuel
  },

  // Formater un montant en devise
  formatCurrency: (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  },

  // Générer un numéro de bulletin de paie
  generatePayslipNumber: (employeeNumber: string, date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `BP-${employeeNumber}-${year}${month}`;
  },

  // Calculer les jours travaillés dans le mois
  calculateWorkingDays: (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      
      // Exclure samedi (6) et dimanche (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  },

  // Calculer le salaire prorata temporis
  calculateProrata: (baseSalary: number, daysWorked: number, totalWorkingDays: number) => {
    return Math.round((baseSalary * daysWorked / totalWorkingDays) * 100) / 100;
  },

  // Valider les données de salaire
  validateSalaryData: (salaryData: any) => {
    const errors = [];

    if (!salaryData.employeeId) {
      errors.push('Employé requis');
    }

    if (!salaryData.baseSalary || salaryData.baseSalary < 0) {
      errors.push('Salaire de base invalide');
    }

    if (salaryData.overtime < 0) {
      errors.push('Heures supplémentaires invalides');
    }

    if (salaryData.socialContributions < 0) {
      errors.push('Cotisations sociales invalides');
    }

    if (salaryData.taxes < 0) {
      errors.push('Impôts invalides');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Générer les données pour l'export Excel
  generateExcelData: (salaries: any[]) => {
    return salaries.map(salary => ({
      'N° Employé': salary.employee.employeeNumber,
      'Nom': `${salary.employee.firstName} ${salary.employee.lastName}`,
      'Service': salary.employee.service?.name || '',
      'Poste': salary.employee.position,
      'Période': new Date(salary.paymentDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }),
      'Salaire de Base': salary.baseSalary,
      'Heures Sup.': salary.overtime,
      'Primes': salary.bonuses,
      'Indemnités': salary.allowances,
      'Salaire Brut': salary.grossSalary,
      'Cotisations Sociales': salary.socialContributions,
      'Impôts': salary.taxes,
      'Autres Déductions': salary.otherDeductions,
      'Total Déductions': salary.totalDeductions,
      'Salaire Net': salary.netSalary,
      'Statut': salary.status === 'PAID' ? 'Payé' : 'En attente'
    }));
  }
};

export default salaryHelpers;