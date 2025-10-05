// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8091;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/naco', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose Models

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  location: { type: String, required: true },
  role: { type: String, enum: ['client', 'artisan'], default: 'client' },
  premium: { type: Boolean, default: false },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  avatar: { type: String, default: null },
  about: { type: String, default: '' },
  skill: { type: String, default: 'General Services' },
  years_experience: { type: Number, default: 0 },
  completed_jobs: { type: Number, default: 0 },
  last_seen: { type: Date, default: Date.now },
  emailVisibility: { type: Boolean, default: true }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

// Artisan Profile Schema
const artisanProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, default: 'General Services' },
  specialties: [{ type: String }],
  description: { type: String, default: '' },
  rate: { type: Number, default: 5000 },
  rating: { type: Number, default: 0 },
  years_experience: { type: Number, default: 1 },
  availability: { type: String, enum: ['Available', 'Busy', 'Unavailable'], default: 'Available' },
  completed_jobs: { type: Number, default: 0 }
}, {
  timestamps: true
});

const ArtisanProfile = mongoose.model('ArtisanProfile', artisanProfileSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: String, required: true },
  description: { type: String, default: '' },
  service_date: { type: Date, required: true },
  service_time: { type: String, required: true },
  amount: { type: Number, required: true },
  payment_method: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'declined', 'completed', 'cancelled', 'in_progress', 'pending_confirmation'],
    default: 'pending' 
  },
  location: { type: String, default: '' },
  reference: { type: String, unique: true }
}, {
  timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, default: '' }
}, {
  timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

// Favorite Schema
const favoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper Functions
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h'
  });
};

const formatArtisanData = (user, completedJobsCount = null) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    location: user.location,
    premium: user.premium || false,
    photo: user.avatar ? `/uploads/${user.avatar}` : null,
    skill: user.skill || 'General Services',
    specialties: user.artisanProfile?.specialties || [],
    description: user.artisanProfile?.description || '',
    about: user.about || '',
    rate: user.artisanProfile?.rate || 0,
    rating: user.artisanProfile?.rating || 0,
    yearsExperience: user.years_experience || 0,
    availability: user.artisanProfile?.availability || 'Available',
    completed_jobs: completedJobsCount !== null ? completedJobsCount : (user.completed_jobs || 0),
    created: user.createdAt,
    updated: user.updatedAt
  };
};

const createNotification = async (userId, notificationData) => {
  try {
    const notification = new Notification({
      user: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      read: false,
      data: notificationData.data || {}
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};

// Authentication Routes

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, location, role, phone, skill, rate, yearsExperience, description } = req.body;

    // Validate required fields
    if (!email || !password || !name || !location) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username: email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username: email,
      email,
      password: hashedPassword,
      name,
      phone: phone || '',
      location,
      role: role || 'client',
      premium: false,
      theme: 'light',
      skill: skill || 'General Services',
      years_experience: yearsExperience || 0
    });

    await user.save();

    // Create artisan profile if role is artisan
    if (role === 'artisan') {
      const artisanProfile = new ArtisanProfile({
        user: user._id,
        skill: skill || 'General Services',
        rate: rate || 5000,
        availability: 'Available',
        rating: 0,
        completed_jobs: 0,
        years_experience: yearsExperience || 1,
        description: description || ''
      });
      await artisanProfile.save();
    }

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ $or: [{ email }, { username: email }] });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Update last seen
    user.last_seen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get current user
app.get('/auth/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User Profile Routes

// Update user profile
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Upload profile image
app.post('/users/:id/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: req.file.filename },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Avatar upload failed:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// Switch user role
app.put('/users/:id/role', authenticateToken, async (req, res) => {
  try {
    const { newRole } = req.body;
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create artisan profile if switching to artisan
    if (newRole === 'artisan') {
      const existingProfile = await ArtisanProfile.findOne({ user: userId });
      
      if (!existingProfile) {
        const artisanProfile = new ArtisanProfile({
          user: userId,
          skill: 'General Services',
          rate: 5000,
          availability: 'Available',
          rating: 0,
          completed_jobs: 0
        });
        await artisanProfile.save();
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Role switch failed:', error);
    res.status(500).json({ error: 'Role switch failed' });
  }
});

// Artisan Routes

// Get all artisans
app.get('/artisans', async (req, res) => {
  try {
    const users = await User.find({ role: 'artisan' })
      .populate('artisanProfile')
      .sort({ premium: -1, createdAt: -1 })
      .limit(50);

    const artisans = users.map(user => formatArtisanData(user));
    res.json(artisans);
  } catch (error) {
    console.error('Failed to get artisans:', error);
    res.status(500).json({ error: 'Failed to get artisans' });
  }
});

// Get single artisan
app.get('/artisans/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('artisanProfile');
    if (!user || user.role !== 'artisan') {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    // Count completed jobs from bookings
    const completedJobs = await Booking.countDocuments({
      artisan: req.params.id,
      status: 'completed'
    });

    const formattedArtisan = formatArtisanData(user, completedJobs);
    res.json(formattedArtisan);
  } catch (error) {
    console.error('Failed to get artisan:', error);
    res.status(500).json({ error: 'Failed to get artisan' });
  }
});

// Search artisans
app.get('/artisans/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { city } = req.query;

    let filter = { role: 'artisan' };
    
    if (city) {
      filter.location = city;
    }

    const users = await User.find(filter).populate('artisanProfile');

    let filteredResults = users;

    // Apply fuzzy search if query provided
    if (query && query.length >= 3) {
      const searchTerm = query.toLowerCase();
      
      filteredResults = users.map(user => {
        const skill = (user.skill || '').toLowerCase();
        const about = (user.about || '').toLowerCase();
        const location = (user.location || '').toLowerCase();
        const name = (user.name || '').toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // Exact matches get highest score
        if (skill.includes(searchTerm)) score += 10;
        if (about.includes(searchTerm)) score += 8;
        if (name.includes(searchTerm)) score += 6;
        if (location.includes(searchTerm)) score += 4;
        
        // Partial matches (3+ characters)
        const queryParts = searchTerm.split(' ').filter(part => part.length >= 3);
        queryParts.forEach(part => {
          if (skill.includes(part)) score += 3;
          if (about.includes(part)) score += 2;
          if (name.includes(part)) score += 2;
          if (location.includes(part)) score += 1;
        });
        
        return { ...user.toObject(), relevanceScore: score };
      })
      .filter(user => user.relevanceScore > 0)
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (a.premium !== b.premium) {
          return b.premium - a.premium;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    const artisans = filteredResults.map(user => formatArtisanData(user));
    res.json(artisans);
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Booking Routes

// Create booking
app.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const { artisanId, service, notes, description, date, time, amount, payment, location } = req.body;

    const reference = 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const booking = new Booking({
      client: req.user.id,
      artisan: artisanId,
      service,
      description: notes || description || '',
      service_date: date,
      service_time: time,
      amount,
      payment_method: payment,
      status: 'pending',
      location: location || '',
      reference
    });

    await booking.save();

    // Create notification for artisan
    await createNotification(artisanId, {
      type: 'booking',
      title: 'New Booking Request',
      message: `You have a new booking request for ${service}`,
      data: { bookingId: booking._id }
    });

    res.status(201).json({ ...booking.toObject(), reference });
  } catch (error) {
    console.error('Booking creation failed:', error);
    res.status(500).json({ error: 'Booking creation failed' });
  }
});

// Get user bookings
app.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ client: req.user.id }, { artisan: req.user.id }]
    })
    .populate('client', 'name')
    .populate('artisan', 'name completed_jobs')
    .sort({ createdAt: -1 })
    .limit(50);

    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      service: booking.service,
      description: booking.description,
      date: booking.service_date,
      time: booking.service_time,
      amount: booking.amount,
      status: booking.status,
      reference: booking.reference,
      location: booking.location,
      paymentMethod: booking.payment_method,
      clientId: booking.client._id,
      artisanId: booking.artisan._id,
      clientName: booking.client.name,
      artisanName: booking.artisan.name,
      artisanCompletedJobs: booking.artisan.completed_jobs || 0,
      created: booking.createdAt
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error('Failed to get bookings:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Update booking status
app.put('/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;

    const validStatuses = [
      'pending', 'confirmed', 'declined', 'completed',
      'pending_confirmation', 'confirm_completion',
      'cancelled', 'in_progress'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Handle special transitions
    let actualStatus = status;
    if (status === 'confirm_completion') {
      actualStatus = 'completed';
    } else if (status === 'reject_completion') {
      actualStatus = 'confirmed';
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: actualStatus },
      { new: true }
    ).populate('client artisan');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only increment completed jobs when client confirms
    if (status === 'confirm_completion' && booking.artisan) {
      await User.findByIdAndUpdate(booking.artisan._id, {
        $inc: { completed_jobs: 1 }
      });
    }

    // Create notifications
    let recipientId, message, title;

    if (actualStatus === 'confirmed' && status !== 'reject_completion') {
      recipientId = booking.client._id;
      title = 'Booking Confirmed';
      message = 'Your booking has been confirmed by the artisan';
    } else if (actualStatus === 'pending_confirmation') {
      recipientId = booking.client._id;
      title = 'Job Completed - Confirmation Required';
      message = 'The artisan has marked your job as completed. Please review and confirm.';
    } else if (actualStatus === 'completed' && status === 'confirm_completion') {
      recipientId = booking.artisan._id;
      title = 'Job Confirmed Complete';
      message = 'Client has confirmed job completion. Payment can now be processed.';
    } else if (actualStatus === 'confirmed' && status === 'reject_completion') {
      recipientId = booking.artisan._id;
      title = 'Completion Rejected';
      message = 'Client has rejected job completion. Please review the work.';
    } else if (actualStatus === 'declined') {
      recipientId = booking.client._id;
      title = 'Booking Declined';
      message = 'Your booking has been declined by the artisan';
    }

    if (recipientId && recipientId.toString() !== req.user.id) {
      await createNotification(recipientId, {
        type: 'booking',
        title,
        message,
        data: { bookingId }
      });
    }

    res.json(booking);
  } catch (error) {
    console.error('Booking status update failed:', error);
    res.status(500).json({ error: 'Booking status update failed' });
  }
});

// Review Routes

// Get reviews for artisan
app.get('/reviews/artisan/:id', async (req, res) => {
  try {
    const reviews = await Review.find({ artisan: req.params.id })
      .populate('reviewer', 'name premium')
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedReviews = reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      text: review.text,
      reviewerName: review.reviewer?.name || 'Anonymous',
      reviewerPremium: review.reviewer?.premium || false,
      date: review.createdAt
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Failed to get reviews:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Create review
app.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { bookingId, artisanId, rating, text } = req.body;

    const review = new Review({
      booking: bookingId,
      reviewer: req.user.id,
      artisan: artisanId,
      rating,
      text
    });

    await review.save();

    // Update artisan's average rating
    const reviews = await Review.find({ artisan: artisanId });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;
    
    // Update artisan profile with new average
    const profile = await ArtisanProfile.findOneAndUpdate(
      { user: artisanId },
      { rating: Math.round(avgRating * 10) / 10 }
    );

    res.status(201).json(review);
  } catch (error) {
    console.error('Review creation failed:', error);
    res.status(500).json({ error: 'Review creation failed' });
  }
});

// Notification Routes

// Get notifications
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notifications as read
app.put('/notifications/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Favorites Routes

// Toggle favorite
app.post('/favorites/toggle/:artisanId', authenticateToken, async (req, res) => {
  try {
    const artisanId = req.params.artisanId;
    const userId = req.user.id;

    const existing = await Favorite.findOne({ user: userId, artisan: artisanId });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      res.json({ isFavorite: false });
    } else {
      await Favorite.create({ user: userId, artisan: artisanId });
      res.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite failed:', error);
    res.status(500).json({ error: 'Toggle favorite failed' });
  }
});

// Get user favorites
app.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate({
        path: 'artisan',
        populate: { path: 'artisanProfile' }
      })
      .limit(50);

    const formattedFavorites = favorites.map(fav => formatArtisanData(fav.artisan));
    res.json(formattedFavorites);
  } catch (error) {
    console.error('Failed to get favorites:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Theme Routes
app.put('/users/:id/theme', authenticateToken, async (req, res) => {
  try {
    const { theme } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Theme update failed:', error);
    res.status(500).json({ error: 'Theme update failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
