// server.js
const nodemailer = require('nodemailer');
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
// Create a transporter with your SMTP settings
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'thealgorithm2000@gmail.com', // Admin email
        pass: '0b111110100002000' // Admin email password
    }
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
        const currentTime = new Date(); // Get the current time
        const result = await pool.query('INSERT INTO userss (username, password, email, first_name, last_name, time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [username, hashedPassword, email, firstname, lastname, currentTime]);

        // Sending email notification
        const mailOptions = {
            from: 'thealgorithm2000@gmail.com', // Admin email
            to: email, // User's email
            subject: 'Welcome to the Dork Platform!',
            html: `<p>Hello ${firstname},</p><p>Thank you for registering with us! We're excited to have you on board.</p><p>Here's a greeting card to welcome you to the Dork Platform:</p><p><img src="https://example.com/greeting_card.jpg" alt="Greeting Card" style="max-width: 100%; height: auto;"></p><p>We hope you enjoy your time on our platform!</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

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
    let loggedInUser; // Declare loggedInUser outside the try-catch block
    let handle; // Declare handle variable
    let totalSolvedProblems = 0; // Initialize totalSolvedProblems

    try {
        loggedInUser = req.session.username;
        console.log(loggedInUser + " Logged in");

        // Fetch accepted submissions for the user
        handle = req.query.handle || '';
        const userSubmissionUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100000`;
        const userSubmissionsResponse = await axios.get(userSubmissionUrl);

        if (userSubmissionsResponse.data.status !== 'OK') {
            throw new Error('Failed to fetch user submissions');
        }

        // Filter only accepted submissions
        const acceptedSubmissions = userSubmissionsResponse.data.result.filter(submission => submission.verdict === 'OK');
        const uniqueAcceptedProblems = Array.from(new Set(acceptedSubmissions.map(submission => submission.problem.name)));
        
        // Count total solved problems
        totalSolvedProblems = uniqueAcceptedProblems.length;

        // Fetch problems based on tags and rating
        const tags = req.query.tags || '';
        const rating = req.query.rating || '';
        const apiUrl = `https://codeforces.com/api/problemset.problems?tags=${tags}&rating=${rating}`;
        const response = await axios.get(apiUrl);
        const problems = response.data.result.problems;

        res.render('dashboard', {
            uname: loggedInUser,
            problems,
            handle, // Pass handle to the template
            topic_name: tags,
            error: null,
            uniqueAcceptedProblems: uniqueAcceptedProblems,
            totalSolvedProblems: totalSolvedProblems // Pass totalSolvedProblems to the template
        });

    } catch (error) {
        console.error(error);

        if (error.response && error.response.status === 400) {
            res.render('dashboard', {
                uname: loggedInUser,
                problems: null,
                handle, // Pass handle to the template
                storedRating: null,
                error: 'Dork want some data'
            });
        } else {
            res.render('dashboard', {
                uname: loggedInUser,
                problems: null,
                handle, // Pass handle to the template
                storedRating: null,
                error: 'Error fetching problems'
            });
        }
    }
});




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
