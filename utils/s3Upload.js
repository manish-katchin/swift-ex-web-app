const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../config/aws.js");
const crypto = require("crypto");
const fs = require('fs');
require('dotenv').config();

const AWS = require("aws-sdk");

// Configure AWS with the credentials
const s3 = new AWS.S3();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});


const generateUploadURL = async (fileType) => {
  const fileName = crypto.randomUUID();
  const fileExtension = fileType.split("/")[1];
  const key = `uploads/${fileName}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { signedUrl, key };
};
async function uploadImageToStorage(file) {
    const fileStream = fs.createReadStream(file.path);
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Body: fileStream,
      Key: `${Date.now()}_${file.originalname}`, // Generate a unique key for the file
    };
  
    const { Location } = await s3.upload(uploadParams).promise();
    return Location; // This is the URL of the uploaded file
  }
  

module.exports = { generateUploadURL, uploadImageToStorage };
