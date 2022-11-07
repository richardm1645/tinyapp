const express = require("express");
const morgan = require('morgan');
const cookieSession = require('cookie-session');

const { 
  getUserByEmail,
  generateRandomString,
  urlsForUser,
  checkEmail,
 } = require('./helpers.js');

const { urlDatabase, users } = require('./databases.js');

const bcrypt = require("bcryptjs"); //For encrypting data
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(morgan('dev')); //Morgan logs all CRUD activities to the console. Not necessary for the app.
app.use(cookieSession({
  name: 'session',
  keys: ['key1'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.use(express.urlencoded({ extended: true }));



//The root directory redirects users to the front page
app.get("/", (req, res) => {
  res.redirect('/urls/');
});

//Register users to the main page if already logged in
app.get('/register', (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.render("user_register");
  }
});

//Validates registration credentials
app.post('/register', (req, res) => {
  //Error when either form is blank
  if (req.body.email === '' || req.body.password === '') {
    return res.status(400).send("Please enter a valid email/password.");

  //Error when the provided email is already registered
  }
  if (getUserByEmail(req.body.email, users)) {
    return res.status(400).send("That email is already registered in the database.");
  }

  //No errors
  const userID = generateRandomString();
  const password = req.body.password;
  
  //Creates a user profile in the users database
  users[userID] = {
    id: userID, //Set to a random string
    email: req.body.email,
    hashedPassword: bcrypt.hashSync(password, 10) //Encrypts password
  };
  //Sets the user cookie ID, which the browser checks for login state
  req.session.user_id = userID;
  res.redirect('/urls');
});

//Logs users in
app.get('/login', (req, res) => {
  //If user is already logged in, redirects to main page
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.render("user_login");
  }
});

//Login validation
app.post('/login', (req, res) => {
  //Checks if the provided email is linked to any users
  if (!getUserByEmail(req.body.email, users)) {
    res.status(403).send("Cannot find user in database.");
  } else {
    //If the provided email exists, checks if the provided password matches the
    //hashed password in the database, Redirects to main page if successful
    for (const user in users) {
      if (bcrypt.compareSync(req.body.password, users[user].hashedPassword)) {
        req.session.user_id = users[user].id;
        return res.redirect("/urls");
      }
    }
    return res.status(403).send("The password does not match the registered email.");
  }
  
});

//Logs the user out of the account
app.post('/logout', (req, res) => {
  //Deletes the user cookie
  delete req.session.user_id;
  res.redirect('/login');
});

//Renders the main page that shows the user's URLs. 
app.get("/urls", (req, res) => {
  console.log("Users: ", users)
  console.log("URLs: ", urlDatabase)
  const templateVars = {
    user_id: req.session.user_id,
    email: checkEmail(req.session.user_id), //Displays which account is logged in
    urls: urlsForUser(req.session.user_id) //Only show URLs belonging to each user
  };
  //Only shows the URLs if the user is signed in.
  if (req.session.user_id) {
    res.render("urls_index", templateVars);
  } else {
    res.render('error_permissions', templateVars);
  }
});

//Handles POST requests to add a new short URL
app.post("/urls", (req, res) => {
  //Can only add URLs if user is signed in.
  if (req.session.user_id) { //Checks for login cookie
    let newCode = generateRandomString();
    //Generates a new object in URL database
    urlDatabase[newCode] = {
      longURL: req.body.longURL, 
      userID: req.session.user_id, //Used to cross reference which user owns this URL
      shortID: newCode
    };
    res.redirect('/urls/' + newCode); //To edit page
  } else {
    const basicTemplateVars = {
      user_id: req.session.user_id,
      email: checkEmail(req.session.user_id)
    }
    res.render('error_permissions', basicTemplateVars);
  }
});

//Creates new URL
app.get("/urls/new", (req, res) => {
  const templateVars = {
    user_id: req.session.user_id,
    email: checkEmail(req.session.user_id)
  };
  //Redirects to login page if user is not signed in
  if (req.session.user_id) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect('/login');
  }
});

//Creates custom short random codes for new URLs
app.get("/urls/:id", (req, res) => {
  console.log("userID of first entry: ", urlsForUser(req.session.user_id)[0].userID,
  " should not equal to user_id: ", req.session.user_id)
  console.log("available sites: ", urlsForUser(req.session.user_id))
  console.log(req.session.user_id, "is currently logged in")

  const basicTemplateVars = {
    user_id: req.session.user_id,
    email: checkEmail(req.session.user_id)
  }
  
  //Error when the specified URL doesn't exist
  if (!urlDatabase[req.params.id]) {
    res.render('error_invalidURL', basicTemplateVars);

  //Error when the user is not signed in 
  } else if (!req.session.user_id) {
    res.render('error_permissions', basicTemplateVars);

  //Error when the specified URL is not owned by the respective signed in user 
  } else if (!urlsForUser(req.session.user_id).includes(urlDatabase[req.params.id])) {
      res.render('error_urlpermissions', basicTemplateVars);

  //No errors
  } else {
    const templateVars = {
      id: req.params.id,
      longURL: urlDatabase[req.params.id].longURL,
      user_id: req.session.user_id,
      email: checkEmail(req.session.user_id)
    };
    res.render("urls_show", templateVars);
  }
});

//Edits an existing short URL, where the user can change the longURL for a given short code.
app.post("/urls/:id", (req, res) => {
  const shortCode = req.params.id;
  urlDatabase[shortCode].longURL = req.body.longURL;
  res.redirect('/urls');
});

//Validates the deletion of a link
app.post("/urls/:id/delete", (req, res) => {
  //A universal object of items that most EJS templates use, needs to be inside CB
  const basicTemplateVars = {
  user_id: req.session.user_id,
  email: checkEmail(req.session.user_id)
  }
  //Error when the specified URL doesn't exist
  if (!urlDatabase[req.params.id]) {
    res.render('error_invalidURL', basicTemplateVars);
  
    //Error when the user is not signed in
  } else if (!req.session.user_id) {
    res.render('error_permissions', basicTemplateVars);
  
    //Error when the specified URL is not owned by the respective signed in user
  } else if (!urlsForUser(req.session.user_id).includes(urlDatabase[req.params.id])) {
    res.render('error_urlpermissions', basicTemplateVars);
  
    //If no errors, deletes the URL object in the database
  } else {
    const shortURL = req.params.id;
    delete urlDatabase[shortURL];
    res.redirect('/urls');
  }
});

//Redirects users to the actual site based on the short code
app.get("/u/:id", (req, res) => {
  const shortCode = req.params.id;
  //Checks if the specified URL exists in the database
  //Note: Everyone can use /u/:id whether if logged in or not
  if (urlDatabase[shortCode]) {
    res.redirect(urlDatabase[shortCode].longURL);
  } else {
    //A universal object of items that most EJS templates use, needs to be inside CB
    const basicTemplateVars = {
    user_id: req.session.user_id,
    email: checkEmail(req.session.user_id)
    }
    res.render('error_invalidURL', basicTemplateVars);
  }
  
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});
