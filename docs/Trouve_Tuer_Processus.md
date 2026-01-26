# Windows - Trouver le PID utilisant le port 3001
netstat -ano | findstr :3000

# Notez le PID (dernier numéro)
# Exemple: TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       12345

# Tuer le processus
taskkill /PID 24940 /F

# Redémarrer votre API Gateway
npm start

 ⚠ Port 3000 is in use, trying 3001 instead.
 ⚠ Port 3001 is in use, trying 3002 instead.