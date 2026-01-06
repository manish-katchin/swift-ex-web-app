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
    const folder = process.env.S3_FOLDER || "s3-objects";
    const fileName = `${Date.now()}-${file.originalname}`;

    const s3Key = `${folder}/${fileName}`;

    await s3.putObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
    }).promise();

    return fileName;
};
router.post("/upload-image", upload.single("file"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "File is required" });

        const allowedTypes = [
            'image/webp', 'image/x-webp',
            'image/jpeg', 'image/png', 'image/gif',
            'video/mp4', 'video/quicktime'
        ];

        if (!allowedTypes.includes(req.file.mimetype))
            return res.status(400).json({ error: "Invalid file type" });

        const key = await uploadToS3(req.file);
        return res.json({ imageUrl: key });

    } catch (error) {
        console.error("S3 Error:", error);
        return res.status(500).json({ error: "Upload failed" });
    }
});

module.exports = router;