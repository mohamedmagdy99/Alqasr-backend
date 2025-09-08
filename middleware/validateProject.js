module.exports = (req, res, next) => {
    const {title, type,image,status} = req.body;
    if(!title || !type || !image || !status){
        return res.status(400).json({success:false,err:'Missing required fields: title, type, image, or status'});
    }
    next();
}