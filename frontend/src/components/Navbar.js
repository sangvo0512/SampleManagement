// src/components/Navbar.js
import React, { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.jpg";
import "../styles/Navbar.css";
import { PermissionContext } from "../context/PermissionContext";
import { useTranslation } from "react-i18next";
import { SettingOutlined, HistoryOutlined, ScanOutlined, FileDoneOutlined, ProductOutlined } from "@ant-design/icons"

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { permissions } = useContext(PermissionContext);
    const { t } = useTranslation();

    const handleLogout = () => {
        localStorage.removeItem("user")
        localStorage.removeItem("token");
        localStorage.removeItem("permissions");
        navigate("/login");
    };

    const hasPermission = (key) => permissions.includes(key);
    const navItems = [
        { key: "sample", to: "/samples", label: t("sample"), icon: <FileDoneOutlined /> },
        { key: "inventory", to: "/inventory", label: t("inventory"), icon: <ProductOutlined /> },
        { key: "scan", to: "/qr-scan", label: t("scan"), icon: <ScanOutlined /> },
        { key: "history", to: "/history-management", label: t("history"), icon: <HistoryOutlined /> },
        { key: "system_management", to: "/system-management", label: t("systemManagement"), icon: <SettingOutlined /> },
    ];

    return (
        <nav className="navbar">
            <div className="nav-logo">
                <Link to="/dashboard">
                    <img src={logo} alt="Logo" className="logo-image" />
                </Link>
            </div>

            <div className="nav-menu">
                {navItems.map(
                    (item) =>
                        hasPermission(item.key) && (
                            <Link
                                key={item.key}
                                to={item.to}
                                className={`nav-item ${location.pathname === item.to ? "active" : ""}`}
                            >
                                {item.label} {item.icon}
                            </Link>
                        )
                )}
            </div>

            <button onClick={handleLogout} className="logout-button">
                <div class="sign"><svg viewBox="0 0 512 512">
                    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path></svg></div>
                <div class="text">{t("logout")}</div>
            </button>
        </nav>
    );
};

export default Navbar;
