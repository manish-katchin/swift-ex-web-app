const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = require("../config/db");
const Post = require("../models/Post");

const S3_BASE_URLS = [
    "https://swiftex.s3.ap-south-1.amazonaws.com/",
    "https://swift-ex-web-app.s3.us-east-2.amazonaws.com/"
];
const S3_FOLDER = "s3-objects/";

function cleanKey(value) {
    if (!value) return value;

    let result = value;
    for (const base of S3_BASE_URLS) {
        if (result.includes(base)) {
            result = result.replace(base, "");
        }
    }
    if (result.startsWith(S3_FOLDER)) {
        result = result.replace(S3_FOLDER, "");
    }

    return result;
}

function cleanHtml(html) {
    if (!html) return html;

    let updated = html;

    for (const base of S3_BASE_URLS) {
        const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        updated = updated.replace(new RegExp(escaped, "g"), "");
    }
    updated = updated.replace(new RegExp(S3_FOLDER, "g"), "");

    return updated;
}

(async () => {
    console.log("replaceS3Urls.js started");

    await connectDB();

    const posts = await Post.find({
        $or: [
            { imageUrl: { $exists: true } },
            { content: { $regex: "amazonaws\\.com|s3-objects/" } }
        ]
    });

    console.log(`Found ${posts.length} posts`);

    for (const post of posts) {
        let updated = false;

        if (post.imageUrl) {
            const cleaned = cleanKey(post.imageUrl);
            if (cleaned !== post.imageUrl) {
                post.imageUrl = cleaned;
                updated = true;
            }
        }

        if (post.content) {
            const cleanedHtml = cleanHtml(post.content);
            if (cleanedHtml !== post.content) {
                post.content = cleanedHtml;
                updated = true;
            }
        }

        if (updated) {
            await post.save();
            console.log(`Updated post ${post._id}`);
        }
    }
    console.log("DONE: All S3 URLs removed, filenames preserved");
    process.exit(0);
})();
