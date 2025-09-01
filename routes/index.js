var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn, async function (req, res) {
  const post = await postModel.find().populate("user");
  res.render("feed", { footer: true, posts });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  res.render("profile", { footer: true, user });
});

router.get("/search", isLoggedIn, function (req, res) {
  res.render("search", { footer: true });
});

router.get("/edit", isLoggedIn, function (req, res) {
  res.render("edit", { footer: true, user: req.user });
});

router.get("/upload", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { footer: true });
});

router.get("/username/:username", isLoggedIn, async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, "i");
  const users = await userModel.find({ username: regex });
  res.json(users);
});

router.post("/register", function (req, res, next) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });

  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  }),
  function (req, res) {
    res.render("login", { footer: true });
  }
);

router.post('/update', isLoggedIn, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).send('Unauthorized');

    // Find user by id from passport session
    const user = await userModel.findById(req.user._id);

    if (!user) return res.status(404).send('User not found');

   if (req.file) {
      user.picture = req.file.filename;
    }

    user.username = req.body.username || user.username;
    user.name = req.body.name || user.name;
    user.bio = req.body.bio || user.bio;

    await user.save();

    res.redirect('/profile');
  } catch (error) {
    next(error);
  }
});


router.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const post = await postModel.create({
      picture: req.file.filename,
      user: user._id,
      caption: req.body.caption,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/feed");
  }
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

module.exports = router;
