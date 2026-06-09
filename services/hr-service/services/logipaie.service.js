/**
 * Service Métier - LOGIPAIE RH (Côte d'Ivoire)
 * Contient la logique légale Ivoirienne (CNPS, ITS, CMU, etc.)
 */

const rate = (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return numeric > 1 ? numeric / 100 : numeric;
};

const getIgrAmount = (baseIgr, parts, config) => {
    const baremes = Array.isArray(config?.baremesIgr) ? config.baremesIgr : null;
    const quotientFamilial = baseIgr / parts;

    if (baremes) {
        const tranche = baremes.find((item) => {
            const min = Number(item.min ?? 0);
            const max = item.max === undefined || item.max === null ? Infinity : Number(item.max);
            return quotientFamilial >= min && quotientFamilial <= max;
        });

        if (tranche) {
            const taux = rate(tranche.taux, 0);
            const abattement = Number(tranche.abattement || 0);
            return Math.max(0, (quotientFamilial * taux - abattement) * parts);
        }
    }

    let tauxIgr = 0;
    let abattement = 0;

    if (quotientFamilial > 8421) {
        if (quotientFamilial <= 20833) { tauxIgr = 0.02; abattement = 168; }
        else if (quotientFamilial <= 41667) { tauxIgr = 0.10; abattement = 1833; }
        else if (quotientFamilial <= 83333) { tauxIgr = 0.15; abattement = 3917; }
        else if (quotientFamilial <= 166667) { tauxIgr = 0.20; abattement = 8083; }
        else if (quotientFamilial <= 333333) { tauxIgr = 0.25; abattement = 16417; }
        else if (quotientFamilial <= 666667) { tauxIgr = 0.35; abattement = 49750; }
        else { tauxIgr = 0.45; abattement = 116417; }
    }

    return Math.max(0, (quotientFamilial * tauxIgr - abattement) * parts);
};

exports.calculerBulletin = (employe, contrat, variables, config = {}) => {
    // 1. Calcul des gains
    const salaireBase = parseFloat(contrat.salaireBaseMensuel || 0);
    const heuresSuppMontant = (parseFloat(variables.heuresSupp15 || 0) * (salaireBase/173.33) * 1.15)
                            + (parseFloat(variables.heuresSupp50 || 0) * (salaireBase/173.33) * 1.50)
                            + (parseFloat(variables.heuresSupp75 || 0) * (salaireBase/173.33) * 1.75)
                            + (parseFloat(variables.heuresSupp100 || 0) * (salaireBase/173.33) * 2.0);
    
    const primesTotal = parseFloat(variables.primeRendement || 0) 
                      + parseFloat(variables.primeAnciennete || 0)
                      + parseFloat(variables.indemniteLogement || 0);
    
    const primeTransport = parseFloat(variables.primeTransport || 0);
    const primeTransportExoneree = Math.min(primeTransport, 30000); // Exonération transport plafonnée à 30.000 FCFA

    const salaireBrut = salaireBase + heuresSuppMontant + primesTotal + primeTransport;

    // 2. Base CNPS
    const plafondCnps = Number(config.plafondCnps || 1647315);
    const brutSoumisCnps = salaireBrut - primeTransportExoneree;
    const baseCnps = Math.min(brutSoumisCnps, plafondCnps);

    // 3. Cotisations Sociales
    const cotisationCnpsSalariale = baseCnps * rate(config.tauxCnpsSalarial, 0.063);
    const cotisationCnpsPatronale = baseCnps * rate(config.tauxCnpsPatronal, 0.077);

    // 4. Base d'imposition (Base ITS)
    const baseIts = brutSoumisCnps; 
    
    // 5. Impôts sur le traitement et salaire (Côte d'Ivoire)
    // IS (Impôt sur Salaire) = 1.2% du brut imposable (80% abattement par défaut dans certains calculs, mais ici simplifié à 100%)
    const impotIs = baseIts * rate(config.tauxIs, 0.012);

    // CN (Contribution Nationale)
    let impotCn = 0;
    if (baseIts > 50000) {
        if (baseIts <= 130000) impotCn = (baseIts - 50000) * 0.015;
        else if (baseIts <= 200000) impotCn = (baseIts * 0.05) - 4550;
        else impotCn = (baseIts * 0.1) - 14550;
    }

    // IGR (Impôt Général sur le Revenu)
    const partsM = parseFloat(employe.nombrePartsIgr || 1);
    const impotIgr = getIgrAmount(baseIts * 0.8 - (impotIs + impotCn), partsM, config);

    const totalRetenues = cotisationCnpsSalariale + impotIs + impotCn + impotIgr;

    // 6. Salaire Net
    const salaireNet = salaireBrut - totalRetenues;

    return {
        salaireBase,
        heuresSuppMontant,
        primesTotal,
        primeTransport,
        salaireBrut,
        cotisationCnpsSalariale,
        cotisationCnpsPatronale,
        impotIs,
        impotCn,
        impotIgr,
        totalRetenues,
        salaireNet,
        coutTotalEmployeur: salaireBrut + cotisationCnpsPatronale
    };
};
