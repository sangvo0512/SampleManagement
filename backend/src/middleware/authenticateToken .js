const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    console.log("Authorization Header:", authHeader);

    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted Token:", token);

    if (!token) {
        return res.status(401).json({ error: "Token is missing" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log("Token verification failed:", err.message);
            return res.status(403).json({ error: "Invalid token" });
        }

        console.log("Decoded Token:", user);
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
