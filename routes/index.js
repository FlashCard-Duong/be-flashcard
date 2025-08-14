const express = require("express");
const router = express.Router();

const accountRoutes = require("./accountRoutes");
const postRoutes = require("./postRoute");



router.use("/accounts", accountRoutes);
router.use("/posts", postRoutes);

module.exports = router;
