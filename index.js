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
app.get('/chapters/:novelID/:title', (req, res) => {
  const { novelID, title } = req.params;

  db.get(`SELECT * FROM Chapters WHERE NovelID = ? and Title = ?`, [novelID, title], (err, row) => {
    if (err) {
      console.error('Error retrieving chapter:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(row);
    }
  });
});

// Update a specific chapter of a novel
app.put('/chapters/:novelID/:chapterID', (req, res) => {
  const { novelID, chapterID } = req.params;
  const { content } = req.body;

  const updateQuery = `
    UPDATE Chapters 
    SET Content = ? 
    WHERE NovelID = ? AND ChapterID = ?`;

  db.run(updateQuery, [content, novelID, chapterID], function (err) {
    if (err) {
      console.error('Error updating chapter:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Chapter updated successfully');
    }
  });
});

//endpoint for deleting a chapter
app.delete('/chapters/:novelID/:title', (req, res) => {
  const { novelID, title } = req.params;

  db.run(`DELETE FROM Chapters WHERE NovelID = ? and Title = ?`, [novelID, title], function (err) {
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

//endpoint for getting characters of a novel
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
app.get('/characters/:novelID/:name', (req, res) => {
  const { novelID, name } = req.params;

  db.all(`SELECT * FROM Characters WHERE NovelID = ? and Name = ?`, [novelID, name], (err, rows) => {
    if (err) {
      console.error('Error retrieving characters:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).json(rows);
    }
  });
});

//endpoint for updating details of a character
app.put('/characters/:novelID/:name', (req, res) => {
  const { novelID, name } = req.params;
  const {
    description,
    role,
    nickname,
    Appearance,
    Parents,
    Siblings,
    Significant_other,
    Gender,
    Nationality,
    Birth_Date,
    Where_they_live,
    Job_status,
    Biggest_fear,
    IQ,
    Eating_Habits,
    Food_preferences,
    Music_preferences,
    Do_they_keep_a_journal,
    What_excites_them,
    Pet_peeves,
    Planned_spontaneous,
    Leader_follower,
    Group_alone,
    Sexual_activity,
    General_health,
    handwriting,
    Things_in_glove_compartment,
    Things_kept_in_backpack,
    talents,
    flaws,
    Old_Halloween_costumes,
    Drugs_alcohol,
    passwords,
    Usernames_social_media,
    Prized_possession,
    Special_places,
    Special_memories,
    obsessions,
    As_seen_by_self,
    As_seen_by_others,
    ambitions,
    hobbies,
    Main_mode_of_transportation
  } = req.body;

  // Fetch the existing character data
  db.get('SELECT * FROM Characters WHERE NovelID = ? AND Name = ?', [novelID, name], (err, row) => {
    if (err) {
      console.error('Error fetching character:', err.message);
      return res.status(500).send('Internal Server Error');
    }

    if (!row) {
      return res.status(404).send('Character not found');
    }

    // Create the update query dynamically based on provided fields
    let updateFields = [];
    let params = [];
    
    if (description !== undefined) { updateFields.push('Description = ?'); params.push(description); }
    if (role !== undefined) { updateFields.push('Role = ?'); params.push(role); }
    if (nickname !== undefined) { updateFields.push('nickname = ?'); params.push(nickname); }
    if (Appearance !== undefined) { updateFields.push('Appearance = ?'); params.push(Appearance); }
    if (Parents !== undefined) { updateFields.push('Parents = ?'); params.push(Parents); }
    if (Siblings !== undefined) { updateFields.push('Siblings = ?'); params.push(Siblings); }
    if (Significant_other !== undefined) { updateFields.push('Significant_other = ?'); params.push(Significant_other); }
    if (Gender !== undefined) { updateFields.push('Gender = ?'); params.push(Gender); }
    if (Nationality !== undefined) { updateFields.push('Nationality = ?'); params.push(Nationality); }
    if (Birth_Date !== undefined) { updateFields.push('Birth_Date = ?'); params.push(Birth_Date); }
    if (Where_they_live !== undefined) { updateFields.push('Where_they_live = ?'); params.push(Where_they_live); }
    if (Job_status !== undefined) { updateFields.push('Job_status = ?'); params.push(Job_status); }
    if (Biggest_fear !== undefined) { updateFields.push('Biggest_fear = ?'); params.push(Biggest_fear); }
    if (IQ !== undefined) { updateFields.push('IQ = ?'); params.push(IQ); }
    if (Eating_Habits !== undefined) { updateFields.push('Eating_Habits = ?'); params.push(Eating_Habits); }
    if (Food_preferences !== undefined) { updateFields.push('Food_preferences = ?'); params.push(Food_preferences); }
    if (Music_preferences !== undefined) { updateFields.push('Music_preferences = ?'); params.push(Music_preferences); }
    if (Do_they_keep_a_journal !== undefined) { updateFields.push('Do_they_keep_a_journal = ?'); params.push(Do_they_keep_a_journal); }
    if (What_excites_them !== undefined) { updateFields.push('What_excites_them = ?'); params.push(What_excites_them); }
    if (Pet_peeves !== undefined) { updateFields.push('Pet_peeves = ?'); params.push(Pet_peeves); }
    if (Planned_spontaneous !== undefined) { updateFields.push('Planned_spontaneous = ?'); params.push(Planned_spontaneous); }
    if (Leader_follower !== undefined) { updateFields.push('Leader_follower = ?'); params.push(Leader_follower); }
    if (Group_alone !== undefined) { updateFields.push('Group_alone = ?'); params.push(Group_alone); }
    if (Sexual_activity !== undefined) { updateFields.push('Sexual_activity = ?'); params.push(Sexual_activity); }
    if (General_health !== undefined) { updateFields.push('General_health = ?'); params.push(General_health); }
    if (handwriting !== undefined) { updateFields.push('handwriting = ?'); params.push(handwriting); }
    if (Things_in_glove_compartment !== undefined) { updateFields.push('Things_in_glove_compartment = ?'); params.push(Things_in_glove_compartment); }
    if (Things_kept_in_backpack !== undefined) { updateFields.push('Things_kept_in_backpack = ?'); params.push(Things_kept_in_backpack); }
    if (talents !== undefined) { updateFields.push('talents = ?'); params.push(talents); }
    if (flaws !== undefined) { updateFields.push('flaws = ?'); params.push(flaws); }
    if (Old_Halloween_costumes !== undefined) { updateFields.push('Old_Halloween_costumes = ?'); params.push(Old_Halloween_costumes); }
    if (Drugs_alcohol !== undefined) { updateFields.push('Drugs_alcohol = ?'); params.push(Drugs_alcohol); }
    if (passwords !== undefined) { updateFields.push('passwords = ?'); params.push(passwords); }
    if (Usernames_social_media !== undefined) { updateFields.push('Usernames_social_media = ?'); params.push(Usernames_social_media); }
    if (Prized_possession !== undefined) { updateFields.push('Prized_possession = ?'); params.push(Prized_possession); }
    if (Special_places !== undefined) { updateFields.push('Special_places = ?'); params.push(Special_places); }
    if (Special_memories !== undefined) { updateFields.push('Special_memories = ?'); params.push(Special_memories); }
    if (obsessions !== undefined) { updateFields.push('obsessions = ?'); params.push(obsessions); }
    if (As_seen_by_self !== undefined) { updateFields.push('As_seen_by_self = ?'); params.push(As_seen_by_self); }
    if (As_seen_by_others !== undefined) { updateFields.push('As_seen_by_others = ?'); params.push(As_seen_by_others); }
    if (ambitions !== undefined) { updateFields.push('ambitions = ?'); params.push(ambitions); }
    if (hobbies !== undefined) { updateFields.push('hobbies = ?'); params.push(hobbies); }
    if (Main_mode_of_transportation !== undefined) { updateFields.push('Main_mode_of_transportation = ?'); params.push(Main_mode_of_transportation); }

    // Ensure that there is at least one field to update
    if (updateFields.length === 0) {
      return res.status(400).send('No fields provided for update');
    }

    const updateQuery = `
      UPDATE Characters 
      SET ${updateFields.join(', ')}
      WHERE NovelID = ? AND Name = ?`;

    params.push(novelID, name);

    db.run(updateQuery, params, function (err) {
      if (err) {
        console.error('Error updating character:', err.message);
        return res.status(500).send('Internal Server Error');
      }

      res.status(200).send('Character updated successfully');
    });
  });
});



//endpoint for deleting a character
app.delete('/characters/:novelID/:name', (req, res) => {
  const { novelID, name } = req.params;

  db.run(`DELETE FROM Characters WHERE NovelID = ? and Name = ?`, [novelID, name], function (err) {
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
