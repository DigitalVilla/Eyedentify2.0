const express = require('express');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const passport = require('passport'); 
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load Input Validation
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

// Load User model
const User = require('../../models/User');

// @route   GET api/users/test
// @desc    Tests users route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'Users Works' }));


// @route   POST api/users/register
// @desc    Register user
// @access  Public
router.post('/register', (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);
  if (!isValid) return res.status(400).json(errors);
  
  const {email, username, password} = req.body;
  User.findOne({ username })
    .catch(err => res.status(400).json(parse(err.errmsg)))
    .then(user => {
      const newUser = new User();
      newUser.email = email.toLowerCase();
      newUser.username = username.toLowerCase();
      newUser.avatar = gravatar(newUser.email);
      
      scrypt(password, (hash) => {
        newUser.password = hash;
        newUser.save()
          .then(user => res.json({ok:true}))
          .catch(err => res.status(400).json(parse(err.errmsg)))
      });
  });
});

// @route   GET api/users/login
// @desc    Login User / Returning JWT Token
// @access  Public
router.post('/login', (req, res) => {
  const { errors, isValid, isEmail } = validateLoginInput(req.body);
  if (!isValid)  return res.status(400).json(errors);
  
  const {login, password} = req.body;
  const search = isEmail ? { email:login } : { username:login };

  User.findOne(search).then(user => {
    if (!user) return res.status(404).json({login: 'User not found'});
    bcrypt.compare(password, user.password).then(isMatch => {
      if (!isMatch) return res.status(400).json({password: 'Password is incorrect'});
        // Create JWT Payload & // Sign Token
        const payload = { id: user.id, username: user.username, avatar: user.avatar }; 
        
        jwt.sign(payload, keys.secret,{ expiresIn: 3600 },
          (err, token) => res.json({token: 'Bearer ' + token})
        );
    });
  });
});


// @route   GET api/users/
// @desc    update with a JWT Token
// @access  Public
router.put('/', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body, true);
  if (!isValid) return res.status(400).json(errors);
  
  const {email,avatar, password, username} = req.body;
  //SPECIAL Profile updates
  const userFields = {};
  if (req.body.avatar) userFields.avatar = avatar;
  if (req.body.email) userFields.email = email.toLowerCase();
  if (req.body.username) userFields.username = username.toLowerCase();
  
  if (req.body.password)
    scrypt(password, (hash)=>{
      userFields.password = hash;
      User.findOneAndUpdate({ email: req.user.email }, { $set: userFields }, { new: true })
        .then((user) => res.json({ok:true})) 
        .catch(err => res.status(400).json(parse(err.errmsg)))
    })
  else
    User.findOneAndUpdate({ email: req.user.email }, { $set: userFields }, { new: true })
      .then((user) => res.json({ok:true})) 
      .catch(err => res.status(400).json(parse(err.errmsg)))
})

const parse = (err) => {
  let start = err.indexOf('$') +1;
  let end = err.indexOf('_');
  const type = err.slice(start, end);
  return {[type]: `That ${type} already exists` };
}

// @route   GET api/users/current
// @desc    Return current user
// @access  Private
router.get('/current', passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
      email: req.user.email
    });
  }
);



const gravatar = function(email,size) {
  // '&d=robohash':
  const style = '&d=retro';
  if (!size) size = 200;
  var md5 = crypto.createHash('md5').update(email).digest('hex');
  return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + style;
};

const scrypt =  (password,  callback) => {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) throw err;
      callback(hash);  
  });
});
} 



module.exports = router;