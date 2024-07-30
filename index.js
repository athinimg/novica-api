const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 8080;
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Signup endpoint
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into the database
    db.run(`INSERT INTO Users (username, email, password) VALUES (?, ?, ?)`,
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          console.error('Error creating user:', err.message);
          res.status(500).send('Internal Server Error');
        } else {
          res.status(201).json({ message: 'User created successfully' });
        }
      });
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

// Get users endpoint
app.get('/users', (req, res) => {
  db.all(`SELECT id, username, email FROM Users`, [], (err, rows) => {
    if (err) {
      console.error('Error retrieving users:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});