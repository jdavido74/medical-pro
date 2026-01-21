#!/usr/bin/env node

/**
 * Service Controller Server - Pilotage des services MedicalPro
 * Port: 3003
 * Interface web: http://localhost:3003
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = 3003;
const BASE_PATH = '/var/www/medical-pro';

// Middleware
app.use(express.json());

// Store pour les clients WebSocket
let wsClients = new Set();

// Fonction pour diffuser des messages aux clients WebSocket
function broadcast(message) {
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Fonction pour exécuter un script
function executeScript(scriptName) {
    return new Promise((resolve) => {
        const scriptPath = path.join(BASE_PATH, scriptName);

        if (!fs.existsSync(scriptPath)) {
            broadcast({
                type: 'error',
                message: `Script non trouvé: ${scriptName}`
            });
            return resolve({ error: 'Script not found' });
        }

        const process = spawn('bash', [scriptPath], {
            cwd: BASE_PATH,
            stdio: 'pipe'
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            broadcast({
                type: 'log',
                message: text
            });
        });

        process.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            broadcast({
                type: 'error',
                message: text
            });
        });

        process.on('close', (code) => {
            broadcast({
                type: 'complete',
                code: code,
                message: `Commande terminée (code: ${code})`
            });
            resolve({ code, output, errorOutput });
        });

        process.on('error', (err) => {
            broadcast({
                type: 'error',
                message: `Erreur: ${err.message}`
            });
            resolve({ error: err.message });
        });

        // Timeout de sécurité (30 minutes pour tmux)
        setTimeout(() => {
            process.kill();
        }, 30 * 60 * 1000);
    });
}

// Route: Page HTML principale du contrôleur
app.get('/', (req, res) => {
    res.json({
        message: 'MedicalPro Service Controller API',
        version: '1.0.0',
        info: 'Allez sur http://localhost:3003/controller pour voir l\'interface',
        endpoints: {
            controller: '/controller',
            api_start_simple: 'POST /api/start-simple',
            api_start_tmux: 'POST /api/start-tmux',
            api_stop: 'POST /api/stop',
            api_status: 'POST /api/status',
            api_logs: 'GET /api/logs/:service',
            api_info: 'GET /api/info'
        }
    });
});

// Route: Interface du contrôleur
app.get('/controller', (req, res) => {
    res.sendFile(path.join(__dirname, 'controller-assets', 'index.html'));
});

// API: Démarrer avec start-all.sh
app.post('/api/start-simple', async (req, res) => {
    broadcast({ type: 'start', message: 'Démarrage des services (mode simple)...' });
    const result = await executeScript('start-all.sh');
    res.json(result);
});

// API: Démarrer avec start-all-tmux.sh
app.post('/api/start-tmux', async (req, res) => {
    broadcast({ type: 'start', message: 'Démarrage des services (mode tmux)...' });
    const result = await executeScript('start-all-tmux.sh');
    res.json(result);
});

// API: Arrêter les services
app.post('/api/stop', async (req, res) => {
    broadcast({ type: 'start', message: 'Arrêt des services...' });
    const result = await executeScript('stop-all.sh');
    res.json(result);
});

// API: Vérifier l'état
app.post('/api/status', async (req, res) => {
    broadcast({ type: 'start', message: 'Vérification de l\'état...' });
    const result = await executeScript('status-all.sh');
    res.json(result);
});

// API: Obtenir les logs
app.get('/api/logs/:service', (req, res) => {
    const { service } = req.params;
    const validServices = ['medicalpro-backend', 'medicalpro', 'medicalpro-admin'];

    if (!validServices.includes(service)) {
        return res.status(400).json({ error: 'Service invalide' });
    }

    const logFile = `/tmp/${service}.log`;

    if (!fs.existsSync(logFile)) {
        return res.json({ logs: 'Pas de logs disponibles' });
    }

    try {
        const logs = fs.readFileSync(logFile, 'utf8');
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Information serveur
app.get('/api/info', (req, res) => {
    res.json({
        name: 'MedicalPro Service Controller',
        version: '1.0.0',
        services: [
            { name: 'Frontend', port: 3000, url: 'http://localhost:3000' },
            { name: 'Backend API', port: 3001, url: 'http://localhost:3001' },
            { name: 'Admin Panel', port: 3002, url: 'http://localhost:3002' },
            { name: 'Service Controller', port: 3003, url: 'http://localhost:3003' }
        ]
    });
});

// Admin API: Service Health Status
app.get('/api/v1/admin/services-health', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        const serviceStatus = {
            backend: false,
            frontend: false,
            admin: false,
            controller: false
        };

        // Vérifier chaque service
        const ports = { backend: 3001, frontend: 3000, admin: 3002, controller: 3003 };

        for (const [service, port] of Object.entries(ports)) {
            try {
                const { stdout } = await execPromise(`lsof -i :${port} 2>/dev/null | wc -l`, { timeout: 2000 });
                serviceStatus[service] = parseInt(stdout.trim()) > 0;
            } catch (e) {
                serviceStatus[service] = false;
            }
        }

        res.json({
            success: true,
            data: {
                services: [
                    { name: 'Backend API', port: 3001, status: serviceStatus.backend ? 'running' : 'unavailable' },
                    { name: 'Frontend', port: 3000, status: serviceStatus.frontend ? 'running' : 'unavailable' },
                    { name: 'Admin Panel', port: 3002, status: serviceStatus.admin ? 'running' : 'unavailable' },
                    { name: 'Service Controller', port: 3003, status: serviceStatus.controller ? 'running' : 'unavailable' }
                ],
                timestamp: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: 'Failed to check service health', details: error.message }
        });
    }
});

// Admin API: Control Services (Start/Stop)
app.post('/api/v1/admin/services/control', async (req, res) => {
    const { service, action } = req.body;

    if (!['start', 'stop'].includes(action)) {
        return res.status(400).json({
            success: false,
            error: { message: 'Invalid action. Use "start" or "stop"' }
        });
    }

    broadcast({
        type: 'info',
        message: `${action === 'start' ? 'Démarrage' : 'Arrêt'} du service: ${service}`
    });

    let result;
    if (action === 'start') {
        result = await executeScript('start-all.sh');
    } else {
        result = await executeScript('stop-all.sh');
    }

    res.json({
        success: result.code === 0,
        data: { service, action, code: result.code },
        message: `Service ${action}ed successfully`
    });
});

// Admin API: List Clinic Databases
app.get('/api/v1/admin/clinic-databases', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        // Récupérer la liste des bases de données clinic
        const env = { ...process.env, PGPASSWORD: 'medicalpro2024' };
        const { stdout } = await execPromise(
            `psql -h localhost -U medicalpro -c "\\l" 2>/dev/null | grep medicalpro_clinic | awk '{print $1}'`,
            { env }
        );

        const databases = stdout
            .trim()
            .split('\n')
            .filter(db => db.length > 0)
            .map(db => ({
                name: db,
                clinicId: db.replace('medicalpro_clinic_', '')
            }));

        res.json({
            success: true,
            data: {
                count: databases.length,
                databases: databases,
                timestamp: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: 'Failed to list clinic databases', details: error.message }
        });
    }
});

// Middleware des fichiers statiques (APRÈS les routes pour éviter les conflits)
app.use(express.static('controller-assets'));

// Créer le serveur HTTP
const server = http.createServer(app);

// Setup WebSocket
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    wsClients.add(ws);
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connecté au serveur de contrôle'
    }));

    ws.on('close', () => {
        wsClients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        wsClients.delete(ws);
    });
});

// Démarrer le serveur
server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         MedicalPro Service Controller Server               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Serveur démarré avec succès!');
    console.log('');
    console.log('📍 Interface web : http://localhost:3003');
    console.log('');
    console.log('Services pilotés:');
    console.log('  • Frontend (port 3000)');
    console.log('  • Backend API (port 3001)');
    console.log('  • Admin Panel (port 3002)');
    console.log('');
    console.log('Pour arrêter le serveur: Ctrl+C');
    console.log('');
});

// Gérer les signaux de fermeture
process.on('SIGINT', () => {
    console.log('\n\n🛑 Arrêt du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
    });
});

// Vérifier les dépendances
const dependencies = ['express', 'ws'];
dependencies.forEach(dep => {
    try {
        require(dep);
    } catch (err) {
        console.error(`❌ Dépendance manquante: ${dep}`);
        console.error(`   Exécutez: npm install ${dep}`);
        process.exit(1);
    }
});
