require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();


app.get('/',(req,res)=>{
    res.send('hello world');
})
mongoose.connect(process.env.DATABASE_CONNECTION_STRING).then(()=>{
    console.log('database is connected');
    app.listen(3000,()=>{
        console.log('server is running');
    });
}).catch((err)=>{
    console.log(err);
})