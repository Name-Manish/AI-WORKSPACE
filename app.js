// app.js example
const express = require('express');
const path = require('path');
const app = express();
const UserRouter = require("./Routes/UserRoutes");
const HomeRouter = require("./Routes/Home");

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/",HomeRouter)
app.use("/Users",UserRouter);

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000/home');
});   