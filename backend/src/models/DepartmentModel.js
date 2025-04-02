const { sql, poolPromise } = require("../config/db");

class DepartmentModel {
    static async getAllDepartments() {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query("SELECT DepartmentID, DepartmentName FROM Departments");
            return result.recordset;
        } catch (err) {
            throw err;
        }
    }

    static async createDepartment(departmentName) {
        try {
            const pool = await poolPromise;

            // Kiểm tra xem DepartmentName đã tồn tại chưa
            const checkExist = await pool.request()
                .input("DepartmentName", sql.NVarChar(255), departmentName)
                .query("SELECT COUNT(*) AS count FROM Departments WHERE DepartmentName = @DepartmentName");

            if (checkExist.recordset[0].count > 0) {
                throw new Error("Department name already exists");
            }

            const result = await pool.request()
                .input("DepartmentName", sql.NVarChar(255), departmentName)
                .query("INSERT INTO Departments (DepartmentName) OUTPUT INSERTED.DepartmentID, INSERTED.DepartmentName VALUES (@DepartmentName)");

            return result.recordset[0]; // Trả về kết quả vừa insert
        } catch (err) {
            console.error("Database Error in createDepartment:", err);
            throw err; // Ném lỗi để Controller xử lý
        }
    }
    static async updateDepartment(id, DepartmentName) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input("DepartmentID", sql.Int, id)
                .input("DepartmentName", sql.NVarChar, DepartmentName)
                .query("UPDATE Departments SET DepartmentName = @DepartmentName WHERE DepartmentID = @DepartmentID");

            return result.rowsAffected[0] > 0; // Trả về true nếu có dòng bị ảnh hưởng
        } catch (err) {
            throw err;
        }
    }

    static async deleteDepartment(departmentId) {
        try {
            const pool = await poolPromise;

            // Kiểm tra xem department có tồn tại không
            const checkExist = await pool.request()
                .input("DepartmentID", sql.Int, departmentId)
                .query("SELECT COUNT(*) AS count FROM Departments WHERE DepartmentID = @DepartmentID");

            if (checkExist.recordset[0].count === 0) {
                throw new Error("Department not found");
            }

            // Thực hiện xóa
            await pool.request()
                .input("DepartmentID", sql.Int, departmentId)
                .query("DELETE FROM Departments WHERE DepartmentID = @DepartmentID");

            return { message: "Department deleted successfully" };
        } catch (err) {
            console.error("Database Error in deleteDepartment:", err);
            throw err;
        }
    }

}

module.exports = DepartmentModel;
