const passport = require("passport");
const LdapStrategy = require("passport-ldapauth");
require('dotenv').config();
const OPTS = {
    server: {
        url: process.env.AD_URL,
        bindDN: process.env.AD_BIND_DN, // Tài khoản bind
        bindCredentials: process.env.AD_BIND_CREDENTIALS, // Mật khẩu bind
        searchBase: process.env.AD_SEARCH_BASE,
        searchFilter: "(sAMAccountName={{username}})"
    }
};

passport.use(new LdapStrategy(OPTS));

module.exports = passport;
