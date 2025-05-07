// src/models/HistoryModel.js
const { sql, poolPromise } = require('../config/db');

class HistoryModel {
    // Tạo bản ghi mượn/trả/chuyển giao
    static async createBorrowReturnHistory(history) {
        try {
            const { sampleId, quantity, date, borrowerFrom, borrowerTo, actionType } = history;
            const pool = await poolPromise;
            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, date)
                .input("borrowerFrom", sql.Int, borrowerFrom || null)
                .input("borrowerTo", sql.Int, borrowerTo)
                .input("actionType", sql.NVarChar, actionType)
                .query(`
                    INSERT INTO BorrowReturnHistory 
                    (SampleID, Quantity, Date, BorrowerFrom, BorrowerTo, ActionType)
                    VALUES (@sampleId, @quantity, @date, @borrowerFrom, @borrowerTo, @actionType)
                `);
            return true;
        } catch (err) {
            throw err;
        }
    }

    // Tạo bản ghi xuất kho
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
                    INSERT INTO ExportHistory 
                    (SampleID, Quantity, Date, ExporterID)
                    VALUES (@sampleId, @quantity, @date, @exporterId)
                `);
            return true;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = HistoryModel;
