const Joi = require('joi');
const bcrypt = require('bcrypt');
const AuthService = require("../services/auth.service"); // Reusing for utilities like signJWT
const DatabaseService = require("../services/database.service"); // Access DB directly

// Validation for Partners (Added companyName)
const partnerRegisterSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    companyName: Joi.string().required(),
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
    address: Joi.string().required(),
    country: Joi.string().required()
});

const PartnersController = {

    // --- 1. Register Partner ---
    registerPartner: async (req, res) => {
        try {
            // Validate Input
            const { error, value } = partnerRegisterSchema.validate(req.body);
            if (error) return res.status(400).send({ error: error.details[0].message });

            // Connect to 'Partners' Collection
            const collection = await DatabaseService.goToCollection('Partners');

            // Check if partner exists
            const existing = await collection.findOne({ email: value.email });
            if (existing) return res.status(409).send({ message: 'Partner account already exists' });

            // Hash Password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(value.password, saltRounds);

            // Save Partner
            const newPartner = {
                ...value,
                password: hashedPassword,
                role: 'partner', // Tag them as partner
                createdAt: new Date().toISOString()
            };

            await collection.insertOne(newPartner);

            res.status(201).send({ message: 'Partner registered successfully!' });

        } catch (err) {
            console.error("Partner Register Error:", err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    },

    // --- 2. Login Partner ---
    loginPartner: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Connect to 'Partners' Collection
            const collection = await DatabaseService.goToCollection('Partners');

            // Find Partner
            const partner = await collection.findOne({ email });
            if (!partner) return res.status(401).send('Invalid email or password');

            // Compare Password
            const isMatch = await bcrypt.compare(password, partner.password);
            if (!isMatch) return res.status(401).send('Invalid email or password');

            // Generate Token (Reusing AuthService to keep JWT secret consistent)
            // We pass the partner object, AuthService.signJWT extracts fields
            const token = AuthService.signJWT(partner);

            res.status(200).json({ 
                message: 'Partner logged in!', 
                token,
                user: { firstName: partner.firstName, company: partner.companyName } 
            });

        } catch (err) {
            console.error("Partner Login Error:", err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    },

    // --- 3. Get Partner Dashboard Data (Statistics & Predictions) ---
    getPartnerDashboard: async (req, res) => {
        try {
            // 1. Verify Token
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).send({ error: 'No token' });
            
            const token = authHeader.split(' ')[1];
            const decoded = AuthService.verifyJWT(token);
            if (!decoded) return res.status(401).send({ error: 'Invalid token' });

            // 2. Fetch Mock Data (In real app, you'd query DB for real stats)
            // This is the data for the "Statistics and Predictions" cards
            const dashboardData = {
                statistics: {
                    infections_today: 145,
                    active_cases_in_area: 1200,
                    risk_level: "High",
                    trend: "Increasing"
                },
                predictions: {
                    next_week_forecast: "Expected 15% increase in flu cases",
                    advisory: "Stock up on antiviral medication"
                },
                company_info: {
                    name: decoded.firstName + "'s Clinic", // Or fetch companyName from DB
                    status: "Active Partner"
                }
            };

            res.status(200).json(dashboardData);

        } catch (err) {
            console.error("Dashboard Data Error:", err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
};

module.exports = PartnersController;