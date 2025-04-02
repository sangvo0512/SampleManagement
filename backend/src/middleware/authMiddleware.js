const { poolPromise, sql } = require("../config/db");

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        const userId = req.user.userId;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("UserID", sql.Int, userId)
            .query(`
                SELECT DISTINCT p.PermissionName
                FROM Permissions p
                LEFT JOIN UserPermissions up ON p.PermissionID = up.PermissionID AND up.UserID = @UserID
                LEFT JOIN GroupPermissions gp ON p.PermissionID = gp.PermissionID
                LEFT JOIN UserGroups ug ON gp.GroupID = ug.GroupID AND ug.UserID = @UserID
                WHERE up.PermissionID IS NOT NULL OR gp.PermissionID IS NOT NULL
            `);

        const userPermissions = result.recordset.map(row => row.PermissionName);

        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({ error: "Access denied" });
        }

        next();
    };
};

module.exports = { checkPermission };
