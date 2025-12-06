// server.js
require('dotenv').config(); // Load env variables immediately
const express = require('express');
const DatabaseService = require('./services/database.service');
const authRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
// This allows Express to read JSON data sent in the body of requests
app.use(express.json());

// --- ROUTES ---

// 1. Mount Auth Routes (Login & Register)
// This enables: localhost:3000/login AND localhost:3000/register
app.use('/', authRoutes);

// 2. The Default "/home" Route
app.get('/home', (req, res) => {
    res.status(200).send("Welcome to the MedHelp API Home Page!");
});

// 3. Redirect root "/" to "/home"
app.get('/', (req, res) => {
    res.redirect('/home');
});


// --- START SERVER ---
async function startServer() {
    try {
        // Connect to DB before starting the server
        await DatabaseService.connectToMongoDB();
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
            console.log(`   - Home:     http://localhost:${PORT}/home`);
            console.log(`   - Login:    http://localhost:${PORT}/login (POST)`);
            console.log(`   - Register: http://localhost:${PORT}/register (POST)`);
        });

    } catch (err) {
        console.error("Failed to connect to DB", err);
        process.exit(1);
    }
}

startServer();