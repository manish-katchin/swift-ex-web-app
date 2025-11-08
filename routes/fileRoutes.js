const aws = require('aws-sdk');
const express = require('express');
const router = express.Router();
const upload = require('multer')();

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_DEFAULT_REGION,
});


const uploadToS3 = async (file) => {
    console.log("the file name original name", file.originalname)
    const urlKey = `${file.originalname}`;
    const params = {
        Body: file.buffer,
        Bucket: process.env.S3_BUCKET_NAME,
        Key: urlKey,
        ACL: 'public-read',
        ContentType: file.mimetype,
    };

    return s3.putObject(params).promise()
        .then(() => {
            return process.env.AWS_URL + urlKey;
        })
        .catch(error => {
            console.error("S3 Upload Error:", error);
            throw new Error("Failed to upload to S3");
        });
};

router.post("/upload-image", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "File is required" });
    }

    const { mimetype } = req.file;
    const allowedTypes = ['image/webp', 'image/x-webp', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];

    if (!allowedTypes.includes(mimetype)) {
        return res.status(400).json({ error: "Invalid file type" });
    }

    try {
        const uploadedImageUrl = await uploadToS3(req.file);
        console.log('the upload url', uploadedImageUrl)
        let fileName = req.file.originalname;
        const url = `https://swiftex.s3.ap-south-1.amazonaws.com/${fileName}`;
        console.log("uplaod imag eurl", url)

        res.json({ imageUrl: url });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
});

module.exports = router;

