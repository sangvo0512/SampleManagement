// src/services/QRScanService.js
const SampleModel = require('../models/SampleModel');
const HistoryModel = require('../models/HistoryModel');
const { sql, poolPromise } = require('../config/db');

class QRScanService {
    static async handleBorrow(sampleId, userId, departmentId, quantity) {
        const pool = await poolPromise;
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            const sample = await SampleModel.getSampleById(sampleId);
            if (!sample || sample.Quantity < quantity) {
                throw new Error("Not enough quantity available to borrow.");
            }

            // Cập nhật mẫu
            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, sample.Quantity - quantity)
                .input("borrowedQuantity", sql.Int, sample.BorrowdQuantity + quantity)
                .input("state", sql.NVarChar, sample.Quantity - quantity === 0 ? 'Unavailable' : 'Available')
                .query(`
                    UPDATE Samples
                    SET Quantity = @quantity,
                        BorrowdQuantity = @borrowedQuantity,
                        State = @state
                    WHERE SampleID = @sampleId
                `);

            // Ghi lịch sử mượn
            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, new Date())
                .input("borrowerFrom", sql.Int, 0)
                .input("borrowerTo", sql.Int, userId)
                .input("actionType", sql.NVarChar, 'Borrow')
                .query(`
                    INSERT INTO BorrowReturnHistory (SampleID, Quantity, Date, BorrowerFrom, BorrowerTo, ActionType)
                    VALUES (@sampleId, @quantity, @date, @borrowerFrom, @borrowerTo, @actionType)
                `);

            await transaction.commit();
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    static async handleReturn(sampleId, userId, quantity) {
        const pool = await poolPromise;
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            const sample = await SampleModel.getSampleById(sampleId);
            if (!sample || sample.BorrowdQuantity < quantity) {
                throw new Error("Return quantity exceeds borrowed quantity.");
            }

            const newQuantity = sample.Quantity + quantity;
            const newBorrowed = sample.BorrowdQuantity - quantity;

            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, newQuantity)
                .input("borrowedQuantity", sql.Int, newBorrowed)
                .input("state", sql.NVarChar, newQuantity > 0 ? 'Available' : 'Unavailable')
                .query(`
                    UPDATE Samples
                    SET Quantity = @quantity,
                        BorrowdQuantity = @borrowedQuantity,
                        State = @state
                    WHERE SampleID = @sampleId
                `);

            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, new Date())
                .input("borrowerFrom", sql.Int, userId)
                .input("borrowerTo", sql.Int, 0)
                .input("actionType", sql.NVarChar, 'Return')
                .query(`
                    INSERT INTO BorrowReturnHistory (SampleID, Quantity, Date, BorrowerFrom, BorrowerTo, ActionType)
                    VALUES (@sampleId, @quantity, @date, @borrowerFrom, @borrowerTo, @actionType)
                `);

            await transaction.commit();
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    static async handleTransfer(sampleId, fromUserId, toUserId, quantity) {
        const pool = await poolPromise;
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            const sample = await SampleModel.getSampleById(sampleId);
            if (!sample || sample.BorrowdQuantity < quantity) {
                throw new Error("Transfer quantity exceeds borrowed quantity.");
            }

            // Không thay đổi Quantity hay BorrowedQuantity, chỉ ghi nhận lịch sử chuyển giao
            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, new Date())
                .input("borrowerFrom", sql.Int, fromUserId)
                .input("borrowerTo", sql.Int, toUserId)
                .input("actionType", sql.NVarChar, 'Transfer')
                .query(`
                    INSERT INTO BorrowReturnHistory (SampleID, Quantity, Date, BorrowerFrom, BorrowerTo, ActionType)
                    VALUES (@sampleId, @quantity, @date, @borrowerFrom, @borrowerTo, @actionType)
                `);

            await transaction.commit();
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    static async handleExport(sampleId, exporterId, reasonId, departmentId, quantity) {
        const pool = await poolPromise;
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            const sample = await SampleModel.getSampleById(sampleId);
            if (!sample || sample.Quantity < quantity) {
                throw new Error("Not enough quantity to export.");
            }

            const newQuantity = sample.Quantity - quantity;
            const newState = newQuantity === 0 ? 'Exported' : sample.State;

            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, newQuantity)
                .input("state", sql.NVarChar, newState)
                .query(`
                    UPDATE Samples
                    SET Quantity = @quantity,
                        State = @state
                    WHERE SampleID = @sampleId
                `);

            await pool.request()
                .input("sampleId", sql.Int, sampleId)
                .input("quantity", sql.Int, quantity)
                .input("date", sql.DateTime, new Date())
                .input("exporterId", sql.Int, exporterId)
                .query(`
                    INSERT INTO ExportHistory (SampleID, Quantity, Date, ExporterID)
                    VALUES (@sampleId, @quantity, @date, @exporterId)
                `);

            await transaction.commit();
            return { success: true };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
}

module.exports = QRScanService;
