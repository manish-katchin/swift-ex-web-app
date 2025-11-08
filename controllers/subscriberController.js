const Subscriber = require('../models/subscriber');


async function addSubscriber(email, firstName, lastName) {
  try {
    const subscriber = new Subscriber({ email, firstName, lastName });
    await subscriber.save();
    return { success: true, message: 'Email subscribed successfully' };
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, message: 'Email is already subscribed' };
    }
    return { success: false, message: 'Failed to subscribe email' };
  }
}


const getSubscribers = async (page = 1, limit = 10, search = '') => {
  const skip = (page - 1) * limit;
  let filter = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } }
    ];
  }

  console.log({ filter, page, limit })
  const subscribers = await Subscriber.find(filter)
    .select('email firstName lastName createdAt -_id')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Subscriber.countDocuments(filter);

  return {
    success: true,
    data: subscribers,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
    },
  };
};



module.exports = {
  addSubscriber,
  getSubscribers,
};
