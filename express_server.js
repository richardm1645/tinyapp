const express = require("express");
const morgan = require('morgan')
const cookieParser = require('cookie-parser');
//const e = require("express");
const bcrypt = require("bcryptjs");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(morgan('dev'))
app.use(cookieParser())

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
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

const urlsForUser = function(id) {
  let userURLs = [];
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      userURLs.push(urlDatabase[url]);
    }
  }
  return userURLs;
}

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.redirect('/urls/')
});

app.get("/urls", (req, res) => {
  const cookieID = req.cookies["user_id"];
  let userURLs = urlsForUser(cookieID)
  console.log(userURLs)
  console.log(users)
  const templateVars = {
    user_id: cookieID,
    email: function() {
      if (this.user_id) {
        return users[req.cookies["user_id"]].email;
      } else {
        return null;
      }
    },
    urls: userURLs
  };
  if (cookieID) {
    res.render("urls_index", templateVars);
  } else {
    res.redirect('/error_permissions')
  }
  
});

app.post("/urls", (req, res) => {
  if (req.cookies["user_id"]) {
    let newCode = generateRandomString();
    urlDatabase[newCode] = {
      longURL: req.body.longURL,
      userID: req.cookies["user_id"],
      shortID: newCode
    }
    res.redirect('/urls/' + newCode)
  } else {
    res.redirect('/error_permissions');
  }
});

app.get('/error_permissions', (req, res) => {
  const templateVars = { 
    user_id: req.cookies["user_id"],
    email: function() {
      if (this.user_id) {
        return users[req.cookies["user_id"]].email;
      } else {
        return null;
      }
    }
  }
  res.render('error_permissions', templateVars)
})

//Creates new URL
app.get("/urls/new", (req, res) => {
  const templateVars = { 
    user_id: req.cookies["user_id"],
    email: function() {
      if (this.user_id) {
        return users[req.cookies["user_id"]].email;
      } else {
        return null;
      }
    }
  } 
  if (!req.cookies["user_id"]) {
    res.redirect('/urls/login')
  } else {
    res.render("urls_new", templateVars);
  }
  
});


//Logs users in
app.get("/urls/login", (req, res) => {
  if (req.cookies["user_id"]) {
    res.redirect('/urls')
  } else {
  res.render("user_login");
  }
})

//Checks for login validation
app.post("/urls/login", (req, res) => {
  if (getUserByEmail(req.body.email) !== req.body.email) {
    res.status(403).send("Cannot find user in database.")
  }
  for (const user in users) {
    if (bcrypt.compareSync(req.body.password, users[user].hashedPassword)) {
      res.cookie("user_id", users[user].id);
      res.redirect("/urls");
    }
  }
  res.status(403).send("The password does not match the registered email.")
})

//Logs the user out of the account
app.post('/urls/logout', (req, res) => {
  res.clearCookie("user_id");
  res.redirect('/urls/login');
})

//Register users
app.get("/urls/register", (req, res) => {
  if (req.cookies["user_id"]) {
    res.redirect('/urls')
  } else {
  res.render("user_register");
  }
});

app.post('/urls/register', (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send("Please enter a valid email/password.")
  } 
  if (getUserByEmail(req.body.email) === req.body.email) {
    res.status(400).send("That email is already registered in the database.")
  }
  const userID = generateRandomString();
  const password = req.body.password;
  //Creates a user profile for registering
  users[userID] = {
    id: userID,
    email: req.body.email,
    hashedPassword: bcrypt.hashSync(password, 10)
  };
  
  res.cookie("user_id", userID)
  res.redirect('/urls');
})

//HTML error page if the short url doesn't exist
app.get('/error_invalidURL', (req, res) => {
  const templateVars = { 
    user_id: req.cookies["user_id"],
    email: this.user_id ? users[req.cookies["user_id"]].email : null 
  }
  res.render('error_invalidURL', templateVars)
})

//Deletes a link
app.post("/urls/:id/delete", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.redirect('/error_invalidURL');
  } else if (!req.cookies["user_id"]) {
    res.redirect('/error_permissions');
  } else if (urlsForUser(req.cookies["user_id"]).length === 0) {
    res.redirect('/error_urlpermissions');
  } else {
    const shortURL = req.url.slice(6, 12);
    delete urlDatabase[shortURL];
    res.redirect('/urls');
  }
  
});


//Creates custom short random codes for new URLs
app.get("/urls/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.redirect('/error_invalidURL');
  } else if (!req.cookies["user_id"]) {
    res.redirect('/error_permissions');
  } else if (urlsForUser(req.cookies["user_id"]).length === 0) {
    res.redirect('/error_urlpermissions');
  } else {
    const templateVars = {
      id: req.params.id,
      longURL: urlDatabase[req.params.id].longURL,
      user_id: req.cookies["user_id"],
      email: function() {
        if (this.user_id) {
          return users[req.cookies["user_id"]].email;
        } else {
          return null;
        }
      }
    };
    res.render("urls_show", templateVars);
  }
  
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
  for (const url in urlDatabase) {
    if (url === req.url.slice(3)) {
      const longURL = urlDatabase[req.url.slice(3)];
      res.redirect(longURL);
    }
  }
  res.redirect('/error_urlpermissions')
});

app.get('/error_urlpermissions', (req, res) => {
  const templateVars = { 
    user_id: req.cookies["user_id"],
    email: function() {
      if (this.user_id) {
        return users[req.cookies["user_id"]].email;
      } else {
        return null;
      }
    }
  }
  res.render('error_urlpermissions', templateVars)
})

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});
