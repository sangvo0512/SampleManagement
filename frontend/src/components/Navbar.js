// src/components/Navbar.js
import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.jpg";
import "../styles/Navbar.css";
import { PermissionContext } from "../context/PermissionContext";
import { useTranslation } from "react-i18next";

const Navbar = () => {
    const navigate = useNavigate();
    const { permissions } = useContext(PermissionContext);
    const { t } = useTranslation();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("permissions");
        navigate("/login");
    };

    const hasPermission = (key) => permissions.includes(key);

    return (
        <nav className="navbar">
            <div className="nav-logo">
                <Link to="/dashboard">
                    <img src={logo} alt="Logo" className="logo-image" />
                </Link>
            </div>

            <div className="nav-menu">
                {hasPermission("sample") && (
                    <Link to="/samples" className="nav-item">
                        {t("sample")}
                    </Link>
                )}
                {hasPermission("scan") && (
                    <Link to="/qr-scan" className="nav-item">
                        {t("scan")}
                    </Link>
                )}
                {hasPermission("history") && (
                    <Link to="/history-management" className="nav-item">
                        {t("history")}
                    </Link>
                )}
                {hasPermission("system_management") && (
                    <Link to="/system-management" className="nav-item">
                        {t("systemManagement")}
                    </Link>
                )}
            </div>

            <button onClick={handleLogout} className="logout-button">
                {t("logout")}
            </button>
        </nav>
    );
};

export default Navbar;
