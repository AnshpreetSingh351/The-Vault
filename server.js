require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DATABASE CONNECTED 🔌"))
  .catch(err => console.log("DB CONNECTION ERROR:", err));

const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

const Room = mongoose.model('Room', new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
  room: String,
  author: String,
  text: String,
  image: String,
  time: String,
  reactions: { type: Object, default: {} }, 
  createdAt: { type: Date, default: Date.now }
}));

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000" },
  maxHttpBufferSize: 1e7 
});
const activeUsers = {}; 

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) { res.status(500).json({ error: "Failed to fetch rooms" }); }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, password } = req.body;
    const existing = await Room.findOne({ name });
    if (existing) return res.status(400).json({ error: "Name taken" });
    const newRoom = new Room({ name, password });
    await newRoom.save();
    io.emit('room_created', newRoom);
    res.status(201).json(newRoom);
  } catch (err) { res.status(500).json({ error: "Failed to create" }); }
});

app.delete('/api/rooms/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { password } = req.body;
    if (name === "General Vibes #1") return res.status(400).json({ error: "Permanent room" });
    const room = await Room.findOne({ name });
    if (!room || room.password !== password) return res.status(401).json({ error: "Incorrect password" });
    await Room.findOneAndDelete({ name });
    await Message.deleteMany({ room: name });
    io.emit('room_deleted', name);
    res.json({ message: "Room destroyed" });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already taken!" });
    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: "Account created!" });
  } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials!" });
    res.status(200).json({ message: "Welcome back!" });
  } catch (err) { res.status(500).json({ error: "DB Error" }); }
});
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 }).limit(50);
    res.json(messages);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.put('/api/messages/:id', async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(req.params.id, { text: req.body.text }, { new: true });
    io.emit('message_edited', updated); 
    res.json(updated);
  } catch (err) { res.status(500).json({ error: "Edit failed" }); }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    io.emit('message_deleted', req.params.id); 
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

app.delete('/api/messages/clear/:room', async (req, res) => {
  try {
    await Message.deleteMany({ room: req.params.room });
    io.emit('room_cleared', req.params.room);
    res.json({ message: "Cleared" });
  } catch (err) { res.status(500).json({ error: "Clear failed" }); }
});

io.on('connection', (socket) => {
  socket.on('join_vault', (data) => {
    const handle = typeof data === 'object' ? data.handle : data;
    const room = data.room || "General Vibes #1";
    activeUsers[socket.id] = handle;
    socket.join(room); 
    io.emit('online_users', Object.values(activeUsers));
  });

  socket.on('typing', (data) => {
    socket.to(data.room).emit('user_typing', data);
  });

  socket.on('send_message', async (data) => {
    try {
      const savedMsg = await new Message({ ...data, reactions: {} }).save(); 
      io.emit('receive_message', savedMsg); 
    } catch (err) { console.error("❌ SAVE ERROR:", err); }
  });

  socket.on('react_message', async ({ messageId, emoji, handle }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      const reactions = msg.reactions || {};
      if (!reactions[emoji]) reactions[emoji] = [];
      if (reactions[emoji].includes(handle)) {
        reactions[emoji] = reactions[emoji].filter(u => u !== handle);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else { reactions[emoji].push(handle); }
      const updated = await Message.findByIdAndUpdate(messageId, { reactions }, { new: true });
      io.emit('message_edited', updated); 
    } catch (err) { console.error("Reaction Error", err); }
  });

  socket.on('disconnect', () => {
    delete activeUsers[socket.id];
    io.emit('online_users', Object.values(activeUsers));
  });
});

server.listen(3001, () => console.log("SERVER RUNNING ON PORT 3001 🚀"));