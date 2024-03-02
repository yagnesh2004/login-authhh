// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { Pool } = require('pg');
const axios = require('axios')
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your_secret_key', resave: true, saveUninitialized: true }));

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'login',
    password: 'Yagnesh@123',
    port: 5432,
});

app.set('view engine', 'ejs');

// Middleware to check for authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Render the home page
app.get('/', (req, res) => {
    res.render('index.ejs');
});

// Render the signup form
// GET route for displaying the signup form
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

// POST route for handling signup form submission
// POST route for handling signup form submission
app.post('/signup', async (req, res) => {
    try {
        // Data Validation
        const { username, password, email, firstname, lastname } = req.body;

        if (!username || !password || !email || !firstname || !lastname) {
            return res.render('signup.ejs', { error: 'All fields are required', username, email, firstname, lastname });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if username is unique
        const existingUsername = await pool.query('SELECT * FROM userss WHERE username = $1', [username]);
        if (existingUsername.rows.length > 0) {
            return res.render('signup.ejs', { error: 'Username already exists', username, email, firstname, lastname });
        }

        // Check if email is unique
        const existingEmail = await pool.query('SELECT * FROM userss WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.render('signup.ejs', { error: 'Email already exists', username, email, firstname, lastname });
        }

        // Database Insertion
        const result = await pool.query('INSERT INTO userss (username, password, email, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING *', [username, hashedPassword, email, firstname, lastname]);

        // Redirect on Success
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Render the login form
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM userss WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const match = await bcrypt.compare(password, result.rows[0].password);
            if (match) {
                // Store the username in the session
                req.session.userId = result.rows[0].id;
                req.session.username = result.rows[0].username;

                res.redirect('/dashboard');
            } else {
                res.render('login.ejs', { error: 'Invalid username or password' });
            }
        } else {
            res.render('login.ejs', { error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error(error);
        res.render('login.ejs', { error: 'An error occurred' });
    }
});


// Protected route
// Assuming you have something like this in your server code
app.get('/analyzer', (req, res) => {
    res.render('analyzer');
});

// POST request for the "/analyzer" endpoint
// POST request for the "/analyzer" endpoint
app.post('/analyzer', async (req, res) => {
    try {
        const loggedInUser = req.session.username;
        const codeforcesHandle = req.body.codeforcesHandle;
        console.log(codeforcesHandle);
        console.log(loggedInUser);

        const apiUrl = `https://codeforces.com/api/user.info?handles=${codeforcesHandle}&checkHistoricHandles=false`;
        const response = await axios.get(apiUrl);
        const user = response.data.result[0];
        console.log(user);

        res.render('analyzer', { uname: loggedInUser, user, error: null });
    } catch (error) {
        console.log("Error fetching user details:", error);
        const loggedInUser = req.session.username;
        res.render('analyzer', { uname: loggedInUser, user: null, error: 'Error fetching user details' });
    }
});



app.get('/home', (req, res) => {
  
    res.redirect('/');
    
});

// Handle logout
app.get('/logout', (req, res) => {
    const loggedInUser = req.session.username;
    console.log(loggedInUser+ " Logged out");
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});
// Assuming you have something like this in your server code
app.get('/dashboard', async (req, res) => {
    try {
        
        const loggedInUser = req.session.username;
        console.log("New user logged");
        console.log(loggedInUser + " Logged in");
        const tags = req.query.tags || '';
        const apiUrl = `https://codeforces.com/api/problemset.problems?tags=${tags}`;
        const response = await axios.get(apiUrl);
        const problems = response.data.result.problems.slice(0, 30);


        // Pass both problems and error to the template
        res.render('dashboard', { uname: loggedInUser, problems, error: null });
    } catch (error) {
        console.error(error);
        // If there's an error, pass the error variable to the template
        res.render('dashboard', { uname: loggedInUser, problems: null, error: 'Error fetching problems' });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
// GET request for the "/analyzer" endpoint
