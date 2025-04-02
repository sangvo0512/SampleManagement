const { sql, poolPromise } = require('../config/db');

class UserModel {
    // Lấy danh sách người dùng
    static async getUserList() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT 
                        Users.UserID, Users.Username, Users.FullName, Users.Email, 
                        Users.IDNumber, Departments.DepartmentName 
                    FROM Users
                    LEFT JOIN Departments ON Users.DepartmentID = Departments.DepartmentID
                `);
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }


    // Lấy thông tin người dùng theo ID
    static async getUserById(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM Users WHERE UserID = @userId');
            return result.recordset[0];
        } catch (err) {
            throw err;
        }
    }

    // Tạo người dùng mới
    static async createUser(username, fullName, email, departmentId, idNumber) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('username', sql.NVarChar, username)
                .input('fullName', sql.NVarChar, fullName)
                .input('email', sql.NVarChar, email)
                .input('departmentId', sql.Int, departmentId)
                .input('idNumber', sql.NVarChar, idNumber)
                .query(`
                    INSERT INTO Users (Username, FullName, Email, DepartmentID, IdNumber)
                    VALUES (@username, @fullName, @email, @departmentId, @idNumber);
                    SELECT SCOPE_IDENTITY() AS UserID;
                `);
            return result.recordset[0];
        } catch (err) {
            throw err;
        }
    }

    // Cập nhật thông tin người dùng
    static async updateUser(userId, fullName, email, departmentId, idNumber) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('fullName', sql.NVarChar, fullName)
                .input('email', sql.NVarChar, email)
                .input('departmentId', sql.Int, departmentId)
                .input('idNumber', sql.NVarChar, idNumber)
                .query(`
                    UPDATE Users
                    SET FullName = @fullName, Email = @email, DepartmentID = @departmentId, IDNumber= @idNumber
                    WHERE UserID = @userId
                `);
            return result.rowsAffected[0];
        } catch (err) {
            throw err;
        }
    }

    // Xóa người dùng
    static async deleteUser(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM Users WHERE UserID = @userId');
            return result.rowsAffected[0];
        } catch (err) {
            throw err;
        }
    }
}

module.exports = UserModel;
