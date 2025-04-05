const GroupModel = require("../models/GroupModel");

class GroupController {
    // Lấy danh sách tất cả nhóm
    static async getAllGroups(req, res) {
        try {
            const groups = await GroupModel.getAllGroups();
            res.json(groups);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Tạo nhóm mới
    static async createGroup(req, res) {
        try {
            const { groupName } = req.body;
            if (!groupName) {
                return res.status(400).json({ error: "Tên nhóm không được để trống" });
            }

            const newGroup = await GroupModel.createGroup(groupName);
            res.status(201).json(newGroup);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Cập nhật tên nhóm
    static async updateGroup(req, res) {
        try {
            const { groupId } = req.params;
            const { groupName } = req.body;
            if (!groupName) {
                return res.status(400).json({ error: "Tên nhóm không được để trống" });
            }
            await GroupModel.updateGroup(groupId, groupName);
            res.json({ message: "Group updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Xóa nhóm
    static async deleteGroup(req, res) {
        try {
            const { groupId } = req.params;

            // Kiểm tra nhóm có tồn tại không
            const groups = await GroupModel.getAllGroups();
            if (!groups.some(g => g.GroupID == groupId)) {
                return res.status(404).json({ error: "Nhóm không tồn tại" });
            }

            await GroupModel.deleteGroup(groupId);
            res.json({ message: "Xóa nhóm thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Thêm user vào nhóm
    static async addUserToGroup(req, res) {
        try {
            const { userId, groupId } = req.body;
            if (!userId || !groupId) {
                return res.status(400).json({ error: "Thiếu userId hoặc groupId" });
            }

            await GroupModel.addUserToGroup(userId, groupId);
            res.json({ message: "Thêm user vào nhóm thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Xóa user khỏi nhóm
    static async removeUserFromGroup(req, res) {
        try {
            const { userId, groupId } = req.body;
            if (!userId || !groupId) {
                return res.status(400).json({ error: "Thiếu userId hoặc groupId" });
            }

            await GroupModel.removeUserFromGroup(userId, groupId);
            res.json({ message: "Xóa user khỏi nhóm thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Lấy danh sách user thuộc nhóm
    static async getUsersInGroup(req, res) {
        try {
            const { groupId } = req.params;
            if (!groupId) {
                return res.status(400).json({ error: "Thiếu groupId" });
            }

            const users = await GroupModel.getUsersInGroup(groupId);
            res.json(users);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = GroupController;
