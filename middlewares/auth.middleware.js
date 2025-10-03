//server/middlewares/auth.middlewares.js

const jwt = require('jsonwebtoken');


exports.protect= (req,res,next) => {
    const token = req.header('Authorization');

    if(!token){
        return res.status(401).json({msg : 'No token , authorization denied'});
    }
    try {
        const tokenString = token.split(' ')[1];
        const decoded = jwt.verify(tokenString,process.env.JWT_SECRET);

        req.user=decoded.user;
        next();


    } catch (err) {
        res.status(401).json({msg : 'Token is not Valid.'});
    }
};

exports.authorize = (...roles) =>{
    return(req,res,next) => {
        if(!roles.includes(req.user.role)){
            return res.status(403).json({msg: `User role '${req.user.role} is not authorized to access this resource.`});
        }

        next();
    };
};