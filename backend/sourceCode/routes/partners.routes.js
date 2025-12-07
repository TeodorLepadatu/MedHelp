const express = require('express');
const router = express.Router();
const PartnersController = require('../controllers/partners.controller');

// Register Partner
// Endpoint: POST /api/partners/register
router.post('/register', PartnersController.registerPartner);

// Login Partner
// Endpoint: POST /api/partners/login
router.post('/login', PartnersController.loginPartner);

// Get Dashboard Data (Protected)
// Endpoint: GET /api/partners/dashboard
router.get('/dashboard', PartnersController.getPartnerDashboard);

module.exports = router;