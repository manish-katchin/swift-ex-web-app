const { getSignedUrl } = require('../utils/s3Upload');

exports.getUploadUrl = async (req, res) => {
  const { fileType } = req.body;

  if (!fileType) {
    return res.status(400).json({ message: 'File type is required' });
  }

  const allowedTypes = ['image/webp', 'image/x-webp', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];

  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ message: 'Invalid file type' });
  }

  try {
    console.log('............................')
    const { signedUrl, key } = await getSignedUrl(fileType);
    res.status(200).json({ signedUrl, key });
  } catch (error) {
    console.error('Error in getting upload URL:', error);
    res.status(500).json({ message: 'Server error during URL generation' });
  }
};






