const express = require('express');
const { postVideo,  createContent, deleteContent } = require('../controller/videoController');
const multer = require('multer');
const { getContent, searchContent, getContentHome, getComments, createComment, getContentByGenre } = require('../controller/contentController');
const router = express.Router();
const path = require('path');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'videos'),
});

const thumbnailUpload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'thumbnails'),
});


router.get('/content/genre', getContentByGenre)
router.get('/content', getContent)
router.get('/content/home', getContentHome)
router.delete('/content/delete/:id', deleteContent)
router.post('/upload', upload.single('file'), postVideo);
router.post('/post', thumbnailUpload.single('file'), createContent)
router.get('/search', searchContent)
router.get("/comment", getComments)
router.post("/comment/create", createComment)
module.exports = router