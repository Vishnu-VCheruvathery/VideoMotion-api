require('dotenv').config()

const { Queue } = require("bullmq");
const connection = require('./redisConfig')

const enCodeQueue = new Queue('encode', { connection });
const uploadQueue = new Queue('upload', { connection });
const dbQueue = new Queue('DB', {connection})

module.exports = {enCodeQueue, uploadQueue, dbQueue}