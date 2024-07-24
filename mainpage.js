const express=require('express');
const app= express();
const mongoose=require('mongoose');
const methodOverride=require('method-override');
const path= require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const User = require('./userschema');
const Post=require('./postschema');

const mongoURI = 'mongodb://localhost:27017/dbmsproject1';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
const db=mongoose.connection;
db.on("error",console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log("database connected")
});
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
// app.use(express.static('public'));
const router = express.Router();

const conn = mongoose.connection;


conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads')
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12,function(err,bytes){
      const fn=bytes.toString("hex") + path.extname(file.originalname)
      cb(null,fn)
    })
  }
})
const upload = multer({ storage: storage })


app.get('/',(req,res)=>{
  res.render('index');
});

app.get('/login',(req,res)=>{
    res.render('login');
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && bcrypt.compareSync(password, user.password)) {
    res.redirect(`/home?username=${username}`);
  } else {
    res.redirect('login');
  }
});


app.get('/signup', (req, res) => {
    res.render('signup');
});
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
      return res.send('Username or Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
      username,
      email,
      password: hashedPassword
  });

  await newUser.save();

  res.redirect('/home');
});

app.get('/home', async (req, res) => {
  const { username } = req.query.username;
  const posts = await Post.find({});
  res.render('home', { username, posts });
});

app.get('/create-post', (req, res) => {
  const {username}= req.query.username;
  res.render('create-post', { username });
});

app.post('/create-post', upload.single('image'), async (req, res) => {
  try {
    console.log('Uploaded file:', req.file);
    const { username, content } = req.body;

    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const newPost = new Post({
      username,
      content,
      imageId: req.file.id,
      imagePath: `/uploads/${req.file.filename}`
    });

    await newPost.save();
    res.redirect(`/home?username=${username}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});


const PORT = process.env.PORT || 2024; 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});