// src/controllers/BorrowReturnExportController.js
const { sql, poolPromise } = require("../config/db");

class BorrowReturnExportController {
    /**
     * API: Borrow hoặc Transfer
     * Nếu fromUserId không được cung cấp hoặc bằng 0, nghĩa là mượn từ kho.
     * Nếu có fromUserId, đó là giao dịch chuyển giao giữa người mượn.
     */
    static async borrowOrTransfer(req, res) {
        try {
            const { sampleId, quantity, fromUserId, toUserId } = req.body;
            if (!sampleId || !quantity || !toUserId) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const pool = await poolPromise;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                // Lấy thông tin sản phẩm mẫu hiện tại
                const sampleResult = await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .query("SELECT * FROM Samples WHERE SampleID = @sampleId");
                if (sampleResult.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ message: "Sample not found" });
                }
                let sample = sampleResult.recordset[0];

                let actionType;
                if (!fromUserId || fromUserId === 0) {
                    // Mượn từ kho
                    if (sample.Quantity < quantity) {
                        await transaction.rollback();
                        return res.status(400).json({ message: "Insufficient quantity in warehouse" });
                    }
                    actionType = "Borrow";
                    const newQuantity = sample.Quantity - quantity;
                    const newBorrowedQuantity = (sample.BorrowedQuantity || 0) + quantity;
                    // Cập nhật sản phẩm: giảm số lượng trong kho, tăng số lượng mượn và gán LastBorrower
                    await transaction.request()
                        .input("sampleId", sql.Int, sampleId)
                        .input("newQuantity", sql.Int, newQuantity)
                        .input("newBorrowedQuantity", sql.Int, newBorrowedQuantity)
                        .input("toUserId", sql.Int, toUserId)
                        .query(`
              UPDATE Samples
              SET Quantity = @newQuantity,
                  BorrowedQuantity = @newBorrowedQuantity,
                  LastBorrower = @toUserId,
                  State = 'Unavailable'
              WHERE SampleID = @sampleId
            `);
                } else {
                    // Chuyển giao giữa người mượn
                    if (sample.LastBorrower !== fromUserId) {
                        await transaction.rollback();
                        return res.status(400).json({ message: "Invalid transfer: fromUserId does not match current holder" });
                    }
                    actionType = "Transfer";
                    // Chỉ cập nhật người mượn cuối cùng
                    await transaction.request()
                        .input("sampleId", sql.Int, sampleId)
                        .input("toUserId", sql.Int, toUserId)
                        .query(`
              UPDATE Samples
              SET LastBorrower = @toUserId
              WHERE SampleID = @sampleId
            `);
                }

                // Ghi lại giao dịch vào bảng BorrowReturnHistory
                await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .input("quantity", sql.Int, quantity)
                    .input("fromUserId", sql.Int, fromUserId || 0)
                    .input("toUserId", sql.Int, toUserId)
                    .input("actionType", sql.NVarChar, actionType)
                    .query(`
            INSERT INTO BorrowReturnHistory (SampleID, Quantity, Date, BorrowerFrom, BorrowerTo, ActionType)
            VALUES (@sampleId, @quantity, GETDATE(), @fromUserId, @toUserId, @actionType)
          `);

                await transaction.commit();
                res.json({ message: `${actionType} transaction successful` });
            } catch (innerError) {
                await transaction.rollback();
                res.status(500).json({ error: innerError.message });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * API: Return (trả sản phẩm về kho)
     * Kiểm tra rằng người trả phải là người mượn cuối cùng (LastBorrower)
     * Cập nhật số lượng trong kho và giảm số lượng mượn.
     */
    static async returnSample(req, res) {
        try {
            const { sampleId, quantity, fromUserId } = req.body;
            if (!sampleId || !quantity || !fromUserId) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const pool = await poolPromise;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                // Lấy thông tin sản phẩm mẫu hiện tại
                const sampleResult = await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .query("SELECT * FROM Samples WHERE SampleID = @sampleId");
                if (sampleResult.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ message: "Sample not found" });
                }
                let sample = sampleResult.recordset[0];
                if (sample.LastBorrower !== fromUserId) {
                    await transaction.rollback();
                    return res.status(400).json({ message: "Invalid return: fromUserId does not match current holder" });
                }
                if ((sample.BorrowedQuantity || 0) < quantity) {
                    await transaction.rollback();
                    return res.status(400).json({ message: "Return quantity exceeds borrowed quantity" });
                }

                const newQuantity = sample.Quantity + quantity;
                const newBorrowedQuantity = (sample.BorrowedQuantity || 0) - quantity;
                let newLastBorrower = sample.LastBorrower;
                let newState = 'Unavailable';
                // Nếu tất cả sản phẩm mượn đã trả về kho
                if (newBorrowedQuantity === 0) {
                    newLastBorrower = null;
                    newState = 'Available';
                }
                await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .input("newQuantity", sql.Int, newQuantity)
                    .input("newBorrowedQuantity", sql.Int, newBorrowedQuantity)
                    .input("newLastBorrower", sql.Int, newLastBorrower)
                    .input("newState", sql.NVarChar, newState)
                    .query(`
            UPDATE Samples
            SET Quantity = @newQuantity,
                BorrowedQuantity = @newBorrowedQuantity,
                LastBorrower = @newLastBorrower,
                State = @newState
            WHERE SampleID = @sampleId
          `);
                await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .input("quantity", sql.Int, quantity)
                    .input("fromUserId", sql.Int, fromUserId)
                    .input("actionType", sql.NVarChar, "Return")
                    .query(`
            INSERT INTO BorrowReturnHistory (SampleID, Quantity, Date, BorrowerFrom, ActionType)
            VALUES (@sampleId, @quantity, GETDATE(), @fromUserId, @actionType)
          `);

                await transaction.commit();
                res.json({ message: "Return transaction successful" });
            } catch (innerError) {
                await transaction.rollback();
                res.status(500).json({ error: innerError.message });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * API: Export
     * Xuất kho sản phẩm. Kiểm tra số lượng trong kho và cập nhật trạng thái nếu hết.
     */
    static async exportSample(req, res) {
        try {
            const { sampleId, quantity, exporterId } = req.body;
            if (!sampleId || !quantity || !exporterId) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            const pool = await poolPromise;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                // Lấy thông tin sản phẩm mẫu hiện tại
                const sampleResult = await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .query("SELECT * FROM Samples WHERE SampleID = @sampleId");
                if (sampleResult.recordset.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ message: "Sample not found" });
                }
                let sample = sampleResult.recordset[0];
                if (sample.Quantity < quantity) {
                    await transaction.rollback();
                    return res.status(400).json({ message: "Insufficient quantity in warehouse for export" });
                }
                const newQuantity = sample.Quantity - quantity;
                let newState = sample.State;
                // Nếu không còn hàng trong kho và không có số lượng mượn, chuyển trạng thái sang Exported
                if (newQuantity === 0 && (!(sample.BorrowedQuantity && sample.BorrowedQuantity > 0))) {
                    newState = 'Exported';
                }
                await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .input("newQuantity", sql.Int, newQuantity)
                    .input("newState", sql.NVarChar, newState)
                    .query(`
            UPDATE Samples
            SET Quantity = @newQuantity,
                State = @newState
            WHERE SampleID = @sampleId
          `);
                // Ghi lại giao dịch xuất kho
                await transaction.request()
                    .input("sampleId", sql.Int, sampleId)
                    .input("quantity", sql.Int, quantity)
                    .input("exporterId", sql.Int, exporterId)
                    .query(`
            INSERT INTO ExportHistory (SampleID, Quantity, Date, ExporterID)
            VALUES (@sampleId, @quantity, GETDATE(), @exporterId)
          `);

                await transaction.commit();
                res.json({ message: "Export transaction successful" });
            } catch (innerError) {
                await transaction.rollback();
                res.status(500).json({ error: innerError.message });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = BorrowReturnExportController;
