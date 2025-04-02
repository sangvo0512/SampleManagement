// src/controllers/HistoryController.js
const { sql, poolPromise } = require("../config/db");

class HistoryController {
    // API lấy lịch sử mượn, chuyển giao và trả sản phẩm mẫu
    static async getBorrowReturnHistory(req, res) {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
        SELECT 
          brh.TransactionID, 
          brh.SampleID, 
          brh.Quantity, 
          brh.Date, 
          brh.BorrowerFrom, 
          brh.BorrowerTo, 
          brh.ActionType,
          uFrom.Username AS BorrowerFromUsername,
          uTo.Username AS BorrowerToUsername
        FROM BorrowReturnHistory brh
        LEFT JOIN Users uFrom ON brh.BorrowerFrom = uFrom.UserID
        LEFT JOIN Users uTo ON brh.BorrowerTo = uTo.UserID
        ORDER BY brh.Date DESC
      `);
            res.json(result.recordset);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // API lấy lịch sử xuất kho sản phẩm mẫu
    static async getExportHistory(req, res) {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
        SELECT 
          eh.ExportID, 
          eh.SampleID, 
          eh.Quantity, 
          eh.Date, 
          eh.ExporterID, 
          u.Username AS ExporterUsername
        FROM ExportHistory eh
        LEFT JOIN Users u ON eh.ExporterID = u.UserID
        ORDER BY eh.Date DESC
      `);
            res.json(result.recordset);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = HistoryController;
