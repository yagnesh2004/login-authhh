// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { Pool } = require('pg');
const axios = require('axios');

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
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    try {
        // Data Validation
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).send('Username and password are required');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Database Insertion
        const result = await pool.query('INSERT INTO userss (username, password) VALUES ($1, $2) RETURNING *', [username, hashedPassword]);

        // Redirect on Success
        res.redirect('/login');
    } catch (error) {
        console.error(error);

        if (error.code === '23502' && error.column === 'username') {
            return res.status(400).send('Username cannot be null');
        }

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
                req.session.userId = result.rows[0].id;
                res.redirect(`/dashboard?uname=${encodeURIComponent(username)}`);
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
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const topic = req.query.uname; // Assuming you passed uname as a query parameter
        const response = await axios.get(`https://codeforces.com/api/problemset.problems?tags=${topic}`);
        const problems = response.data.result.problems;
        res.render('dashboard.ejs', { uname: topic, problems, title: 'Dashboard' });
    } catch (error) {
        console.error('Failed to make request:', error.message);
        res.render('dashboard.ejs', {
            error: 'Failed to fetch data from the API.',
            title: 'Dashboard',
        });
    }
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
