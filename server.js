require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files allowed'));
  }
});

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
  video: String,
  time: String,
  reactions: { type: Object, default: {} },
  // 'sent' = saved to DB, 'seen' = recipient opened the room
  seenBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000" },
  maxHttpBufferSize: 1e7
});

// Track socket → { handle, room }
const activeUsers = {};      // socketId → handle
const userRooms = {};        // socketId → current room

app.post('/api/upload/video', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
  const uploadStream = cloudinary.uploader.upload_stream(
    { resource_type: 'video', folder: 'the-vault' },
    (error, result) => {
      if (error) return res.status(500).json({ error: 'Upload to Cloudinary failed' });
      res.json({ url: result.secure_url });
    }
  );
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

app.get('/api/rooms', async (req, res) => {
  try { res.json(await Room.find()); }
  catch (err) { res.status(500).json({ error: "Failed to fetch rooms" }); }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, password } = req.body;
    if (await Room.findOne({ name })) return res.status(400).json({ error: "Name taken" });
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
    if (await User.findOne({ username })) return res.status(400).json({ error: "Username already taken!" });
    await new User({ username, password }).save();
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

  socket.on('join_vault', async (data) => {
    const handle = typeof data === 'object' ? data.handle : data;
    const room = (typeof data === 'object' ? data.room : null) || "General Vibes #1";

    activeUsers[socket.id] = handle;
    userRooms[socket.id] = room;
    socket.join(room);
    io.emit('online_users', Object.values(activeUsers));

    // Mark all unread messages in this room as seen by this user
    try {
      const unseen = await Message.find({ room, seenBy: { $ne: handle }, author: { $ne: handle } });
      if (unseen.length > 0) {
        await Message.updateMany(
          { room, seenBy: { $ne: handle }, author: { $ne: handle } },
          { $addToSet: { seenBy: handle } }
        );
        // Notify room that these messages are now seen
        const updatedMsgs = await Message.find({ _id: { $in: unseen.map(m => m._id) } });
        updatedMsgs.forEach(msg => io.to(room).emit('message_seen_update', { _id: msg._id, seenBy: msg.seenBy }));
      }
    } catch (err) { console.error("Seen update error:", err); }
  });

  socket.on('typing', (data) => {
    socket.to(data.room).emit('user_typing', data);
  });

  socket.on('send_message', async (data) => {
    try {
      // Message starts with author already in seenBy (they sent it)
      const savedMsg = await new Message({ ...data, reactions: {}, seenBy: [data.author] }).save();
      // Emit to sender first with 'sent' status confirmed (double tick)
      socket.emit('message_delivered', { tempId: data.tempId, message: savedMsg });
      // Broadcast to room
      socket.to(data.room).emit('receive_message', savedMsg);

      // Check if any other users are currently in this room — mark as seen immediately
      const roomSockets = await io.in(data.room).fetchSockets();
      const othersInRoom = roomSockets
        .filter(s => s.id !== socket.id)
        .map(s => activeUsers[s.id])
        .filter(Boolean);

      if (othersInRoom.length > 0) {
        await Message.findByIdAndUpdate(savedMsg._id, { $addToSet: { seenBy: { $each: othersInRoom } } });
        const updated = await Message.findById(savedMsg._id);
        io.to(data.room).emit('message_seen_update', { _id: updated._id, seenBy: updated.seenBy });
      }
    } catch (err) { console.error("❌ SAVE ERROR:", err); }
  });

  // Client tells server user opened/is viewing a room
  socket.on('mark_seen', async ({ room, handle }) => {
    try {
      await Message.updateMany(
        { room, seenBy: { $ne: handle }, author: { $ne: handle } },
        { $addToSet: { seenBy: handle } }
      );
      const updated = await Message.find({ room, seenBy: handle, author: { $ne: handle } }).select('_id seenBy');
      updated.forEach(msg => io.to(room).emit('message_seen_update', { _id: msg._id, seenBy: msg.seenBy }));
    } catch (err) { console.error("mark_seen error:", err); }
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
    delete userRooms[socket.id];
    io.emit('online_users', Object.values(activeUsers));
  });
});

server.listen(3001, () => console.log("SERVER RUNNING ON PORT 3001 🚀"));
