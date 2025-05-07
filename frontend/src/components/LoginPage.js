import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';
import logo from '../assets/logo-removebg-preview.jpg';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { useTranslation } from 'react-i18next';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { fetchPermissionsFromServer } = usePermissions();
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form submitted");
        try {
            const result = await login(username, password);
            const { user } = result;

            await fetchPermissionsFromServer(user.userId);
            navigate('/dashboard');
        } catch (err) {
            setError(t('loginFailed') || 'Login failed. Please check your account and password again.');
        }
    };

    return (
        <div className="login-container">
            <div className="language-selector">
                <select onChange={(e) => changeLanguage(e.target.value)} value={i18n.language}>
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                    <option value="cn">中國人</option>
                </select>
            </div>
            <div className="login-box">
                <div className="logo">
                    <img src={logo} alt="Logo" />
                </div>
                <form onSubmit={handleSubmit}>
                    <h2>{t('login')}</h2>
                    {error && <div className="error">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="username">{t('username')}</label>
                        <input
                            type="text"
                            id="username"
                            placeholder={t('username')}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">{t('password')}</label>
                        <input
                            type="password"
                            id="password"
                            placeholder={t('password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login-button">{t('login')}</button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
