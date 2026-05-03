require('dotenv').config()
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const prisma = require("../utils/prismaClient");
const s3 = require('../utils/s3Client');
const path = require('path');

const {AWS_BUCKET} = process.env
const fs = require('fs')
const { randomUUID } = require("crypto");
const { enCodeQueue } = require('../worker/queues');




module.exports.createContent = async(req,res) => {
    const {title, description, userId, type,genre, episode} = req.body;
    const inputPath = req.file.path;
     const now = Date.now()
    const ext = req.file.originalname.split('.').pop();
    const s3Key = `thumbnails/${title}-${now}.${ext}`

    if(!title || !description || !userId || !type){
        return res.status(400).json('Please provide complete details!')
    }

    if(!inputPath || inputPath.length < 0 || !req.file){
        return res.status(400).json('Please provide thumbnail!')
    }

    try {
       
        const fileStream = fs.createReadStream(inputPath)
        const params = {
        Bucket: AWS_BUCKET,
        Key: s3Key,
        Body: fileStream,
         ContentType: req.file.mimetype
        }
        

        const command = new PutObjectCommand(params);
        await s3.send(command);

        const content = await prisma.content.create({
            data: {
                title,
                description,
                authorId: Number(userId),
                type,
                thumbnail: `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
                genre
            }
        })

        await fs.promises.unlink(inputPath);

        return res.status(200).json({message: 'Information added!', id: content.id})

    } catch (error) {
        console.log('error during content creation: '  ,error)
        return res.status(500).json({error: error})
    }
}


module.exports.postVideo = async(req,res) => {
    const {title, contentId, episode, taskId} = req.body;



    console.log(req.body)
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, '..', 'encoded', title)
 
    try {
          
          
      
   await enCodeQueue.add(
  'encode',
  {
    title,
    inputPath,
    outputDir,
    contentId: Number(contentId),
    episode: Number(episode),
    taskId
  },
  {
    jobId: taskId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
);
 

          return  res.status(200).json({message: 'Encoding started!', taskId}) 
    } catch (error) {
        console.log('error during posting: ',error);
        return res.status(500).json({error: error})
    }
}

module.exports.deleteContent = async(req,res) => {
    const {id} = req.params;
    try {
        await prisma.content.delete({
            where: {id: Number(id)}
        })

        return res.json({ message: "Deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: error})
    }
}