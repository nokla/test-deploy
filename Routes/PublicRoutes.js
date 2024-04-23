const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/Auth/auth");
const NotifController = require("../controllers/notificationsController");


router.post("/login", AuthController.Login);

router.post("/stopCron/:sessionId", NotifController.stopCronJob);
router.get("/restartCron", NotifController.restartCron);


module.exports = router; 