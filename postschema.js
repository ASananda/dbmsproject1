
const mongoose=require('mongoose');
const postSchema = new mongoose.Schema({
    username: String,
    content: String,
    imageId: String,
    imagePath:String,
    createdAt: { type: Date, default: Date.now }
  });

const Post = mongoose.model('Post', postSchema);
module.exports = Post;