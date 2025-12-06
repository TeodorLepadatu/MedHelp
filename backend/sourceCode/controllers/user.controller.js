const Joi = require('joi');
const AuthService = require("../services/auth.service");

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.string().isoDate().required(),
    password: Joi.string().min(8).required(),
    address: Joi.string().required(),
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
});

const UserController = {

    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body; // Changed username to email to match register schema

            // 1. Find user in the actual Database
            const user = await AuthService.findUserByEmail(email);

            if (!user) {
                return res.status(401).send('Invalid email or password');
            }

            // 2. Compare the provided password with the stored hash
            const isPasswordValid = await AuthService.validatePassword(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).send('Invalid email or password');
            }

            // 3. Generate Token
            const token = AuthService.signJWT(user);

            res.status(200).json({ message: 'User logged in!', token });

        } catch (err) {
            console.error(err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    },

    registerUser: async (req, res) => {
        try {
            const { error, value } = registerSchema.validate(req.body);
            
            if (error) {
                return res.status(400).send({ error: error.details[0].message });
            }

            // Check if user exists using the DB method
            const userExists = await AuthService.findUserByEmail(value.email);
            
            if (userExists) {
                return res.status(409).send({ message: 'An account with this email already exists' });
            }

            // Create user (hashing happens inside AuthService now)
            await AuthService.createUser({
                ...value,
                createdAt: new Date().toISOString() 
            });

            res.status(201).send({ message: 'User registered!' });

        } catch (err) {
            console.error(err);
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
}

module.exports = UserController;