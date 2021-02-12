//servers and middlewares used
const express=require("express")
const mongoose=require("mongoose")
const bodyparser=require("body-parser")
const cookieParser=require("cookie-parser")
const csrf=require("csurf")
const passport=require("passport")
const LocalStrategy=require("passport-local").Strategy
const csrfProtection = csrf({ cookie: true })
const bcrypt=require("bcrypt")
const session = require('express-session')
const flash=require("express-flash")
const jwt=require("jsonwebtoken")
const nodemailer=require("nodemailer")
const multer=require("multer")
const path=require("path")
const fs=require("fs")
const app=express()
const extract = require("decompress-zip")
const server = require('http').createServer(app);
const io = require('socket.io')(server);

mongoose.connect("mongodb://localhost/share_project",
         {useNewUrlParser:true,
         useUnifiedTopology:true})
         .then(res => console.log('Connected to the databse succcessfully'))
         .catch(err => console.log("There was an error connecting to the database"));//connects to the databse you want to use


app.use(express.static(__dirname+"/public"))//setting the public directory you want to use
app.use(bodyparser.urlencoded({extended:true}))//body parser to parse through requests incase of post methods from forms




//destination for upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

var upload = multer({
    storage:storage,
    dest:'public/uploads', //this property is not needed bcoz we are saving it to the database
    limits:{fileSize: 10000000},
    fileFilter(req,file,cb){
        if (!file.originalname.match(/\.(png|jpg|jpeg|zip|rar)$/)){
            cb(new Error("Please upload an image"))
        }
        cb(undefined,true)
    }
    })


function CheckPassword(inputtxt){ 
    var paswd=  /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;//the regular  expression for the password
    if(inputtxt.match(paswd)){ 
    return true;}
    else{ 
    return false;
    }
}  

function encodeTokenstring(userId){
    let info={id:userId}
    const token=jwt.sign(info,"secret")
    var url = "127.0.0.1:8000" +"/" + token   
    console.log(url)
    return url
}

function sendtokentoUser(user_email,body){
    let transporter=nodemailer.createTransport({
       host:"Smtp.gmail.com",
       port:587,
       secutr:false,
       auth:{
            user:"olayinkaganiyu1@gmail.com",
            pass:"taiacfcfxjylmvck"
       }
       
    })
    let mail= transporter.sendMail({
        from:"ShareProject",
        to:user_email,
        subject:"Confirm your email",
        html:"<a href="+ body+">Click on this confirm your email</a>"
    },function(err,result){
        if(err){
            console.log(err)
        }
        console.log("The mail was sent successfully")
        console.log(result)
        transporter.close()
    })

}



app.use(session(
    {secret: 'keyboard cat', 
    resave: false,
    saveUninitialized: true }));


    // parse cookies
// we need this because "cookie" is true in csrfProtection
app.use(cookieParser())

//intitalize the passport and start passport sessions
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())//enables sending of flash messages


let default_img_base64="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"


//Models and database(defining your database and schema)
var UserSchema= new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        
    },
    active:{
        type:Boolean,
        default:false
    },
    posts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post"
    }],
    profile:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Profile"
    },
    image:{
        type:Buffer,
        default:new Buffer.from(default_img_base64,"base64")
    },
    img_content_type:{ type :String,
    default:'image/png'},
    img_path:{
        type:String,
        default:"/img/download.png"
    }
})

//hashing the password before saving it 
UserSchema.pre("save",function(next){
    var user=this;
    
    bcrypt.hash(user.password,10,function(err,hash){
        if(err){
            next(err)
        }
        user.password = hash
        next()
    })
})




UserSchema.method("isvalid",function(password){
    bcrypt.compare(password,this.password,function(err,result){
        if(err){
            console.log(err)
        }
        if(result===true){
            return true
        }
        if(result!==true){
            return null
        }
    })
})

var ConversationSchema=new mongoose.Schema({
    initiator:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    recipient:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    last_contact:{
        type:Date,
    },
    last_message:{
        type:String
    }

})


var MessagesSchema=new mongoose.Schema({
    Conversation:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Conversation"
    },
    Sender:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    Receiver:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    text:{
        type:String,
    },
    date_created:{
        type:Date,
        default:Date.now
    }
})

ConversationSchema.static("get_or_new",async function(user1_id,user2_id){
    if(user1_id==user2_id){
        return null
    }
    query1={initiator:user1_id,recipient:user2_id}
    query2={initiator:user2_id,recipient:user1_id}
    return this.findOne({$or:[query1,query2]})
})

ConversationSchema.static("get_convo",async function(user1_id){
    
    query1={initiator:user1_id}
    query2={recipient:user1_id}
    return this.find({$or:[query1,query2]}).populate(["initiator","recipient"])
})


var Conversation=new mongoose.model("Conversation",ConversationSchema)
var Messages=new mongoose.model("Messages",MessagesSchema)

var User= new mongoose.model("User",UserSchema)
User

//Post databse model
var PostSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    content:{
        type:String,
        required:true,
    },
    created_time:{
        type:Date,
        required:true,
        default:Date.now
    },
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    topics:{
        type:Array
    }
})

var Post=mongoose.model("Post",PostSchema)


//Notification Schema and model
var NotificationSchema=new mongoose.Schema({
    initiator:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    recipient:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    date_created:{
        type:Date,
        default:Date.now
    },
    last_message:{
        type:String
    }
})

var Notification=mongoose.model("Notification",NotificationSchema)

//Profile Database
var ProfileSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    about:{
        type:String,
        default:""
    },
    favorite:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post"
    }],
    followers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    following:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    location:{
        type:String,
        default:""
    },
    topics:[{
        type:String
    }],
    image:{
        type:Buffer,
        default:new Buffer.from(default_img_base64,"base64")
    },
    img_content_type:{ type :String,
                        default:'image/png'},
    date_created:{
        type:Date,
        required:true,
        default:Date.now
    },
    img_path:{
        type:String,
        default:"/img/download.png"
    }
})

var Profile=mongoose.model("Profile",ProfileSchema)



//Passport session setup,useful for persistent login sessions
//passport needs ability to serialize the users in and out of sessions
passport.serializeUser(function(user,done){
    done(null,user)
});
passport.deserializeUser(function(id,done){
    User.findById(id,function(err,user){
        done(err,user)
    })
});


passport.use("local-login",new LocalStrategy({
    usernameField:"username",
    passwordField:"password",
    passReqToCallback:true

},function(req,username,password,done){
    if(username){
        username=username.toLowerCase()
        process.nextTick(function(){
            User.findOne({username:username},function(err,user){
                if(err){
                   return done(err)
                }
                if(!user){
                   return done(null,false,req.flash("error","The username was not found")) 
                }else{
                    bcrypt.compare(password,user.password,function(err,result){
                    if(err){
                        console.log(err)
                    }
                    console.log(result)
                    if(result==false){
                        console.log(password)
                        console.log(user.password)
                        return done(null,false,req.flash("error","The password is incorrect")) //this part is showing everything as wrong password
                    }else{
                       // if(user.active==false){
                           // return done(null,false,req.flash("error","The user account is not verified"))
                       /// }
                        return done(null,user)
                    }
                });}
             
            })
        })
    }
}))

//the passport strategy to use
passport.use("local-signup",new LocalStrategy({
    usernameField:"username",
    passwordField:"password",
    passReqToCallback:true
},function(req,username,password,done){
    //asynchronous
    //User.findOne wont fire unless data is sent back
    process.nextTick(function(){
        //making sure the username doesnt exist first
        if(!req.user){//making sure it is not the logged in user
            User.findOne({username:username},function(err,user){
                if (err){
                    done(err)
                }
                console.log(user)
                if(user!=null){
                    console.log("The username is already taken")
                    return done(null,false,req.flash("error" , "The username already exist"))
                }
                if(!user){

                    if(username.length<6){
                        console.log("The username is short")
                        return done(null,false,req.flash("error" , "The username should be at least 6 characters"))
                    }
                    if(!CheckPassword(password)){
                        console.log("The password is not strong enough")
                        return done(null,false,req.flash("error" , "The password is not strong enough"))
                    }   
                    //validate that password and confirm passowrd form fields are equal
                    if(req.body.password != req.body.confirm_password){
                        console.log("The passwords do not match")
                        return done(null,false,req.flash('error', 'The passwords do not match'))
                    }else{
                    var newUser=User.create(
                            {
                                username:username.toLowerCase(),
                                email:(req.body.email).toLowerCase(),
                                password:password
                            },function(err,user){
                                if(err){
                                    console.log(err)
                                }else{
                                    console.log(password)
                                    console.log("The user was successfully created")
                                    //var url= encodeTokenstring(result.id)//returns the url to the verification link
                                    //sendtokentoUser(result.email,url)
                                    Profile.create({
                                        user:user._id
                                    },function(err,result){
                                        if(err){
                                            console.log(err)
                                        }
                                            user.profile=result._id
                                            console.log("The profile was successfully created")
                                    })
                                    return done(null, user,req.flash('created', 'The User was successfully created'));
                                }
                            })
                           
                           
    
                    }
                }
                
            })}
        else{
            return req.user
        }
    })

}))     

app.get("/",function(req,res){
    res.render("home.ejs")
})

app.post("/register",csrfProtection,passport.authenticate("local-signup",{
            successRedirect:"/login",
            failureRedirect:"/register"
}),function(req,res){
    console.log(req.body.username)
})


 
app.get("/login",csrfProtection, function(req,res){
   
    res.render("login.ejs",{csrfToken:req.csrfToken()})
})

app.post("/login",passport.authenticate("local-login",{successRedirect:"/discover",
                                                 failureFlash:true,
                                                
                                                 failureRedirect:"/login"},),
                function(req,res){
                   console.log(req.session)
                })


app.get("/register",csrfProtection,function(req,res){
    // pass the csrfToken to the view
    res.render("register.ejs",{csrfToken:req.csrfToken()})
})

app.get("/discover",isLoggedin,function(req,res){
    user=req.user
    res.render("discover.ejs",{user:user})
    //console.log(req.user)
})

app.get("/post/:id",isLoggedin,function(req,res){
    user=req.user
    var id=req.params.id
    Post.findOne({_id:id},function(err,doc){
        if(err){
            console.log(err)
        }
        if(doc==null){
            res.render("error.ejs")
        }
        User.findOne({_id:doc.author},function(err,author){
            if(err){
                console.log(err)
            }
            console.log(user._id,author._id)
            if(`${user._id}` == `${author._id}`){
                console.log(true)
            }
            res.render("post.ejs",{user:user,post:doc,author:author})
        })
       
    })
   
})




app.get("/profile/:username",isLoggedin,function(req,res){
    var request_user=req.user
    var username=req.params.username;
    User.findOne({
        username:username.toLowerCase()
    },function(err,result){
        if(err){
            console.log(err)
            
        }
           var user=result
           if(user === null){
           res.render("error.ejs")
           }else{
           Profile.findOne({
               user:user._id
           },function(err,result){
               if(err){
                   console.log(err)
               }
               //console.log(result)
               var profile=result
               res.render("profile.ejs",{profile:profile,user:user,req_user:request_user})
           })}
          
    })
})

app.get("/new-post",function(req,res){
    user=req.user
    res.render("new post.ejs",{user:user})
})


app.post("/new-post",upload.single("attachment"),async function(req,res){
    user=req.user
    console.log(req.file)
    if(req.file){
        try {
            var filepath = path.join(req.file.destination, req.file.filename);
            var unzipper = new extract(filepath);

        unzipper.on("extract", function () {
            console.log("Finished extracting");
        });

        unzipper.extract({ path: "\extracted"});
        }
        catch (error) {
            console.log(error)
        }
    }
    Post.create(
        {
            title:req.body.title,
            content:req.body.content,
            author:user._id,
            topics:req.body.topics.split(",")
        },
    function(err,doc){
        if(err){
            console.log(err)
        }
        console.log(doc)
        res.redirect(`/post/${doc._id}`)
    })
   
})

app.get("/projects",function(req,res){
    res.render("projects.ejs")
})


app.get("/verify/:token",function(req,res){
    let token=req.params.token
    let decoded=jwt.verify(token,"secret")

    let userId= decoded.id
    User.findOne({_id:userId},function(err,user){
        if (err){
            console.log(err)
        }
        console.log("The user has been found and  verify the link")
        user.active=true
        req.flash("created","User account successfully verified")
        res.redirect("/login")
       
    })
})

app.get("/profile-update",isLoggedin,function(req,res){
    user=req.user
    Profile.findOne({user:user._id},function(err,profile){
        if(err){
            console.log(err)
        }
        res.render("profile-update.ejs",{profile:profile,user:user})
    })
   
})  

app.get("/follow/:user_id",isLoggedin,function(req,res){
    var user=req.user
    var profile_user_id=req.params.user_id
    //pushing into an array using findandupdate
    if(user._id===profile_user_id){
        res.send("You no fit like yourself boss")
    }else{
    Profile.findOne({user:user._id},function(err,profile){
        if(err){
            console.log(err)
        }
        if(profile.following.includes(profile_user_id)){
            Profile.findOneAndUpdate({user:user._id},{"$pull": { "following": profile_user_id }} ,function(err,profile){
                if(err){
                    console.log(err)
                }
            })
            Profile.findOneAndUpdate({user:profile_user_id},{"$pull":{"followers":user._id}},function(err,pro){  
                if(err){
                    console.log(err)
                }           
            })
            res.redirect(req.get("referer"))
        }else{
            Profile.findOneAndUpdate({user:user._id},{"$push": { "following": profile_user_id }} ,function(err,profile){
                if(err){
                    console.log(err)
                }
                User.findOne({_id:profile_user_id},function(err,res_user){
                    if(err){
                        console.log(err)
                    }
                    Profile.findOneAndUpdate({user:profile_user_id},{"$push":{"followers":user._id}},function(err,pro){  
                        if(err){
                            console.log(err)
                        }           
                    })
                })
                res.redirect(req.get("referer"))
            })
        }
    })
    
    }
})

app.get("/followers/:username",isLoggedin,function(req,res){
    var request_user=req.user
    var username=req.params.username;
    User.findOne({
        username:username.toLowerCase()
    },function(err,result){
        if(err){
            console.log(err)
            
        }
           var user=result
           if(user === null){
           res.render("error.ejs")
           }else{
           Profile.findOne({user:user._id}).populate("followers").exec(function(err,profile){
               if(err){
                   console.log(err)
               }
               console.log(profile.user.username)
               console.log(profile.populated("followers"))
               res.render("followers.ejs",{profile:profile,user:user,req_user:request_user})
           })

           }
          
    })
})

app.get("/following/:username",isLoggedin,function(req,res){
    var request_user=req.user
    var username=req.params.username;
    User.findOne({
        username:username.toLowerCase()
    },function(err,result){
        if(err){
            console.log(err)
            
        }
           var user=result
           if(user === null){
           res.render("error.ejs")
           }else{
           Profile.findOne({user:user._id}).populate("following").exec(function(err,profile){
               if(err){
                   console.log(err)
               }
               console.log(profile.user.username)
               console.log(profile.populated("following"))
               res.render("following.ejs",{profile:profile,user:user,req_user:request_user})
           })

           }
          
    })
})

app.post("/profile-update",upload.single("profile"),function(req,res){
    
    user1=req.user
    console.log(req.body)
    Profile.findOne({user:user1._id},function(err,profile){
        if(err){
            console.log(err)
        }else{
            if(req.file){
                var filepath = path.join(req.file.destination.split("/")[1], req.file.filename);
                User.findOneAndUpdate({_id:user1._id},{$set: {username:req.body.username,
                    email:req.body.email,
                    img_path:filepath,
                    img_content_type:req.file.mimetype
                    }},
                    {new:true},
                    function(err,result){
                        if(err){
                            console.log(err)
                        }
                        //console.log(result)
                        console.log(req.file)
                            profile.topics=req.body.topics.split()
                            profile.location=req.body.location
                            profile.about=req.body.about
                            profile.img_path=filepath
                            profile.img_content_type=req.file.mimetype
                        profile.save(function(err,pro){
                        if(err){
                        console.log(err)
                        }
                        //console.log(pro)
                        res.redirect(`/profile/${result.username}`)

                        })
                        })
            }else{
                User.findOneAndUpdate({_id:user1._id},{$set: {username:req.body.username,
                    email:req.body.email}},
                    {new:true},
                    function(err,result){
                    if(err){
                    console.log(err)
                    }
                    //console.log(result)
                    profile.topics=req.body.topics.split()
                    profile.location=req.body.location
                    profile.about=req.body.about
                    profile.save(function(err,pro){
                    if(err){
                    console.log(err)
                    }
                    //console.log(pro)
                    res.redirect(`/profile/${result.username}`)

                    })
                    })
            }
        }
   
    
    })
   
})


io.on("connection",(socket)=>{
    socket.on("connection",(data)=>{
        console.log("Websocket connected")
    })
    const ObjectId = mongoose.Types.ObjectId;
    socket.on("join_message",async(data)=>{
        console.log(data)
        var conversation=await Conversation.get_or_new(ObjectId(data.me),ObjectId(data.other_user))
        console.log(conversation)
        socket.join(conversation._id.toString())
    })
    socket.on("send_message",async(data)=>{
        try {
            console.log(data)
            var conversation=await Conversation.get_or_new(ObjectId(data.me),ObjectId(data.other_user))
            console.log(conversation)
            Messages.create({
                Conversation:conversation._id,
                Sender:ObjectId(data.me),
                Receiver:ObjectId(data.other_user),
                text:data.message
            },function(err,message){
                if(err){
                    console.log(err)
                }
                console.log(message)
                Conversation.findOneAndUpdate({_id:conversation._id},{last_message:message.text,last_contact:message.date_created},function(err,update){
                    if(err){console.log(err)}{
                        var data={message:message.text,message_sender:message.Sender}
                        io.to(conversation._id.toString()).emit("received_message",data)
                    }
                })
            })  
        } catch (error) {
            console.log(error)
        }
       
    })
  })

  

app.get("/chat/:recipient",isLoggedin,async(req,res)=>{
    const chat_username=req.params.recipient
    const user=req.user
    if(user.username==chat_username){
        res.send("You no fit message yourself bossman")
    }
    User.findOne({username:chat_username},async function(err,result){
        if(err){
            console.log(err)
            res.render("error.ejs")
        }
        var conversation=await Conversation.get_or_new(user._id,result._id)
        if(!conversation){
        conversation=await  Conversation.create({
                initiator:user._id,
                recipient:result._id
            })
            console.log("A new object was created")
        }
        console.log(conversation._id.toString())
        var messages=await Messages.find({Conversation:conversation._id})
        var convos=await Conversation.get_convo(user._id)
        res.render("chat.ejs",{user:user,chat_user:result,messages:messages,convos:convos})
    })
})


app.get("/chat",isLoggedin,async(req,res)=>{
    const user=req.user

})



app.get("/post-update/:id",isLoggedin,function(req,res){
    user=req.user
    var id=req.params.id
    Post.findOne({_id:id},function(err,post){
        if(err){
            console.log(err)
            res.render("error.ejs")
        }
        if(post === null){
            res.render("error.ejs")
        }
        else{
            if(`${user._id}` == `${post.author}`){
                res.render("post-update.ejs",{user:user,post:post})
            }
        }
    })

})

app.post("/post-update/:id",function(req,res){
    user=req.user
    var id=req.params.id
    Post.findOne({_id:id},function(err,post){
        if(err){
            console.log(err)
        }
        post.title=req.body.title
        post.topics=req.body.topics.split(",")
        post.content=req.body.content
        post.save(function(err,result){
            if(err){
                console.log(err)
            }
            res.redirect(`/post/${id}`)
        })

    })
})

app.get("/logout",isLoggedin,function(req,res){
    req.logOut()
    res.send('You have been successfully logged out')
})

function isLoggedin(req,res,next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect("/login")
}

server.listen(8000,function(){
    console.log("The server is listening at port 3000")
})