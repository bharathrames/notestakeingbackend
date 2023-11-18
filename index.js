const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  notes: [
    {
      title: String,
      content: String,
    },
  ],
});

const User = mongoose.model('User', userSchema);

// Registration
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error during registration' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user._id, username }, process.env.SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token, userId: user._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error during login' });
  }
});


app.post('/dashboard/note', async (req, res) => {
  try {
    const { username, title, content } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.notes.push({ title, content });
    await user.save();

    res.status(201).json({ message: 'Note created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all notes 
app.get('/dashboard/notes/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ notes: user.notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a note
app.put('/dashboard/note/:username/:noteId', async (req, res) => {
  try {
    const { username, noteId } = req.params;
    const { title, content } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const note = user.notes.id(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    note.title = title;
    note.content = content;

    await user.save();

    res.status(200).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a note
app.delete('/dashboard/note/:username/:noteId', async (req, res) => {
  try {
    const { username, noteId } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const note = user.notes.id(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    user.notes.pull(note);
    
    await user.save();

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Search notes
app.get('/dashboard/search/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { keyword } = req.query;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matchingNotes = user.notes.filter(
      (note) =>
        note.title.includes(keyword) || note.content.includes(keyword)
    );

    res.status(200).json({ notes: matchingNotes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
