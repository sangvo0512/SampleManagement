const { sql, poolPromise } = require('../config/db');
const SampleModel = require('./SampleModel');

class TransactionModel {
    // Tạo một giao dịch mới
    static async createTransaction(data) {
        const {
            ActionType,
            ItemCode,
            UserID,
            DepartmentID,
            Quantity,
            TransactionDate,
            ReturnDate = null
        } = data;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("ActionType", sql.NVarChar(50), ActionType)
            .input("ItemCode", sql.NVarChar(50), ItemCode)
            .input("UserID", sql.Int, UserID)
            .input("DepartmentID", sql.Int, DepartmentID)
            .input("Quantity", sql.Int, Quantity)
            .input("TransactionDate", sql.Date, TransactionDate)
            .input("ReturnDate", sql.Date, ReturnDate)
            .query(`
                INSERT INTO Transactions 
                (ActionType, ItemCode, UserID, DepartmentID, Quantity, TransactionDate, ReturnDate)
                VALUES 
                (@ActionType, @ItemCode, @UserID, @DepartmentID, @Quantity, @TransactionDate, @ReturnDate);
                SELECT SCOPE_IDENTITY() AS TransactionID;
            `);

        return result.recordset[0].TransactionID;
    }

    // Lấy tất cả giao dịch
    static async getAllTransactions() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT t.*, u.FullName AS UserName, d.DepartmentName, s.Brand, s.ItemCode
                FROM Transactions t
                LEFT JOIN Users u ON t.UserID = u.UserID
                LEFT JOIN Departments d ON t.DepartmentID = d.DepartmentID
                LEFT JOIN Samples s ON t.ItemCode = s.ItemCode
                ORDER BY t.TransactionDate DESC
            `);
        return result.recordset;
    }

    // Lấy giao dịch theo ItemCode
    static async getTransactionsByItemCode(itemCode) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("ItemCode", sql.NVarChar(50), itemCode)
            .query(`
                SELECT * FROM Transactions
                WHERE ItemCode = @ItemCode
                ORDER BY TransactionDate DESC
            `);
        return result.recordset;
    }

    // Lấy giao dịch theo TransactionID
    static async getTransactionById(transactionId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("TransactionID", sql.Int, transactionId)
            .query(`
                SELECT * FROM Transactions
                WHERE TransactionID = @TransactionID
            `);
        return result.recordset[0];
    }

    // Lấy giao dịch theo User
    static async getTransactionsByUserId(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("UserID", sql.Int, userId)
            .query(`
                SELECT * FROM Transactions
                WHERE UserID = @UserID
                ORDER BY TransactionDate DESC
            `);
        return result.recordset;
    }

    // Lấy giao dịch theo Department
    static async getTransactionsByDepartmentId(departmentId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("DepartmentID", sql.Int, departmentId)
            .query(`
                SELECT * FROM Transactions
                WHERE DepartmentID = @DepartmentID
                ORDER BY TransactionDate DESC
            `);
        return result.recordset;
    }

    // Cập nhật giao dịch khi trả lại sản phẩm
    static async returnTransaction(transactionId, returnDate) {
        const transaction = await this.getTransactionById(transactionId);
        if (!transaction) throw new Error("Transaction not found.");

        const item = await SampleModel.getSampleByItemCode(transaction.ItemCode);
        if (!item) throw new Error("Sample not found.");

        const newQuantity = item.Quantity + transaction.Quantity;
        const newBorrowed = (item.BorrowdQuantity || 0) - transaction.Quantity;

        // Update sample
        await SampleModel.updateSampleByItemCode(transaction.ItemCode, {
            Quantity: newQuantity,
            BorrowdQuantity: newBorrowed,
            State: newQuantity > 0 ? "Available" : "Unavailable"
        });

        // Update transaction ReturnDate
        const pool = await poolPromise;
        const result = await pool.request()
            .input("TransactionID", sql.Int, transactionId)
            .input("ReturnDate", sql.Date, returnDate)
            .query(`
                UPDATE Transactions
                SET ReturnDate = @ReturnDate
                WHERE TransactionID = @TransactionID
            `);
        return result.rowsAffected[0];
    }

    // Xóa giao dịch
    static async deleteTransaction(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("TransactionID", sql.Int, id)
            .query("DELETE FROM Transactions WHERE TransactionID = @TransactionID");
        return result.rowsAffected[0];
    }

    // (Tùy chọn) Lấy tổng hợp theo tháng
    static async getTransactionSummaryByMonth(year) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Year", sql.Int, year)
            .query(`
                SELECT 
                    MONTH(TransactionDate) AS Month,
                    ActionType,
                    COUNT(*) AS TotalTransactions
                FROM Transactions
                WHERE YEAR(TransactionDate) = @Year
                GROUP BY MONTH(TransactionDate), ActionType
                ORDER BY Month
            `);
        return result.recordset;
    }
}

module.exports = TransactionModel;
