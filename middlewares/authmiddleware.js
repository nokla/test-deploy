const jwt = require("jsonwebtoken");
const db = require('../config/connect'); // Assuming config.js is in the same directory

// const User = require("../models/user");

const StudentCheck = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.user.id]);

    if(users.length===0){
      return res
      .status(401)
      .json({ message: "No token, authorization denied" });
    }
    const user =users[0];

    const [studentroles] = await db.query('SELECT * FROM roles WHERE name = ?', ["student"]);
    if(studentroles.length===0){
      return res
      .status(401)
      .json({ message: "No token, authorization denied" });
    }

    if (!user) {
      return res.status(401).json({ message: "No user found" });
    }

    const role = user.role_id;
    const id = user.id.toString(); // convert ObjectId to string

    if (role !== studentroles[0].id) {
      return res.status(401).json({ message: "Not authorized 1" });
    }

    // add user id to req object
    res.locals.id = id;
    res.locals.AuthUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Token is not valid" });
  }
};



// const CustomerCheck = async (req, res, next) => {
//   try {

//     // try {
//       const token = req.header("Authorization").replace("Bearer ", "");
//       if (!token) {
//         return res
//           .status(401)
//           .json({ message: "No token, authorization denied" });
//       }
//     // }
//     // catch (e) {
//     //   return res
//     //     .status(401)
//     //     .json({ message: "No token, authorization denied" });

//     // }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.user.id);
//     if (!user) {
//       return res.status(401).json({ message: "No user found" });
//     }

//     const role = user.role;
//     const id = user._id.toString(); // convert ObjectId to string

//     if (role !== "customer") {
//       return res.status(401).json({ message: "Not authorized" });
//     }

//     // add user id to req object
//     res.locals.id = id;
//     res.locals.AuthUser = user;
//     next();
//   } catch (error) {
//     console.error(error);
//     res.status(401).json({ message: "Token is not valid" });
//   }
// };


// const SAdminCheck = async (req, res, next) => {
//   try {
//     const token = req.header("Authorization").replace("Bearer ", "");
//     if (!token) {
//       return res
//         .status(401)
//         .json({ message: "No token, authorization denied" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.user.id);
//     if (!user) {
//       return res.status(401).json({ message: "No user found" });
//     }

//     const role = user.role;
//     const id = user._id.toString(); // convert ObjectId to string

//     if (role !== "superAdmin") {
//       return res.status(401).json({ message: "" });
//     }

//     // add user id to req object
//     res.locals.id = id;
//     res.locals.AuthUser = user;

//     // console.log(res.locals.id);

//     next();
//   } catch (error) {
//     console.error(error);
//     res.status(401).json({ message: "Token is not valid" });
//   }
// };



module.exports = {StudentCheck};
