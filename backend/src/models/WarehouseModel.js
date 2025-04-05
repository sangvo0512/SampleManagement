const { sql, poolPromise } = require("../config/db");

class WarehouseModel {
    static async getAllWarehouses() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query("SELECT * FROM Warehouses");
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    static async createWarehouse(name) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("WarehouseName", sql.NVarChar(255), name)
                .query("INSERT INTO Warehouses (WarehouseName) OUTPUT INSERTED.* VALUES (@WarehouseName)");
            return result.recordset[0];
        } catch (err) {
            throw err;
        }
    }

    static async updateWarehouse(id, name) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("WarehouseID", sql.Int, id)
                .input("WarehouseName", sql.NVarChar(255), name)
                .query("UPDATE Warehouses SET WarehouseName = @WarehouseName WHERE WarehouseID = @WarehouseID");
        } catch (err) {
            throw err;
        }
    }

    static async deleteWarehouse(id) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("WarehouseID", sql.Int, id)
                .query("DELETE FROM Warehouses WHERE WarehouseID = @WarehouseID");
        } catch (err) {
            throw err;
        }
    }
}

module.exports = WarehouseModel;
