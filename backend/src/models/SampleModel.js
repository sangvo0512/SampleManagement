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
            serialNumber,
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
            .input("serialNumber", sql.NVarChar, serialNumber)
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
                 (SerialNumber, Brand, BU, Season, ItemCode, WorkingNO, ArticleNO, Round, 
                  NotifyProductionQuantity, DateInform, Quantity, InventoryLocation, WarehouseID, State, BorrowdQuantity)
                 VALUES 
                 (@serialNumber, @brand, @BU, @season, @itemCode, @workingNO, @articleNO, @round, 
                  @notifyProductionQuantity, @dateInform, @quantity, @inventoryLocation, @warehouseID, @state, @borrowdQuantity);
                 SELECT SCOPE_IDENTITY() AS SampleID;`
            );

        return result.recordset[0].SampleID;
    }



    static async updateSample(id, sampleData) {
        const { brand, BU, season, itemCode, workingNO, articleNO, round, notifyProductionQuantity, dateInform, quantity, inventoryLocation, state } = sampleData;

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
        const result = await pool.request()
            .input("sampleId", sql.Int, id)
            .query("DELETE FROM Samples WHERE SampleID = @sampleId");

        return result.rowsAffected[0];
    }
}

module.exports = SampleModel;
