const { urlDatabase, users } = require('./databases.js');

//Function that gets the user's ID from an inputted email and database
const getUserByEmail = function(email, database) {
  for (const user in database) {
    if (database[user].email === email) {
      return user;
    }
  }
  return null;
}

//Function that generates a random 6 digit string for user identification and short URLs.
const generateRandomString = function() {
  let ID = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i <= 5; i++) {
    ID += char.charAt(Math.floor(Math.random() * char.length));
  }
  return ID;
};

//Function that only displays links that a specific user has created by cross-referencing their ID
//Note: The saved URLs are in an array, not an object like the URL database.
const urlsForUser = function(id) {
  let userURLs = [];
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      userURLs.push(urlDatabase[url]);
    }
  }
  return userURLs;
};

//Function returns a user's email if signed in, or returns null if not.
const checkEmail = function(accountID) {
  if (users[accountID]) {
    return users[accountID].email;
  } else {
    return null;
  }
}

module.exports = { 
  getUserByEmail,
  generateRandomString,
  urlsForUser,
  checkEmail,
 }