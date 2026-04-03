'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hrService, logipaieService } from '@/shared/api/hr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';

type TableColumn = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
};

const Table = LogipaieTable;

export default function LogipaiePage() {
  const employeesQuery = useQuery({
    queryKey: ['logipaie-employees'],
    queryFn: () => hrService.getEmployees({ pageSize: 200 }),
  });
  const contractsQuery = useQuery({
    queryKey: ['logipaie-contracts'],
    queryFn: () => hrService.getContracts({ limit: 200 }),
  });
  const payrollsQuery = useQuery({
    queryKey: ['logipaie-payrolls'],
    queryFn: () => hrService.getPayrolls({ pageSize: 200 }),
  });
  const leavesQuery = useQuery({
    queryKey: ['logipaie-leaves'],
    queryFn: () => hrService.getConges({ limit: 200 }),
  });
  const loansQuery = useQuery({
    queryKey: ['logipaie-loans'],
    queryFn: () => hrService.getLoans({ pageSize: 200 }),
  });
  const variablesQuery = useQuery({
    queryKey: ['logipaie-variables-mensuelles'],
    queryFn: () => logipaieService.getVariablesMensuelles({ pageSize: 200 }),
  });
  const gratificationsQuery = useQuery({
    queryKey: ['logipaie-gratifications'],
    queryFn: () => logipaieService.getGratifications({ pageSize: 200 }),
  });
  const livresMensuelsQuery = useQuery({
    queryKey: ['logipaie-livres-mensuels'],
    queryFn: () => logipaieService.getLivresPaieMensuels({ pageSize: 200 }),
  });
  const livresAnnuelsQuery = useQuery({
    queryKey: ['logipaie-livres-annuels'],
    queryFn: () => logipaieService.getLivresPaieAnnuels({ pageSize: 200 }),
  });
  const ordresQuery = useQuery({
    queryKey: ['logipaie-ordres-bancaires'],
    queryFn: () => logipaieService.getOrdresBancaires({ pageSize: 200 }),
  });
  const declarationsQuery = useQuery({
    queryKey: ['logipaie-declarations'],
    queryFn: () => logipaieService.getDeclarationsFiscales({ pageSize: 200 }),
  });
  const declarationsCnpsQuery = useQuery({
    queryKey: ['logipaie-declarations-cnps'],
    queryFn: () => logipaieService.getDeclarationsCnps({ pageSize: 200 }),
  });
  const etat301Query = useQuery({
    queryKey: ['logipaie-etat-301'],
    queryFn: () => logipaieService.getEtat301({ pageSize: 200 }),
  });

  const employees = employeesQuery.data?.data ?? [];
  const contracts = contractsQuery.data?.data ?? [];
  const payrolls = payrollsQuery.data?.data ?? [];
  const leaves = leavesQuery.data?.data ?? [];
  const loans = loansQuery.data?.data ?? [];
  const variables = variablesQuery.data?.data ?? [];
  const gratifications = gratificationsQuery.data?.data ?? [];
  const livresMensuels = livresMensuelsQuery.data?.data ?? [];
  const livresAnnuels = livresAnnuelsQuery.data?.data ?? [];
  const ordresBancaires = ordresQuery.data?.data ?? [];
  const declarations = declarationsQuery.data?.data ?? [];
  const declarationsCnps = declarationsCnpsQuery.data?.data ?? [];
  const etat301 = etat301Query.data?.data ?? [];

  const personnelColumns: TableColumn[] = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'nomComplet', label: 'Noms & Prénoms' },
    { key: 'sexe', label: 'Sexe' },
    { key: 'dateNaissance', label: 'Date de naissance' },
    { key: 'lieuNaissance', label: 'Lieu de naissance' },
    { key: 'nationalite', label: 'Nationalité' },
    { key: 'situationMatrimoniale', label: 'Situation matrimoniale' },
    { key: 'nombreEnfants', label: "Nombre d'enfants", align: 'right' },
    { key: 'nombrePartsIgr', label: 'Part(s) IGR', align: 'right' },
    { key: 'adressePersonnelle', label: 'Adresse' },
    { key: 'telephonePersonnel', label: 'Téléphone' },
    { key: 'numeroCnps', label: 'N° CNPS' },
    { key: 'modePaiement', label: 'Mode paiement' },
    { key: 'rib', label: 'RIB' },
    { key: 'banque', label: 'Banque' },
  ];

  const personnelRows = useMemo(
    () =>
      employees.map((emp: any) => ({
        id: emp.id,
        matricule: emp.matricule || emp.id,
        nomComplet:
          emp.nomComplet ||
          `${emp.firstName ?? emp.prenoms ?? ''} ${emp.lastName ?? emp.nom ?? ''}`.trim(),
        sexe: emp.sexe || emp.gender || '-',
        dateNaissance: emp.dateNaissance ? new Date(emp.dateNaissance).toLocaleDateString('fr-FR') : '-',
        lieuNaissance: emp.lieuNaissance || '-',
        nationalite: emp.nationalite || '-',
        situationMatrimoniale: emp.situationMatrimoniale || '-',
        nombreEnfants: emp.nombreEnfants ?? '-',
        nombrePartsIgr: emp.nombrePartsIgr ?? '-',
        adressePersonnelle: emp.adressePersonnelle || emp.address || '-',
        telephonePersonnel: emp.telephonePersonnel || emp.phoneNumber || '-',
        numeroCnps: emp.numeroCnps || emp.cnpsNumber || '-',
        modePaiement: emp.modePaiement || '-',
        rib: emp.rib || '-',
        banque: emp.banque || '-',
      })),
    [employees]
  );

  const contractColumns: TableColumn[] = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'nomComplet', label: 'Nom' },
    { key: 'typeContrat', label: 'Type contrat' },
    { key: 'dateSignature', label: 'Signature' },
    { key: 'dateDebut', label: 'Date début' },
    { key: 'dateFin', label: 'Date fin' },
    { key: 'poste', label: 'Poste' },
    { key: 'direction', label: 'Direction' },
    { key: 'service', label: 'Service' },
    { key: 'salaireBaseMensuel', label: 'Salaire base', align: 'right' },
    { key: 'statutContrat', label: 'Statut' },
  ];

  const contractRows = useMemo(
    () =>
      contracts.map((contract: any) => ({
        id: contract.id,
        matricule: contract.employeeId ?? contract.matricule ?? contract.employeId ?? '-',
        nomComplet:
          contract.employee?.firstName || contract.employee?.lastName
            ? `${contract.employee?.firstName ?? ''} ${contract.employee?.lastName ?? ''}`.trim()
            : '-',
        typeContrat: contract.contractType || contract.typeContrat || '-',
        dateSignature: contract.signedDate ? new Date(contract.signedDate).toLocaleDateString('fr-FR') : '-',
        dateDebut: contract.startDate ? new Date(contract.startDate).toLocaleDateString('fr-FR') : '-',
        dateFin: contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : '-',
        poste: contract.position || '-',
        direction: contract.department || '-',
        service: contract.department || '-',
        salaireBaseMensuel: contract.salary ? `${contract.salary} F CFA` : '-',
        statutContrat: contract.status || '-',
      })),
    [contracts]
  );

  const payrollColumns: TableColumn[] = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'nomComplet', label: 'Nom' },
    { key: 'periode', label: 'Période' },
    { key: 'salaireBrut', label: 'Salaire brut', align: 'right' },
    { key: 'totalRetenues', label: 'Retenues', align: 'right' },
    { key: 'salaireNet', label: 'Net à payer', align: 'right' },
    { key: 'statut', label: 'Statut' },
  ];

  const payrollRows = useMemo(
    () =>
      payrolls.map((payroll: any) => ({
        id: payroll.id,
        matricule: payroll.employee?.matricule || payroll.employeeId || '-',
        nomComplet: payroll.employee
          ? `${payroll.employee.firstName ?? ''} ${payroll.employee.lastName ?? ''}`.trim()
          : '-',
        periode: payroll.period || '-',
        salaireBrut: payroll.grossSalary ? `${payroll.grossSalary} F CFA` : '-',
        totalRetenues: payroll.deductions ? `${payroll.deductions} F CFA` : '-',
        salaireNet: payroll.netSalary ? `${payroll.netSalary} F CFA` : '-',
        statut: payroll.status || '-',
      })),
    [payrolls]
  );

  const variablesRows = useMemo(
    () =>
      variables.map((variable: any) => ({
        id: variable.id,
        matricule: variable.matricule,
        periode: variable.periode,
        heuresSupp15: variable.heuresSupp15,
        heuresSupp50: variable.heuresSupp50,
        heuresSupp75: variable.heuresSupp75,
        heuresSupp100: variable.heuresSupp100,
        primeRendement: variable.primeRendement,
        primeTransport: variable.primeTransport,
        primeSalissure: variable.primeSalissure,
        primeAnciennete: variable.primeAnciennete,
        primesDiverses: variable.primesDiverses,
        indemniteLogement: variable.indemniteLogement,
        indemniteRepas: variable.indemniteRepas,
        retenuePret: variable.retenuePret,
      })),
    [variables]
  );

  const gratificationRows = useMemo(
    () =>
      gratifications.map((gratification: any) => ({
        id: gratification.id,
        matricule: gratification.matricule,
        periode: gratification.periode,
        typeGratification: gratification.typeGratification,
        baseCalcul: gratification.baseCalcul,
        tauxGratification: gratification.tauxGratification,
        montantBrut: gratification.montantBrut,
        retenues: gratification.retenues,
        montantNet: gratification.montantNet,
        dateVersement: gratification.dateVersement
          ? new Date(gratification.dateVersement).toLocaleDateString('fr-FR')
          : '-',
      })),
    [gratifications]
  );

  const livresMensuelsRows = useMemo(
    () =>
      livresMensuels.map((livre: any) => ({
        id: livre.id,
        periode: livre.periode,
        nombreEmployes: livre.nombreEmployes,
        totalSalaireBrut: livre.totalSalaireBrut,
        totalSalaireNet: livre.totalSalaireNet,
        totalRetenues: livre.totalRetenues,
        totalChargesPatronales: livre.totalChargesPatronales,
        coutTotalEmployeur: livre.coutTotalEmployeur,
      })),
    [livresMensuels]
  );

  const livresAnnuelsRows = useMemo(
    () =>
      livresAnnuels.map((livre: any) => ({
        id: livre.id,
        annee: livre.annee,
        nombreEmployesMoyen: livre.nombreEmployesMoyen,
        totalGainsAnnuels: livre.totalGainsAnnuels,
        totalChargesPatronalesAnnuelles: livre.totalChargesPatronalesAnnuelles,
        coutTotalAnnuel: livre.coutTotalAnnuel,
        masseSalarialeMoyenne: livre.masseSalarialeMoyenne,
      })),
    [livresAnnuels]
  );

  const ordresRows = useMemo(
    () =>
      ordresBancaires.map((ordre: any) => ({
        id: ordre.id,
        periode: ordre.periode,
        dateVirement: ordre.dateVirement ? new Date(ordre.dateVirement).toLocaleDateString('fr-FR') : '-',
        banqueEmetteur: ordre.banqueEmetteur,
        nombreBeneficiaires: ordre.nombreBeneficiaires,
        montantTotalLot: ordre.montantTotalLot,
        statut: ordre.statut,
        referenceVirement: ordre.referenceVirement,
      })),
    [ordresBancaires]
  );

  const declarationsRows = useMemo(
    () =>
      declarations.map((decl: any) => ({
        id: decl.id,
        periode: decl.periode,
        typeDeclaration: decl.typeDeclaration,
        matricule: decl.matricule,
        salaireImposable: decl.salaireImposable,
        montantIs: decl.montantIs,
        montantCn: decl.montantCn,
        montantIgr: decl.montantIgr,
        totalImpots: decl.totalImpots,
        statut: decl.statut,
      })),
    [declarations]
  );

  const declarationsCnpsRows = useMemo(
    () =>
      declarationsCnps.map((decl: any) => ({
        id: decl.id,
        periode: decl.periode,
        typeDeclaration: decl.typeDeclaration,
        matricule: decl.matricule,
        salaireSoumisCnps: decl.salaireSoumisCnps,
        partSalariale: decl.partSalariale,
        partPatronale: decl.partPatronale,
        totalCotisation: decl.totalCotisation,
        statutDeclaration: decl.statutDeclaration,
      })),
    [declarationsCnps]
  );

  const etat301Rows = useMemo(
    () =>
      etat301.map((etat: any) => ({
        id: etat.id,
        annee: etat.annee,
        matricule: etat.matricule,
        salaireAnnuel: etat.salaireAnnuel,
        impotAnnuel: etat.impotAnnuel,
        regularisation: etat.regularisation,
      })),
    [etat301]
  );

  const leaveColumns: TableColumn[] = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'nom', label: 'Nom' },
    { key: 'dateDebut', label: 'Date départ' },
    { key: 'dateFin', label: 'Date retour' },
    { key: 'duree', label: 'Durée congé', align: 'right' },
    { key: 'statut', label: 'Statut' },
  ];

  const leaveRows = useMemo(
    () =>
      leaves.map((leave: any) => ({
        id: leave.id,
        matricule: leave.employeeId || leave.matricule || '-',
        nom: leave.employee?.firstName
          ? `${leave.employee.firstName} ${leave.employee.lastName ?? ''}`.trim()
          : '-',
        dateDebut: leave.startDate ? new Date(leave.startDate).toLocaleDateString('fr-FR') : '-',
        dateFin: leave.endDate ? new Date(leave.endDate).toLocaleDateString('fr-FR') : '-',
        duree: leave.totalDays ?? leave.nombreJours ?? '-',
        statut: leave.status || '-',
      })),
    [leaves]
  );

  const loanColumns: TableColumn[] = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'nom', label: 'Nom' },
    { key: 'montant', label: 'Montant prêt', align: 'right' },
    { key: 'mensualite', label: 'Mensualité', align: 'right' },
    { key: 'dateDebut', label: 'Date début' },
    { key: 'dateFin', label: 'Date fin' },
    { key: 'statut', label: 'Statut' },
  ];

  const loanRows = useMemo(
    () =>
      loans.map((loan: any) => ({
        id: loan.id,
        matricule: loan.employeId || loan.matricule || '-',
        nom: loan.employe?.nom ? `${loan.employe.nom} ${loan.employe.prenom ?? ''}`.trim() : '-',
        montant: loan.montantInitial ? `${loan.montantInitial} F CFA` : '-',
        mensualite: loan.deductionMensuelle ? `${loan.deductionMensuelle} F CFA` : '-',
        dateDebut: loan.dateDebut ? new Date(loan.dateDebut).toLocaleDateString('fr-FR') : '-',
        dateFin: loan.dateFin ? new Date(loan.dateFin).toLocaleDateString('fr-FR') : '-',
        statut: loan.statut || '-',
      })),
    [loans]
  );

  const loading = [
    employeesQuery,
    contractsQuery,
    payrollsQuery,
    leavesQuery,
    loansQuery,
    variablesQuery,
    gratificationsQuery,
    livresMensuelsQuery,
    livresAnnuelsQuery,
    ordresQuery,
    declarationsQuery,
    declarationsCnpsQuery,
    etat301Query,
  ].some(
    (q) => q.isLoading
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">LOGIPAIE RH</h1>
        <p className="text-sm text-muted-foreground">
          Version web du classeur LOGIPAIE_RH pour la gestion RH et paie.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Spinner className="mr-2 h-4 w-4" />
          Chargement des données LOGIPAIE...
        </div>
      ) : null}

      <Tabs defaultValue="personnel">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          <TabsTrigger value="contrats">Contrats</TabsTrigger>
          <TabsTrigger value="paie">Paie</TabsTrigger>
          <TabsTrigger value="heures">Heures sup</TabsTrigger>
          <TabsTrigger value="conges">Congés</TabsTrigger>
          <TabsTrigger value="gratifications">Gratifications</TabsTrigger>
          <TabsTrigger value="prets">Prêts</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
          <TabsTrigger value="livres">Livre de paie</TabsTrigger>
          <TabsTrigger value="virements">Ordre virement</TabsTrigger>
          <TabsTrigger value="declarations">Déclarations</TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>5 - Personnel</CardTitle>
              <CardDescription>Données issues du classeur LOGIPAIE RH.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table columns={personnelColumns} rows={personnelRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contrats" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>6/7 - Contrats de travail</CardTitle>
              <CardDescription>CDI / CDD et informations contractuelles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table columns={contractColumns} rows={contractRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paie" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>9 - Traitement de la paie</CardTitle>
              <CardDescription>Brut, retenues, net et statut.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table columns={payrollColumns} rows={payrollRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heures" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>10 - Heures supplémentaires</CardTitle>
              <CardDescription>À connecter aux variables mensuelles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  { key: 'matricule', label: 'Matricule' },
                  { key: 'periode', label: 'Période' },
                  { key: 'heuresSupp15', label: 'HS 15%', align: 'right' },
                  { key: 'heuresSupp50', label: 'HS 50%', align: 'right' },
                  { key: 'heuresSupp75', label: 'HS 75%', align: 'right' },
                  { key: 'heuresSupp100', label: 'HS 100%', align: 'right' },
                  { key: 'primeRendement', label: 'Prime rendement', align: 'right' },
                  { key: 'primeTransport', label: 'Prime transport', align: 'right' },
                  { key: 'primeAnciennete', label: 'Prime ancienneté', align: 'right' },
                ]}
                rows={variablesRows}
                emptyLabel="Aucune variable mensuelle enregistrée."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>11 - Congés</CardTitle>
              <CardDescription>Demandes, périodes et calculs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table columns={leaveColumns} rows={leaveRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gratifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>13 - Gratifications</CardTitle>
              <CardDescription>Prime annuelle, prorata et taux.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  { key: 'matricule', label: 'Matricule' },
                  { key: 'periode', label: 'Période' },
                  { key: 'typeGratification', label: 'Type' },
                  { key: 'baseCalcul', label: 'Base', align: 'right' },
                  { key: 'tauxGratification', label: 'Taux', align: 'right' },
                  { key: 'montantBrut', label: 'Montant brut', align: 'right' },
                  { key: 'retenues', label: 'Retenues', align: 'right' },
                  { key: 'montantNet', label: 'Montant net', align: 'right' },
                  { key: 'dateVersement', label: 'Date versement' },
                ]}
                rows={gratificationRows}
                emptyLabel="Aucune gratification enregistrée."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>18 - Prêts</CardTitle>
              <CardDescription>Suivi des avances et prêts salariés.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table columns={loanColumns} rows={loanRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulletins" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>19/20 - Édition bulletins</CardTitle>
              <CardDescription>PDF individuel et groupé.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table columns={payrollColumns} rows={payrollRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="livres" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>21/29 - Livre de paie</CardTitle>
              <CardDescription>Mensuel et annuel.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table
                  columns={[
                    { key: 'periode', label: 'Période' },
                    { key: 'nombreEmployes', label: 'Effectif', align: 'right' },
                    { key: 'totalSalaireBrut', label: 'Total brut', align: 'right' },
                    { key: 'totalRetenues', label: 'Retenues', align: 'right' },
                    { key: 'totalSalaireNet', label: 'Net', align: 'right' },
                    { key: 'totalChargesPatronales', label: 'Charges patronales', align: 'right' },
                  ]}
                  rows={livresMensuelsRows}
                  emptyLabel="Aucun livre mensuel disponible."
                />
                <Table
                  columns={[
                    { key: 'annee', label: 'Année' },
                    { key: 'nombreEmployesMoyen', label: 'Effectif moyen', align: 'right' },
                    { key: 'totalGainsAnnuels', label: 'Gains annuels', align: 'right' },
                    { key: 'totalChargesPatronalesAnnuelles', label: 'Charges patronales', align: 'right' },
                    { key: 'coutTotalAnnuel', label: 'Coût total', align: 'right' },
                  ]}
                  rows={livresAnnuelsRows}
                  emptyLabel="Aucun livre annuel disponible."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="virements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>22/23 - Ordres de virement</CardTitle>
              <CardDescription>Virements bancaires et listes nominatives.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table
                columns={[
                  { key: 'periode', label: 'Période' },
                  { key: 'dateVirement', label: 'Date virement' },
                  { key: 'banqueEmetteur', label: 'Banque' },
                  { key: 'nombreBeneficiaires', label: 'Bénéficiaires', align: 'right' },
                  { key: 'montantTotalLot', label: 'Montant total', align: 'right' },
                  { key: 'statut', label: 'Statut' },
                  { key: 'referenceVirement', label: 'Référence' },
                ]}
                rows={ordresRows}
                emptyLabel="Aucun ordre de virement disponible."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="declarations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>24-35 - Déclarations</CardTitle>
              <CardDescription>ITS, FDFP, CNPS, DISA, DASC, État 301.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table
                  columns={[
                    { key: 'periode', label: 'Période' },
                    { key: 'typeDeclaration', label: 'Type' },
                    { key: 'matricule', label: 'Matricule' },
                    { key: 'salaireImposable', label: 'Salaire imposable', align: 'right' },
                    { key: 'montantIs', label: 'IS', align: 'right' },
                    { key: 'montantCn', label: 'CN', align: 'right' },
                    { key: 'montantIgr', label: 'IGR', align: 'right' },
                    { key: 'totalImpots', label: 'Total impôts', align: 'right' },
                    { key: 'statut', label: 'Statut' },
                  ]}
                  rows={declarationsRows}
                  emptyLabel="Aucune déclaration fiscale disponible."
                />
                <Table
                  columns={[
                    { key: 'periode', label: 'Période' },
                    { key: 'typeDeclaration', label: 'Type' },
                    { key: 'matricule', label: 'Matricule' },
                    { key: 'salaireSoumisCnps', label: 'Salaire CNPS', align: 'right' },
                    { key: 'partSalariale', label: 'Part salariale', align: 'right' },
                    { key: 'partPatronale', label: 'Part patronale', align: 'right' },
                    { key: 'totalCotisation', label: 'Total', align: 'right' },
                    { key: 'statutDeclaration', label: 'Statut' },
                  ]}
                  rows={declarationsCnpsRows}
                  emptyLabel="Aucune déclaration CNPS disponible."
                />
                <Table
                  columns={[
                    { key: 'annee', label: 'Année' },
                    { key: 'matricule', label: 'Matricule' },
                    { key: 'salaireAnnuel', label: 'Salaire annuel', align: 'right' },
                    { key: 'impotAnnuel', label: 'Impôt annuel', align: 'right' },
                    { key: 'regularisation', label: 'Régularisation', align: 'right' },
                  ]}
                  rows={etat301Rows}
                  emptyLabel="Aucun Etat 301 disponible."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
