const express = require("express");
const morgan = require('morgan')
const cookieParser = require('cookie-parser');
const e = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(morgan('dev'))
app.use(cookieParser())

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {};

const generateRandomString = function () {
  let ID = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i <= 5; i++) {
    ID += char.charAt(Math.floor(Math.random() * char.length))
  }
  return ID;
}

const getUserByEmail = function(email) {
  for (const user in users) {
    if (users[user].email === email) {
      return users[user].email;
    }
  }
  return null;
}

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.redirect('/urls/')
});

app.get("/urls", (req, res) => {
  console.log(users)
  const cookieID = req.cookies["user_id"];
  if (cookieID) {
    var email = users[cookieID].email; //var for global scope use
  }
  const templateVars = {
    urls: urlDatabase,
    user_id: cookieID,
    email: email
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
  const templateVars = { 
    user_id: req.cookies["user_id"],
    email: this.user_id ? users[req.cookies["user_id"]].email : null 
  }
  res.render("urls_new", templateVars);
});


//Logs users in
app.get("/urls/login", (req, res) => {
  res.render("user_login");
})

//Checks for login validation
app.post("/urls/login", (req, res) => {
  if (getUserByEmail(req.body.email) !== req.body.email) {
    res.send("Error 403, the specified email does not exist in the database.")
  }
  for (const user in users) {
    if (users[user].password === req.body.password) {
      res.cookie("user_id", users[user].id);
      res.redirect("/urls");
    }
  }
  res.send("Error 403, the password does not match the registered email")
})

//Logs the user out of the account
app.post('/urls/logout', (req, res) => {
  res.clearCookie("user_id");
  res.redirect('/urls/login');
})

//Register users
app.get("/urls/register", (req, res) => {
  res.render("user_register");
});

app.post('/urls/register', (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.send("Error 400, please enter a valid email and/or password")
  } 
  if (getUserByEmail(req.body.email) === req.body.email) {
    res.send("Error 400, that email already exists in the database")
  }
  const userID = generateRandomString();
  //Creates a user profile for registering
  users[userID] = {
    id: userID,
    email: req.body.email,
    password: req.body.password
  };
  
  res.cookie("user_id", userID)
  res.redirect('/urls/');
})




//Creates custom short random codes for new URLs
app.get("/urls/:id", (req, res) => {
  const templateVars = {
    id: req.params.id,
    longURL: urlDatabase[req.params.id],
    user_id: req.cookies["user_id"],
    email: this.user_id ? users[req.cookies["user_id"]].email : null
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
