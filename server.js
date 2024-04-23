const bodyparser = require('body-parser')
const express = require("express");
const cors = require('cors');
require("./config/connect");
require('dotenv').config();
const multer = require('multer');
// const upload = multer();
var admin = require("firebase-admin");

var serviceAccount = require("./alfissah-25-01-2024-firebase-adminsdk-opqur-4ee16db904.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();

app.use(bodyparser.urlencoded({ extended: true }))
app.use(bodyparser.json())
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
// app.use(upload.any());

//Routes ---------------------------

const PublicRoutes = require('./Routes/PublicRoutes')
app.use(PublicRoutes);

const StudentRoutes = require('./Routes/StudentRoutes');
app.use("/student", StudentRoutes);

var port = process.env.PORT || '3001'
app.listen(port,()=>{
    console.log('server started at http://localhost:'+port.toString());
});
// app.listen(port, err => {
//     if (err)
//         throw err
//     console.log('Server listening on :', port)
// })
