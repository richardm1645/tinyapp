const express = require("express");
const morgan = require('morgan')
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(morgan('dev'))
app.use(cookieParser())

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const generateRandomString = function() {
  let ID = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i <= 5; i++) {
    ID += char.charAt(Math.floor(Math.random() * char.length))
  }
  return ID;
}


app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.redirect('/urls/')
});

app.get("/urls", (req, res) => {
  const templateVars = { 
    username: req.cookies["username"],
    urls: urlDatabase 
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  let newCode = generateRandomString();
  urlDatabase[newCode] = req.body.longURL;
  res.redirect('/urls/' + newCode)
});


//Creates new URL
app.get("/urls/new", (req, res) => {
  const templateVars = { username: req.cookies["username"] }
  res.render("urls_new", templateVars);
});


//Creates an account
app.post("/urls/login", (req, res) => {
  res.cookie("username", req.body.username);
  res.redirect('/urls/');
});

//Logs the user out of the account
app.post('/urls/logout', (req, res) => {
  res.clearCookie("username");
  res.redirect('/urls/');
})

//Creates custom short random codes for new URLs
app.get("/urls/:id", (req, res) => {
  const templateVars = { 
    id: req.params.id, 
    longURL: urlDatabase[req.params.id],
    username: req.cookies.username
  };
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  const shortCode = req.url.slice(6)
  res.redirect('/urls/' + shortCode)
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


//Redirects users to the actual site based on the short code
app.get("/u/:id", (req, res) => {
  //Gets the id from the url to cross reference with the database
  const longURL = urlDatabase[req.url.slice(3)];
  res.redirect(longURL);
});

/*
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

*/

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
