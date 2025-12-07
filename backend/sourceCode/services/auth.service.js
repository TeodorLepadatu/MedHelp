const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 
const DatabaseService = require('../services/database.service'); 

const AuthService = {

    getCollection: async () => {
        return await DatabaseService.goToCollection('Users');
    },

    signJWT: (user) => {
        const secret = process.env.JWT_SECRET_KEY;
        const payload = { 
            email: user.email, 
            _id: user._id, 
            firstName: user.firstName 
        };
        // 15 minute expiration
        return jwt.sign(payload, secret, { expiresIn: '15m' });
    },

    // --- THIS IS THE MISSING FUNCTION ---
    verifyJWT: (token) => {
        const secret = process.env.JWT_SECRET_KEY;
        try {
            // Returns the decoded payload if valid, throws error if invalid
            return jwt.verify(token, secret);
        } catch (error) {
            // Return null so the controller knows it failed
            return null;
        }
    },
    // -----------------------------------

    findUserByEmail: async (email) => {
        const collection = await AuthService.getCollection();
        return await collection.findOne({ email: email });
    },

    createUser: async (userData) => {
        const collection = await AuthService.getCollection();
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
        
        const userToSave = {
            ...userData,
            password: hashedPassword 
        };

        return await collection.insertOne(userToSave);
    },

    validatePassword: async (inputPassword, storedHash) => {
        return await bcrypt.compare(inputPassword, storedHash);
    },

    // This is Middleware (req, res, next) - DO NOT call this manually with a token!
    validateJWT: (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer'))
            return res.status(401).send('Access denied. No token provided'); 

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET_KEY;

        jwt.verify(token, secret, (err, user) => {
            if (err)
                return res.status(403).send("Invalid token"); 
            req.user = user;
            next();
        });
    },
    
}

module.exports = AuthService;