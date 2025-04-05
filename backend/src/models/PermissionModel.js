const { sql, poolPromise } = require("../config/db");

class PermissionModel {
    // Lấy quyền của user
    static async getUserPermissions(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("userId", sql.Int, userId)
                .query(`
                    SELECT DISTINCT p.PermissionID, p.PermissionName
                    FROM Permissions p
                    LEFT JOIN UserPermissions up ON p.PermissionID = up.PermissionID AND up.UserID = @userId
                    WHERE up.PermissionID IS NOT NULL
                `);
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }
    static async getDisplayPermissions() {
        const pool = await poolPromise;
        // Lấy các quyền có tên bắt đầu bằng 'VIEW_'
        const result = await pool.request().query("SELECT * FROM Permissions WHERE PermissionName LIKE 'VIEW_%'");
        return result.recordset;
    }
    // Thêm quyền cho user (chặn trùng lặp)
    static async addUserPermissions(userId, permissions) {
        try {
            const pool = await poolPromise;
            for (let permissionId of permissions) {
                const checkResult = await pool.request()
                    .input("userId", sql.Int, userId)
                    .input("permissionId", sql.Int, permissionId)
                    .query("SELECT COUNT(*) AS count FROM UserPermissions WHERE UserID = @userId AND PermissionID = @permissionId");

                if (checkResult.recordset[0].count === 0) {
                    await pool.request()
                        .input("userId", sql.Int, userId)
                        .input("permissionId", sql.Int, permissionId)
                        .query("INSERT INTO UserPermissions (UserID, PermissionID) VALUES (@userId, @permissionId)");
                }
            }
        } catch (err) {
            throw err;
        }
    }

    // Xóa quyền của user
    static async removeUserPermissions(userId, permissions) {
        try {
            const pool = await poolPromise;
            for (let permissionId of permissions) {
                await pool.request()
                    .input("userId", sql.Int, userId)
                    .input("permissionId", sql.Int, permissionId)
                    .query("DELETE FROM UserPermissions WHERE UserID = @userId AND PermissionID = @permissionId");
            }
        } catch (err) {
            throw err;
        }
    }
}

module.exports = PermissionModel;
