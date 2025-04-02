// src/middlewares/checkPermission.js
const PermissionModel = require("../models/PermissionModel");

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // Giả sử JWT token đã được giải mã và gắn vào req.user
            const userId = req.user && req.user.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const permissions = await PermissionModel.getUserPermissions(userId);
            if (permissions.includes(requiredPermission)) {
                next();
            } else {
                return res.status(403).json({ message: "Forbidden: You don't have permission" });
            }
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    };
};

module.exports = checkPermission;
