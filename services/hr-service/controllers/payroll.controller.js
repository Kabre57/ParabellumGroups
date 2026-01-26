const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PayrollController {
  calculateCNPS(baseSalary) {
    return baseSalary * 0.036;
  }

  calculateCNAM(baseSalary) {
    return baseSalary * 0.035;
  }

  calculateFDFP(baseSalary) {
    return baseSalary * 0.004;
  }

  calculateIGR(taxableIncome) {
    if (taxableIncome <= 50000) return 0;
    if (taxableIncome <= 130000) return (taxableIncome - 50000) * 0.015;
    if (taxableIncome <= 200000) return 1200 + (taxableIncome - 130000) * 0.10;
    if (taxableIncome <= 300000) return 8200 + (taxableIncome - 200000) * 0.15;
    if (taxableIncome <= 1000000) return 23200 + (taxableIncome - 300000) * 0.20;
    return 163200 + (taxableIncome - 1000000) * 0.25;
  }

  async getAllPayroll(req, res) {
    try {
      const { page = 1, pageSize = 20, search, employeeId, period, year, month } = req.query;
      const offset = (page - 1) * pageSize;

      let query = 'SELECT * FROM payroll WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND period LIKE $${paramIndex}`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (employeeId) {
        query += ` AND employee_id = $${paramIndex}`;
        params.push(employeeId);
        paramIndex++;
      }

      if (period) {
        query += ` AND period = $${paramIndex}`;
        params.push(period);
        paramIndex++;
      }

      if (year) {
        query += ` AND year = $${paramIndex}`;
        params.push(parseInt(year));
        paramIndex++;
      }

      if (month) {
        query += ` AND month = $${paramIndex}`;
        params.push(parseInt(month));
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(pageSize), offset);

      const result = await db.query(query, params);

      const countQuery = 'SELECT COUNT(*) FROM payroll WHERE 1=1' +
        (search ? ` AND period LIKE '%${search}%'` : '') +
        (employeeId ? ` AND employee_id = '${employeeId}'` : '') +
        (period ? ` AND period = '${period}'` : '') +
        (year ? ` AND year = ${year}` : '') +
        (month ? ` AND month = ${month}` : '');

      const countResult = await db.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: {
          data: result.rows,
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      console.error('Error fetching payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des bulletins de paie',
        error: error.message
      });
    }
  }

  async getPayroll(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT p.*, 
          json_build_object(
            'id', e.id,
            'firstName', e.first_name,
            'lastName', e.last_name,
            'email', e.email,
            'matricule', e.matricule,
            'position', e.position,
            'cnpsNumber', e.cnps_number,
            'cnamNumber', e.cnam_number
          ) as employee
        FROM payroll p
        LEFT JOIN employees e ON p.employee_id = e.id
        WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bulletin de paie non trouvé'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du bulletin',
        error: error.message
      });
    }
  }

  async createPayroll(req, res) {
    try {
      const {
        employeeId,
        period,
        month,
        year,
        baseSalary,
        overtime = 0,
        bonuses = 0,
        allowances = 0,
        deductions = [],
        currency = 'XOF'
      } = req.body;

      if (!employeeId || !period || !month || !year || !baseSalary) {
        return res.status(400).json({
          success: false,
          message: 'Champs requis manquants'
        });
      }

      const cnps = this.calculateCNPS(baseSalary);
      const cnam = this.calculateCNAM(baseSalary);
      const fdfp = this.calculateFDFP(baseSalary);

      const grossSalary = baseSalary + overtime + bonuses + allowances;
      
      const socialContributions = cnps + cnam + fdfp;
      const otherDeductions = deductions.reduce((sum, ded) => sum + (ded.amount || 0), 0);
      
      const taxableIncome = grossSalary - socialContributions;
      const igr = this.calculateIGR(taxableIncome);
      
      const totalDeductions = socialContributions + igr + otherDeductions;
      const netSalary = grossSalary - totalDeductions;

      const result = await db.query(
        `INSERT INTO payroll (
          employee_id, period, month, year, base_salary, overtime, bonuses,
          allowances, gross_salary, cnps, cnam, fdfp, igr, deductions,
          total_deductions, net_salary, currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'GENERATED')
        RETURNING *`,
        [
          employeeId, period, month, year, baseSalary, overtime, bonuses,
          allowances, grossSalary, cnps, cnam, fdfp, igr, JSON.stringify(deductions),
          totalDeductions, netSalary, currency
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du bulletin',
        error: error.message
      });
    }
  }

  async updatePayroll(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const allowedFields = [
        'base_salary', 'overtime', 'bonuses', 'allowances', 'deductions', 'status'
      ];

      const setFields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (allowedFields.includes(snakeKey)) {
          if (snakeKey === 'deductions') {
            setFields.push(`${snakeKey} = $${paramIndex}`);
            values.push(JSON.stringify(updates[key]));
          } else {
            setFields.push(`${snakeKey} = $${paramIndex}`);
            values.push(updates[key]);
          }
          paramIndex++;
        }
      });

      if (setFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun champ valide à mettre à jour'
        });
      }

      values.push(id);
      const query = `UPDATE payroll SET ${setFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bulletin non trouvé'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du bulletin',
        error: error.message
      });
    }
  }

  async deletePayroll(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('DELETE FROM payroll WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bulletin non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Bulletin supprimé avec succès'
      });
    } catch (error) {
      console.error('Error deleting payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du bulletin',
        error: error.message
      });
    }
  }

  async generatePayslip(req, res) {
    try {
      const { employeeId, period } = req.body;

      if (!employeeId || !period) {
        return res.status(400).json({
          success: false,
          message: 'employeeId et period sont requis'
        });
      }

      const employeeResult = await db.query(
        'SELECT * FROM employees WHERE id = $1',
        [employeeId]
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employé non trouvé'
        });
      }

      const contractResult = await db.query(
        `SELECT * FROM contracts 
         WHERE employee_id = $1 AND status = 'ACTIVE' 
         ORDER BY start_date DESC LIMIT 1`,
        [employeeId]
      );

      if (contractResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Aucun contrat actif trouvé pour cet employé'
        });
      }

      const contract = contractResult.rows[0];
      const periodDate = new Date(period);
      const month = periodDate.getMonth() + 1;
      const year = periodDate.getFullYear();

      const payrollData = {
        employeeId,
        period,
        month,
        year,
        baseSalary: contract.salary,
        overtime: 0,
        bonuses: 0,
        allowances: 0,
        deductions: [],
        currency: contract.currency || 'XOF'
      };

      req.body = payrollData;
      return this.createPayroll(req, res);

    } catch (error) {
      console.error('Error generating payslip:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du bulletin',
        error: error.message
      });
    }
  }
}

module.exports = new PayrollController();
