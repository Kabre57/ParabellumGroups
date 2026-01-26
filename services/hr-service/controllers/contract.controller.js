const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ContractController {
  async getAllContracts(req, res) {
    try {
      const { page = 1, pageSize = 20, search, status, employeeId } = req.query;
      const offset = (page - 1) * pageSize;

      let query = 'SELECT * FROM contracts WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (position LIKE $${paramIndex} OR department LIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (employeeId) {
        query += ` AND employee_id = $${paramIndex}`;
        params.push(employeeId);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(pageSize), offset);

      const result = await db.query(query, params);

      const countQuery = 'SELECT COUNT(*) FROM contracts WHERE 1=1' + 
        (search ? ` AND (position LIKE '%${search}%' OR department LIKE '%${search}%')` : '') +
        (status ? ` AND status = '${status}'` : '') +
        (employeeId ? ` AND employee_id = '${employeeId}'` : '');
      
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
      console.error('Error fetching contracts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des contrats',
        error: error.message
      });
    }
  }

  async getContract(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT c.*, 
          json_build_object(
            'id', e.id,
            'firstName', e.first_name,
            'lastName', e.last_name,
            'email', e.email,
            'phoneNumber', e.phone_number
          ) as employee
        FROM contracts c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contrat non trouvé'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du contrat',
        error: error.message
      });
    }
  }

  async createContract(req, res) {
    try {
      const {
        employeeId,
        contractType,
        startDate,
        endDate,
        salary,
        currency = 'XOF',
        workHoursPerWeek,
        position,
        department,
        benefits,
        clauses
      } = req.body;

      if (!employeeId || !contractType || !startDate || !salary || !position || !department) {
        return res.status(400).json({
          success: false,
          message: 'Champs requis manquants'
        });
      }

      const result = await db.query(
        `INSERT INTO contracts (
          employee_id, contract_type, start_date, end_date, salary, currency,
          work_hours_per_week, position, department, benefits, clauses, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')
        RETURNING *`,
        [
          employeeId,
          contractType,
          startDate,
          endDate,
          salary,
          currency,
          workHoursPerWeek,
          position,
          department,
          benefits,
          clauses
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du contrat',
        error: error.message
      });
    }
  }

  async updateContract(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const allowedFields = [
        'contract_type', 'start_date', 'end_date', 'salary', 'currency',
        'work_hours_per_week', 'position', 'department', 'benefits', 
        'clauses', 'status'
      ];

      const setFields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (allowedFields.includes(snakeKey)) {
          setFields.push(`${snakeKey} = $${paramIndex}`);
          values.push(updates[key]);
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
      const query = `UPDATE contracts SET ${setFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contrat non trouvé'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du contrat',
        error: error.message
      });
    }
  }

  async deleteContract(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contrat non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Contrat supprimé avec succès'
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du contrat',
        error: error.message
      });
    }
  }

  async getEmployeeContracts(req, res) {
    try {
      const { employeeId } = req.params;

      const result = await db.query(
        'SELECT * FROM contracts WHERE employee_id = $1 ORDER BY created_at DESC',
        [employeeId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching employee contracts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des contrats de l\'employé',
        error: error.message
      });
    }
  }
}

module.exports = new ContractController();
