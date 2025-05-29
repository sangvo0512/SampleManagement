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
            round,
            notifyProductionQuantity,
            dateInform,
            quantity,
            inventoryLocation,
            warehouseID,
            state = 'Available',
            BorrowdQuantity = 0
        } = sampleData;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("brand", sql.NVarChar, brand)
            .input("BU", sql.NVarChar, BU)
            .input("season", sql.NVarChar, season)
            .input("itemCode", sql.NVarChar, itemCode)
            .input("workingNO", sql.NVarChar, workingNO)
            .input("articleNO", sql.NVarChar, articleNO)
            .input("round", sql.NVarChar, round)
            .input("notifyProductionQuantity", sql.Int, notifyProductionQuantity)
            .input("dateInform", sql.Date, dateInform)
            .input("quantity", sql.Int, quantity)
            .input("inventoryLocation", sql.NVarChar, inventoryLocation)
            .input("warehouseID", sql.Int, warehouseID)
            .input("state", sql.NVarChar, state)
            .input("borrowdQuantity", sql.Int, BorrowdQuantity)
            .query(
                `INSERT INTO Samples 
                 (Brand, BU, Season, ItemCode, WorkingNO, ArticleNO, Round, 
                  NotifyProductionQuantity, DateInform, Quantity, InventoryLocation, WarehouseID, State, BorrowdQuantity)
                 VALUES 
                 (@brand, @BU, @season, @itemCode, @workingNO, @articleNO, @round, 
                  @notifyProductionQuantity, @dateInform, @quantity, @inventoryLocation, @warehouseID, @state, @borrowdQuantity);
                 SELECT SCOPE_IDENTITY() AS SampleID;`
            );

        return result.recordset[0].SampleID;
    }

    static async updateSample(id, sampleData) {
        const {
            brand,
            BU,
            season,
            itemCode,
            workingNO,
            articleNO,
            round,
            notifyProductionQuantity,
            dateInform,
            quantity,
            inventoryLocation,
            state
        } = sampleData;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("sampleId", sql.Int, id)
            .input("brand", sql.NVarChar, brand)
            .input("BU", sql.NVarChar, BU)
            .input("season", sql.NVarChar, season)
            .input("itemCode", sql.NVarChar, itemCode)
            .input("workingNO", sql.NVarChar, workingNO)
            .input("articleNO", sql.NVarChar, articleNO)
            .input("round", sql.NVarChar, round)
            .input("notifyProductionQuantity", sql.Int, notifyProductionQuantity)
            .input("dateInform", sql.Date, dateInform)
            .input("quantity", sql.Int, quantity)
            .input("inventoryLocation", sql.NVarChar, inventoryLocation)
            .input("state", sql.NVarChar, state)
            .query(
                `UPDATE Samples 
                 SET Brand = @brand, BU = @BU, Season = @season, ItemCode = @itemCode, WorkingNO = @workingNO, 
                     ArticleNO = @articleNO, Round = @round, NotifyProductionQuantity = @notifyProductionQuantity, 
                     DateInform = @dateInform, Quantity = @quantity, InventoryLocation = @inventoryLocation, State = @state
                 WHERE SampleID = @sampleId`
            );

        return result.rowsAffected[0];
    }

    static async deleteSample(id) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // Lấy ItemCode của mẫu trước khi xóa
            const sampleResult = await transaction.request()
                .input("sampleId", sql.Int, id)
                .query("SELECT ItemCode FROM Samples WHERE SampleID = @sampleId");

            if (sampleResult.recordset.length === 0) {
                throw new Error("Sample not found");
            }

            const itemCode = sampleResult.recordset[0].ItemCode;

            // Xóa các bản ghi liên quan trong QRCodeDetails
            await transaction.request()
                .input("itemCode", sql.NVarChar, itemCode)
                .query("DELETE FROM QRCodeDetails WHERE ItemCode = @itemCode");

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
    static async getSampleByItemCode(itemCode) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("itemCode", sql.NVarChar, itemCode)
            .query("SELECT * FROM Samples WHERE ItemCode = @itemCode");

        return result.recordset[0];
    }
    static async updateSampleByItemCode(itemCode, updateData, transaction) {
        try {
            console.log(`updateSampleByItemCode: ItemCode=${itemCode}, UpdateData=`, updateData);
            const request = transaction.request();
            request.input('itemCode', sql.NVarChar, itemCode);
            request.input('quantity', sql.Int, updateData.Quantity);
            request.input('borrowdQuantity', sql.Int, updateData.BorrowdQuantity);
            request.input('state', sql.NVarChar, updateData.State);

            const result = await request.query(`
                UPDATE Samples 
                SET Quantity = @quantity, BorrowdQuantity = @borrowdQuantity, State = @state
                WHERE ItemCode = @itemCode
            `);
            console.log(`updateSampleByItemCode result: RowsAffected=${result.rowsAffected}`);
            if (result.rowsAffected[0] === 0) {
                console.error(`Không tìm thấy mẫu với ItemCode=${itemCode}`);
                throw new Error(`Không tìm thấy mẫu với ItemCode=${itemCode}`);
            }
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error("Error updating sample:", error);
            throw error;
        }
    }


}

module.exports = SampleModel;
