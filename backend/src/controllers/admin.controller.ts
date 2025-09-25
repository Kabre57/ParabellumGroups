import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

//Changer le type de retour de la fonction
export const listLogFiles = (_req: Request, res: Response): Response | void => {
  fs.readdir(LOG_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Impossible de lire le dossier des logs." });
    }
    const logFiles = files.filter(file => file.endsWith('.log')).sort().reverse();
    return res.json({ success: true, data: logFiles });
  });
};

//Changer le type de retour de la fonction
export const getLogFileContent = (req: Request, res: Response): Response | void => {
  const { filename } = req.params;
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ success: false, message: "Nom de fichier invalide." });
  }

  const filePath = path.join(LOG_DIR, filename);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ success: false, message: "Fichier log introuvable." });
    }
    try {
      const logs = data.split('\n').filter(line => line).map(line => JSON.parse(line));
      return res.json({ success: true, data: logs });
    } catch (parseError) {
      return res.status(500).json({ success: false, message: "Erreur lors de l'analyse du fichier de log." });
    }
  });
};
