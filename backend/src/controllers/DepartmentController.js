const DepartmentModel = require("../models/DepartmentModel");

class DepartmentController {
    static async getAllDepartments(req, res) {
        try {
            const departments = await DepartmentModel.getAllDepartments();
            res.json(departments);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createDepartment(req, res) {
        try {
            console.log("Received body:", req.body);

            const { DepartmentName } = req.body;
            if (!DepartmentName || typeof DepartmentName !== "string" || DepartmentName.trim() === "") {
                return res.status(400).json({ error: "DepartmentName is required and must be a valid string." });
            }

            const newDepartment = await DepartmentModel.createDepartment(DepartmentName.trim());
            return res.status(201).json(newDepartment);
        } catch (err) {
            console.error("Error creating department:", err);
            return res.status(500).json({ error: err.message || "Internal Server Error" });
        }
    }
    static async updateDepartment(req, res) {
        try {
            const { id } = req.params; // Lấy DepartmentID từ URL
            const { DepartmentName } = req.body; // Lấy dữ liệu từ body

            if (!DepartmentName) {
                return res.status(400).json({ error: "DepartmentName is required" });
            }

            const updated = await DepartmentModel.updateDepartment(id, DepartmentName);
            if (updated) {
                res.json({ message: "Department updated successfully" });
            } else {
                res.status(404).json({ error: "Department not found" });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteDepartment(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({ error: "Invalid department ID" });
            }

            const result = await DepartmentModel.deleteDepartment(parseInt(id));
            return res.json(result);
        } catch (err) {
            console.error("Error deleting department:", err);
            return res.status(500).json({ error: err.message || "Internal Server Error" });
        }
    }

}

module.exports = DepartmentController;
