const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookies = require('cookie-parser');
const upload = require('./configs/multerconfig');

//require models have been done here 
const userModel = require('./models/user');
const postModel = require('./models/post');
const feedModel =require('./models/feeds');
const commentModel = require('./models/comment');

// const { log } = require('console');

// link css to ejs
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookies());

// first page contains login and register
app.get('/', (req, res) => {
   res.render('index.ejs');
}); 


// register page only contains register button  

app.get('/registerpage', (req, res) => {

   res.render('registerpage.ejs');
});

//user register routing

app.post("/register",async (req, res) => {

    let { name, username, age, email, password } = req.body;

    let user = await userModel.findOne({email})

    if(user){
        return res.send("user already exists");
    }
    
        bcrypt.genSalt(10,(err,salt)=>{


            bcrypt.hash(password,salt, async(err,hash)=>{
                password = hash;

                const user = await userModel({
                    name,
                    username,
                    age,
                    email,
                    password
                })

                user.save();

                let token = jwt.sign({email:email , userid:user._id},"abcdef")
                res.cookie("token",token)
                // res.send("user registered successfully");
                res.redirect("/profile");
            })

        })

    



})

//user login routing

app.post("/login", async (req,res)=>{


    let {email,password} = req.body;

    let user = await userModel.findOne({email})

    if(!user) {

        return res.send("something went wrong !!!");
    }

    bcrypt.compare(password,user.password,(err,result)=>{

        if(result){

            let token = jwt.sign({email:email , userid:user._id},"abcdef")
            res.cookie("token",token);

            // res.send("login successful");

            res.redirect("/profile");
        }
        else{
            res.redirect("/");
        }
    })
})

//logout routing

app.get("/logout",(req,res)=>{ 

    res.cookie("token","")
    res.redirect("/");
})

//profile routing

function isLoggedIn(req, res, next) {
    if (!req.cookies.token) {
      return res.redirect("/");
    }
  
    try {
      let data = jwt.verify(req.cookies.token, "abcdef");
      req.user = data;
      next();
    } catch (err) {
      console.error("JWT verification error:", err);
      res.redirect("/");
    }
  }


app.get("/profile",isLoggedIn, async (req,res)=>{


    try {
        let user = await userModel.findOne({ email: req.user.email });
    
        if (!user) {
          return res.redirect("/");
        }
    
        await user.populate("post");
        // user.post.reverse();
    
        res.render("profile.ejs", { user });
      } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Internal Server Error");
      }
})




app.get("/createpage/:id",isLoggedIn, async(req,res)=>{ 

   let id = req.params.id;
   let user=await userModel.findOne({_id:id});

//    console.log(user);

    res.render("createpage.ejs",{user});
})

app.post("/create-post",isLoggedIn,upload.single("image"), async (req,res)=>{

    // console.log(req.file);

    let imagename = req.file.filename;

    let email=req.user.email;
    let user= await userModel.findOne({email});

    let {username,profilepic}=user;
    
    // console.log(email);
    // console.log(user);

    let {title,content}=req.body;

    let post = await postModel.create({
        user:user._id,
        title,
        content,
        username,

        image:imagename

    })

    let feed = await feedModel.create({
        user:user._id,
        title,
        content,
        username,
        postid:post._id,
        image:imagename,
        profilepic,


    })
    
    user.post.push(post._id);
    
    await user.save();
    await feed.save();




    res.redirect("/profile",);

})

//feeds routing

app.get("/feeds",isLoggedIn,async(req,res)=>{

    let feeds = await feedModel.find({});

    let user = await userModel.findOne({email:req.user.email});

    console.log(user.username);

    let newfeeds = feeds.filter((feed)=>{

        if(feed.username!=user.username){
            
            return feed
        }else{

            return
        }
    })

    newfeeds.reverse();

    res.render("feeds.ejs",{newfeeds,user});

})


//comment page routing


app.get("/comment/:id",isLoggedIn, async(req,res)=>{


    let content = req.body.content;

   

    let id = req.params.id;

    let post = await postModel.findOne({_id:id});

    let user = await userModel.findOne({email:req.user.email});


if(post.comment.length!=0){
    
   await post.populate("comment");
}
let comments = post.comment;
comments.reverse();

let {username,profilepic}=user;

await commentModel.findOneAndUpdate({username:username},{ 
    profilepic
})



    res.render("comment.ejs",{comments,post,id,user});

   

})

//comment adding rote

app.post("/add-comment/:id",isLoggedIn, async(req,res)=>{

let id =req.params.id;

let {content}=req.body;


let user = await userModel.findOne({email:req.user.email});

let {username,profilepic}=user;


 let commentData = await commentModel.create({
    content,
    username,
    post:id,
    profilepic,


})




let post = await postModel.findOne({_id:id});

post.comment.push(commentData._id);

await post.save();

await post.populate("comment");

let comments = post.comment;

comments.reverse();

// console.log(comments);



res.render("comment.ejs",{comments,id,post,user});

})

app.get("/editprofile",isLoggedIn, async(req,res)=>{
    // let user = await userModel.findOne({email:req.user.email});

    let user = await userModel.findOne({email:req.user.email});

    res.render("editprofile.ejs",{user});
})

app.post("/update",isLoggedIn,upload.single("image") ,async(req,res)=>{

    let user = await userModel.findOne({email:req.user.email});
    // console.log(user);

    let {name,username,bio,email}=req.body;

    console.log(req.body);

    console.log(req.file);

    user.name=name;
    user.username=username;
    user.bio=bio;
    user.email=email;

    if(req.file){
        user.profilepic=req.file.filename;
    }

    await user.save();



    await user.populate("post");

    res.render("profile.ejs",{user});
})

//delete the post

app.get("/deletepost/:id",isLoggedIn, async(req,res)=>{
    let id = req.params.id;
    let user = await userModel.findOne({email:req.user.email});
    let post = await postModel.findOne({_id:id});

    user.post.pull(post._id);
    await feedModel.deleteOne({postid:id});
    await postModel.deleteOne({_id:id});
    await commentModel.deleteMany({post:id});
   
    // let comment = await commentModel.findOne({_id:id});
    await user.save();
    
    
    res.redirect("/profile");
})



app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
