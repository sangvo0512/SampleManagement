const { sql, poolPromise } = require("../config/db");

class OperationCodeModel {
    static async getAllOperationCodes() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT oc.ReasonID, oc.ReasonDetail, d.DepartmentID, d.DepartmentName
                FROM OperationCodes oc
                LEFT JOIN DepartmentOperationCodes doc ON oc.ReasonID = doc.ReasonID
                LEFT JOIN Departments d ON doc.DepartmentID = d.DepartmentID
            `);
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    static async createOperationCode(reasonDetail) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("ReasonDetail", sql.NVarChar, reasonDetail)
                .query("INSERT INTO OperationCodes (ReasonDetail) OUTPUT INSERTED.ReasonID VALUES (@ReasonDetail)");
            return result.recordset[0];
        } catch (err) {
            throw err;
        }
    }

    static async deleteOperationCode(reasonID) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("ReasonID", sql.Int, reasonID)
                .query("DELETE FROM OperationCodes WHERE ReasonID = @ReasonID");
        } catch (err) {
            throw err;
        }
    }

    static async updateOperationCode(reasonID, reasonDetail) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("ReasonID", sql.Int, reasonID)
                .input("ReasonDetail", sql.NVarChar, reasonDetail)
                .query("UPDATE OperationCodes SET ReasonDetail = @ReasonDetail WHERE ReasonID = @ReasonID");
        } catch (err) {
            throw err;
        }
    }

    static async assignOperationCodeToDepartment(departmentID, reasonID) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("DepartmentID", sql.Int, departmentID)
                .input("ReasonID", sql.Int, reasonID)
                .query("INSERT INTO DepartmentOperationCodes (DepartmentID, ReasonID) VALUES (@DepartmentID, @ReasonID)");
        } catch (err) {
            throw err;
        }
    }

    static async getOperationCodesByDepartment(departmentID) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("DepartmentID", sql.Int, departmentID)
                .query(`
                    SELECT oc.ReasonID, oc.ReasonDetail
                    FROM OperationCodes oc
                    JOIN DepartmentOperationCodes doc ON oc.ReasonID = doc.ReasonID
                    WHERE doc.DepartmentID = @DepartmentID
                `);
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = OperationCodeModel;
