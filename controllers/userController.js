const db = require('../config/connect'); // Assuming config.js is in the same directory
const multer = require("multer");
const path = require("path");
require("dotenv").config();
//function for uploading images // ! the photos not added yet to be saved

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // /var/www/al_fissah/storage/app/public/users
        cb(null, "./uploads/users");
    },

    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const uploadUserPhoto = multer({ storage: storage }).single("image");


// Example SQL query
const getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users');
        res.json({
            rows,
        });
    } catch (error) {
        console.error('Error executing SQL query:', error);
        throw error;
    }
};

const updateUser = async (req, res) => {
    try {
        console.log(" req file : ",req.file);
        console.log("req body : ",req.body);
        const {email, first_name, last_name, phone, country, nationality, biography } = req.body;
        console.log(email," , ",first_name);

        const userId = res.locals.id;
        // Construct the SQL query based on the fields you want to update
        const updateQuery = "UPDATE users SET first_name=? ,last_name=?,phone=?,email=?,country=?, nationality=?,biography=? WHERE id=?";

        // Execute the update query
        const [result] = await db.query(updateQuery, [first_name, last_name, phone, email, country, nationality, biography, userId]);

        if (req.file) {
            console.log("file : ",req.file.filename);
            const img = req.file.filename;

            const [imageEdit] = await db.query("UPDATE users SET avatar=? WHERE id=?", [ img, userId]);

        }

        const [user]=await db.query("SELECT * FROM users Where id=?",[res.locals.id]);



        // Check if the update was successful
        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: "User updated successfully",
                User:user[0]
            });
        } else {
            res.json({
                success: false,
                message: "User not found or no changes made"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getAllUsers,
    updateUser,
    uploadUserPhoto

}