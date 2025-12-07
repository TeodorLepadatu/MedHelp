const Joi = require('joi');
const AuthService = require("../services/auth.service");

// Validation Schema
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.string().isoDate().required(),
    password: Joi.string().min(8).required(),
    address: Joi.string().required(),
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
    
    // New Fields
    weight: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
    country: Joi.string().required(),
    sex: Joi.string().valid('Male', 'Female', 'Other').required(),
    previousConditions: Joi.string().allow('').optional(), // Allow empty string
    familyConditions: Joi.string().allow('').optional()    // Allow empty string
});

const UserController = {

    // --- 1. Login User ---
    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body; 

            // Find user in the Database
            const user = await AuthService.findUserByEmail(email);

            if (!user) {
                return res.status(401).send('Invalid email or password');
            }

            // Compare password
            const isPasswordValid = await AuthService.validatePassword(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).send('Invalid email or password');
            }

            // Generate Token
            const token = AuthService.signJWT(user);

            res.status(200).json({ message: 'User logged in!', token });

        } catch (err) {
            console.error(err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    },

    // --- 2. Register User ---
    registerUser: async (req, res) => {
        try {
            const { error, value } = registerSchema.validate(req.body);
            
            if (error) {
                return res.status(400).send({ error: error.details[0].message });
            }

            // Check if user exists
            const userExists = await AuthService.findUserByEmail(value.email);
            
            if (userExists) {
                return res.status(409).send({ message: 'An account with this email already exists' });
            }

            // Create user
            await AuthService.createUser({
                ...value,
                createdAt: new Date().toISOString() 
            });

            res.status(201).send({ message: 'User registered!' });

        } catch (err) {
            console.error(err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    },
    
    // --- 3. Get Profile (FIXED) ---
   // In user.controller.js

getUserProfile: async (req, res) => {
        console.log("👉 1. Profile route hit!"); 

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).send({ error: 'No token' });

            const token = authHeader.split(' ')[1];
            let decoded;
            try {
                decoded = AuthService.verifyJWT(token);
            } catch (e) {
                return res.status(401).send({ error: 'Invalid token' });
            }

            const user = await AuthService.findUserByEmail(decoded.email);
            if (!user) return res.status(404).send({ error: 'User not found' });

            // --- UPDATE: Add new fields to safe response ---
            const safeUserProfile = {
                _id: String(user._id),
                email: String(user.email || ""),
                firstName: String(user.firstName || ""),
                lastName: String(user.lastName || ""),
                phoneNumber: String(user.phoneNumber || ""),
                address: String(user.address || ""),
                dateOfBirth: String(user.dateOfBirth || ""), 
                createdAt: String(user.createdAt || ""),
                
                // New Fields (Safe Cast)
                weight: String(user.weight || ""),
                height: String(user.height || ""),
                country: String(user.country || ""),
                sex: String(user.sex || ""),
                previousConditions: String(user.previousConditions || ""),
                familyConditions: String(user.familyConditions || "")
            };
            
            return res.status(200).json(safeUserProfile);

        } catch (err) {
            console.error("❌ CRASH REPORT:", err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}

module.exports = UserController;