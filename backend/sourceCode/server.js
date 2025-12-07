require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const DatabaseService = require('./services/database.service'); 
const userRoutes = require('./routes/user.routes');
const partnerRoutes = require('./routes/partners.routes'); 

const app = express();
const port = 3000;

app.disable('etag');

// --- 1. Middleware (Order Matters!) ---
app.use(cors()); // Enable CORS first
app.use(express.json());

// Logger: Place this BEFORE routes to see incoming requests
app.use((req, res, next) => {
    console.log(`\n📡 REQUEST: ${req.method} ${req.url}`);
    next();
});

// --- 2. Routes ---
app.use('/', userRoutes); 
app.use('/partners', partnerRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send("Server is running. POST to /register or /login");
});

// --- 3. Start Server ---
DatabaseService.connectToMongoDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Backend server listening at http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error("Failed to connect to Database:", err);
    });