const mongoose = require('mongoose');
const bycrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,'name is required']
    },
    email:{
        type:String,
        required:[true,'email is required'],
        unique:true
    },
    password:{
        type:String,
        required:[true,'password is required']
    },
    role:{
        type:String,
        default:'admin'
    }
},{timestamps:true});

userSchema.pre('save',async function(next){
    if(this.isModified('password')){
        this.password = await bycrypt.hash(this.password,12);
        next();
    }
});
module.exports=mongoose.model('User',userSchema);