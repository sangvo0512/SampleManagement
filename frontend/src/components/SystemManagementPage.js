import React from "react";
import { Link } from "react-router-dom";
import { Users, Shield, Warehouse, Database } from "lucide-react";
import "../styles/SystemManagementPage.css";
const SystemManagementPage = () => {
    return (

        <div className="system-container">
            {/* Nội dung chính */}
            <div className="content-container">
                {/* Quản lý người dùng */}
                <div className="card">
                    <Users className="card-icon" />
                    <h2 className="card-title">Users</h2>
                    <button>
                        <Link to="/users-management">Access</Link>
                    </button>
                </div>

                {/* Quản lý phân quyền */}
                <div className="card">
                    <Shield className="card-icon" />
                    <h2 className="card-title">Permission</h2>
                    <button>
                        <Link to="/permissions-management">Access</Link>
                    </button>
                </div>

                {/* Quản lý kho */}
                <div className="card">
                    <Warehouse className="card-icon" />
                    <h2 className="card-title">Warehouse</h2>
                    <Link to="/permissions-management"></Link>
                    <button>
                        <Link to="/warehouse-management">Access</Link>
                    </button>
                </div>

                {/* Quản lý bộ phận */}
                <div className="card">
                    <Database className="card-icon" />
                    <h2 className="card-title">Departments</h2>
                    <button>
                        <Link to="/department-management">Access</Link>
                    </button>
                </div>

                {/* Quản lý dữ liệu cơ bản */}
                <div className="card">
                    <Database className="card-icon" />
                    <h2 className="card-title">Operation Code</h2>
                    <button>
                        <Link to="/operation-code-management">Access</Link>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemManagementPage;
