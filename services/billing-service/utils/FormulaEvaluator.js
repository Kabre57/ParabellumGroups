const { Parser } = require('expr-eval');

/**
 * Utility to evaluate accounting formulas stored in the database.
 * Supports context-based variable resolution (e.g., bankInflows, cashOutflows).
 */
class FormulaEvaluator {
  constructor() {
    this.parser = new Parser();
    
    // Custom functions for formulas
    this.parser.functions.max = function(...args) {
      const validDates = args.filter(d => d && !isNaN(new Date(d).getTime()));
      if (validDates.length === 0) return null;
      return new Date(Math.max(...validDates.map(d => new Date(d).getTime()))).toISOString();
    };

    this.parser.functions.count = function(array, conditionFn) {
      if (!Array.isArray(array)) return 0;
      if (!conditionFn) return array.length;
      return array.filter(conditionFn).length;
    };
  }

  /**
   * Evaluates a JSON formula object against a given data context.
   * @param {Object} formula - { balance: string, lastTransaction: string, movementCount: string }
   * @param {Object} context - Data context containing pre-calculated variables and raw arrays.
   */
  evaluateAccount(formula, context) {
    if (!formula) return { balance: 0, lastTransaction: null, movementCount: 0 };

    const result = {
      balance: 0,
      lastTransaction: null,
      movementCount: 0
    };

    try {
      // Evaluate Balance
      if (formula.balance) {
        result.balance = this.parser.evaluate(formula.balance, context);
      }

      // Evaluate movementCount
      if (formula.movementCount) {
        result.movementCount = this.parser.evaluate(formula.movementCount, context);
      }

      // Evaluate lastTransaction (custom logic for dates)
      if (formula.lastTransaction) {
        // We use a simpler strategy for dates to avoid expr-eval limitations with complex objects
        // In the database, formula.lastTransaction can be a variable name or a specific property
        if (context[formula.lastTransaction]) {
            result.lastTransaction = context[formula.lastTransaction];
        } else {
            // Fallback to evaluating as expression
            try {
                result.lastTransaction = this.parser.evaluate(formula.lastTransaction, context);
            } catch (e) {
                result.lastTransaction = null;
            }
        }
      }

      return result;
    } catch (error) {
      console.error('[FormulaEvaluator] Evaluation Error:', error.message, { formula });
      return { balance: 0, lastTransaction: null, movementCount: 0, error: error.message };
    }
  }
}

module.exports = new FormulaEvaluator();
