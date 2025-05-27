const { sql, poolPromise } = require("../config/db");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
    try {
        // Lấy thông tin từ AD sau khi xác thực qua Passport
        const { sAMAccountName, displayName, mail } = req.user;

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("username", sql.NVarChar, sAMAccountName)
            .query("SELECT * FROM Users WHERE Username = @username");

        if (result.recordset.length === 0) {
            return res.status(403).json({ message: "Access denied. User not authorized." });
        }

        const user = result.recordset[0];

        // Tạo token JWT
        const token = jwt.sign(
            { userId: user.UserID, username: user.Username, departmentId: user.DepartmentID },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                username: user.Username,
                displayName,
                email: mail,
                departmentId: user.DepartmentID,
                idNumber: user.IdNumber
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
