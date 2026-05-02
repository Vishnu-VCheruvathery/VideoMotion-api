const express = require('express');
const { Login, SignIn, updateUser } = require('../controller/userController');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const profileUpload = multer({dest: '/tmp/profiles'});


router.post("/login", Login)
router.post("/signup", SignIn)
router.post("/update", profileUpload.single('file') ,updateUser)


module.exports = router