const UserModel = require("../models/UserModel");

class UserController {
    // Lấy danh sách user
    static async getUserList(req, res) {
        try {
            const users = await UserModel.getUserList();
            res.json(users);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Lấy thông tin user theo ID
    static async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await UserModel.getUserById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Thêm user mới
    static async createUser(req, res) {
        try {
            const { username, fullName, email, departmentId, idNumber } = req.body;
            const newUser = await UserModel.createUser(username, fullName, email, departmentId, idNumber);
            res.status(201).json(newUser);
        } catch (err) {
            console.error("Error creating user:", err);
            res.status(500).json({ error: err.message });
        }
    }

    // Cập nhật user
    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { fullName, email, departmentId, idNumber } = req.body;
            const updated = await UserModel.updateUser(userId, fullName, email, departmentId, idNumber);
            if (!updated) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json({ message: "User updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Xóa user
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const deleted = await UserModel.deleteUser(userId);
            if (!deleted) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json({ message: "User deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = UserController;
