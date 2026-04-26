require('dotenv').config()

const {Queue, Worker} = require('bullmq')
const {encodeVideo} = require('../scripts/encode')
const {AWS_BUCKET, AWS_REGION} = process.env
const s3 = require('../utils/s3Client');
const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const prisma = require('../utils/prismaClient')
const connection = require('./redisConfig')


const enCodeQueue = new Queue('encode', { connection });
const uploadQueue = new Queue('upload', { connection });
const dbQueue = new Queue('DB', {connection})

function getAllFiles(dir) {
  let results = [];

  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of list) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}


const encodeWorker = new Worker('encode', async job => {
      const {title, inputPath, outputDir, contentId, taskId, episode} = job.data;
      try {
        await encodeVideo(inputPath, outputDir, title, contentId, (progress) => job.updateProgress(progress), taskId, episode)
      } catch (error) {
        console.log(error);
      }

}, {connection})

encodeWorker.on('completed', job => {
    console.log(`${job.id} has completed!`)
})

encodeWorker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

const uploadWorker = new Worker('upload', async job => {
     const {title,  outputDir, contentId, episode} = job.data;
    
     if (!fs.existsSync(outputDir)) {
  throw new Error(`Output directory not found: ${outputDir}`);
}

   const allFiles = getAllFiles(outputDir);
const totalFiles = allFiles.length;
let uploadedFiles = 0;

    async function uploadDirectoryToS3(localDir, s3Prefix, job){
      const entries = fs.readdirSync(localDir, {withFileTypes: true});

      for(const entry of entries){
        const fullPath = path.join(localDir, entry.name)
        const s3Key = path.posix.join(s3Prefix, entry.name);

        if(entry.isDirectory()){
          await uploadDirectoryToS3(fullPath, s3Key, job);
        }else if(entry.isFile()){
          const fileStream = fs.createReadStream(fullPath);
             const params = {
        Bucket: AWS_BUCKET,
        Key: s3Key,
        Body: fileStream,
         ContentType: getContentType(entry.name)
        }

        const command = new PutObjectCommand(params);
        await s3.send(command);
        uploadedFiles++;

// calculate 90 → 100 progress
const uploadPercent = (uploadedFiles / totalFiles) * 10;
const finalProgress = 90 + uploadPercent;

await job.updateProgress(Math.min(Math.round(finalProgress), 100),
);

console.log(`Uploaded: ${s3Key}`);
        }
      }
    }
  
    function getContentType(fileName){
      const ext = path.extname(fileName);
      switch(ext){
        case '.ts': return 'video/MP2T';
        case '.m3u8': return 'application/vnd.apple.mpegurl';
        default: return 'application/octet-stream';
      }
    }


      
 

 try {
    const s3BaseKey = `videos/${title}`;
    await uploadDirectoryToS3(outputDir, s3BaseKey, job);

    await dbQueue.add('DB', {s3BaseKey, contentId, episode, title})

    fs.rm(outputDir, {recursive: true}, (err) => {
      if(err){
        console.error(err)
      }else{
        console.log("Directory Deleted!")
      }
    })
   
  } catch (error) {
    console.error('Upload worker error:', error);
  }
}, {connection})

uploadWorker.on('completed', job => {
    console.log(`${job.id} has completed!`)
})

uploadWorker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});

const dbWorker = new Worker('DB', async job => {
    const {s3BaseKey,  contentId, episode, title} = job.data;

    try {
          // Save video metadata to DB
const video = await prisma.video.create({
  data: {
    path: `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3BaseKey}/${title}_master.m3u8`,
    content: {
      connect: { id: contentId }
    },
    episode
  }
});

console.log('Metadata saved to DB:', video);

    } catch (error) {
      console.error('DB worker error: ', error)
    }

}, {connection})

dbWorker.on('completed', job => {
  console.log(`Job ${job.id} completed!`)
})

dbWorker.on('failed', (job, err)=> {
  console.log(`Job ${job.id} failed with error: ${err}`)
})

module.exports = {enCodeQueue, uploadQueue, connection}
