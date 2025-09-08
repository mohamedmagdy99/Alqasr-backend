const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (userid) => {
    return jwt.sign({id:userid},process.env.JWT_SECRET,{expiresIn:'7d'});
};

exports.signup = async (req,res)=>{
    try{
        const {name,email,password} = req.body;
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({success:false,err:'Email already exists'});
        }
        const user = await  User.create({name,email,password});
        const token = generateToken(user._id);
        res
            .cookie('token', token, {
                httpOnly: true,
                secure:  true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            })
            .status(201)
            .json({
                success: true,
                message: 'User signed up successfully',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
    }catch (err){
        res.status(500).json({success:false,err:err.message});
    }
};

exports.signin = async (req,res)=>{
    try{
        const {email,password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({success:false,err:'Invalid Email'});
        }
        const isMatch=  await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({success:false,err:'Invalid Password'});
        }
        const token = generateToken(user._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure:  true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        }).status(200).json({success:true,message: 'User signed in successfully',user: {
            id: user._id,
            name: user.name,
            email: user.email,
            }});
    }catch (err){
        res.status(500).json({success:false,err:err.message});
    }
}