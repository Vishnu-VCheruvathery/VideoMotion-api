require('dotenv').config()
const {AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY} = process.env
const {S3Client} = require('@aws-sdk/client-s3')

const s3 = new S3Client({
    region:  AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
})

module.exports = s3