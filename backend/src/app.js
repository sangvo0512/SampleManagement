const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const path = require("path"); // Thêm module path
require("dotenv").config();
require("./config/passport");

const app = express();

// Cấu hình middleware
app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());

// Cấu hình API routes
const routes = require("./routes/index");
app.use("/api", routes);

// Phục vụ các tệp tĩnh của frontend từ thư mục build
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Xử lý các yêu cầu SPA (chuyển hướng tất cả các route không phải API về index.html)
app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});