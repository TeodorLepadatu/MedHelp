const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Import bcrypt
// Assuming DatabaseService is required here
const DatabaseService = require('../services/database.service'); 

const AuthService = {

    // Helper to get collection
    getCollection: async () => {
        return await DatabaseService.goToCollection('Users');
    },

    signJWT: (user) => {
        const secret = process.env.JWT_SECRET_KEY;
        // removing sensitive info like password before signing
        const payload = { 
            email: user.email, 
            _id: user._id, 
            firstName: user.firstName 
        };
        
        return jwt.sign(payload, secret, { expiresIn: '1h' });
    },

    findUserByEmail: async (email) => {
        const collection = await AuthService.getCollection();
        return await collection.findOne({ email: email });
    },

    createUser: async (userData) => {
        const collection = await AuthService.getCollection();
        
        // 1. Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
        
        const userToSave = {
            ...userData,
            password: hashedPassword // Save the hash, not the plain text
        };

        return await collection.insertOne(userToSave);
    },

    validatePassword: async (inputPassword, storedHash) => {
        return await bcrypt.compare(inputPassword, storedHash);
    },

    validateJWT: (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer'))
            return res.status(401).send('Access denied. No token provided'); // Fixed typo

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET_KEY;

        jwt.verify(token, secret, (err, user) => {
            if (err)
                return res.status(403).send("Invalid token"); // Fixed typo and changed to 403 (Forbidden)
            req.user = user;
            next();
        });
    },
}

module.exports = AuthService;