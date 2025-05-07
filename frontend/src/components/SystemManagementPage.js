import React from "react";
import { Link } from "react-router-dom";
import { Users, Shield, Warehouse, Tags, Database } from "lucide-react";
import "../styles/SystemManagementPage.css";
import { useTranslation } from "react-i18next";
const SystemManagementPage = () => {
    const { t } = useTranslation();
    return (

        <div className="system-container">
            {/* Nội dung chính */}
            <div className="content-container">
                {/* Quản lý người dùng */}
                <Link to={"/users-management"} className="card-link">
                    <div className="card">
                        <Users className="card-icon" />
                        <h2 className="card-title">{t("users")}</h2>
                    </div>
                </Link>
                {/* Quản lý Nhóm */}
                <Link to={"/group-management"} className="card-link">
                    <div className="card">
                        <Tags className="card-icon" />
                        <h2 className="card-title">{t("groups")}</h2>
                    </div>
                </Link>
                {/* Quản lý phân quyền */}
                <Link to={"/access-management"} className="card-link">
                    <div className="card">
                        <Shield className="card-icon" />
                        <h2 className="card-title">{t("permission")}</h2>
                    </div>
                </Link>
                {/* Quản lý kho */}
                <Link to={"/warehouse-management"} className="card-link">
                    <div className="card">
                        <Warehouse className="card-icon" />
                        <h2 className="card-title">{t("warehouse")}</h2>
                    </div>
                </Link>
                {/* Quản lý bộ phận */}
                <Link to={"/department-management"} className="card-link">
                    <div className="card">
                        <Database className="card-icon" />
                        <h2 className="card-title">{t("departments")}</h2>
                    </div>
                </Link>
                {/* Quản lý dữ liệu cơ bản */}
                <Link to={"/operation-code-management"} className="card-link">
                    <div className="card">
                        <Database className="card-icon" />
                        <h2 className="card-title">{t("operationCode")}</h2>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default SystemManagementPage;
