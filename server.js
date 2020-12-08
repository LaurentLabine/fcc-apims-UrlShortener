require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyparser = require("body-parser")
const dns = require('dns'); 
const validUrl = require("valid-url")
const mongoose = require("mongoose");
const { doesNotMatch } = require('assert');
const { Schema } = mongoose;

//Url Mongoose Stuff
const urlSchema = new Schema({
  original_url: String,
  short_url: String,
  https : Boolean
});

//Creating a Model
const URL = mongoose.model("Url", urlSchema,"UrlShortener");

//Configure connection t
mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false });

const db = mongoose.connection;
var count;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", function() {
  console.log("Connection Successful!");
}); 

// Basic Configuration
const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

// Middleware
app.use(bodyparser.urlencoded({extended: true})) 
app.use(bodyparser.json()) 
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

//Endpoints Below
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');

  if(req.path.split('/')[2])
  console.log(req.path.split('/')[2])
  let requestSegments = req.path.split('/');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.get("/api/shorturl/:sUrl", (req,res) => {

  URL.findOne({short_url: req.params.sUrl}, (err, doc) => {
    if(doc) {
      res.redirect((doc.https? "https://" : "http://") + doc.original_url)
    } else {
      console.log("Couldn't find " + req.params.sUrl + " in DB")
      res.redirect("/"); 
    }
  })
})

app.post("/api/shorturl/new", (req,res) => 
{
  var url = req.body.url

  if(!validUrl.isUri(url) || !url.startsWith("http"))//Check if URL is structurally Valid
    return res.json({error: 'invalid url'})

  var https = url.startsWith("http")? true: false;//saving wether http or https to recall later

  //removing the "http/https:www." pre and "/" suffix
  url = url.replace(/http(s)?(:)?(\/\/)?|(\/\/)?(www\.)?/,"").replace(/\/$/,"")

  URL.findOne({original_url: url}, (err, doc) => {
    if(doc) {
      console.log("Found It")
      res.json({
        original_url: doc.original_url,
        short_url: doc.short_url
      })
    } else {
      console.log("Not Found... Creating New.")

      db.collection("UrlShortener").countDocuments({}, (err, data) => { //Updating Counter
        if(err) return console.error(err)
        count = data + 1
        console.log("Count : " + count)

        var urlDoc = new URL({
          original_url: url,
          short_url: count,
          https: https
        })
      
        urlDoc.save((err, doc) => {//Saving the new website
          if(err) return console.error(err)
          res.json({
            original_url: ((doc.https? "https://" : "http://") + doc.original_url),
            short_url: urlDoc.short_url
          })
        })
      })
    }
  })
});