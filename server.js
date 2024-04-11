const nodemailer = require('nodemailer');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { Pool } = require('pg');
const axios = require('axios');
const moment = require('moment-timezone');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = "http://localhost:4000";
app.use(express.static(path.join(__dirname, 'public')));

let posts = [
    {
      id: 1,
      title: "hbkghhjuk",
      content:
        "Sora builds on past research in DALL·E and GPT models. It uses the recaptioning technique from DALL·E 3, which involves generating highly descriptive captions for the visual training data. As a result, the model is able to follow the user’s text instructions in the generated video more faithfully.",
      author: "Alex Thompson",
      date: "2023-08-01T10:00:00Z",
    },
    {
      id: 2,
      title: "The Impact of Artificial Intelligence on Modern Businesses",
      content:
        "Artificial Intelligence (AI) is no longer a concept of the future. It's very much a part of our present, reshaping industries and enhancing the capabilities of existing systems. From automating routine tasks to offering intelligent insights, AI is proving to be a boon for businesses. With advancements in machine learning and deep learning, businesses can now address previously insurmountable problems and tap into new opportunities.",
      author: "Mia Williams",
      date: "2023-08-05T14:30:00Z",
    },
    {
      id: 3,
      title: "Sustainable Living: Tips for an Eco-Friendly Lifestyle",
      content:
        "Sustainability is more than just a buzzword; it's a way of life. As the effects of climate change become more pronounced, there's a growing realization about the need to live sustainably. From reducing waste and conserving energy to supporting eco-friendly products, there are numerous ways we can make our daily lives more environmentally friendly. This post will explore practical tips and habits that can make a significant difference.",
      author: "Samuel Green",
      date: "2023-08-10T09:15:00Z",
    },
  ];
  
  let lastId = 3;
  
// Configure session middleware
app.use(session({ secret: 'your_secret_key', resave: true, saveUninitialized: true }));

// Configure body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure static file serving middleware
app.use(express.static('public'));

// Set the view engine to use EJS
app.set('view engine', 'ejs');

// Create a PostgreSQL pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'login',
    password: 'Yagnesh@123',
    port: 5432,
});
// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'thealgorithm2000@gmail.com',
        pass: '0b111110100002000'
    }
});

// Middleware to check for authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Function to get the user's country
function getUserCountry() {
    // Logic to determine user's country based on their IP address or any other method
    return 'US'; // Example country code for demonstration
}

// Route to render the home page
app.get('/', (req, res) => {
    res.render('index.ejs');
});

// Route to render the signup form
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});
app.get('/data', (req, res) => {
    res.render('data.ejs');
});
// Route to handle signup form submission
app.post('/signup', async (req, res) => {
    try {
        const { username, password, email, firstname, lastname } = req.body;

        if (!username || !password || !email || !firstname || !lastname) {
            return res.render('signup.ejs', { error: 'All fields are required', username, email, firstname, lastname });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUsername = await pool.query('SELECT * FROM userss WHERE username = $1', [username]);
        if (existingUsername.rows.length > 0) {
            return res.render('signup.ejs', { error: 'Username already exists', username, email, firstname, lastname });
        }

        const existingEmail = await pool.query('SELECT * FROM userss WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.render('signup.ejs', { error: 'Email already exists', username, email, firstname, lastname });
        }

        const currentTime = new Date();
        const result = await pool.query('INSERT INTO userss (username, password, email, first_name, last_name, time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [username, hashedPassword, email, firstname, lastname, currentTime]);

        const mailOptions = {
            from: 'thealgorithm2000@gmail.com',
            to: email,
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

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to render the login form
app.get('/login', (req, res) => {
    res.render('login.ejs');
});
// Route to render the guide page
app.get('/guide', (req, res) => {
    try {
        // Generate the uname variable
        const uname = req.session.username;

        // Logic to render the guide page
        res.render('guide.ejs', { uname: uname });
    } catch (error) {
        console.error('Error rendering guide page:', error);
        res.status(500).render('error.ejs', { error: 'An error occurred while rendering the guide page' });
    }
});


// Route to handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM userss WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const match = await bcrypt.compare(password, result.rows[0].password);
            if (match) {
                req.session.userId = result.rows[0].id;
                req.session.username = result.rows[0].username;

                const loginTime = moment().utc().format("X");
                const country = getUserCountry();

                const insertQuery = `INSERT INTO login_data (user_name, login_time, country) VALUES ($1, $2, $3);`;
                await pool.query(insertQuery, [username, loginTime, country]);

                console.log(username + " Logged in");

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
app.get('/analyzer', (req, res) => {
    const loggedInUser = req.session.username;
    res.render('analyzer', { uname: loggedInUser });
});

// Route to handle POST request for the "/analyzer" endpoint
// Route to handle POST request for the "/analyzer" endpoint
app.post('/analyzer', async (req, res) => {
    try {
        const loggedInUser = req.session.username;
        const codeforcesHandle = req.body.codeforcesHandle;
        console.log(codeforcesHandle);
        console.log(loggedInUser);

        const apiUrl = `https://codeforces.com/api/user.info?handles=${codeforcesHandle}&checkHistoricHandles=false`;
        const apiGraph = `https://codeforces.com/api/user.rating?handle=${codeforcesHandle}`;
        const responseGraph = await axios.get(apiGraph);

        const response = await axios.get(apiUrl);
        const user = response.data.result[0];
        console.log(user);

        // Extracting new ratings from the user's rating history
        const newRatings = responseGraph.data.result.map(entry => entry.newRating);

        // Extracting rating updates
        const ratingUpdates = responseGraph.data.result.map(entry => {
            return {
                updateTime: new Date(entry.ratingUpdateTimeSeconds * 1000).toLocaleString(), // Human-readable time
                originalTimeFrame: entry.ratingUpdateTimeSeconds // Original Unix epoch time
            };
        });
        // Function to extract original time frames from ratingUpdates array
function getOriginalTimeFramesList(ratingUpdates) {
    return ratingUpdates.map(update => update.originalTimeFrame);
}
function getupdatedDta(ratingUpdates) {
    return ratingUpdates.map(update => update.updateTime);
}
// Usage example:
const updatedTime=getupdatedDta(ratingUpdates);
const originalTimeFramesList = getOriginalTimeFramesList(ratingUpdates);
console.log(originalTimeFramesList);

        console.log("amsbdfjsbdfkjsadbfhj")

        // List of rating marks
        const ratingMarks = [0,1200, 1400, 1600, 1900, 2100, 2300, 2400, 2600, 3000];

        res.render('analyzer', { uname: loggedInUser, user, newRatings, ratingMarks,updatedTime:updatedTime,originalTimeFramesList: originalTimeFramesList,ratingUpdates, error: null });

    } catch (error) {
        console.log("Error fetching user details:", error);
        const loggedInUser = req.session.username;
        res.render('analyzer', { uname: loggedInUser, user: null, newRatings: null, ratingMarks: null,originalTimeFrame: null, ratingUpdates: null, error: 'Error fetching user details' });
    }
});



// Route to render the blog page
app.get('/blog', async (req, res) => {
    let loggedInUser; // Declare loggedInUser outside the try-catch block

    try {
        loggedInUser = req.session.username;

        const response = await axios.get(`${API_URL}/posts`);
        res.render("blog", { posts: response.data,uname: loggedInUser,
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching posts" });
    }
});

// Route to render the explore page
const fello = [
    {
        id: 1,
        title: "LFX Mentorship Program",
        image: "/images/lfx.jpg",
        application: "https://mentorship.lfx.linuxfoundation.org/#projects_all",
        read: "https://lfx.linuxfoundation.org/tools/mentorship/",
        name:"Tech",

    },
    {
        id: 2,
        title: "MLH Fellowship",
        image: "/images/mlh.jpg",
        application: "https://www.tfaforms.com/4956119",
        read: "https://lfx.linuxfoundation.org/tools/mentorship/",
        name:"Tech",

    },
    {
        id: 3,
        title: "CNCF Mentoring",
        image: "/images/cncf.jpg",
        application: "https://github.com/cncf/mentoring",
        read: "https://www.cncf.io/",
        name:"Tech",

    },
    {
        id: 4,
        title: "LFN Mentorship Program",
        image: "/images/lfn.png",
        application: "https://wiki.lfnetworking.org/display/LN/LFN+Mentorship+Program#LFNMentorshipProgram-MenteeStipends",
        read: "https://lfnetworking.org/",
        name:"Tech",

    },
    {
        id: 5,
        title: "Y Combinator summer 2024",
        image: "/images/yc.png",
        application: "https://www.ycombinator.com/apply",
        read: "https://www.ycombinator.com/",
        name:"Entrepreneurship",

    },
    {
        id: 6,
        title: "Thiel Fellowship",
        image: "/images/theil.jpg",
        application: "https://thielfellowship.org/apply",
        read: "https://thielfellowship.org/",
        name:"Entrepreneurship",

    },
    {
        id: 7,
        title: "Naropa Fellowship ",
        image: "/images/NAROPA.png",
        application: "https://www.naropafellowship.org/about-the-fellowship.html",
        read: "https://www.naropafellowship.org/apply.html",
        name:"Entrepreneurship",

    },
    {
        id: 8,
        title: "Google Summer of Code",
        image: "/images/gsoc.png",
        application: "https://opensource.googleblog.com/2023/11/google-summer-of-code-2024-celebrating-20th-year.html",
        read: "https://summerofcode.withgoogle.com/",
        name:"Open source",
    },
    {
        id: 9,
        title: "Github campus expert",
        image: "/images/github.jpg",
        application: "https://education.github.com/campus_experts",
        read: "https://education.github.com/experts",
        name:"Tech",

    },
];
const Resources = [

    {
        id: 1,
        title: "Roadmaps Repo",
        image: "/images/githubl.png",
        Link: "https://github.com/WeMakeDevs/roadmaps",
        name:"Tech",
        

    },
    {
        id: 1,
        title: "freecodecamp",
        image: "/images/free.png",
        Link: "https://www.freecodecamp.org/",
        name:"Tech",

    },
    {
        id: 1,
        title: "Harvard cs50",
        image: "/images/cs50.png",
        Link: "https://www.youtube.com/playlist?list=PLhQjrBD2T380F_inVRXMIHCqLaNUd7bN4",
        name:"#Learn",

    },
];
const hack = [

    {
        id: 1,
        title: "ETHIndia Grants (2nd edition)",
        image: "/images/ethindia.jpg",
        Link: "https://ethindiagrants2023.devfolio.co/",
        name:"#Tech, #Blockchain",
        mode:"Online, Devfolio",
        

    },
 
];

app.set('view engine', 'ejs');

app.get('/explore', (req, res) => {
    res.render('opportunities', { uname: req.session.username, fello: fello,Resources:Resources ,hack:hack});
});

// Route to handle logout
app.get('/logout', (req, res) => {
    console.log(req.session.username + " Logged out");
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

// Route to render the dashboard
app.get('/dashboard', async (req, res) => {
    let user;
    let loggedInUser; // Declare loggedInUser outside the try-catch block
    let handle; // Declare handle variable
    let totalSolvedProblems = 0; // Initialize totalSolvedProblems
    const wrongAnswerProblemsSet = new Set();
    const timeLimitExceededProblemsSet = new Set(); // Initialize array for time limit exceeded problems

    try {
        loggedInUser = req.session.username;

        // Fetch accepted submissions for the user
        handle = req.query.handle || '';
        const userSubmissionUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100000`;
        const userSubmissionsResponse = await axios.get(userSubmissionUrl);

        if (userSubmissionsResponse.data.status !== 'OK') {
            throw new Error('Failed to fetch user submissions');
        }

        // Filter only accepted submissions
      // Filter only accepted submissions
const acceptedSubmissions = userSubmissionsResponse.data.result.filter(submission => submission.verdict === 'OK');
const uniqueAcceptedProblems = [...new Set(acceptedSubmissions.map(submission => submission.problem.name))];


        // Separate wrong answer and time limit exceeded problems
        const latestSubmissionsMap = new Map(); // Map to store the latest submission for each problem
        userSubmissionsResponse.data.result.forEach(submission => {
            // Check if the problem is already in the map
            if (latestSubmissionsMap.has(submission.problem.name)) {
                // If it is, compare the submission time to determine if it's the latest one
                const currentSubmissionTime = submission.creationTimeSeconds;
                const previousSubmissionTime = latestSubmissionsMap.get(submission.problem.name).creationTimeSeconds;
                if (currentSubmissionTime > previousSubmissionTime) {
                    // Replace the previous submission with the current one
                    latestSubmissionsMap.set(submission.problem.name, submission);
                }
            } else {
                // If the problem is not in the map, add it
                latestSubmissionsMap.set(submission.problem.name, submission);
            }
        });

        // Iterate through the latest submissions map to separate wrong answer and time limit exceeded problems
        const wrongAnswerProblems = [];
        const timeLimitExceededProblems = [];
        latestSubmissionsMap.forEach(submission => {
            if (submission.verdict === 'WRONG_ANSWER') {
                wrongAnswerProblems.push(submission.problem.name);
            } else if (submission.verdict === 'TIME_LIMIT_EXCEEDED') {
                timeLimitExceededProblems.push(submission.problem.name);
            }
        });

        // Log the arrays for verification
        console.log(wrongAnswerProblems);
        console.log(timeLimitExceededProblems);
        console.log(uniqueAcceptedProblems);

        // Count total solved problems
        totalSolvedProblems = uniqueAcceptedProblems.length;

        // Fetch problems based on tags and rating
        const tags = req.query.tags || '';
        const rating = req.query.rating || '';
        const apiUrl = `https://codeforces.com/api/problemset.problems?tags=${tags}&rating=${rating}`;
        const response = await axios.get(apiUrl);
        const problems = response.data.result.problems;
        const apiUrll = `https://codeforces.com/api/user.info?handles=${handle}&checkHistoricHandles=false`;
        const responsee= await axios.get(apiUrll);
        const user = responsee.data.result[0];

        res.render('dashboard', {
            uname: loggedInUser,
            problems,
            user,
            handle, // Pass handle to the template
            topic_name: tags,
            error: null,
            uniqueAcceptedProblems: uniqueAcceptedProblems,
            wrongAnswerProblems: wrongAnswerProblems,
            timeLimitExceededProblems: timeLimitExceededProblems,
            totalSolvedProblems: totalSolvedProblems // Pass totalSolvedProblems to the template
        });

    } catch (error) {
        console.error(error);

        if (error.response && error.response.status === 400) {
            res.render('dashboard', {
                uname: loggedInUser,
                user,
                problems: null,
                handle, // Pass handle to the template
                storedRating: null,
                error: 'Dork want some data'
            });
        } else {
            res.render('dashboard', {
                uname: loggedInUser,
                user,
                problems: null,
                handle, // Pass handle to the template
                storedRating: null,
                error: 'Error fetching problems, API 403 Forbidden Error'
            });

        }
    }
});
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
// Route to render the profile page
app.get('/profile', async (req, res) => {
    let loggedInUser;
    try {
        loggedInUser = req.session.username;

        const query = 'SELECT username, first_name, last_name, user_image, email FROM userss WHERE username = $1';
        const { rows } = await pool.query(query, [loggedInUser]);

        if (rows.length > 0) {
            console.log('Fetched user information:', rows[0]);
            res.render('profile', { user: rows[0], uname: loggedInUser });
        } else {
            console.error('User not found');
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching user information:', error);
        res.status(500).send('Error fetching user information');
    }
});
app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Post", submit: "Create Post" });
  });
  
  // GET all posts
  app.get("/posts", (req, res) => {
    console.log(posts);
    res.json(posts);
  });
  
  // GET a specific post by id
  app.get("/posts/:id", (req, res) => {
    const post = posts.find((p) => p.id === parseInt(req.params.id));
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  });
  app.post("/api/posts", async (req, res) => {
    try {
      const response = await axios.post(`${API_URL}/posts`, req.body);
      console.log(response.data);
      res.redirect("/blog");
    } catch (error) {
      res.status(500).json({ message: "Error creating post" });
    }
  });
  // Route to render the edit post page
app.get("/edit/:id(\\d+)", async (req, res) => {
    try {
        const postId = parseInt(req.params.id); // Parse the ID as an integer
        if (isNaN(postId)) {
            // If the ID is not a number, return a 404 error
            return res.status(404).json({ message: "Invalid post ID" });
        }
        
        // Fetch the post data from the API or database using the postId
        const response = await axios.get(`${API_URL}/posts/${postId}`);
        console.log(response.data);
        
        // Render the modify.ejs template with the post data
        res.render("modify.ejs", {
            heading: "Edit Post",
            submit: "Update Post",
            post: response.data,
        });
    } catch (error) {
        // If an error occurs during the process, return a 500 error
        console.error(error);
        res.status(500).json({ message: "Error fetching post" });
    }
});

  
  // Partially update a post
  app.post("/api/posts/:id", async (req, res) => {
    console.log("called");
    try {
      const response = await axios.patch(
        `${API_URL}/posts/${req.params.id}`,
        req.body
      );
      console.log(response.data);
      res.redirect("/blog");Z
    } catch (error) {
      res.status(500).json({ message: "Error updating post" });
    }
  });
  
  // Delete a post
  app.get("/api/posts/delete/:id", async (req, res) => {
    try {
      await axios.delete(`${API_URL}/posts/${req.params.id}`);
      res.redirect("/blog");
    } catch (error) {
      res.status(500).json({ message: "Error deleting post" });
    }
  });
  // POST a new post
  app.post("/posts", (req, res) => {
    const newId = lastId += 1;
    const post = {
      id: newId,
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      date: new Date(),
    };
    lastId = newId;
    posts.push(post);
    res.status(201).json(post);
  });
  
  // PATCH a post when you just want to update one parameter
  app.patch("/posts/:id", (req, res) => {
    const post = posts.find((p) => p.id === parseInt(req.params.id));
    if (!post) return res.status(404).json({ message: "Post not found" });
  
    if (req.body.title) post.title = req.body.title;
    if (req.body.content) post.content = req.body.content;
    if (req.body.author) post.author = req.body.author;
  
    res.json(post);
  });
  
  // DELETE a specific post by providing the post id
  app.delete("/posts/:id", (req, res) => {
    const index = posts.findIndex((p) => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: "Post not found" });
  
    posts.splice(index, 1);
    res.json({ message: "Post deleted" });
  });

  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});