require('dotenv').config()
const Redis = require("ioredis")

console.log('REDIS_URL:', process.env.REDIS_URL);
const connection = new Redis(process.env.REDIS_URL, {maxRetriesPerRequest: null})


if(connection){
    console.log('Redis connection successful in worker!')
}

module.exports = connection