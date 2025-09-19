require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect(process.env.DATABASE_CONNECTION_STRING).then(()=>{
    console.log('database is connected');
}).catch((err)=>{
    console.log(err);
});
const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
});