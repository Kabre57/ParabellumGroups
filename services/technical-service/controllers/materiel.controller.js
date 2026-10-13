// Facade conservant les gestionnaires utilises par les routes materiel.
Object.assign(exports, require('./materiel/queries.controller'));
Object.assign(exports, require('./materiel/lifecycle.controller'));
Object.assign(exports, require('./materiel/import.controller'));
Object.assign(exports, require('./materiel/stock.controller'));
