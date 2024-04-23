const express = require("express");
const Authmiddleware = require("../middlewares/authmiddleware");
const router = express.Router();
const userController=require("../controllers/userController")
const coursesController=require("../controllers/coursesController")
const notifsController=require("../controllers/notificationsController")

router.use(Authmiddleware.StudentCheck);

router.get("/users",userController.getAllUsers);
router.post("/updateUser",userController.uploadUserPhoto,userController.updateUser);
router.get("/userCourses", coursesController.getAllCourses);
router.post("/addNote",coursesController.addCourseNote);
router.get("/userNotes",coursesController.getNotesForStudent);
router.get("/getnotifs", notifsController.notifications);




module.exports = router; 