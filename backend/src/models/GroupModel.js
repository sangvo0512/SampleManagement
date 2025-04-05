const { sql, poolPromise } = require("../config/db");

class GroupModel {
    // Lấy danh sách tất cả nhóm
    static async getAllGroups() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query("SELECT * FROM Groups");
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    // Tạo nhóm mới
    static async createGroup(groupName) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("GroupName", sql.NVarChar, groupName)
                .query("INSERT INTO Groups (GroupName) OUTPUT INSERTED.GroupID VALUES (@GroupName)");
            return result.recordset[0];
        } catch (err) {
            throw err;
        }
    }
    // Lấy danh sách user thuộc nhóm
    static async getUsersInGroup(groupId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("GroupID", sql.Int, groupId)
                .query(`
                SELECT u.UserID, u.Username, u.FullName, u.Email
                FROM UserGroups ug
                JOIN Users u ON ug.UserID = u.UserID
                WHERE ug.GroupID = @GroupID
            `);
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    // Xóa nhóm (bao gồm xóa quyền và user trong nhóm)
    static async deleteGroup(groupId) {
        try {
            const pool = await poolPromise;
            await pool.request().input("GroupID", sql.Int, groupId).query(`
                DELETE FROM UserGroups WHERE GroupID = @GroupID;
                DELETE FROM GroupPermissions WHERE GroupID = @GroupID;
                DELETE FROM Groups WHERE GroupID = @GroupID;
            `);
        } catch (err) {
            throw err;
        }
    }

    // Thêm user vào nhóm (chặn trùng lặp)
    static async addUserToGroup(userId, groupId) {
        try {
            const pool = await poolPromise;
            const checkResult = await pool.request()
                .input("UserID", sql.Int, userId)
                .input("GroupID", sql.Int, groupId)
                .query("SELECT COUNT(*) AS count FROM UserGroups WHERE UserID = @UserID AND GroupID = @GroupID");
            console.log("Check result:", checkResult.recordset);
            if (checkResult.recordset[0].count > 0) {
                throw new Error("User đã thuộc nhóm này.");
            }

            await pool.request()
                .input("UserID", sql.Int, userId)
                .input("GroupID", sql.Int, groupId)
                .query("INSERT INTO UserGroups (UserID, GroupID) VALUES (@UserID, @GroupID)");
        } catch (err) {
            throw err;
        }
    }

    // Cập nhật tên nhóm
    static async updateGroup(groupId, groupName) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("GroupID", sql.Int, groupId)
                .input("GroupName", sql.NVarChar, groupName)
                .query("UPDATE Groups SET GroupName = @GroupName WHERE GroupID = @GroupID");
        } catch (err) {
            throw err;
        }
    }
    // Xóa user khỏi nhóm
    static async removeUserFromGroup(userId, groupId) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input("UserID", sql.Int, userId)
                .input("GroupID", sql.Int, groupId)
                .query("DELETE FROM UserGroups WHERE UserID = @UserID AND GroupID = @GroupID");
        } catch (err) {
            throw err;
        }
    }

    // Lấy danh sách quyền của nhóm
    static async getGroupPermissions(groupId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("groupId", sql.Int, groupId)
                .query("SELECT PermissionID FROM GroupPermissions WHERE GroupID = @groupId");
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    // Gán quyền cho nhóm
    static async assignPermissionToGroup(groupId, permissionId) {
        try {
            const pool = await poolPromise;
            const checkResult = await pool.request()
                .input("GroupID", sql.Int, groupId)
                .input("PermissionID", sql.Int, permissionId)
                .query("SELECT COUNT(*) AS count FROM GroupPermissions WHERE GroupID = @GroupID AND PermissionID = @PermissionID");

            if (checkResult.recordset[0].count > 0) {
                throw new Error("Nhóm này đã có quyền này.");
            }

            await pool.request()
                .input("GroupID", sql.Int, groupId)
                .input("PermissionID", sql.Int, permissionId)
                .query("INSERT INTO GroupPermissions (GroupID, PermissionID) VALUES (@GroupID, @PermissionID)");
        } catch (err) {
            throw err;
        }
    }
}

module.exports = GroupModel;
