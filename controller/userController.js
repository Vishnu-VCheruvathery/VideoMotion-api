require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../utils/prismaClient');
const {SECRET, AWS_BUCKET} = process.env
const jwt = require('jsonwebtoken');
const s3 = require('../utils/s3Client');
const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
module.exports.SignIn = async(req,res) => {
    const {email, password, firstname, lastname, type} = req.body;
    try {
        if(!email || !password || !firstname || !lastname){
            return res.status(400).json({message: 'Need all credentials!'})
        }

         const user = await prisma.user.findUnique({
            where: {email: email}
         })
        
         if(user){
            return res.status(409).json({message: 'User already exists!'})
         }

          const hashedPassword = await bcrypt.hash(password, 10); // ✅ await this!

  
            const newUser = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
                firstname: firstname,
                lastname: lastname,
                type
            }
        })
        
        let token = jwt.sign({id: newUser.id, firstname, lastname, email, type}, SECRET, { expiresIn: '1h' })


        return res.status(200).json({message: 'User created!', token})   

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.Login = async(req,res) => {
    const {email, password} = req.body;
       if(!email || !password){
            return res.status(400).json({message: 'Need all credentials!'})
        }
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if(!user){
            return res.status(403).json({message: 'Not found!'})
        }

        const matchPassword = await bcrypt.compare(password, user.password)
        if(!matchPassword){
            return res.status(403).json({message: "Password don't match!"})
        }

        let token = jwt.sign({id: user.id, email, firstname: user.firstname, lastname: user.lastname, type: user.type, profile: user.profile}, SECRET, { expiresIn: '1h' })
        return res.status(200).json({message: 'Login successful!', token})
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: error})
    }
}

module.exports.updateUser = async(req,res) => {
     const {id, firstname, lastname, email} = req.body;
     console.log(req.body)
     const inputPath = req.file?.path;
     console.log('the path: ', inputPath)
    if(!id){
        return res.status(403).json({message: 'Provide id'})
    }

    try {
        const user = await prisma.user.findUnique({
            where: {id: Number(id)}
        })

        if(!user){
            return res.status(403).json({message: 'Not found!'})
        }

        let body = {
            firstname: firstname ?? user.firstname,
            lastname: lastname ?? user.lastname,
            email: email ?? user.email
        }

        if(inputPath){
             const now = Date.now()
    const ext = req.file.originalname.split('.').pop();
    const s3Key = `profiles/${user.firstname}-${now}.${ext}`

            const fileStream = fs.createReadStream(inputPath)
        const params = {
        Bucket: AWS_BUCKET,
        Key: s3Key,
        Body: fileStream,
         ContentType: req.file.mimetype
        }
        

        const command = new PutObjectCommand(params);
        await s3.send(command);
        body.profile  = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`

          fs.unlink(inputPath, (err) => {
    if (err) console.log("File cleanup error:", err);
  });
        }

      const updatedUser = await prisma.user.update({
  where: { id: Number(id) },
  data: body,
  select: {firstname: true, lastname: true, email: true, profile: true}
});

return res.status(200).json(updatedUser);
    } catch (error) {
         console.log(error);
        return res.status(500).json({error: error})
    }
}
