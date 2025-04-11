const { sql, poolPromise } = require("../config/db");

class PermissionModel {
    static async getAllPermissions() {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Permissions");
        return result.recordset;
    }

    static async getUserPermissions(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("UserID", sql.Int, userId)
            .query(`
                SELECT p.* FROM Permissions p
                INNER JOIN UserPermissions up ON up.PermissionID = p.PermissionID
                WHERE up.UserID = @UserID
            `);
        return result.recordset;
    }

    static async getGroupPermissions(groupId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("GroupID", sql.Int, groupId)
            .query(`
                SELECT p.* FROM Permissions p
                INNER JOIN GroupPermissions gp ON gp.PermissionID = p.PermissionID
                WHERE gp.GroupID = @GroupID
            `);
        return result.recordset;
    }

    static async setUserPermissions(userId, permissionIds) {
        const pool = await poolPromise;
        const transaction = await pool.transaction();
        await transaction.begin();

        try {
            await transaction.request()
                .input("UserID", sql.Int, userId)
                .query("DELETE FROM UserPermissions WHERE UserID = @UserID");

            for (const permissionId of permissionIds) {
                await transaction.request()
                    .input("UserID", sql.Int, userId)
                    .input("PermissionID", sql.Int, permissionId)
                    .query("INSERT INTO UserPermissions (UserID, PermissionID) VALUES (@UserID, @PermissionID)");
            }

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    static async setGroupPermissions(groupId, permissionIds) {
        const pool = await poolPromise;
        const transaction = await pool.transaction();
        await transaction.begin();

        try {
            await transaction.request()
                .input("GroupID", sql.Int, groupId)
                .query("DELETE FROM GroupPermissions WHERE GroupID = @GroupID");

            for (const permissionId of permissionIds) {
                await transaction.request()
                    .input("GroupID", sql.Int, groupId)
                    .input("PermissionID", sql.Int, permissionId)
                    .query("INSERT INTO GroupPermissions (GroupID, PermissionID) VALUES (@GroupID, @PermissionID)");
            }

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
    static async removeUserPermission(userId, permissionId) {
        const pool = await poolPromise;
        await pool.request()
            .input("UserID", sql.Int, userId)
            .input("PermissionID", sql.Int, permissionId)
            .query("DELETE FROM UserPermissions WHERE UserID = @UserID AND PermissionID = @PermissionID");
    }

    static async removeGroupPermission(groupId, permissionId) {
        const pool = await poolPromise;
        await pool.request()
            .input("GroupID", sql.Int, groupId)
            .input("PermissionID", sql.Int, permissionId)
            .query("DELETE FROM GroupPermissions WHERE GroupID = @GroupID AND PermissionID = @PermissionID");
    }
    //Lấy quyền trực tiếp và quyền group
    static async getEffectivePermissions(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("UserID", sql.Int, userId)
            .query(`
                SELECT DISTINCT p.* 
                FROM Permissions p
                WHERE p.PermissionID IN (
                    SELECT up.PermissionID FROM UserPermissions up WHERE up.UserID = @UserID
                    UNION
                    SELECT gp.PermissionID 
                    FROM GroupPermissions gp 
                    INNER JOIN UserGroups ug ON ug.GroupID = gp.GroupID 
                    WHERE ug.UserID = @UserID
                )
            `);
        return result.recordset;
    }


}

module.exports = PermissionModel;
