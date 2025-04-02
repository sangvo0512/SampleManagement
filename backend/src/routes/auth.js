const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/db");
require("dotenv").config();

const router = express.Router();

router.post("/login", async (req, res, next) => {
    passport.authenticate("ldapauth", { session: false }, async (err, user, info) => {
        if (err) {
            console.error("LDAP Error:", err);
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            console.log("Info:", info);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        try {
            const pool = await poolPromise;
            const result = await pool
                .request()
                .input("username", sql.NVarChar, user.sAMAccountName)
                .query("SELECT * FROM Users WHERE Username = @username");

            if (result.recordset.length === 0) {
                return res.status(403).json({ message: "Access denied. User not authorized." });
            }

            const dbUser = result.recordset[0];

            // Khi người dùng hợp lệ, tạo token
            const token = jwt.sign(
                { userId: dbUser.UserID, username: dbUser.Username, departmentId: dbUser.DepartmentID },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.json({
                message: "Login successful",
                token,
                user: {
                    userId: dbUser.UserID,
                    username: dbUser.Username,
                    fullName: dbUser.FullName,
                    email: dbUser.Email,
                    departmentId: dbUser.DepartmentID
                }
            });

        } catch (dbError) {
            console.error("Database Error:", dbError);
            return res.status(500).json({ error: dbError.message });
        }
    })(req, res, next);
});

module.exports = router;
