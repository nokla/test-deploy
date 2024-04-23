const db = require('../../config/connect'); // Assuming config.js is in the same directory
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Login = async (req, res, next) => { 
  try {
    // Check if email exists
    console.log(req.body.email);
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
    console.log("users :",users);


    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email' ,
      token :null,
      User:null});
    }

    const user = users[0];
    console.log("user :",user);

    // Check if password is correct
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password'  ,token :null,
      User:null});
    }


    const [studentroles] = await db.query('SELECT * FROM roles WHERE name = ?', ["student"]);
    if(studentroles.length===0){
      return res
      .status(401)
      .json({ message: "No token, authorization denied",
      token :null,
      User:null
    });
    }

    const role = user.role_id;
    if (role !== studentroles[0].id) {
      return res.status(401).json({ message: "Not authorized 1",
    token :null,
    User:null
    });
    }
   

    // if (user.role === 'customer' && user.status !== 2) {
    //   return res.status(400).json({ message: 'Account not paid yet' });
    // }

    // Create and sign JWT token
    const payload = {
      user: {
        id: user.id, // Assuming 'id' is the primary key of the 'users' table
        role: user.role,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    // Remove sensitive information from the user object
    const retUser = { ...user };
    delete retUser.password;

    // Return success response with token
    res.json({
      message: 'User logged in successfully',
      token: token,
      User: retUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' ,
  token:null,
  User:null
  });
  }
};

module.exports = {
  Login,
};
