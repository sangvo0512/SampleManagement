// src/models/HistoryModel.js
const { sql, poolPromise } = require('../config/db');

class HistoryModel {
    // Lưu lịch sử mượn/trả sản phẩm mẫu
    static async createBorrowReturnHistory(history) {
        try {
            const { sampleId, quantity, date, borrowerId, actionType } = history;
            const pool = await poolPromise;
            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, date)
                .input("borrowerId", sql.Int, borrowerId)
                .input("actionType", sql.NVarChar, actionType)
                .query(`
          INSERT INTO BorrowReturnHistory (SampleID, Quantity, Date, BorrowerID, ActionType)
          VALUES (@sampleId, @quantity, @date, @borrowerId, @actionType)
        `);
            return true;
        } catch (err) {
            throw err;
        }
    }

    // Lưu lịch sử xuất kho sản phẩm mẫu
    static async createExportHistory(history) {
        try {
            const { sampleId, quantity, date, exporterId } = history;
            const pool = await poolPromise;
            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, date)
                .input("exporterId", sql.Int, exporterId)
                .query(`
          INSERT INTO ExportHistory (SampleID, Quantity, Date, ExporterID)
          VALUES (@sampleId, @quantity, @date, @exporterId)
        `);
            return true;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = HistoryModel;
