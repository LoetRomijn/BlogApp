/*/////////////////////////////////////////////////

 Blog Application NYCDA homework 

 // To improve: add comments counter under posts + add date + time of posts/comments.


/////////////////////////////////////////////////*/

var express = require('express');
var bodyParser = require('body-parser');
var sequelize = require('sequelize');
var session = require('express-session');

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
});

var Comment = sequelize.define('comments', {
	body: Sequelize.TEXT,
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
// To improve: change for-loop-model into model with Post.findAll({ include: [User]})

app.get('/user/page', function(request, response) {
	var user = request.session.user;

	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your user page."));
	} else {
		Post.findAll().then(function(posts) {
			var data = posts.map(function(post) {
				return {
					title: post.dataValues.title,
					body: post.dataValues.body,
					userId: post.dataValues.userId,
					id: post.dataValues.id
				}
			})
			allPosts = data.reverse();
		}).then(User.findAll().then(function(users) {
			var data = users.map(function(user) {
				return {
					name: user.dataValues.name,
					id: user.dataValues.id
				}
			})
			allUsers = data;
		}).then(function() {
			for (post in allPosts) {
				for (user in allUsers) {
					if (allPosts[post].userId === allUsers[user].id) {
						allPosts[post].userId = allUsers[user].name
					}
				}
			}
		})).then(Post.findAll({
			where: {
				userId: user.id
			}
		}).then(function(posts) {
			var moredata = posts.map(function(post) {
				return {
					title: post.dataValues.title,
					body: post.dataValues.body,
					id: post.dataValues.id
				}
			})
			ownPosts = moredata.reverse();
		}).then(function() {
			response.render('userspage', {
				user: user,
				allPosts: allPosts,
				ownPosts: ownPosts
			});
		}));
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
	User.findOne({
		where: {
			name: request.body.name
		}
	}).then(function(user) {
		if (user === undefined) {
			response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
		} else if (user !== null && request.body.password === user.password) {
			request.session.user = user;
			response.redirect('/user/page');
		} else {
			response.redirect('/?message=' + encodeURIComponent("Name or Password incorrect, try again!"))
		}
	}, function(error) {
		response.redirect('/?message=' + encodeURIComponent("Name or Password incorrect, try again!"));
	});
});

// New User
// To improve: figure out how to immediately login while registering, so that user page loads without logging in first

app.post('/user/new', function(request, response) {
	var user = request.session.user;
	User.create({
		name: request.body.name,
		email: request.body.email,
		password: request.body.password
	}).then(function(user) {
		response.redirect('/user/page');
	}, function(error) {
		response.redirect('/?message=' + encodeURIComponent("Name or email already in use, try something else!"));
	});
});

// One Post + All Comments
// To improve: comments authors' are not showing names, but ID's at the moment..fix it! 

app.get('/posts/:id', function(request, response) {
	if (request.session.user != undefined) {
		var postId = request.params.id;
		Post.findById(postId)
			.then(function(post) {
				User.findAll().then(function(users) {
						var data = users.map(function(user) {
							return {
								name: user.dataValues.name,
								userId: user.dataValues.id
							}
						})
						allUsers = data;
					})
					.then(function() {
						for (user in allUsers) {
							if (allUsers[user].userId === post.id) {
								post.author = allUsers[user].name
							}
						}
					})
					.then(Comment.findAll({
							where: {
								postId: postId
							}
						})
						.then(function(comments) {
							var data = comments.map(function(comment) {
								return {
									body: comment.dataValues.body,
									userId: comment.dataValues.userId,
									id: post.dataValues.id
								}
							});
							allComments = data.reverse();
						}).then(function() {
							console.log("before the loop")
							for (comment in allComments) {
								for (user in allUsers) {
									if (allComments[comment].userId === allUsers[user].id) {
										allComments[comment].userId = allUsers[user].name
									}
								}
							}
						}).then(function() {
							console.log()
							response.render('post', {
								postId: postId,
								post: post,
								allComments: allComments,
								comment: comment,
								user: request.session.username,
								user: request.session.user
							});
						}));
			})
	} else {
		response.redirect('/');
	}
});

// New comment

app.post('/posts/:id', function(request, response) {
	var user = request.session.user.id;
	var postId = request.params.id;

	Comment.create({
		include: [postId],
		where: {
			postId: postId
		},

		postId: request.params.id,
		userId: request.session.user.id,
		body: request.body.body
	}).then(function(Comment) {
		return {
			Comment: Comment
		}
	});
	response.redirect('/posts/' + postId);
});

// New post

app.post('/newPost', function(request, response) {
	var user = request.session.user;

	Post.create({
		userId: user.id,
		title: request.body.title,
		body: request.body.body
	}).then(function() {
		response.redirect('/user/page');
	});
});

// sync database, then start server 

sequelize.sync().then(function() {
	var server = app.listen(3000, function() {
		console.log('BlogApp running on port 3000');
	});
});