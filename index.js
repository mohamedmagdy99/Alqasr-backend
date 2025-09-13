require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const cors = require('cors');

app.use(cors({
    origin: 'http://localhost:3001', // or use '*' for development only
    credentials: true, // if you're sending cookies or auth headers
}));

mongoose.connect(process.env.DATABASE_CONNECTION_STRING).then(()=>{
    console.log('database is connected');
}).catch((err)=>{
    console.log(err);
});
const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
});