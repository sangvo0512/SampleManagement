const PermissionModel = require("../models/PermissionModel");

class PermissionController {
    // Lấy danh sách tất cả quyền
    static async getAllPermissions(req, res) {
        try {
            const permissions = await PermissionModel.getAllPermissions();
            res.json(permissions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Tạo quyền mới
    static async createPermission(req, res) {
        try {
            const { permissionName } = req.body;
            if (!permissionName) {
                return res.status(400).json({ error: "Tên quyền không được để trống" });
            }

            const newPermission = await PermissionModel.createPermission(permissionName);
            res.status(201).json(newPermission);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Xóa quyền
    static async deletePermission(req, res) {
        try {
            const { permissionId } = req.params;
            await PermissionModel.deletePermission(permissionId);
            res.json({ message: "Xóa quyền thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Cấp quyền cho user
    static async assignPermissionToUser(req, res) {
        try {
            const { userId, permissionId } = req.body;
            if (!userId || !permissionId) {
                return res.status(400).json({ error: "Thiếu userId hoặc permissionId" });
            }

            await PermissionModel.assignPermissionToUser(userId, permissionId);
            res.json({ message: "Gán quyền cho user thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Thu hồi quyền của user
    static async removePermissionFromUser(req, res) {
        try {
            const { userId, permissionId } = req.body;
            if (!userId || !permissionId) {
                return res.status(400).json({ error: "Thiếu userId hoặc permissionId" });
            }

            await PermissionModel.removePermissionFromUser(userId, permissionId);
            res.json({ message: "Thu hồi quyền thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = PermissionController;
