// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { Pool } = require('pg');
const app = express();
const port = 3000;
const path = require('path');


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

// Basic route to render the home page
app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
// Add these routes inside server.js

// Render the signup form
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await pool.query('INSERT INTO userss (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.redirect('/signup');
    }
});

// Render the login form
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

// Handle login form submission
// Handle login form submission
// Handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM userss WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const { username: fetchedUsername } = result.rows[0];
            console.log(fetchedUsername);

            const match = await bcrypt.compare(password, result.rows[0].password);
            if (match) {
                req.session.userId = result.rows[0].id;
                console.log(req.session.userId);

                // Pass the fetchedUsername as a query parameter in the redirect
                res.redirect(`/dashboard?uname=${encodeURIComponent(fetchedUsername)}`);
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

// Add this middleware inside server.js

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Example protected route
// Example protected route
app.get('/dashboard', requireAuth, (req, res) => {
    const fetchedUsername = req.query.uname; // Assuming you passed uname as a query parameter
    // Render the dashboard view and pass fetchedUsername
    res.render('dashboard.ejs', { uname: fetchedUsername });
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
