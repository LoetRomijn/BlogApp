/////////////////////////////////////////////////
// Blog Application NYCDA homework 

var express = require('express');
var bodyParser = require('body-parser');
var jade = require('jade');
var pg = require('pg');
var sequelize = require('sequelize');

var app = express();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
	extended: true
}));

app.set('views', './src/views');
app.set('view engine', 'jade');


// var connectionString = "postgres://" + process.env.POSTGRES_USER + ":@localhost/blogapp";

/////////////////////////////////////////////////
// Sequelize (copied from Jons example, ask about dialect and timestamps!)

var Sequelize = require('sequelize');
var sequelize = new Sequelize('blogapp', process.env.POSTGRES_USER {
    host: 'localhost',
    dialect: 'postgres',
    define: {
        timestamps: false
    }
});

var user = sequelize.define('users', {
    name: Sequelize.TEXT,
    email: Sequelize.TEXT
    password: Sequelize.TEXT,
});

var post = sequelize.define('posts', {
    title: Sequelize.TEXT,
    body: Sequelize.TEXT,
    author: Sequelize.INTEGER
});

var comment = sequelize.define('comments', {
    author: Sequelize.TEXT,
    body: Sequelize.TEXT,
    postid: Sequelize.INTEGER
});


/////////////////////////////////////////////////
//Routes 
app.get('/', function(request, response) {
	response.render('index');
	// console.log(connectionString)
});

app.post('/login', function(request, response) {
	pg.connect(connectionString, function(err, client, done) {
		if (err) {
			done();
			throw err;
		}
		client.query()  // check login with db
		if (err) {
			throw err;
		}

		done();
		response.redirect('/allPosts');
	})
});

app.get('/logout', function(request, response) {
	pg.connect(connectionString, function(err, client, done) {
		if (err) {
			done();
			throw err;
		}
		//Sequalize drop user
		client.query()
	});
});

app.post('/register', function(request, response) {
	pg.connect(connectionString, function(err, client, done) {
		if (err) {
			done();
			throw err;
			console.log(connectionString);
		}
		client.query('insert into users (name, email) values ($1,$2)', [request.body.name, request.body.email])
				if (err) {
				throw err;
			}

			done();
			response.redirect('/allPosts');
		});
	});


app.post('/create', function(request, response) {

	pg.connect(connectionString, function(err, client, done) {
		if (err) {
			done();
			throw err;
		}
		client.query('insert into posts (title, body) values ($1, $2)', [request.body.title, request.body.body], function(err, result) {
			if (err) {
				throw err;
			}

			done();
			response.redirect('/allPosts');
		});
	});
});

app.get('/allPosts', function(request, response) {
	pg.connect(connectionString, function(err, client, done) {
		if (err) {
			done();
			throw err;
		}
		client.query('select * from posts', function(err, result) {
			posts = result.rows.reverse();
			response.render('posts', {
				posts: posts
			});
			done();
		});
	});
});


app.listen(3000);
console.log('BlogApp running on port 3000');