const router = require('express').Router();
const passport = require('passport');
const u = require('../../utils/utils');
// Load Validation
const validateProfileInput = require('../../validation/profile');
// Load Profile Model
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   GET api/profiles/test
// @desc    Tests profiles route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'Profile Works' }));


// @route   GET api/profile
// @desc    Get current users profile
// @access  Private
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
  const errors = {};
  Profile.findOne({ user: req.user.id })
    // .populate('posts', ['username', 'avatar'])
    // .populate('favorite', ['username', 'avatar'])
    // .populate('followers', ['username', 'avatar'])
    // .populate('following', ['username', 'avatar'])
    .populate('user', ['username', 'avatar', 'banner'])
    .then(profile => {
      if (!profile) {
        errors.noprofile = 'There is no profile for this user';
        return res.status(404).json(errors);
      }
      res.json(profile);
    })
    .catch(err => res.status(404).json(err));
}
);

// @route   GET api/profile/all
// @desc    Get all profiles
// @access  Public
router.get('/all', passport.authenticate('jwt', { session: false }), (req, res) => {
  const errors = {};

  Profile.find()
    .populate('user', ['username', 'avatar', 'banner'])
    .then(profiles => {
      if (!profiles) {
        errors.noprofile = 'There are no profiles';
        return res.status(404).json(errors);
      }
      res.json(profiles);
    })
    .catch(err => res.status(404).json({ profile: 'There are no profiles' }));
});


// @route   GET api/profile/:username
// @desc    Get profile by user ID
// @access  Public

router.get('/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
  const errors = {};
  Profile.findOne({ handler: req.params.username })
    .populate('posts', ['username', 'avatar'])
    .populate('following', ['username', 'avatar'])
    .populate('followers', ['username', 'avatar'])
    .populate('favorite', ['username', 'avatar'])
    .populate('user', ['username', 'avatar', 'banner'])
    .then(profile => {
      // console.log(profile);
      if (profile) return res.json(profile);
      return res.status(404).json({ profile: 'There is no profile for this user' });
    })
    .catch(err =>
      res.status(404).json({ profile: 'There is no profile for this user' })
    );
});


// @route   GET api/profile/user/:username
// @desc    Get profile by user ID
// @access  Public
router.get('/email/:email', passport.authenticate('jwt', { session: false }), (req, res) => {
  const errors = {};
  Profile.findOne({ email: req.params.email })
    .populate('user', ['username', 'avatar', 'banner'])
    .then(profile => {
      if (profile) return res.json(profile);
      return res.status(404).json({ profile: 'There is no profile for this user' });
    })
    .catch(err =>
      res.status(404).json({ profile: 'There is no profile for this user' })
    );
});


// @route   POST api/profile
// @desc    Create or edit user profile
// @access  Private
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { errors, isValid } = validateProfileInput(req.body);
  if (!isValid) return res.status(400).json(errors);

  const profileFields = {};
  profileFields.user = req.user.id;
  profileFields.handler = req.user.username;
  if (req.body.intro) profileFields.intro = req.body.intro;

  if (typeof req.body.following !== 'undefined')
    profileFields.following = req.body.following;

  if (typeof req.body.followers !== 'undefined')
    profileFields.followers = req.body.followers;

  if (typeof req.body.favorite !== 'undefined')
    profileFields.favorite = req.body.favorite;

  if (typeof req.body.posts !== 'undefined')
    profileFields.posts = req.body.posts;

  Profile.findOne({ user: req.user.id })

    .then(profile => {
      if (profile) {
        Profile.findOneAndUpdate({ user: req.user.id }, { $set: profileFields }, { new: true })
          .populate('user', ['username', 'avatar', 'banner'])
          .then(profile => res.json(profile));
      } else {  // Create
        Profile.findOne({ user: req.user.id })
          .then(profile => {
            if (profile) {
              errors.handle = 'That Profile already exists';
              res.status(400).json(errors);
            }
            // Save Profile
            new Profile(profileFields).save().then(profile => res.json({ ok: true }));
          });
      }
    });
});

// @route   GET api/profile/follow/:id
// @desc    Get profile by user ID
// @access  Public
router.put('/follow/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
  Profile.findOne({ user: req.user.id }).then(profile => { // add/remove following id
    const newFollowing = u.swapR(profile.following, req.params.id);

    Profile.findOneAndUpdate({ user: req.user.id }, { $set: { following: newFollowing } }, { new: true })
      .populate('user', ['username', 'avatar', 'banner'])
      .then(finalProfile => {

        Profile.findOne({ user: req.params.id }).then(profile2 => { // add/remove followers id
          const newFollowers = u.swapR(profile2.followers, req.user.id);

          Profile.findOneAndUpdate({ user: req.params.id }, { $set: { followers: newFollowers } }, { new: true })
            .then(rpp => {
              res.json(finalProfile)
            })
        })
      })
  })
});

// @route   DELETE api/profile
// @desc    Delete user and profile
// @access  Private
router.delete('/', passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Profile.findOneAndRemove({ user: req.user.id }).then(() => {
      User.findOneAndRemove({ _id: req.user.id }).then(() =>
        res.json({ success: true })
      );
    });
  }
);


module.exports = router;