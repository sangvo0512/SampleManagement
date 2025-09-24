// src/models/SampleModel.js
const { sql, poolPromise } = require("../config/db");

class SampleModel {
    static async getAllSamples() {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Samples");
        return result.recordset;
    }

    static async createSample(sampleData) {
        const {
            brand,
            BU,
            season,
            itemCode,
            workingNO,
            articleNO,
            colorwayName,
            round,
            notifyProductionQuantity,
            dateInform,
            quantity = 0, // Quantity mặc định là 0
            state = 'Unavailable',
            borrowdQuantity = 0,
            exported = 0,
            rejected = 0,
            createDate = new Date(),
            modifyTime = new Date(),
        } = sampleData;

        // Tạo UniqueKey
        const uniqueKey = `${itemCode}-${season}-${articleNO}-${round}`;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("brand", sql.NVarChar, brand)
            .input("BU", sql.NVarChar, BU)
            .input("season", sql.NVarChar, season)
            .input("itemCode", sql.NVarChar, itemCode)
            .input("workingNO", sql.NVarChar, workingNO)
            .input("articleNO", sql.NVarChar, articleNO)
            .input("colorwayName", sql.NVarChar, colorwayName)
            .input("round", sql.NVarChar, round)
            .input("notifyProductionQuantity", sql.Int, notifyProductionQuantity)
            .input("dateInform", sql.Date, dateInform)
            .input("quantity", sql.Int, quantity)
            .input("state", sql.NVarChar, state)
            .input("borrowdQuantity", sql.Int, borrowdQuantity)
            .input("exported", sql.Int, exported)
            .input("rejected", sql.Int, rejected)
            .input("createDate", sql.DateTime, createDate)
            .input("modifyTime", sql.DateTime, modifyTime)
            .input("uniqueKey", sql.NVarChar, uniqueKey)
            .query(
                `INSERT INTO Samples 
                 (Brand, BU, Season, ItemCode, WorkingNO, ArticleNO, ColorwayName, Round, 
                  NotifyProductionQuantity, DateInform, Quantity, State, BorrowdQuantity, 
                  Exported, Rejected, CreateDate, ModifyTime, UniqueKey)
                 VALUES 
                 (@brand, @BU, @season, @itemCode, @workingNO, @articleNO, @colorwayName, @round, 
                  @notifyProductionQuantity, @dateInform, @quantity, @state, @borrowdQuantity, 
                  @exported, @rejected, @createDate, @modifyTime, @uniqueKey);
                 SELECT SCOPE_IDENTITY() AS SampleID;`
            );

        return { sampleId: result.recordset[0].SampleID, uniqueKey };
    }

    static async updateSample(id, sampleData) {
        const {
            brand,
            BU,
            notifyProductionQuantity,
            dateInform,
            quantity,
            state,
            borrowdQuantity,
            exported,
            rejected,
            colorwayName,
            modifyTime = new Date(),
        } = sampleData;
        if (sampleData.quantity > sampleData.notifyProductionQuantity) {
            throw new Error("Quantity không được lớn hơn NotifyProductionQuantity");
        }
        const pool = await poolPromise;
        const result = await pool.request()
            .input("sampleId", sql.Int, id)
            .input("brand", sql.NVarChar, brand)
            .input("BU", sql.NVarChar, BU)
            .input("notifyProductionQuantity", sql.Int, notifyProductionQuantity)
            .input("dateInform", sql.Date, dateInform)
            .input("quantity", sql.Int, quantity)
            .input("state", sql.NVarChar, state)
            .input("borrowdQuantity", sql.Int, borrowdQuantity)
            .input("exported", sql.Int, exported)
            .input("rejected", sql.Int, rejected)
            .input("colorwayName", sql.NVarChar, colorwayName)
            .input("modifyTime", sql.DateTime, modifyTime)
            .query(
                `UPDATE Samples 
                 SET Brand = @brand, BU = @BU, NotifyProductionQuantity = @notifyProductionQuantity, 
                     DateInform = @dateInform, Quantity = @quantity, State = @state, 
                     BorrowdQuantity = @borrowdQuantity, Exported = @exported, Rejected = @rejected,
                     ColorwayName = @colorwayName, ModifyTime = @modifyTime
                 WHERE SampleID = @sampleId`
            );

        return result.rowsAffected[0];
    }

    static async deleteSample(id) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // Lấy UniqueKey của mẫu trước khi xóa
            const sampleResult = await transaction.request()
                .input("sampleId", sql.Int, id)
                .query("SELECT UniqueKey FROM Samples WHERE SampleID = @sampleId");

            if (sampleResult.recordset.length === 0) {
                throw new Error("Sample not found");
            }

            const uniqueKey = sampleResult.recordset[0].UniqueKey;

            // Xóa các bản ghi liên quan trong QRCodeDetails
            await transaction.request()
                .input("uniqueKey", sql.NVarChar, uniqueKey)
                .query("DELETE FROM QRCodeDetails WHERE UniqueKey = @uniqueKey");

            // Xóa bản ghi trong Samples
            const result = await transaction.request()
                .input("sampleId", sql.Int, id)
                .query("DELETE FROM Samples WHERE SampleID = @sampleId");

            await transaction.commit();

            return result.rowsAffected[0];
        } catch (err) {
            await transaction.rollback();
            console.error("Error deleting sample:", err);
            throw err;
        }
    }

    static async getSampleByUniqueKey(uniqueKey) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("uniqueKey", sql.NVarChar, uniqueKey)
            .query("SELECT * FROM Samples WHERE UniqueKey = @uniqueKey");

        return result.recordset[0];
    }

    static async updateSampleByUniqueKey(uniqueKey, updateData, transaction) {
        try {
            console.log(`updateSampleByUniqueKey: UniqueKey=${uniqueKey}, UpdateData=`, updateData);
            const request = transaction.request();
            request.input('uniqueKey', sql.NVarChar, uniqueKey);
            request.input('quantity', sql.Int, updateData.Quantity);
            request.input('borrowdQuantity', sql.Int, updateData.BorrowdQuantity);
            request.input('state', sql.NVarChar, updateData.State);
            request.input('exported', sql.Int, updateData.Exported);
            request.input('rejected', sql.Int, updateData.Rejected);
            const result = await request.query(`
                UPDATE Samples 
                SET Quantity = @quantity, BorrowdQuantity = @borrowdQuantity, State = @state, Exported = @exported, Rejected = @rejected
                WHERE UniqueKey = @uniqueKey
            `);
            console.log(`updateSampleByUniqueKey result: RowsAffected=${result.rowsAffected}`);
            if (result.rowsAffected[0] === 0) {
                console.error(`Không tìm thấy mẫu với UniqueKey=${uniqueKey}`);
                throw new Error(`Không tìm thấy mẫu với UniqueKey=${uniqueKey}`);
            }
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error("Error updating sample:", error);
            throw error;
        }
    }

    static async getRecentBorrowedTransactions() {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                t.TransactionID,
                t.ActionType,
                t.UserID,
                t.DepartmentName,
                t.Quantity AS TransactionQuantity,
                t.TransactionDate,
                t.UserName,
                td.QRCodeID,
                t.ToUserName,
                t.ToDepartmentName,
                td.DetailID,
                td.QRIndex,
                s.Brand,
                s.BU,
                s.Season,
                s.WorkingNO,
                s.ArticleNO,
                s.ColorwayName,
                s.Round,
                s.NotifyProductionQuantity,
                s.DateInform,
                s.Quantity AS SampleQuantity,
                s.BorrowdQuantity,
                s.CreateDate,
                s.ModifyTime,
                s.UniqueKey,
                q.Location
            FROM Transactions t
            INNER JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
            INNER JOIN QRCodeDetails q ON td.QRCodeID = q.QRCodeID
            INNER JOIN Samples s ON q.UniqueKey = s.UniqueKey
            WHERE 
                s.BorrowdQuantity > 0
                AND t.ActionType IN ('Borrow', 'Transfer')
                AND td.ReturnDate IS NULL
                AND t.TransactionDate = (
                    SELECT MAX(t2.TransactionDate)
                    FROM Transactions t2
                    INNER JOIN TransactionDetails td2 ON t2.TransactionID = td2.TransactionID
                    WHERE td2.QRCodeID = q.QRCodeID
                    AND t2.ActionType IN ('Borrow', 'Transfer')
                )
            ORDER BY t.TransactionDate DESC;
        `);
        return result.recordset;
    }
}

module.exports = SampleModel;