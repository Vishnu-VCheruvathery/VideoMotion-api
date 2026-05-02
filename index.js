require('dotenv').config()
const express = require('express');
const app = express()
const cors = require('cors')
const userRouter = require('./routes/userRoutes');
const videoRouter = require('./routes/videoRoutes')
const http = require('http');
const { Server } = require('socket.io');
const { QueueEvents } = require('bullmq');
const { default: Redis } = require('ioredis');
const { startWorker } = require('./worker/src');
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3001",
      "https://video-motion-frontend-7ysav2ey9-cvishnuvasudevan-4577s-projects.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: [
    "http://localhost:3001",
    "https://video-motion-frontend-7ysav2ey9-cvishnuvasudevan-4577s-projects.vercel.app"
  ],
  credentials: true
}));
app.use(express.json())
app.use('/users', userRouter)
app.use('/videos', videoRouter);

const connection = new Redis(process.env.REDIS_URL, {maxRetriesPerRequest: null})


if(connection){
    console.log('Redis connection successful in main!')
    startWorker()
}

const encodeEvents = new QueueEvents('encode', {connection})
const uploadEvents = new QueueEvents('upload', {connection})

io.on('connection', (socket) => {
    console.log('A user connected')

    socket.on('join-job', (taskId) => {
        socket.join(taskId)
        console.log('Socket joined: ', taskId)
    })

    socket.on('disconnect', () => {
        console.log('A user disconnected')
    })
})

encodeEvents.on('progress', ({jobId, data}) => {
    io.to(jobId).emit('progress', data)
})

uploadEvents.on('progress', ({jobId, data}) => {
    const scaled = 90 + (data / 100) * 10; 

    io.to(jobId).emit('progress', Math.round(scaled))
})

server.listen(3000, () => {
    console.log("Server started on Port 3000")
})