/////////////////////////////////////////////////
// Blog Application NYCDA homework 

var express = require('express');
var bodyParser = require('body-parser');
// var jade = require('jade'); // unnecessary because of express
// var pg = require('pg'); // unnecessary because of sequelize
// same goes for promise
var sequelize = require('sequelize');
var session = require('express-session');

var app = express();

app.use(express.static(__dirname + '/public'));
// app.use(express.static(__dirname + '../public'));
// app.use(express.static(__dirname + '../views'));

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

/////////////////////////////////////////////////
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
	email: Sequelize.TEXT,
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

/////////////////////////////////////////////////
//Routes 
app.get('/', function(request, response) {
	response.render('index', {
		message: request.query.message,
		user: request.session.user
	});
});

app.get('/logout', function(request, response) {
	request.session.destroy(function(error) {
		if (error) {
			throw error;
		}
		response.render('logout');
	});
});

app.get('/user/page', function(request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your user page."));
	} else {
		response.render('userspage', {
			user: user
		});
	};
});

var id = '';

app.get('/user/:id', function(request, response) {
	var user = request.session.user;
	id = request.params.id;
	response.render('usersprofile', {
		user: user
	})
});

app.post('/login', function(request, response) {

	User.findOne({
		where: {
			name: request.body.name
		}
	}).then(function(user) {
		if (user === undefined) {
			response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
		} else if (user !== null && request.body.password === user.password) {
			console.log('Succesfully logged in as: ' + user.name);
			request.session.user = user;
			response.render('userspage', {
				user: user
			})
		} else {
			response.redirect('/?message=' + encodeURIComponent("Name or Password incorrect, try again!"))
		}
	}, function(error) {
		response.redirect('/?message=' + encodeURIComponent("Name or Password incorrect, try again!"));
	});
});

app.post('/user', function(request, response) {
	var user = request.session.user;

	User.create({
		name: request.body.name,
		email: request.body.email,
		password: request.body.password
	}).then(function(result) {
		response.redirect('/user/:id')
	}, function(error) {
		console.log("Name already exists: " + request.body.name);
		response.redirect('/?message=' + encodeURIComponent("Name already exists, try something else!"));
	});
});

app.post('/posts/new', function(request, response) {
	var user = request.session.user;

	Post.create({
		userId: user.id,
		title: request.body.title,
		body: request.body.body
	}).then(function(newpost) {
		response.redirect('/posts/' + newpost.dataValues.id);
	});
});


app.post('/comments/new', function(request, response) {
	var user = request.session.user;


})

app.post('/posts/:id', function(request, response) {
	var user = request.session.user;
	id = request.params.id;

	Post.findAll().then(function(posts) {
		var data = posts.map(function(post) {
			return {
				title: post.dataValues.title,
				author: post.dataValues.userId,
				postID: post.dataValues.id
			}
		})
		allPosts = data.reverse();
	}).then(function() {
		response.render('post', {
			user: user
		});
	});
});



/////////////////////////////////////////////////
// sync database, then start server 

sequelize.sync().then(function() {
	var server = app.listen(3000, function() {
		console.log('BlogApp running on port 3000');
	});
});