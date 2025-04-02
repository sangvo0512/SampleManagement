const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();
require("./config/passport"); // Khởi tạo cấu hình passport

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());

const routes = require("./routes/index");
app.use("/api", routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
