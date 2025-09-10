const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('./s3Client');

exports.uploadToS3 = async (fileBuffer, fileName, mimeType, folder = 'projects') => {
    const key = `${folder}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType
    });

    await s3.send(command);

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};