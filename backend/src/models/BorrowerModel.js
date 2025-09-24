const { sql, poolPromise } = require('../config/db');

class BorrowerModel {
    // Lấy tất cả người mượn
    static async getAllBorrowers() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT Name, CardID, Dept
                FROM Borrower
                ORDER BY Name
            `);
            return result.recordset;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách người mượn:', error);
            throw error;
        }
    }

    // Lấy người mượn theo CardID
    static async getBorrowerByCardID(cardID) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('CardID', sql.NVarChar(50), cardID)
                .query(`
                    SELECT Name, CardID, Dept
                    FROM Borrower
                    WHERE CardID = @CardID
                `);
            return result.recordset[0];
        } catch (error) {
            console.error('Lỗi khi lấy người mượn theo CardID:', error);
            throw error;
        }
    }

    // Thêm người mượn mới
    static async createBorrower({ Name, CardID, Dept }) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('Name', sql.NVarChar(100), Name)
                .input('CardID', sql.NVarChar(50), CardID)
                .input('Dept', sql.NVarChar(100), Dept)
                .query(`
                    INSERT INTO Borrower (Name, CardID, Dept)
                    VALUES (@Name, @CardID, @Dept)
                `);
        } catch (error) {
            console.error('Lỗi khi thêm người mượn:', error);
            throw error;
        }
    }

    // Cập nhật người mượn
    static async updateBorrower({ Name, CardID, Dept }) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('Name', sql.NVarChar(100), Name)
                .input('CardID', sql.NVarChar(50), CardID)
                .input('Dept', sql.NVarChar(100), Dept)
                .query(`
                    UPDATE Borrower
                    SET Name = @Name, Dept = @Dept
                    WHERE CardID = @CardID
                `);
            return result.rowsAffected[0];
        } catch (error) {
            console.error('Lỗi khi cập nhật người mượn:', error);
            throw error;
        }
    }

    // Xóa người mượn
    static async deleteBorrower(cardID) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('CardID', sql.NVarChar(50), cardID)
                .query(`
                    DELETE FROM Borrower
                    WHERE CardID = @CardID
                `);
            return result.rowsAffected[0];
        } catch (error) {
            console.error('Lỗi khi xóa người mượn:', error);
            throw error;
        }
    }
}

module.exports = BorrowerModel;