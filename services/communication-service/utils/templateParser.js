const templateParser = {
  /**
   * Parse un template avec des variables
   * @param {string} template - Template à parser
   * @param {Object} variables - Variables à remplacer
   * @returns {string} - Template parsé
   */
  parse(template, variables = {}) {
    if (!template) return '';
    
    let result = template;

    // Remplacer les variables au format {{variable}}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });

    // Remplacer les variables au format {variable}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{\\s*${key}\\s*}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });

    return result;
  },

  /**
   * Extrait les variables d'un template
   * @param {string} template - Template à analyser
   * @returns {Array} - Liste des variables trouvées
   */
  extractVariables(template) {
    if (!template) return [];
    
    const regex = /{{?\s*([a-zA-Z0-9_]+)\s*}}?/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  },

  /**
   * Valide qu'un template contient toutes les variables nécessaires
   * @param {string} template - Template à valider
   * @param {Object} variables - Variables à vérifier
   * @returns {Object} - Résultat de la validation
   */
  validate(template, variables = {}) {
    const requiredVars = this.extractVariables(template);
    const providedVars = Object.keys(variables);
    const missingVars = requiredVars.filter(v => !providedVars.includes(v));

    return {
      valid: missingVars.length === 0,
      missingVariables: missingVars,
      requiredVariables: requiredVars
    };
  }
};

module.exports = templateParser;
