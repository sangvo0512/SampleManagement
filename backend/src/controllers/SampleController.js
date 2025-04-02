// src/controllers/SampleController.js
const SampleModel = require("../models/SampleModel");

class SampleController {
    static async getAllSamples(req, res) {
        try {
            const samples = await SampleModel.getAllSamples();
            res.json(samples);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async createSample(req, res) {
        try {
            const sampleId = await SampleModel.createSample(req.body);
            res.status(201).json({ message: "Sample created successfully", sampleId });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async updateSample(req, res) {
        try {
            const { id } = req.params;
            const rowsAffected = await SampleModel.updateSample(id, req.body);

            if (rowsAffected === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            res.json({ message: "Sample updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async deleteSample(req, res) {
        try {
            const { id } = req.params;
            const rowsAffected = await SampleModel.deleteSample(id);

            if (rowsAffected === 0) {
                return res.status(404).json({ message: "Sample not found" });
            }

            res.json({ message: "Sample deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async importSamples(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }
            // Đọc dữ liệu từ file Excel
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            // Xử lý dữ liệu import (ví dụ: lưu vào DB qua SampleModel)
            // ... thêm logic xử lý tùy theo yêu cầu

            res.json({ message: "File imported successfully", data });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = SampleController;
