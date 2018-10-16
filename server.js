var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var bodyParser = require('body-parser');

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");


var PORT = 3000;

var app = express();

// Serve static content for the app from the "public" directory in the application directory.
app.use(express.static("public"));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/nyt", { useNewUrlParser: true });

// renders main page
app.get("/", function(req, res) {
  db.Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("index", hbsObject);
  });
});

app.get("/saved", function(req, res) {
  db.Article.find({"saved": true}, function(error, data) {
    var hbsObject = {
      article: data
    };
    res.render("saved", hbsObject);
  });
});

// A GET route for scraping the nytimes US page website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.nytimes.com/section/us").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // grab the title, link and summary and set it to our database
    $("div.story-body").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .find("h2.headline")
        .text().trim();
      result.link = $(this)
        .find("a")
        .attr("href");
      result.summary = $(this)
        .find("p.summary")
        .text().trim();


      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          return res.json(err);
        });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.get("/articles/:id", function(req, res) {
  Article.findById(req.params.id, function(err, data) {
		res.json(data);
	})
});

// save article
app.post("/articles/save/:id", function(req, res) {
  db.Article
  .findOneAndUpdate({_id: req.params.id},{saved: true})
  .then(function(result) {
    res.redirect('/');
    alert("post saved successful");
  })
  .catch(function(err) {
    err => res.json(err);
  });
});

// Delete an article
app.post("/articles/delete/:id", function(req, res) {
  db.Article
  .remove({_id: req.params.id})
  .then(function(result) {
    res.json(result);
  })
  .catch(function(err) {
    res.json(err);
  });
});



// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
