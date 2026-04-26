require('dotenv').config();
const {SECRET} = process.env
const jwt = require('jsonwebtoken')

module.exports.verifyToken = async(req, res,next) => {
    const authHeader = req.headers['authorization'];

    if(authHeader && authHeader.startsWith('Bearer')){
        const token = authHeader.split('')[1];
        jwt.verify(token, SECRET, function(err, decoded){
            if(decoded){
                   req.decoded = decoded
                   next()
            }else{
                console.log(err)
                res.status(403).json({message: 'Not authorized!'})
            }
         
        })
    }
}