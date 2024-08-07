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

// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM Users WHERE email = ?`, [email], async (err, user) => {
      if (err) {
          return res.status(500).send('Internal Server Error');
      }

      if (!user) {
          return res.status(400).send('User not found');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
          return res.status(400).send('Invalid password');
      }

      // Authentication successful
      res.status(200).json({ username: user.username }); // Send username in response
  });
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

// Endpoint to get user by email
app.get('/user/:email', (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).send('Email parameter is required');
  }

  const query = 'SELECT * FROM Users WHERE email = ?';
  db.get(query, [email], (err, row) => {
    if (err) {
      console.error('Error retrieving user:', err.message);
      return res.status(500).send('Internal Server Error');
    }

    if (!row) {
      return res.status(404).send('User not found');
    }

    res.status(200).json(row);
  });
});


//endpoint for creating a new novel
app.post('/novels', (req, res) => {
  const { userID, title, genre, summary } = req.body;

  if (!userID || !title) {
    return res.status(400).send('UserID and Title are required');
  }

  db.run(`INSERT INTO Novels (UserID, Title, Genre, Summary) VALUES (?, ?, ?, ?)`,
    [userID, title, genre, summary],
    function (err) {
      if (err) {
        console.error('Error creating novel:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(201).json({ novelID: this.lastID });
      }
    });
});

//endpoint for getting novels created by a specific user
app.get('/novels/:userID', (req, res) => {
  const { userID } = req.params;

  db.all(`SELECT * FROM Novels WHERE UserID = ?`, [userID], (err, rows) => {
    if (err) {
      console.error('Error retrieving novels:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

// Endpoint for getting a specific novel by title and userID
app.get('/novel/:UserID/:Title', (req, res) => {
  const { Title, UserID } = req.params;

  if (!Title || !UserID) {
    return res.status(400).send('Title and UserID parameters are required');
  }

  const query = 'SELECT * FROM Novels WHERE Title = ? AND UserID = ?';
  db.get(query, [Title, UserID], (err, row) => {
    if (err) {
      console.error('Error retrieving novel:', err.message);
      return res.status(500).send('Internal Server Error');
    }

    if (!row) {
      return res.status(404).send('Novel not found');
    }

    res.status(200).json(row);
  });
});

//endpoint for updating details of a novel
app.put('/novels/:novelID', (req, res) => {
  const novelID = req.params.novelID;
  const { userID, title, genre, summary } = req.body;

  db.get('SELECT * FROM Novels WHERE NovelID = ?', [novelID], (err, row) => {
    if (err) {
      console.error('Error retrieving novel:', err.message);
      return res.status(500).send('Internal Server Error');
    }

    if (!row) {
      return res.status(404).send('Novel not found');
    }

    const updatedUserID = userID || row.UserID;
    const updatedTitle = title || row.Title;
    const updatedGenre = genre || row.Genre;
    const updatedSummary = summary || row.Summary;

    db.run(
      `UPDATE Novels SET UserID = ?, Title = ?, Genre = ?, Summary = ? WHERE NovelID = ?`,
      [updatedUserID, updatedTitle, updatedGenre, updatedSummary, novelID],
      function (err) {
        if (err) {
          console.error('Error updating novel:', err.message);
          return res.status(500).send('Internal Server Error');
        }

        res.status(200).send('Novel updated successfully');
      }
    );
  });
});

//endpoint to delete a novel
app.delete('/novels/:novelID', (req, res) => {
  const { novelID } = req.params;

  db.run(`DELETE FROM Novels WHERE NovelID = ?`, [novelID], function (err) {
    if (err) {
      console.error('Error deleting novel:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Novel deleted successfully');
    }
  });
});

//endpoint to add chapters to a novel
app.post('/chapters', (req, res) => {
  const { novelID, title, content } = req.body;

  if (!novelID || !title) {
    return res.status(400).send('NovelID and Title are required');
  }

  db.run(`INSERT INTO Chapters (NovelID, Title, Content) VALUES (?, ?, ?)`,
    [novelID, title, content],
    function (err) {
      if (err) {
        console.error('Error creating chapter:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(201).json({ chapterID: this.lastID });
      }
    });
});

//endpoint to get chapters of a novel
app.get('/chapters/:novelID', (req, res) => {
  const { novelID } = req.params;

  db.all(`SELECT * FROM Chapters WHERE NovelID = ?`, [novelID], (err, rows) => {
    if (err) {
      console.error('Error retrieving chapters:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

//endpoint to get a single chapter from a novel
app.get('/chapters/chapter/:chapterID', (req, res) => {
  const { chapterID } = req.params;

  db.get(`SELECT * FROM Chapters WHERE ChapterID = ?`, [chapterID], (err, row) => {
    if (err) {
      console.error('Error retrieving chapter:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(row);
    }
  });
});

//endpoint update a chapter of a novel
app.put('/chapters/:chapterID', (req, res) => {
  const { chapterID } = req.params;
  const { title, content } = req.body;

  db.run(`UPDATE Chapters SET Title = ?, Content = ? WHERE ChapterID = ?`,
    [title, content, chapterID],
    function (err) {
      if (err) {
        console.error('Error updating chapter:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(200).send('Chapter updated successfully');
      }
    });
});

//endpoint for deleting a chapter
app.delete('/chapters/:chapterID', (req, res) => {
  const { chapterID } = req.params;

  db.run(`DELETE FROM Chapters WHERE ChapterID = ?`, [chapterID], function (err) {
    if (err) {
      console.error('Error deleting chapter:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Chapter deleted successfully');
    }
  });
});

//endpoint for creating a new character for a novel
app.post('/characters', (req, res) => {
  const { novelID, name, description, role } = req.body;

  if (!novelID || !name) {
    return res.status(400).send('NovelID and Name are required');
  }

  db.run(`INSERT INTO Characters (NovelID, Name, Description, Role) VALUES (?, ?, ?, ?)`,
    [novelID, name, description, role],
    function (err) {
      if (err) {
        console.error('Error creating character:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(201).json({ characterID: this.lastID });
      }
    });
});

//endpoint for seeing characters of a novel
app.get('/characters/:novelID', (req, res) => {
  const { novelID } = req.params;

  db.all(`SELECT * FROM Characters WHERE NovelID = ?`, [novelID], (err, rows) => {
    if (err) {
      console.error('Error retrieving characters:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

//endpoint for getting a single character of a novel
app.get('/characters/character/:characterID', (req, res) => {
  const { characterID } = req.params;

  db.get(`SELECT * FROM Characters WHERE CharacterID = ?`, [characterID], (err, row) => {
    if (err) {
      console.error('Error retrieving character:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(row);
    }
  });
});

//endpoint for updating details of a character
app.put('/characters/:characterID', (req, res) => {
  const { characterID } = req.params;
  const { name, description, role } = req.body;

  db.run(`UPDATE Characters SET Name = ?, Description = ?, Role = ? WHERE CharacterID = ?`,
    [name, description, role, characterID],
    function (err) {
      if (err) {
        console.error('Error updating character:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(200).send('Character updated successfully');
      }
    });
});

//endpoint for deleting a character
app.delete('/characters/:characterID', (req, res) => {
  const { characterID } = req.params;

  db.run(`DELETE FROM Characters WHERE CharacterID = ?`, [characterID], function (err) {
    if (err) {
      console.error('Error deleting character:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Character deleted successfully');
    }
  });
});


//endpoint for creating notes for a novel
app.post('/notes', (req, res) => {
  const { novelID, title, content } = req.body;

  if (!novelID) {
    return res.status(400).send('NovelID is required');
  }

  db.run(`INSERT INTO Notes (NovelID, Title, Content) VALUES (?, ?, ?)`,
    [novelID, title, content],
    function (err) {
      if (err) {
        console.error('Error creating note:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(201).json({ noteID: this.lastID });
      }
    });
});

//endpoint for getting notes of a novel
app.get('/notes/:novelID', (req, res) => {
  const { novelID } = req.params;

  db.all(`SELECT * FROM Notes WHERE NovelID = ?`, [novelID], (err, rows) => {
    if (err) {
      console.error('Error retrieving notes:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

//endpoint for getting one note of a novel
app.get('/notes/note/:noteID', (req, res) => {
  const { noteID } = req.params;

  db.get(`SELECT * FROM Notes WHERE NoteID = ?`, [noteID], (err, row) => {
    if (err) {
      console.error('Error retrieving note:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(row);
    }
  });
});


//endpoint to update a note
app.put('/notes/:noteID', (req, res) => {
  const { noteID } = req.params;
  const { title, content } = req.body;

  db.run(`UPDATE Notes SET Title = ?, Content = ? WHERE NoteID = ?`,
    [title, content, noteID],
    function (err) {
      if (err) {
        console.error('Error updating note:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(200).send('Note updated successfully');
      }
    });
});

//endpoint to delete a note
app.delete('/notes/:noteID', (req, res) => {
  const { noteID } = req.params;

  db.run(`DELETE FROM Notes WHERE NoteID = ?`, [noteID], function (err) {
    if (err) {
      console.error('Error deleting note:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Note deleted successfully');
    }
  });
});

//endpoint to create a new setting
app.post('/settings', (req, res) => {
  const { novelID, name, description, details } = req.body;

  if (!novelID || !name) {
    return res.status(400).send('NovelID and Name are required');
  }

  db.run(`INSERT INTO Settings (NovelID, Name, Description, Details) VALUES (?, ?, ?, ?)`,
    [novelID, name, description, details],
    function (err) {
      if (err) {
        console.error('Error creating setting:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(201).json({ settingID: this.lastID });
      }
    });
});

//endpoint to get all settings of a novel
app.get('/settings/:novelID', (req, res) => {
  const { novelID } = req.params;

  db.all(`SELECT * FROM Settings WHERE NovelID = ?`, [novelID], (err, rows) => {
    if (err) {
      console.error('Error retrieving settings:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

//endpoint to get a single setting by id
app.get('/settings/setting/:settingID', (req, res) => {
  const { settingID } = req.params;

  db.get(`SELECT * FROM Settings WHERE SettingID = ?`, [settingID], (err, row) => {
    if (err) {
      console.error('Error retrieving setting:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(row);
    }
  });
});

//endpoint to update a setting
app.put('/settings/:settingID', (req, res) => {
  const { settingID } = req.params;
  const { name, description, details } = req.body;

  db.run(`UPDATE Settings SET Name = ?, Description = ?, Details = ? WHERE SettingID = ?`,
    [name, description, details, settingID],
    function (err) {
      if (err) {
        console.error('Error updating setting:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(200).send('Setting updated successfully');
      }
    });
});

//endpoint to delete a setting
app.delete('/settings/:settingID', (req, res) => {
  const { settingID } = req.params;

  db.run(`DELETE FROM Settings WHERE SettingID = ?`, [settingID], function (err) {
    if (err) {
      console.error('Error deleting setting:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Setting deleted successfully');
    }
  });
});

//endpoint

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
