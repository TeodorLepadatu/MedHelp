const { MongoClient } = require('mongodb');

// We use a separate variable to track the *active connection attempt*
let connectionPromise = null;
let dbInstance = null;
let clientInstance = null;

const DatabaseService = { 

    connectToMongoDB: async () => {
        // 1. If we already have a DB, return it immediately
        if (dbInstance) return dbInstance;

        // 2. If a connection is currently happening (but not finished), wait for it
        if (connectionPromise) return connectionPromise;

        // 3. Start a new connection attempt
        connectionPromise = (async () => {
            try {
                console.log("Connecting to MongoDB...");
                
                clientInstance = await MongoClient.connect(process.env.MONGO_CONNECTION_STRING);
                
                // Use env var for DB name, fallback to 'MedHelp' if not found
                const dbName = process.env.DB_NAME || 'MedHelp'; 
                dbInstance = clientInstance.db(dbName);
                
                console.log(`Successfully connected to database: ${dbName}`);
                return dbInstance;
            } catch (error) {
                console.error("MongoDB Connection Failed:", error);
                connectionPromise = null; // Reset promise so we can try again later
                throw error;
            }
        })();

        return connectionPromise;
    },

    goToCollection: async (collectionName) => {
        // This ensures we always have a connection before getting the collection
        const db = await DatabaseService.connectToMongoDB();
        return db.collection(collectionName);
    },
    
    // Optional: Useful for testing or shutting down the server
    closeConnection: async () => {
        if (clientInstance) {
            await clientInstance.close();
            dbInstance = null;
            connectionPromise = null;
            console.log("MongoDB connection closed.");
        }
    }
};

module.exports = DatabaseService;