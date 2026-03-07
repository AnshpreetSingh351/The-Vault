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
  .then(() => console.log("VAULT ENGINE ONLINE 🔌"))
  .catch(err => console.log("DB ERROR:", err));

const Room = mongoose.model('Room', new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
  room: String, author: String, text: String, image: String, time: String,
  reactions: { type: Object, default: {} },
  readBy: { type: [String], default: [] }, 
  createdAt: { type: Date, default: Date.now }
}));

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e7 
});

const activeUsers = {}; 

app.get('/api/rooms', async (req, res) => {
  try { res.json(await Room.find()); } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, password } = req.body;
    const newRoom = await new Room({ name, password }).save();
    io.emit('room_created', newRoom);
    res.status(201).json(newRoom);
  } catch (err) { res.status(400).json({ error: "Name taken" }); }
});

app.delete('/api/rooms/:name', async (req, res) => {
  try {
    const room = await Room.findOne({ name: req.params.name });
    if (!room || room.password !== req.body.password) return res.status(401).json({ error: "Bad Key" });
    await Room.findOneAndDelete({ name: req.params.name });
    await Message.deleteMany({ room: req.params.name });
    io.emit('room_deleted', req.params.name);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

app.get('/api/messages/:room', async (req, res) => {
  try { res.json(await Message.find({ room: req.params.room }).sort({ createdAt: 1 })); } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.delete('/api/messages/clear/:room', async (req, res) => {
  try {
    await Message.deleteMany({ room: req.params.room });
    io.emit('room_cleared', req.params.room);
    res.json({ message: "Wiped" });
  } catch (err) { res.status(500).json({ error: "Wipe failed" }); }
});

io.on('connection', (socket) => {
  socket.on('join_vault', (data) => {
    socket.join(data.room);
    activeUsers[socket.id] = data.handle;
    io.emit('online_users', Object.values(activeUsers));
  });
  socket.on('typing', (data) => socket.to(data.room).emit('user_typing', data));
  socket.on('send_message', async (data) => {
    const saved = await new Message({ ...data, readBy: [data.author] }).save();
    io.emit('receive_message', saved);
  });
  socket.on('mark_read', async ({ messageId, handle }) => {
    const updated = await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: handle } }, { new: true });
    if (updated) io.emit('message_edited', updated);
  });
  socket.on('disconnect', () => { delete activeUsers[socket.id]; io.emit('online_users', Object.values(activeUsers)); });
});

const PORT = process.env.PORT || 3001; 
server.listen(PORT, () => console.log(`SERVER LIVE ON PORT ${PORT} 🚀`));