const express = require("express");
const AccountController = require("../controllers/accountsController");
const tokenHandler = require("../middlewares/token-handler");
const { check } = require("express-validator");

const router = express.Router();

router.post("/login", AccountController.login);
//Đăng nhập, đăng ký, đăng xuất
router.get("/signup/:username/:email", AccountController.getOtpSignUp);
router.post(
  "/signup",
  [
    check("otp").not().isEmpty(),
    check("otpToken").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("username").isLength({ min: 5 }),
    check("fullname").not().isEmpty(),
    check("password").isLength({ min: 5 }),
  ],
  AccountController.signUp
);
router.get("/logout", AccountController.logout);

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/", AccountController.getLoginAccountInformation);

module.exports = router;
