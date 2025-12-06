require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
DatabaseService = require('./services/database.service');
const userRoutes = require('./routes/user.routes');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.use('/', userRoutes); 

// Optional: Default route for testing
app.get('/', (req, res) => {
    res.send("Server is running. POST to /register or /login");
});



DatabaseService.connectToMongoDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Backend server listening at http://localhost:${port}`);
        });
    });

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});