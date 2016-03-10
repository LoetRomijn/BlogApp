/*/////////////////////////////////////////////////

 Blog Application NYCDA homework 

 // To improve: add comments counter under posts 
 
/////////////////////////////////////////////////*/

var express = require('express');
var bodyParser = require('body-parser');
var sequelize = require('sequelize');
var session = require('express-session');
var bcrypt = require('bcrypt');

var app = express();

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(session({
	secret: 'extremely secret stuff here',
	resave: true,
	saveUninitialized: false
}));

app.set('views', './src/views');
app.set('view engine', 'jade');

// Sequelize settings

var Sequelize = require('sequelize');
var sequelize = new Sequelize('blogapp', process.env.POSTGRES_USER, null, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});

// Sequelize models

var User = sequelize.define('users', {
	name: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: true
	},
	email: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: true
	},
	password: Sequelize.TEXT,
});

var Post = sequelize.define('posts', {
	title: Sequelize.TEXT,
	body: Sequelize.TEXT,
	timeStamp: Sequelize.DATE,
});

var Comment = sequelize.define('comments', {
	body: Sequelize.TEXT,
	timeStamp: Sequelize.DATE,
});

User.hasMany(Post);
Post.belongsTo(User);

Post.hasMany(Comment);
Comment.belongsTo(Post);

User.hasMany(Comment);
Comment.belongsTo(User);

//Routes 

// Homepage

app.get('/', function(request, response) {
	response.render('index', {
		message: request.query.message,
		user: request.session.user
	});
});

// Logout

app.get('/logout', function(request, response) {
	request.session.destroy(function(error) {
		if (error) {
			throw error;
		}
		response.render('logout');
	});
});

// User page

app.get('/user/page', function(request, response) {
	var user = request.session.user;

	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your user page."));
	} else {
		Post.findAll({
			include: [User]
		}).then(function(posts) {
			var data = posts.map(function(post) {
				return {
					title: post.dataValues.title,
					body: post.dataValues.body,
					id: post.dataValues.id,
					username: post.dataValues.user.name,
					timeStamp: post.dataValues.timeStamp
				}
			});
			allPosts = data.reverse();
		})
		Post.findAll({
			where: {
				userId: user.id
			}
		}).then(function(posts) {
			var moreData = posts.map(function(post) {
				return {
					title: post.dataValues.title,
					body: post.dataValues.body,
					id: post.dataValues.id,
					username: user.name,
					timeStamp: post.dataValues.timeStamp
				}
			});
			ownPosts = moreData.reverse();
			response.render('userspage', {
				user: user,
				allPosts: allPosts,
				ownPosts: ownPosts
			});
		})
	}
});

// User profile

app.get('/user', function(request, response) {
	var user = request.session.user;
	response.render('usersprofile', {
		user: user
	})
});


// Login   

app.post('/login', function(request, response) {
	var password = request.body.password;
	User.findOne({
		where: {
			name: request.body.name
		}
	}).then(function(user) {
			if (user === undefined) {
				response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
			}
			if (user === null) {
				response.redirect('/?message=' + encodeURIComponent("Please register below before logging in"));

			} else if (request.body.name.length === 0) {
				response.redirect('/?message=' + encodeURIComponent("Please enter a name"));
			} else if (password.length === 0) {
				response.redirect('/?message=' + encodeURIComponent("Please enter a password"));
			} else if (user !== null && password.length !== 0) {
				bcrypt.compare(password, user.password, function(err, passwordMatch) {
					if (err) {
						console.log("Error with bcrypt")
					}
					if (passwordMatch) {
						request.session.user = user;
						response.redirect('/user/page');
					} else {
						response.redirect('/?message=' + encodeURIComponent("Name or Password incorrect, try again!"))
					}
				})
			}
		},
		function(error) {
			response.redirect('/?message=' + encodeURIComponent("An error occurred, try logging in again or register below"));
		});
});

// New User

app.post('/user/new', function(request, response) {
	var user = request.session.user;

	bcrypt.hash(request.body.password, 8, function(err, passwordHash) {
		if (err !== undefined) {
			console.log(err);
		}
		if (request.body.name.length === 0 || request.body.email.length === 0 || request.body.password.length === 0) {
			response.redirect('/?message=' + encodeURIComponent("Please enter a name, emailaddress and a password"));
		} else {
			User.create({
				name: request.body.name,
				email: request.body.email,
				password: passwordHash
			}).then(function(user) {
				request.session.user = user;
			}).then(function(user) {
					response.redirect('/user/page');
				},
				function(error) {
					response.redirect('/?message=' + encodeURIComponent("Name or email already in use, try something else!"));
				});
		};
	});
});

// New post

app.post('/posts/new', function(request, response) {
	var user = request.session.user;

	Post.create({
		userId: user.id,
		title: request.body.title,
		body: request.body.body,
		timeStamp: new Date()
	}).then(function() {
		response.redirect('/user/page');
	});
});

// New comment

app.post('/posts/:id/comments', function(request, response) {
	var user = request.session.user.id;
	var postId = request.params.id;

	Comment.create({
		include: [postId],
		where: {
			postId: postId
		},

		postId: request.params.id,
		userId: request.session.user.id,
		body: request.body.body,
		timeStamp: new Date()
	}).then(function(Comment) {
		return {
			Comment: Comment
		}
	});
	response.redirect('/posts/' + postId);
});

// One Post + All Comments

app.get('/posts/:id', function(request, response) {
	if (request.session.user !== undefined) {
		var postId = request.params.id;
		Post.findAll({
			include: [User],
			where: {
				id: postId
			}
		}).then(function(posts) {
			var onePost = posts.map(function(post) {
				return {
					title: post.dataValues.title,
					body: post.dataValues.body,
					id: post.dataValues.id,
					username: post.dataValues.user.name,
					timeStamp: post.dataValues.timeStamp
				}
			});
			Comment.findAll({
				include: [User],
				where: {
					postId: postId
				}
			}).then(function(comments) {
				var allComments = comments.map(function(comment) {
					return {
						username: comment.dataValues.user.name,
						body: comment.dataValues.body,
						timeStamp: comment.dataValues.timeStamp
					}
				});
				response.render('post', {
					onePost: onePost[0],
					allComments: allComments
				});
			})
		})
	} else {
		response.redirect('/');
	}
});


// Sync database, then start server 

sequelize.sync().then(function() {
	var server = app.listen(3000, function() {
		console.log('BlogApp running on port 3000');
	});
});